import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BuildMethod, JewelleryType, RfqStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { MarketplaceIntelligenceService } from "../marketplace-intelligence/marketplace-intelligence.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ShopsService } from "../shops/shops.service";
import { BroadcastRfqDto } from "./dto/broadcast-rfq.dto";
import { CreateRfqDto } from "./dto/create-rfq.dto";
import {
  validateComposition,
  validateMethodDRequirements,
  ValidationResult,
} from "./validation/composition-validator";

@Injectable()
export class RfqService {
  constructor(
    private prisma: PrismaService,
    private shopsService: ShopsService,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
    private intelligenceService: MarketplaceIntelligenceService,
  ) {}

  /**
   * Create a new RFQ (Draft)
   */
  async create(customerId: string, dto: CreateRfqDto) {
    // Validate composition based on build method
    const validationResult = this.validateBuildMethodComposition(dto);

    if (!validationResult.isValid) {
      throw new BadRequestException({
        message: "Invalid composition for selected build method",
        errors: validationResult.errors,
      });
    }

    // Calculate estimated price range
    const priceEstimate = await this.estimatePriceRange(dto);

    const rfq = await this.prisma.rfqRequest.create({
      data: {
        customerId,
        jewelleryType: dto.jewelleryType as JewelleryType,
        buildMethod: dto.buildMethod as BuildMethod,
        composition: JSON.parse(JSON.stringify(dto.composition)),
        designId: dto.designId, // Link to Design Gallery if from "Build This"
        targetTotalWeightG: dto.targetTotalWeightG,
        targetGoldWeightG: dto.targetGoldWeightG,
        budgetMinNpr: dto.budgetMinNpr,
        budgetMaxNpr: dto.budgetMaxNpr,
        preferredDeliveryDays: dto.preferredDeliveryDays,
        specialInstructions: dto.specialInstructions,
        referenceImages: dto.referenceImages || [],
        estimatedPriceMinNpr: priceEstimate.min,
        estimatedPriceMaxNpr: priceEstimate.max,
        mandatoryLabels: validationResult.mandatoryLabels,
        status: RfqStatus.DRAFT,
      },
    });

    await this.auditService.log({
      userId: customerId,
      actorType: "USER",
      action: "CREATE",
      resourceType: "RFQ",
      resourceId: rfq.id,
      newValue: {
        buildMethod: dto.buildMethod,
        jewelleryType: dto.jewelleryType,
      },
    });

    return rfq;
  }

