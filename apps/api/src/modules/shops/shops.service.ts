import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { RedisService } from "../../common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateShopDto } from "./dto/create-shop.dto";
import { OAuthShopSetupDto } from "./dto/oauth-shop-setup.dto";
import { UpdateMetalRatesDto } from "./dto/update-metal-rates.dto";
import { UpdateShopDto } from "./dto/update-shop.dto";

@Injectable()
export class ShopsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private redisService: RedisService
  ) {}

  /**
   * Check if a phone number is already registered (using Redis cache first)
   */
  private async checkPhoneUniqueness(
    phone: string,
    excludeUserId?: string
  ): Promise<boolean> {
    const normalizedPhone = phone.trim();
    const cacheKey = `phone:${normalizedPhone}`;

    // Check Redis cache first
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        const cachedData = JSON.parse(cached);
        // If excluding a user (like self), check if it's them
        if (excludeUserId && cachedData.userId === excludeUserId) {
          return false; // Phone belongs to same user, allow
        }
        return true; // Phone exists for another user
      }
    } catch (error) {
      // Redis error, fall back to database
    }

    // Check database
    const existingUser = await this.prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
      select: { id: true },
    });

    if (existingUser) {
      // Cache the result for future lookups
      try {
        await this.redisService.set(
          cacheKey,
          JSON.stringify({ userId: existingUser.id }),
          3600
        );
      } catch (error) {
        // Ignore Redis errors
      }
      return true;
    }

    return false;
  }

  /**
   * Setup shop for OAuth users who signed up as SHOPKEEPER
   * This validates phone uniqueness and creates the shop
   */
  async setupShopForOAuthUser(userId: string, dto: OAuthShopSetupDto) {
    // Check if user exists and is a shopkeeper
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { shops: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.role !== UserRole.SHOPKEEPER) {
      throw new ForbiddenException("Only shopkeeper accounts can create shops");
    }

    if (user.shops && user.shops.length > 0) {
      throw new BadRequestException(
        "User already has a shop. Use the dashboard to add more shops."
      );
    }

    // Check phone uniqueness (required for OAuth setup)
    const phoneExists = await this.checkPhoneUniqueness(dto.userPhone, userId);
    if (phoneExists) {
      throw new ConflictException(
        "This phone number is already registered. Please use a different number."
      );
    }

    // Determine shop contact phone (use shop phone if provided, else user phone)
    const shopContactPhone = dto.shopPhone || dto.userPhone;

    // Create shop and update user phone in a transaction
    const [shop] = await this.prisma.$transaction([
      this.prisma.shop.create({
        data: {
          userId,
          shopName: dto.shopName,
          country: dto.country || "NP",
          city: dto.city,
          address: dto.address || "",
          contactPhone: shopContactPhone,
          contactEmail: dto.contactEmail || user.email,
          makingChargePercent: 10, // Default making charge
        },
      }),
      // Update user's phone number
      this.prisma.user.update({
        where: { id: userId },
        data: {
          phone: dto.userPhone,
          // Keep status as PENDING_VERIFICATION until admin approves the shop
        },
      }),
    ]);

    // Cache the phone number in Redis
    try {
      const cacheKey = `phone:${dto.userPhone.trim()}`;
      await this.redisService.set(cacheKey, JSON.stringify({ userId }), 3600);
    } catch (error) {
      // Ignore Redis errors
    }

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "CREATE",
      resourceType: "SHOP",
      resourceId: shop.id,
      newValue: { shopName: shop.shopName, method: "oauth_setup" },
    });

    return shop;
  }

  async create(userId: string, dto: CreateShopDto) {
    // Multi-shop support: Allow multiple shops per user
    // No longer checking for existing shop

    const shop = await this.prisma.shop.create({
      data: {
        userId,
        shopName: dto.shopName,
        shopNameNe: dto.shopNameNe,
        shopNameHi: dto.shopNameHi,
        description: dto.description,
        country: dto.country || "NP",
        state: dto.state,
        city: dto.city,
        address: dto.address,
        pincode: dto.pincode,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        whatsappNumber: dto.whatsappNumber,
        supportedJewelleryTypes: dto.supportedJewelleryTypes || [],
        supportedMethods: dto.supportedMethods || [],
        supportedMaterials: dto.supportedMaterials || [],
        supportedFinishes: dto.supportedFinishes || [],
        codEnabled: dto.codEnabled || false,
        makingChargePercent: dto.makingChargePercent || 10,
      },
    });

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "CREATE",
      resourceType: "SHOP",
      resourceId: shop.id,
      newValue: { shopName: shop.shopName },
    });

    return shop;
  }

  async findAll(params: {
    country?: string;
    city?: string;
    jewelleryType?: string;
    method?: string;
    verified?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const {
      country,
      city,
      jewelleryType,
      method,
      verified,
      page = 1,
      pageSize = 20,
    } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
      isActive: true,
    };

    if (country) where.country = country;
    if (city) where.city = city;
    if (verified !== undefined) where.isVerified = verified;
    if (jewelleryType) where.supportedJewelleryTypes = { has: jewelleryType };
    if (method) where.supportedMethods = { has: method };

    const [shops, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        skip,
        take: pageSize,
        select: {
          id: true,
          shopName: true,
          shopNameNe: true,
          shopNameHi: true,
          city: true,
          address: true,
          country: true,
          contactPhone: true,
          contactEmail: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          supportedJewelleryTypes: true,
          supportedMethods: true,
          codEnabled: true,
          makingChargePercent: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          ratings: {
            select: { overall: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.shop.count({ where }),
    ]);

    return {
      shops: shops.map((shop) => ({
        ...shop,
        owner: shop.user,
        user: undefined,
        currency:
          shop.country === "IN"
            ? "INR"
            : shop.country === "AE"
            ? "AED"
            : shop.country === "US"
            ? "USD"
            : shop.country === "UK"
            ? "GBP"
            : "NPR",
        averageRating:
          shop.ratings.length > 0
            ? shop.ratings.reduce((sum, r) => sum + r.overall, 0) /
              shop.ratings.length
            : null,
        reviewCount: shop.ratings.length,
        ratings: undefined,
      })),
      meta: {
        page,
        pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        metalRates: true,
        finishPricing: true,
        ratings: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            overall: true,
            quality: true,
            reviewText: true,
            createdAt: true,
          },
        },
      },
    });

    if (!shop) {
      throw new NotFoundException("Shop not found");
    }

    return {
      ...shop,
      averageRating:
        shop.ratings.length > 0
          ? shop.ratings.reduce((sum, r) => sum + r.overall, 0) /
            shop.ratings.length
          : null,
    };
  }

  async findByUserId(userId: string) {
    // For multi-shop support, find the user's active shop or the first shop
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeShopId: true },
    });

    let shop;
    if (user?.activeShopId) {
      shop = await this.prisma.shop.findUnique({
        where: { id: user.activeShopId, userId },
        include: {
          metalRates: true,
          finishPricing: true,
        },
      });
    }

    if (!shop) {
      // Fallback to first shop owned by user
      shop = await this.prisma.shop.findFirst({
        where: { userId },
        include: {
          metalRates: true,
          finishPricing: true,
        },
      });
    }

    if (!shop) {
      throw new NotFoundException("Shop not found for this user");
    }

    return shop;
  }

  async findAllByUserId(userId: string) {
    const shops = await this.prisma.shop.findMany({
      where: { userId },
      select: {
        id: true,
        shopName: true,
        isVerified: true,
        city: true,
        country: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to match frontend expectations
    return shops.map((shop) => ({
      ...shop,
      name: shop.shopName,
      slug: shop.id, // Using ID as slug placeholder
      status: shop.isVerified ? "ACTIVE" : "PENDING",
    }));
  }

  async update(shopId: string, userId: string, dto: UpdateShopDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException("Shop not found");
    }

    if (shop.userId !== userId) {
      throw new ForbiddenException("Not authorized to update this shop");
    }

    const previousValue = { ...shop };

    const updated = await this.prisma.shop.update({
      where: { id: shopId },
      data: dto,
    });

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "UPDATE",
      resourceType: "SHOP",
      resourceId: shopId,
      previousValue,
      newValue: dto,
    });

    return updated;
  }

  async updateMetalRates(
    shopId: string,
    userId: string,
    dto: UpdateMetalRatesDto
  ) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException("Shop not found");
    }

    if (shop.userId !== userId) {
      throw new ForbiddenException("Not authorized");
    }

    // Upsert metal rates
    const results = await Promise.all(
      dto.rates.map((rate) =>
        this.prisma.shopMetalRate.upsert({
          where: {
            shopId_metalType: {
              shopId,
              metalType: rate.metalType,
            },
          },
          create: {
            shopId,
            metalType: rate.metalType,
            ratePerGramNpr: rate.ratePerGramNpr,
          },
          update: {
            ratePerGramNpr: rate.ratePerGramNpr,
            lastUpdatedAt: new Date(),
          },
        })
      )
    );

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "UPDATE",
      resourceType: "SHOP_RATES",
      resourceId: shopId,
      newValue: dto.rates,
    });

    return results;
  }

  async verifyShop(shopId: string, adminId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException("Shop not found");
    }

    const updated = await this.prisma.shop.update({
      where: { id: shopId },
      data: { isVerified: true },
    });

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: "APPROVE",
      resourceType: "SHOP",
      resourceId: shopId,
    });

    return updated;
  }

  async getShopDashboard(shopId: string) {
    const [shop, pendingRfqs, activeOrders, recentRatings] = await Promise.all([
      this.prisma.shop.findUnique({
        where: { id: shopId },
      }),
      this.prisma.rfqShopTarget.count({
        where: {
          shopId,
          respondedAt: null,
          rfq: {
            status: "SENT_TO_SHOPS",
          },
        },
      }),
      this.prisma.order.count({
        where: {
          shopId,
          status: {
            in: ["PAID", "IN_PRODUCTION", "QC_PENDING", "READY_TO_SHIP"],
          },
        },
      }),
      this.prisma.shopRating.findMany({
        where: { shopId },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      shop,
      stats: {
        pendingRfqs,
        activeOrders,
        recentRatings: recentRatings.length,
        averageRating:
          recentRatings.length > 0
            ? recentRatings.reduce((sum, r) => sum + r.overall, 0) /
              recentRatings.length
            : null,
      },
    };
  }

  /**
   * Get shop settings for the current user
   */
  async getShopSettings(userId: string) {
    // For multi-shop support: get active shop or first shop for user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeShopId: true },
    });

    const shop = await this.prisma.shop.findFirst({
      where: user?.activeShopId
        ? { id: user.activeShopId, userId }
        : { userId },
      include: {
        metalRates: true,
        finishPricing: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            preferredCurrency: true,
          },
        },
      },
    });

    if (!shop) {
      throw new NotFoundException("Shop not found for this user");
    }

    return {
      shop,
      user: shop.user,
    };
  }

  /**
   * Update shop settings
   */
  async updateShopSettings(userId: string, dto: UpdateShopDto) {
    // For multi-shop support: get active shop or first shop
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeShopId: true },
    });

    const shop = await this.prisma.shop.findFirst({
      where: user?.activeShopId
        ? { id: user.activeShopId, userId }
        : { userId },
    });

    if (!shop) {
      throw new NotFoundException("Shop not found for this user");
    }

    const previousValue = { ...shop };

    const updated = await this.prisma.shop.update({
      where: { id: shop.id },
      data: dto,
    });

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "UPDATE",
      resourceType: "SHOP_SETTINGS",
      resourceId: shop.id,
      previousValue,
      newValue: dto,
    });

    return updated;
  }

  /**
   * Get shop analytics
   */
  async getShopAnalytics(shopId: string, period?: string) {
    if (!shopId) {
      throw new BadRequestException("Shop ID required");
    }

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
      ratings,
      recentOrders,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { shopId, createdAt: { gte: startDate } },
      }),
      this.prisma.order.count({
        where: {
          shopId,
          status: {
            in: ["CREATED", "PAYMENT_PENDING", "PAID", "IN_PRODUCTION"],
          },
          createdAt: { gte: startDate },
        },
      }),
      this.prisma.order.count({
        where: {
          shopId,
          status: { in: ["DELIVERED", "COMPLETED"] },
          createdAt: { gte: startDate },
        },
      }),
      this.prisma.order.count({
        where: { shopId, status: "CANCELLED", createdAt: { gte: startDate } },
      }),
      this.prisma.order.aggregate({
        where: {
          shopId,
          status: { in: ["DELIVERED", "COMPLETED", "PAID"] },
          createdAt: { gte: startDate },
        },
        _sum: { totalNpr: true },
      }),
      this.prisma.shopRating.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      this.prisma.order.findMany({
        where: { shopId, createdAt: { gte: startDate } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalNpr: true,
          createdAt: true,
          customer: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
    ]);

    const avgRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.overall, 0) / ratings.length
        : 0;

    return {
      period: period || "month",
      summary: {
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue: totalRevenue._sum.totalNpr || 0,
        averageRating: avgRating,
        totalReviews: ratings.length,
      },
      recentOrders,
    };
  }

  /**
   * Get shop materials inventory
   */
  async getShopMaterials(shopId: string) {
    if (!shopId) {
      throw new BadRequestException("Shop ID required");
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        supportedMaterials: true,
        metalRates: true,
        makingChargePercent: true,
      },
    });

    if (!shop) {
      throw new NotFoundException("Shop not found");
    }

    // Get all available material codes from the system
    const allMaterials = [
      {
        code: "GOLD_24K",
        name: "24K Gold",
        category: "PRECIOUS_METAL",
        purity: 99.9,
      },
      {
        code: "GOLD_22K",
        name: "22K Gold",
        category: "PRECIOUS_METAL",
        purity: 91.6,
      },
      {
        code: "GOLD_18K",
        name: "18K Gold",
        category: "PRECIOUS_METAL",
        purity: 75.0,
      },
      {
        code: "GOLD_14K",
        name: "14K Gold",
        category: "PRECIOUS_METAL",
        purity: 58.5,
      },
      {
        code: "SILVER_999",
        name: "Pure Silver",
        category: "PRECIOUS_METAL",
        purity: 99.9,
      },
      {
        code: "SILVER_925",
        name: "Sterling Silver",
        category: "PRECIOUS_METAL",
        purity: 92.5,
      },
      {
        code: "PLATINUM_950",
        name: "Platinum 950",
        category: "PRECIOUS_METAL",
        purity: 95.0,
      },
    ];

    // Map materials with shop-specific data
    const materials = allMaterials.map((material) => {
      const isAvailable = shop.supportedMaterials.includes(material.code);
      const shopRate = shop.metalRates.find(
        (r) => r.metalType === material.code
      );
      return {
        ...material,
        isAvailable,
        pricePerGramNpr: shopRate?.ratePerGramNpr || null,
        lastUpdated: shopRate?.lastUpdatedAt || null,
      };
    });

    return {
      materials,
      makingChargePercent: shop.makingChargePercent,
    };
  }

  /**
   * Update shop materials inventory
   */
  async updateShopMaterials(
    shopId: string,
    userId: string,
    materials: Array<{
      materialCode: string;
      isAvailable: boolean;
      pricePerGramNpr?: number;
    }>
  ) {
    if (!shopId) {
      throw new BadRequestException("Shop ID required");
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop || shop.userId !== userId) {
      throw new ForbiddenException("Not authorized");
    }

    // Update supportedMaterials array
    const supportedMaterials = materials
      .filter((m) => m.isAvailable)
      .map((m) => m.materialCode);

    // Update metal rates for materials with custom pricing
    const metalRateUpdates = materials
      .filter(
        (m) => m.pricePerGramNpr !== undefined && m.pricePerGramNpr !== null
      )
      .map((m) =>
        this.prisma.shopMetalRate.upsert({
          where: {
            shopId_metalType: {
              shopId,
              metalType: m.materialCode,
            },
          },
          create: {
            shopId,
            metalType: m.materialCode,
            ratePerGramNpr: m.pricePerGramNpr!,
          },
          update: {
            ratePerGramNpr: m.pricePerGramNpr!,
            lastUpdatedAt: new Date(),
          },
        })
      );

    await Promise.all([
      this.prisma.shop.update({
        where: { id: shopId },
        data: { supportedMaterials },
      }),
      ...metalRateUpdates,
    ]);

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "UPDATE",
      resourceType: "SHOP_MATERIALS",
      resourceId: shopId,
      newValue: { materials: supportedMaterials },
    });

    return { success: true, supportedMaterials };
  }

  /**
   * Get shop capabilities (jewellery types they can make)
   */
  async getShopCapabilities(shopId: string) {
    if (!shopId) {
      throw new BadRequestException("Shop ID required");
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        supportedJewelleryTypes: true,
        supportedMethods: true,
        supportedFinishes: true,
        supportedGemstones: true,
      },
    });

    if (!shop) {
      throw new NotFoundException("Shop not found");
    }

    // All available jewellery types
    const allJewelleryTypes = [
      "RING",
      "NECKLACE",
      "BRACELET",
      "BANGLE",
      "EARRING",
      "PENDANT",
      "CHAIN",
      "ANKLET",
      "NOSE_PIN",
      "MANGALSUTRA",
      "MAANG_TIKKA",
      "OTHER",
    ];

    const allBuildMethods = ["METHOD_A", "METHOD_B", "METHOD_C", "METHOD_D"];

    // All available gemstone types
    const allGemstoneTypes = [
      "DIAMOND_NATURAL",
      "DIAMOND_LAB",
      "MOISSANITE",
      "CUBIC_ZIRCONIA",
      "RUBY",
      "SAPPHIRE",
      "EMERALD",
      "PEARL",
      "AMETHYST",
      "TOPAZ",
      "GARNET",
      "OPAL",
      "TURQUOISE",
      "AQUAMARINE",
      "PERIDOT",
      "CITRINE",
    ];

    return {
      jewelleryTypes: allJewelleryTypes.map((type) => ({
        code: type,
        name: type.replace(/_/g, " "),
        isSupported: shop.supportedJewelleryTypes.includes(type),
      })),
      buildMethods: allBuildMethods.map((method) => ({
        code: method,
        name: method.replace(/_/g, " "),
        isSupported: shop.supportedMethods.includes(method),
      })),
      supportedFinishes: shop.supportedFinishes,
      gemstones: allGemstoneTypes.map((type) => ({
        code: type,
        name: type.replace(/_/g, " "),
        isSupported: (shop.supportedGemstones || []).includes(type),
      })),
    };
  }

  /**
   * Update shop capabilities
   */
  async updateShopCapabilities(
    shopId: string,
    userId: string,
    dto: {
      jewelleryTypes?: string[];
      buildMethods?: string[];
      finishes?: string[];
      gemstones?: string[];
    }
  ) {
    if (!shopId) {
      throw new BadRequestException("Shop ID required");
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop || shop.userId !== userId) {
      throw new ForbiddenException("Not authorized");
    }

    const updateData: any = {};

    if (dto.jewelleryTypes) {
      updateData.supportedJewelleryTypes = dto.jewelleryTypes;
    }

    if (dto.buildMethods) {
      updateData.supportedMethods = dto.buildMethods;
    }

    if (dto.finishes) {
      updateData.supportedFinishes = dto.finishes;
    }

    if (dto.gemstones) {
      updateData.supportedGemstones = dto.gemstones;
    }

    await this.prisma.shop.update({
      where: { id: shopId },
      data: updateData,
    });

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "UPDATE",
      resourceType: "SHOP_CAPABILITIES",
      resourceId: shopId,
      newValue: dto,
    });

    return { success: true, ...dto };
  }

  /**
   * Admin: Update any shop
   */
  async adminUpdateShop(shopId: string, adminId: string, dto: UpdateShopDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException("Shop not found");
    }

    const previousValue = { ...shop };

    const updated = await this.prisma.shop.update({
      where: { id: shopId },
      data: dto,
    });

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: "UPDATE",
      resourceType: "SHOP",
      resourceId: shopId,
      previousValue,
      newValue: dto,
    });

    return updated;
  }

  /**
   * Admin: Delete any shop
   */
  async adminDeleteShop(shopId: string, adminId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: { user: true },
    });

    if (!shop) {
      throw new NotFoundException("Shop not found");
    }

    // Delete shop and related data in transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete metal rates
      await tx.shopMetalRate.deleteMany({ where: { shopId } });
      // Delete finish pricing
      await tx.shopFinishPricing.deleteMany({ where: { shopId } });
      // Delete verification requests
      await tx.verificationRequest.deleteMany({ where: { shopId } });
      // Delete shop
      await tx.shop.delete({ where: { id: shopId } });
    });

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: "DELETE",
      resourceType: "SHOP",
      resourceId: shopId,
      previousValue: { shopName: shop.shopName, userId: shop.userId },
    });

    return { success: true, message: "Shop deleted successfully" };
  }
}
