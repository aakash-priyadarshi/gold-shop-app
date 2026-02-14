import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { BuildMethod, JewelleryType, ShopQuoteStatus } from "@prisma/client";
import { RedisService } from "../../common/redis";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { MarketRegion } from "../market-rates/types";
import { TaxRulesService } from "../pricing/services/tax-rules.service";
import {
  CreateShopQuoteDto,
  RecordPaymentDto,
  UpdateQuoteStatusDto,
  UpdateShopQuoteDto,
} from "./dto";

// Redis key prefix for walk-in customer lookup
const WALKIN_CUSTOMER_CACHE_PREFIX = "walkin:phone:";
const WALKIN_CUSTOMER_CACHE_TTL = 86400; // 24 hours

@Injectable()
export class ShopQuotesService {
  private readonly logger = new Logger(ShopQuotesService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private auditService: AuditService,
    private taxRulesService: TaxRulesService,
  ) {}

  /**
   * Get the dynamic tax rate for a given region from admin-configured rules.
   * Falls back to 0.13 (Nepal default) if lookup fails.
   */
  private async getTaxRate(region: string = "NP"): Promise<number> {
    try {
      const result = await this.taxRulesService.calculateTaxes(
        region as MarketRegion,
        { ALL: 1 }, // dummy amount to get effective rate
      );
      return result.effectiveRate;
    } catch {
      return 0.13; // Fallback default
    }
  }