  /**
   * Get eligible shops for an RFQ based on capabilities
   * Includes price estimation and city-based priority sorting
   */
  async getEligibleShops(rfqId: string, customerCity?: string) {
    const rfq = await this.prisma.rfqRequest.findUnique({
      where: { id: rfqId },
      include: { gemstones: true },
    });

    if (!rfq) {
      throw new NotFoundException("RFQ not found");
    }

    // Extract material code from composition (e.g. "GOLD_22K", "SILVER_925")
    const composition = rfq.composition as any;
    const materialCode: string | undefined =
      composition?.preciousMetal || composition?.metalType || undefined;

    // Extract gemstone types from RFQ gemstones
    const gemstoneTypes = rfq.gemstones.map((g) => g.stoneType);

    // Build dynamic filter: always require jewelleryType + buildMethod
    const whereClause: any = {
      isActive: true,
      isVerified: true,
      supportedJewelleryTypes: { has: rfq.jewelleryType },
      supportedMethods: { has: rfq.buildMethod },
    };

    // Filter by material if specified
    if (materialCode) {
      whereClause.supportedMaterials = { has: materialCode };
    }

    // Filter by surface finish if specified
    if (rfq.surfaceFinish) {
      whereClause.supportedFinishes = { has: rfq.surfaceFinish };
    }

    // Filter by gemstones — shop must support all requested gemstone types
    if (gemstoneTypes.length > 0) {
      whereClause.supportedGemstones = { hasEvery: gemstoneTypes };
    }

    // Filter shops by capabilities
    const shops = await this.prisma.shop.findMany({
      where: whereClause,
      select: {
        id: true,
        shopName: true,
        shopNameNe: true,
        shopNameHi: true,
        city: true,
        country: true,
        isVerified: true,
        makingChargePercent: true,
        codEnabled: true,
        metalRates: true,
        ratings: {
          select: {
            overall: true,
          },
        },
      },
    });

    // Get market rate from MarketRate table (synced daily with live rates)
    const targetMetal = materialCode || "GOLD_24K";
    const marketRate = await this.prisma.marketRate.findFirst({
      where: { metalCode: targetMetal, country: "NP", validUntil: null },
      orderBy: { validFrom: "desc" },
    });
    let defaultRatePerGram = marketRate?.ratePerGram || 0;
    if (!defaultRatePerGram) {
      const fallbackRate = await this.prisma.marketRate.findFirst({
        where: { metalCode: "GOLD_24K", country: "NP", validUntil: null },
        orderBy: { validFrom: "desc" },
      });
      defaultRatePerGram = fallbackRate?.ratePerGram || 10000;
    }

    // Calculate price estimate and rating for each shop
    // defaultRatePerGram = live market rate for the metal (not the shop's making charge)
    const shopsWithPrices = shops.map((shop) => {
      // Shop's ratePerGramNpr is the MAKING CHARGE per gram (flat rate), not the metal price
      const shopRate =
        shop.metalRates.find((r) => r.metalType === targetMetal) ||
        shop.metalRates.find(
          (r) => r.metalType === "GOLD_24K" || r.metalType === "GOLD_22K",
        );

      // Estimate price based on target weight
      const targetWeight =
        rfq.targetGoldWeightG || rfq.targetTotalWeightG || 10;
      // Material cost uses the MARKET rate (actual metal price)
      const metalCost = targetWeight * defaultRatePerGram;
      // Making charge: use shop's flat rate if set, otherwise calculate from percentage
      const makingCharge = shopRate?.ratePerGramNpr
        ? targetWeight * shopRate.ratePerGramNpr
        : metalCost * ((shop.makingChargePercent || 10) / 100);
      const estimatedPrice = Math.round(metalCost + makingCharge);

      // Calculate average rating
      const averageRating =
        shop.ratings.length > 0
          ? shop.ratings.reduce((sum, r) => sum + r.overall, 0) /
            shop.ratings.length
          : null;

      // Calculate location priority (1=same city, 2=same country, 3=global)
      let locationPriority = 3;
      if (
        customerCity &&
        shop.city.toLowerCase() === customerCity.toLowerCase()
      ) {
        locationPriority = 1;
      } else if (shop.country === "NP") {
        locationPriority = 2;
      }

      return {
        id: shop.id,
        shopName: shop.shopName,
        shopNameNe: shop.shopNameNe,
        shopNameHi: shop.shopNameHi,
        city: shop.city,
        country: shop.country,
        isVerified: shop.isVerified,
        makingChargePercent: shop.makingChargePercent,
        codEnabled: shop.codEnabled,
        averageRating,
        estimatedPrice,
        metalRatePerGram: defaultRatePerGram,
        locationPriority,
      };
    });

    // Sort by location priority (city > country > global), then by price
    return shopsWithPrices.sort((a, b) => {
      // First sort by location priority
      if (a.locationPriority !== b.locationPriority) {
        return a.locationPriority - b.locationPriority;
      }
      // Then sort by estimated price (cheapest first)
      return a.estimatedPrice - b.estimatedPrice;
    });
  }

  /**
   * Broadcast RFQ to selected shops
   */
  async broadcast(rfqId: string, customerId: string, dto: BroadcastRfqDto) {
    const rfq = await this.prisma.rfqRequest.findUnique({
      where: { id: rfqId },
    });

    if (!rfq) {
      throw new NotFoundException("RFQ not found");
    }

    if (rfq.customerId !== customerId) {
      throw new ForbiddenException("Not authorized to broadcast this RFQ");
    }

    if (rfq.status !== RfqStatus.DRAFT) {
      throw new BadRequestException("RFQ has already been broadcast");
    }

    // Validate shops exist and have capabilities
    const eligibleShopIds = (await this.getEligibleShops(rfqId)).map(
      (s) => s.id,
    );
    const invalidShops = dto.shopIds.filter(
      (id) => !eligibleShopIds.includes(id),
    );

    if (invalidShops.length > 0) {
      throw new BadRequestException(
        `Some shops are not eligible for this RFQ: ${invalidShops.join(", ")}`,
      );
    }

    // Create snapshot of RFQ at broadcast time
    const broadcastSnapshot = {
      ...rfq,
      broadcastAt: new Date().toISOString(),
      shopCount: dto.shopIds.length,
    };

    // Update RFQ and create shop targets
    const updatedRfq = await this.prisma.$transaction(async (tx) => {
      // Update RFQ status
      const updated = await tx.rfqRequest.update({
        where: { id: rfqId },
        data: {
          status: RfqStatus.SENT_TO_SHOPS,
          broadcastAt: new Date(),
          broadcastSnapshot,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Create shop targets
      await tx.rfqShopTarget.createMany({
        data: dto.shopIds.map((shopId) => ({
          rfqId,
          shopId,
        })),
      });

      return updated;
    });

    // Send notifications to shops
    for (const shopId of dto.shopIds) {
      const shop = await this.prisma.shop.findUnique({
        where: { id: shopId },
        include: { user: true },
      });

      if (shop) {
        await this.notificationsService.create({
          userId: shop.userId,
          type: "RFQ_RECEIVED",
          titleKey: "notification.rfqReceived.title",
          bodyKey: "notification.rfqReceived.body",
          bodyParams: {
            jewelleryType: rfq.jewelleryType,
            buildMethod: rfq.buildMethod,
          },
          referenceType: "RFQ",
          referenceId: rfqId,
          channels: ["EMAIL", "PUSH"],
        });
      }
    }

    await this.auditService.log({
      userId: customerId,
      actorType: "USER",
      action: "BROADCAST",
      resourceType: "RFQ",
      resourceId: rfqId,
      newValue: { shopCount: dto.shopIds.length },
    });

    return {
      ...updatedRfq,
      message: `RFQ sent to ${dto.shopIds.length} shops`,
      messageKey: "helper.rfqSentToShops",
      messageParams: { count: dto.shopIds.length },
    };
  }

  /**
   * Send RFQ directly to a single seller with optional budget update
   * Customer selects a seller from matching results and sends the request
   */
  async sendToSeller(
    rfqId: string,
    customerId: string,
    dto: {
      shopId: string;
      budgetMinNpr?: number;
      budgetMaxNpr?: number;
      message?: string;
    },
  ) {
    const rfq = await this.prisma.rfqRequest.findUnique({
      where: { id: rfqId },
    });

    if (!rfq) {
      throw new NotFoundException("RFQ not found");
    }

    if (rfq.customerId !== customerId) {
      throw new ForbiddenException("You can only send your own RFQ");
    }

    if (rfq.status !== RfqStatus.DRAFT) {
      throw new BadRequestException(
        "RFQ has already been sent. Cannot send again.",
      );
    }

    // Verify shop exists and is active
    const shop = await this.prisma.shop.findFirst({
      where: { id: dto.shopId, isActive: true },
      include: {
        user: { select: { id: true, firstName: true, email: true } },
      },
    });

    if (!shop) {
      throw new NotFoundException("Shop not found or is not active");
    }

    // Update budget if provided, then broadcast
    const updateData: any = {
      status: RfqStatus.SENT_TO_SHOPS,
      broadcastAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      broadcastSnapshot: JSON.parse(JSON.stringify(rfq)),
    };

    if (dto.budgetMinNpr !== undefined) {
      updateData.budgetMinNpr = dto.budgetMinNpr;
    }
    if (dto.budgetMaxNpr !== undefined) {
      updateData.budgetMaxNpr = dto.budgetMaxNpr;
    }
    if (dto.message) {
      updateData.specialInstructions = rfq.specialInstructions
        ? `${rfq.specialInstructions}\n\n[Customer Note to Seller]: ${dto.message}`
        : `[Customer Note to Seller]: ${dto.message}`;
    }

    const updatedRfq = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.rfqRequest.update({
        where: { id: rfqId },
        data: updateData,
      });

      // Create the shop target record
      await tx.rfqShopTarget.create({
        data: {
          rfqId: rfqId,
          shopId: dto.shopId,
        },
      });

      return updated;
    });

    // Notify the seller
    if (shop.user) {
      await this.notificationsService.create({
        userId: shop.user.id,
        type: "RFQ_RECEIVED",
        channels: ["EMAIL", "PUSH"],
        titleKey: "rfq.received.title",
        titleParams: { jewelleryType: rfq.jewelleryType },
        bodyKey: "rfq.received.body",
        bodyParams: {
          jewelleryType: rfq.jewelleryType,
          buildMethod: rfq.buildMethod,
          budgetRange: `${dto.budgetMinNpr || rfq.budgetMinNpr} - ${dto.budgetMaxNpr || rfq.budgetMaxNpr}`,
        },
        referenceType: "RFQ",
        referenceId: rfqId,
      });
    }

    await this.auditService.log({
      userId: customerId,
      actorType: "USER",
      action: "BROADCAST",
      resourceType: "RFQ",
      resourceId: rfqId,
      newValue: { shopId: dto.shopId, shopName: shop.shopName },
    });

    return {
      ...updatedRfq,
      message: `Order request sent to ${shop.shopName}`,
      shopName: shop.shopName,
    };
  }

  /**
   * Get RFQ by ID with offers
   */
  async findOne(rfqId: string, userId: string, userRole: string) {
    const rfq = await this.prisma.rfqRequest.findUnique({
      where: { id: rfqId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        targetedShops: {
          include: {
            rfq: false,
          },
        },
        offers: {
          include: {
            shop: {
              select: {
                id: true,
                shopName: true,
                shopNameNe: true,
                shopNameHi: true,
                city: true,
                isVerified: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        selectedOffer: true,
      },
    });

    if (!rfq) {
      throw new NotFoundException("RFQ not found");
    }

    // Access control
    const isCustomer = rfq.customerId === userId;
    const isShopkeeper = rfq.targetedShops.some(
      (t) => t.shopId === userId, // This would need shop lookup
    );
    const isAdmin = userRole === "ADMIN";
    const isSupport = userRole === "SUPPORT";

    if (!isCustomer && !isAdmin && !isSupport) {
      // Check if user is a targeted shopkeeper
      const userShop = await this.prisma.shop.findFirst({
        where: { userId },
      });

      if (
        !userShop ||
        !rfq.targetedShops.some((t) => t.shopId === userShop.id)
      ) {
        throw new ForbiddenException("Not authorized to view this RFQ");
      }
    }

    return rfq;
  }

  /**
   * List RFQs for a customer
   */
  async findAllForCustomer(customerId: string, status?: RfqStatus) {
    return this.prisma.rfqRequest.findMany({
      where: {
        customerId,
        ...(status && { status }),
      },
      include: {
        offers: {
          select: {
            id: true,
            status: true,
            totalPriceNpr: true,
            shop: {
              select: {
                shopName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * List RFQs for a shopkeeper
   */
  async findAllForShop(shopId: string) {
    return this.prisma.rfqRequest.findMany({
      where: {
        targetedShops: {
          some: {
            shopId,
          },
        },
        status: {
          in: [
            RfqStatus.SENT_TO_SHOPS,
            RfqStatus.OFFERS_RECEIVED,
            RfqStatus.OFFER_SELECTED,
            RfqStatus.CONFIRMED,
          ],
        },
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        offers: {
          where: {
            shopId,
          },
        },
        targetedShops: {
          where: {
            shopId,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Validate composition based on build method
   */
  private validateBuildMethodComposition(dto: CreateRfqDto): ValidationResult {
    const composition = dto.composition as any;
    composition.method = dto.buildMethod;

    // Use the shared validation
    const result = validateComposition(composition);

    // Additional METHOD_D validation
    if (dto.buildMethod === "METHOD_D") {
      if (!validateMethodDRequirements(composition)) {
        result.isValid = false;
        result.errors.push({
          code: "METHOD_D_REQUIREMENTS_NOT_MET",
          field: "composition",
          message:
            "Method D requires pattern, mode, and at least one weight specification",
          messageKey: "validation.methodD.requirementsNotMet",
        });
      }
    }

    return result;
  }

  /**
   * Estimate price range based on current market rates
   */
  private async estimatePriceRange(
    dto: CreateRfqDto,
  ): Promise<{ min: number; max: number }> {
    // Get market rates from MarketRate table (synced daily with live rates)
    const marketRates = await this.prisma.marketRate.findMany({
      where: {
        country: "NP",
        validUntil: null,
      },
    });

    // Basic estimation logic (simplified)
    let baseRate = 0;
    const composition = dto.composition as any;

    if (dto.buildMethod === "METHOD_A" || dto.buildMethod === "METHOD_B") {
      // For solid/alloy methods, use gold rate
      const goldRate = marketRates.find((r) => r.metalCode === "GOLD_24K");
      baseRate = goldRate?.ratePerGram || 10000;
    } else if (dto.buildMethod === "METHOD_C") {
      // For plated items, use base metal rate + plating cost
      baseRate = 500; // Base metal average
    } else if (dto.buildMethod === "METHOD_D") {
      // Multi-metal: weighted calculation
      const goldRate = marketRates.find((r) => r.metalCode === "GOLD_24K");
      const goldPercent = composition.modeConfig?.goldPercentByWeight || 50;
      baseRate = ((goldRate?.ratePerGram || 10000) * goldPercent) / 100 + 200;
    }

    const weight = dto.targetTotalWeightG || 10; // Default 10g
    const basePrice = baseRate * weight;
    const makingChargeMin = basePrice * 0.08;
    const makingChargeMax = basePrice * 0.2;

    return {
      min: Math.round(basePrice + makingChargeMin),
      max: Math.round(basePrice + makingChargeMax),
    };
  }

  /**
   * Update RFQ status when offers are received
   */
  async updateStatusOnOfferReceived(rfqId: string) {
    const rfq = await this.prisma.rfqRequest.findUnique({
      where: { id: rfqId },
    });

    if (rfq && rfq.status === RfqStatus.SENT_TO_SHOPS) {
      await this.prisma.rfqRequest.update({
        where: { id: rfqId },
        data: { status: RfqStatus.OFFERS_RECEIVED },
      });
    }
  }

  /**
   * Select an offer
   */
  async selectOffer(rfqId: string, offerId: string, customerId: string) {
    const rfq = await this.prisma.rfqRequest.findUnique({
      where: { id: rfqId },
      include: { offers: true },
    });

    if (!rfq) {
      throw new NotFoundException("RFQ not found");
    }

    if (rfq.customerId !== customerId) {
      throw new ForbiddenException("Not authorized");
    }

    if (
      rfq.status !== RfqStatus.OFFERS_RECEIVED &&
      rfq.status !== RfqStatus.SENT_TO_SHOPS
    ) {
      throw new BadRequestException("Cannot select offer at this stage");
    }

    const offer = rfq.offers.find((o) => o.id === offerId);
    if (!offer) {
      throw new BadRequestException("Offer not found for this RFQ");
    }

    if (offer.status !== "ACCEPTED" && offer.status !== "COUNTERED") {
      throw new BadRequestException("Cannot select this offer");
    }

    // Update RFQ and offer
    const result = await this.prisma.$transaction(async (tx) => {
      // Update RFQ
      await tx.rfqRequest.update({
        where: { id: rfqId },
        data: {
          status: RfqStatus.OFFER_SELECTED,
          selectedOfferId: offerId,
        },
      });

      // Update selected offer
      await tx.rfqOffer.update({
        where: { id: offerId },
        data: {
          status: "SELECTED",
          paymentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      // Expire other offers
      await tx.rfqOffer.updateMany({
        where: {
          rfqId,
          id: { not: offerId },
          status: { in: ["PENDING", "ACCEPTED", "COUNTERED"] },
        },
        data: { status: "EXPIRED" },
      });

      return tx.rfqOffer.findUnique({
        where: { id: offerId },
        include: { shop: true },
      });
    });

    // Notify the selected shop
    if (result) {
      await this.notificationsService.create({
        userId: result.shop.userId,
        type: "OFFER_SELECTED",
        titleKey: "notification.offerSelected.title",
        bodyKey: "notification.offerSelected.body",
        referenceType: "OFFER",
        referenceId: offerId,
        channels: ["EMAIL", "PUSH", "SMS"],
      });
    }

    await this.auditService.log({
      userId: customerId,
      actorType: "USER",
      action: "SELECT_OFFER",
      resourceType: "RFQ",
      resourceId: rfqId,
      newValue: { offerId },
    });

    // Capture data for marketplace intelligence
    try {
      await this.intelligenceService.captureOfferSelection(rfqId, offerId);
    } catch (err) {
      // Non-critical — don't block the main flow
      console.error('Intelligence data capture failed:', err);
    }

    return {
      rfqId,
      offerId,
      message: "Offer selected. Please pay booking fee within 24 hours.",
      messageKey: "helper.offerSelected",
      paymentDeadline: result?.paymentDeadline,
      bookingFeeNpr: result?.bookingFeeNpr,
    };
  }
}