  /**
   * Generate a unique quote number
   */
  private generateQuoteNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SQ-${timestamp}${random}`;
  }

  /**
   * Lookup customer by phone number
   * First checks Redis cache, then falls back to database
   */
  async lookupCustomerByPhone(
    phoneCountryCode: string,
    phone: string,
    shopId: string,
  ) {
    const fullPhone = `${phoneCountryCode}${phone}`;
    const cacheKey = `${WALKIN_CUSTOMER_CACHE_PREFIX}${fullPhone}`;

    // Try Redis cache first
    const cachedCustomer = await this.redisService.get(cacheKey);
    if (cachedCustomer) {
      try {
        const parsed = JSON.parse(cachedCustomer);
        this.logger.log(`Customer found in cache: ${parsed.name}`);
        return {
          found: true,
          customer: parsed,
          source: "cache",
        };
      } catch (e) {
        this.logger.warn(`Failed to parse cached customer: ${e.message}`);
      }
    }

    // Fall back to database — search walk-in customers first
    const customer = await this.prisma.walkInCustomer.findUnique({
      where: { phone: fullPhone },
      include: {
        shopQuotes: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            quoteNumber: true,
            jewelleryType: true,
            totalPriceNpr: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (customer) {
      // Cache the customer data
      const customerData = {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        phoneCountryCode: customer.phoneCountryCode,
        email: customer.email,
        address: customer.address,
        city: customer.city,
        country: customer.country,
        recentOrders: customer.shopQuotes,
        isRegistered: false,
      };
      await this.redisService.set(
        cacheKey,
        JSON.stringify(customerData),
        WALKIN_CUSTOMER_CACHE_TTL,
      );

      return {
        found: true,
        customer: customerData,
        source: "database",
      };
    }

    // Also search registered users (CUSTOMER role) by phone
    const registeredUser = await this.prisma.user.findFirst({
      where: {
        phone: fullPhone,
        role: "CUSTOMER",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        preferredCity: true,
        preferredCountry: true,
      },
    });

    if (registeredUser) {
      const customerData = {
        id: registeredUser.id,
        name: `${registeredUser.firstName} ${registeredUser.lastName}`.trim(),
        phone: registeredUser.phone,
        phoneCountryCode: phoneCountryCode,
        email: registeredUser.email,
        address: "",
        city: registeredUser.preferredCity || "",
        country: registeredUser.preferredCountry || "",
        recentOrders: [],
        isRegistered: true,
      };
      await this.redisService.set(
        cacheKey,
        JSON.stringify(customerData),
        WALKIN_CUSTOMER_CACHE_TTL,
      );

      return {
        found: true,
        customer: customerData,
        source: "database",
      };
    }

    return {
      found: false,
      customer: null,
      source: null,
    };
  }

  /**
   * Search customers by partial phone number
   * Returns up to 5 matching customers for live suggestions
   */
  async searchCustomersByPhone(
    phoneCountryCode: string,
    partialPhone: string,
    shopId: string,
  ) {
    const fullPartial = `${phoneCountryCode}${partialPhone}`;

    // Search walk-in customers
    const walkInCustomers = await this.prisma.walkInCustomer.findMany({
      where: {
        phone: { startsWith: fullPartial },
        createdByShopId: shopId,
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        phoneCountryCode: true,
        email: true,
        address: true,
        city: true,
        country: true,
      },
    });

    // Also search registered users (CUSTOMER role) by phone
    const registeredUsers = await this.prisma.user.findMany({
      where: {
        phone: { startsWith: fullPartial },
        role: "CUSTOMER",
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        preferredCity: true,
        preferredCountry: true,
      },
    });

    // Merge results, walk-in first, then registered (deduped by phone)
    const seenPhones = new Set(walkInCustomers.map((c) => c.phone));
    const merged = [
      ...walkInCustomers.map((c) => ({ ...c, isRegistered: false })),
      ...registeredUsers
        .filter((u) => u.phone && !seenPhones.has(u.phone))
        .map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`.trim(),
          phone: u.phone!,
          phoneCountryCode: phoneCountryCode,
          email: u.email,
          address: "",
          city: u.preferredCity || "",
          country: u.preferredCountry || "",
          isRegistered: true,
        })),
    ].slice(0, 5);

    return {
      customers: merged,
      count: merged.length,
    };
  }

  /**
   * Create or get existing walk-in customer
   */
  private async getOrCreateCustomer(
    shopId: string,
    customerData: {
      name: string;
      phone: string;
      phoneCountryCode: string;
      email?: string;
      address: string;
      city: string;
      country?: string;
    },
  ) {
    const fullPhone = `${customerData.phoneCountryCode}${customerData.phone}`;

    // Check if customer already exists
    let customer = await this.prisma.walkInCustomer.findUnique({
      where: { phone: fullPhone },
    });

    if (customer) {
      // Update customer details if changed
      customer = await this.prisma.walkInCustomer.update({
        where: { id: customer.id },
        data: {
          name: customerData.name,
          email: customerData.email,
          address: customerData.address,
          city: customerData.city,
          country: customerData.country || "India",
        },
      });
    } else {
      // Create new customer
      customer = await this.prisma.walkInCustomer.create({
        data: {
          phone: fullPhone,
          phoneCountryCode: customerData.phoneCountryCode,
          name: customerData.name,
          email: customerData.email,
          address: customerData.address,
          city: customerData.city,
          country: customerData.country || "India",
          createdByShopId: shopId,
        },
      });
    }

    // Invalidate cache to ensure fresh data
    const cacheKey = `${WALKIN_CUSTOMER_CACHE_PREFIX}${fullPhone}`;
    await this.redisService.del(cacheKey);

    return customer;
  }

  /**
   * Create a new shop quote for a walk-in customer
   */
  async create(shopId: string, shopkeeperId: string, dto: CreateShopQuoteDto) {
    // Verify shop exists and belongs to the shopkeeper
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId: shopkeeperId },
    });

    if (!shop) {
      throw new ForbiddenException(
        "Shop not found or you do not own this shop",
      );
    }

    if (!shop.isVerified) {
      throw new BadRequestException("Shop must be verified to create quotes");
    }

    // Get or create walk-in customer
    const customer = await this.getOrCreateCustomer(shopId, {
      name: dto.customer.name,
      phone: dto.customer.phone,
      phoneCountryCode: dto.customer.phoneCountryCode,
      email: dto.customer.email,
      address: dto.customer.address,
      city: dto.customer.city,
      country: dto.customer.country,
    });

    // Calculate total price if pricing provided
    let totalPriceNpr: number | null = null;
    let taxNprValue = 0;
    if (dto.metalCostNpr !== undefined) {
      totalPriceNpr =
        (dto.metalCostNpr || 0) +
        (dto.makingChargeNpr || 0) +
        (dto.gemstoneCostNpr || 0) +
        (dto.finishCostNpr || 0);

      // Use admin-configured tax rate
      const taxRate = await this.getTaxRate("NP");
      taxNprValue = totalPriceNpr * taxRate;
      totalPriceNpr += taxNprValue;
    }

    // Create the quote
    const quote = await this.prisma.shopQuote.create({
      data: {
        quoteNumber: this.generateQuoteNumber(),
        shopId,
        walkInCustomerId: customer.id,
        jewelleryType: dto.jewelleryType as JewelleryType,
        buildMethod: dto.buildMethod as BuildMethod,
        composition: JSON.parse(JSON.stringify(dto.composition)),
        targetTotalWeightG: dto.targetTotalWeightG,
        targetGoldWeightG: dto.targetGoldWeightG,
        specialInstructions: dto.specialInstructions,
        referenceImages: dto.referenceImages || [],
        metalCostNpr: dto.metalCostNpr,
        makingChargeNpr: dto.makingChargeNpr,
        gemstoneCostNpr: dto.gemstoneCostNpr || 0,
        finishCostNpr: dto.finishCostNpr || 0,
        taxNpr: taxNprValue,
        totalPriceNpr,
        estimatedDays: dto.estimatedDays,
        shopNotes: dto.shopNotes,
        balanceDueNpr: totalPriceNpr,
        status: ShopQuoteStatus.QUOTED,
      },
      include: {
        walkInCustomer: true,
        shop: {
          select: {
            id: true,
            shopName: true,
            city: true,
          },
        },
      },
    });

    // Log audit
    await this.auditService.log({
      userId: shopkeeperId,
      actorType: "USER",
      action: "CREATE",
      resourceType: "SHOP_QUOTE",
      resourceId: quote.id,
      newValue: {
        quoteNumber: quote.quoteNumber,
        customerName: customer.name,
        jewelleryType: dto.jewelleryType,
        totalPriceNpr,
      },
    });

    return {
      ...quote,
      message: "Quote created successfully",
    };
  }

  /**
   * Get all quotes for a shop
   */
  async findAllForShop(
    shopId: string,
    userId: string,
    status?: ShopQuoteStatus,
  ) {
    // Verify shop belongs to user
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId },
    });

    if (!shop) {
      throw new ForbiddenException(
        "Shop not found or you do not own this shop",
      );
    }

    const where: any = { shopId };
    if (status) {
      where.status = status;
    }

    return this.prisma.shopQuote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        walkInCustomer: {
          select: {
            id: true,
            name: true,
            phone: true,
            city: true,
          },
        },
      },
    });
  }

  /**
   * Get a single quote by ID
   */
  async findOne(quoteId: string, shopId: string, userId: string) {
    const quote = await this.prisma.shopQuote.findUnique({
      where: { id: quoteId },
      include: {
        walkInCustomer: true,
        shop: {
          select: {
            id: true,
            shopName: true,
            city: true,
            userId: true,
          },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException("Quote not found");
    }

    // Verify ownership
    if (quote.shop.userId !== userId) {
      throw new ForbiddenException("Not authorized to view this quote");
    }

    return quote;
  }

  /**
   * Update quote details (pricing, notes, etc.)
   */
  async update(
    quoteId: string,
    shopId: string,
    userId: string,
    dto: UpdateShopQuoteDto,
  ) {
    const quote = await this.findOne(quoteId, shopId, userId);

    if (
      quote.status === ShopQuoteStatus.COMPLETED ||
      quote.status === ShopQuoteStatus.CANCELLED
    ) {
      throw new BadRequestException(
        "Cannot update a completed or cancelled quote",
      );
    }

    // Recalculate total if pricing changed
    let totalPriceNpr = quote.totalPriceNpr;
    let taxNpr = quote.taxNpr;

    if (
      dto.metalCostNpr !== undefined ||
      dto.makingChargeNpr !== undefined ||
      dto.gemstoneCostNpr !== undefined ||
      dto.finishCostNpr !== undefined
    ) {
      const metalCost = dto.metalCostNpr ?? quote.metalCostNpr ?? 0;
      const makingCharge = dto.makingChargeNpr ?? quote.makingChargeNpr ?? 0;
      const gemstoneCost = dto.gemstoneCostNpr ?? quote.gemstoneCostNpr ?? 0;
      const finishCost = dto.finishCostNpr ?? quote.finishCostNpr ?? 0;

      const subtotal = metalCost + makingCharge + gemstoneCost + finishCost;
      const dynamicTaxRate = await this.getTaxRate("NP");
      taxNpr = subtotal * dynamicTaxRate;
      totalPriceNpr = subtotal + taxNpr;
    }

    const balanceDueNpr =
      totalPriceNpr !== null
        ? totalPriceNpr - (quote.advancePaidNpr || 0)
        : null;

    const updated = await this.prisma.shopQuote.update({
      where: { id: quoteId },
      data: {
        metalCostNpr: dto.metalCostNpr ?? quote.metalCostNpr,
        makingChargeNpr: dto.makingChargeNpr ?? quote.makingChargeNpr,
        gemstoneCostNpr: dto.gemstoneCostNpr ?? quote.gemstoneCostNpr,
        finishCostNpr: dto.finishCostNpr ?? quote.finishCostNpr,
        taxNpr,
        totalPriceNpr,
        balanceDueNpr,
        estimatedDays: dto.estimatedDays ?? quote.estimatedDays,
        shopNotes: dto.shopNotes ?? quote.shopNotes,
        specialInstructions:
          dto.specialInstructions ?? quote.specialInstructions,
      },
      include: {
        walkInCustomer: true,
      },
    });

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "UPDATE",
      resourceType: "SHOP_QUOTE",
      resourceId: quoteId,
      previousValue: {
        totalPriceNpr: quote.totalPriceNpr,
        estimatedDays: quote.estimatedDays,
      },
      newValue: {
        totalPriceNpr: updated.totalPriceNpr,
        estimatedDays: updated.estimatedDays,
      },
    });

    return updated;
  }

  /**
   * Update quote status
   */
  async updateStatus(
    quoteId: string,
    shopId: string,
    userId: string,
    dto: UpdateQuoteStatusDto,
  ) {
    const quote = await this.findOne(quoteId, shopId, userId);

    const validTransitions: Record<ShopQuoteStatus, ShopQuoteStatus[]> = {
      [ShopQuoteStatus.QUOTED]: [
        ShopQuoteStatus.CONFIRMED,
        ShopQuoteStatus.CANCELLED,
      ],
      [ShopQuoteStatus.CONFIRMED]: [
        ShopQuoteStatus.IN_PROGRESS,
        ShopQuoteStatus.CANCELLED,
      ],
      [ShopQuoteStatus.IN_PROGRESS]: [
        ShopQuoteStatus.READY,
        ShopQuoteStatus.CANCELLED,
      ],
      [ShopQuoteStatus.READY]: [
        ShopQuoteStatus.COMPLETED,
        ShopQuoteStatus.CANCELLED,
      ],
      [ShopQuoteStatus.COMPLETED]: [],
      [ShopQuoteStatus.CANCELLED]: [],
    };

    const newStatus = dto.status as ShopQuoteStatus;
    if (!validTransitions[quote.status].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${quote.status} to ${newStatus}`,
      );
    }

    if (newStatus === ShopQuoteStatus.CANCELLED && !dto.cancelReason) {
      throw new BadRequestException("Cancel reason is required");
    }

    // For CONFIRMED, pricing must be set
    if (newStatus === ShopQuoteStatus.CONFIRMED && !quote.totalPriceNpr) {
      throw new BadRequestException(
        "Price must be set before confirming the quote",
      );
    }

    const updateData: any = {
      status: newStatus,
    };

    // Set timestamps based on status
    switch (newStatus) {
      case ShopQuoteStatus.CONFIRMED:
        updateData.confirmedAt = new Date();
        break;
      case ShopQuoteStatus.IN_PROGRESS:
        updateData.startedAt = new Date();
        break;
      case ShopQuoteStatus.READY:
        updateData.readyAt = new Date();
        break;
      case ShopQuoteStatus.COMPLETED:
        updateData.completedAt = new Date();
        if (quote.balanceDueNpr && quote.balanceDueNpr > 0) {
          throw new BadRequestException(
            "Balance must be paid before completing",
          );
        }
        updateData.paidInFullAt = new Date();
        break;
      case ShopQuoteStatus.CANCELLED:
        updateData.cancelledAt = new Date();
        updateData.cancelReason = dto.cancelReason;
        break;
    }

    const updated = await this.prisma.shopQuote.update({
      where: { id: quoteId },
      data: updateData,
      include: {
        walkInCustomer: true,
      },
    });

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "STATUS_UPDATE",
      resourceType: "SHOP_QUOTE",
      resourceId: quoteId,
      previousValue: { status: quote.status },
      newValue: { status: newStatus, cancelReason: dto.cancelReason },
    });

    return updated;
  }

  /**
   * Record a payment on the quote
   */
  async recordPayment(
    quoteId: string,
    shopId: string,
    userId: string,
    dto: RecordPaymentDto,
  ) {
    const quote = await this.findOne(quoteId, shopId, userId);

    if (quote.status === ShopQuoteStatus.CANCELLED) {
      throw new BadRequestException("Cannot record payment on cancelled quote");
    }

    if (!quote.totalPriceNpr) {
      throw new BadRequestException(
        "Quote price must be set before recording payment",
      );
    }

    const newAdvancePaid = (quote.advancePaidNpr || 0) + dto.amountNpr;
    const newBalanceDue = (quote.totalPriceNpr || 0) - newAdvancePaid;

    if (newBalanceDue < 0) {
      throw new BadRequestException("Payment exceeds remaining balance");
    }

    const updated = await this.prisma.shopQuote.update({
      where: { id: quoteId },
      data: {
        advancePaidNpr: newAdvancePaid,
        balanceDueNpr: newBalanceDue,
        paidInFullAt: newBalanceDue === 0 ? new Date() : undefined,
      },
      include: {
        walkInCustomer: true,
      },
    });

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "PAYMENT_RECORDED",
      resourceType: "SHOP_QUOTE",
      resourceId: quoteId,
      newValue: {
        amount: dto.amountNpr,
        newTotal: newAdvancePaid,
        balanceDue: newBalanceDue,
        notes: dto.notes,
      },
    });

    return {
      ...updated,
      paymentRecorded: dto.amountNpr,
      message:
        newBalanceDue === 0
          ? "Quote fully paid"
          : `Payment recorded. Balance due: ${newBalanceDue}`,
    };
  }

  /**
   * Get quote statistics for a shop
   */
  async getStats(shopId: string, userId: string) {
    // Verify shop belongs to user
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId },
    });

    if (!shop) {
      throw new ForbiddenException(
        "Shop not found or you do not own this shop",
      );
    }

    const [
      totalQuotes,
      pendingQuotes,
      confirmedQuotes,
      inProgressQuotes,
      completedQuotes,
      cancelledQuotes,
      totalRevenue,
      uniqueCustomers,
    ] = await Promise.all([
      this.prisma.shopQuote.count({ where: { shopId } }),
      this.prisma.shopQuote.count({
        where: { shopId, status: ShopQuoteStatus.QUOTED },
      }),
      this.prisma.shopQuote.count({
        where: { shopId, status: ShopQuoteStatus.CONFIRMED },
      }),
      this.prisma.shopQuote.count({
        where: { shopId, status: ShopQuoteStatus.IN_PROGRESS },
      }),
      this.prisma.shopQuote.count({
        where: { shopId, status: ShopQuoteStatus.COMPLETED },
      }),
      this.prisma.shopQuote.count({
        where: { shopId, status: ShopQuoteStatus.CANCELLED },
      }),
      this.prisma.shopQuote.aggregate({
        where: { shopId, status: ShopQuoteStatus.COMPLETED },
        _sum: { totalPriceNpr: true },
      }),
      this.prisma.shopQuote.groupBy({
        by: ["walkInCustomerId"],
        where: { shopId },
      }),
    ]);

    return {
      total: totalQuotes,
      byStatus: {
        pending: pendingQuotes,
        confirmed: confirmedQuotes,
        inProgress: inProgressQuotes,
        completed: completedQuotes,
        cancelled: cancelledQuotes,
      },
      totalRevenue: totalRevenue._sum.totalPriceNpr || 0,
      uniqueCustomers: uniqueCustomers.length,
    };
  }

  /**
   * Get customer history
   */
  async getCustomerHistory(customerId: string, shopId: string, userId: string) {
    // Verify shop belongs to user
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId },
    });

    if (!shop) {
      throw new ForbiddenException(
        "Shop not found or you do not own this shop",
      );
    }

    const customer = await this.prisma.walkInCustomer.findUnique({
      where: { id: customerId },
      include: {
        shopQuotes: {
          where: { shopId },
          orderBy: { createdAt: "desc" },
          include: {
            shop: {
              select: { id: true, shopName: true },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    return customer;
  }
}
