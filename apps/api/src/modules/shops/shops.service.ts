import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { RedisService } from "../../common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PlatformConfigService } from "../platform-config/platform-config.service";
import { ContentModerationService } from "./content-moderation.service";
import { CreateShopDto } from "./dto/create-shop.dto";
import { OAuthShopSetupDto } from "./dto/oauth-shop-setup.dto";
import { UpdateMetalRatesDto } from "./dto/update-metal-rates.dto";
import { UpdateShopDto } from "./dto/update-shop.dto";

@Injectable()
export class ShopsService {
  private readonly logger = new Logger(ShopsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private redisService: RedisService,
    private configService: PlatformConfigService,
    private moderationService: ContentModerationService,
  ) {}

  /**
   * Check if a phone number is already registered (using Redis cache first)
   */
  private async checkPhoneUniqueness(
    phone: string,
    excludeUserId?: string,
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
          3600,
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
        "User already has a shop. Use the dashboard to add more shops.",
      );
    }

    // Check phone uniqueness (required for OAuth setup)
    const phoneExists = await this.checkPhoneUniqueness(dto.userPhone, userId);
    if (phoneExists) {
      throw new ConflictException(
        "This phone number is already registered. Please use a different number.",
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
          where: { isPublic: true },
          orderBy: { createdAt: "desc" },
          select: {
            overall: true,
            quality: true,
            reviewText: true,
            createdAt: true,
            sellerReply: true,
            sellerRepliedAt: true,
          },
        },
      },
    });

    if (!shop) {
      throw new NotFoundException("Shop not found");
    }

    // Build a materials pricing map for public display
    // metalRates stores the making charge per gram (ratePerGramNpr) set by the seller
    const materialsPricing = (shop.supportedMaterials || []).map(
      (materialCode: string) => {
        const rate = shop.metalRates.find((r) => r.metalType === materialCode);
        return {
          materialCode,
          makingChargePerGram: rate?.ratePerGramNpr || null,
        };
      },
    );

    return {
      ...shop,
      materialsPricing,
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
    dto: UpdateMetalRatesDto,
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
        }),
      ),
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

    // Enforce making charge cap based on seller tier
    if (dto.makingChargePercent !== undefined) {
      const cap = await this.configService.getMakingChargeCap(
        shop.sellerTier || "STANDARD",
      );
      if (dto.makingChargePercent > cap) {
        throw new BadRequestException(
          `Making charge ${dto.makingChargePercent}% exceeds your ${shop.sellerTier} tier cap of ${cap}%. Upgrade your tier to increase the limit.`,
        );
      }
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
        (r) => r.metalType === material.code,
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
    }>,
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
        (m) => m.pricePerGramNpr !== undefined && m.pricePerGramNpr !== null,
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
        }),
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
    },
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
   * Get shop gemstone pricing (shop-specific overrides + system defaults)
   */
  async getShopGemstonePricing(shopId: string) {
    if (!shopId) {
      throw new BadRequestException("Shop ID required");
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: { gemstoneRates: true },
    });

    if (!shop) {
      throw new NotFoundException("Shop not found");
    }

    // System default gemstone prices (same structure as DEFAULT_GEMSTONE_PRICES_NPR)
    const defaultPrices: Record<
      string,
      Record<string, Record<string, number>>
    > = {
      DIAMOND: {
        "0.1-0.25ct": { LOW: 8000, MEDIUM: 15000, HIGH: 25000, PREMIUM: 30000 },
        "0.25-0.5ct": {
          LOW: 25000,
          MEDIUM: 50000,
          HIGH: 80000,
          PREMIUM: 100000,
        },
        "0.5-1ct": {
          LOW: 80000,
          MEDIUM: 150000,
          HIGH: 250000,
          PREMIUM: 350000,
        },
        "1-2ct": {
          LOW: 200000,
          MEDIUM: 400000,
          HIGH: 700000,
          PREMIUM: 1000000,
        },
      },
      DIAMOND_LAB: {
        "0.1-0.25ct": { LOW: 5200, MEDIUM: 9750, HIGH: 16250, PREMIUM: 19500 },
        "0.25-0.5ct": {
          LOW: 16250,
          MEDIUM: 32500,
          HIGH: 52000,
          PREMIUM: 65000,
        },
        "0.5-1ct": { LOW: 52000, MEDIUM: 97500, HIGH: 162500, PREMIUM: 227500 },
        "1-2ct": { LOW: 130000, MEDIUM: 260000, HIGH: 455000, PREMIUM: 650000 },
      },
      RUBY: {
        "1-3mm": { LOW: 2000, MEDIUM: 5000, HIGH: 15000, PREMIUM: 40000 },
        "3-5mm": { LOW: 5000, MEDIUM: 15000, HIGH: 40000, PREMIUM: 100000 },
        "5-8mm": { LOW: 15000, MEDIUM: 40000, HIGH: 100000, PREMIUM: 300000 },
      },
      SAPPHIRE: {
        "1-3mm": { LOW: 2000, MEDIUM: 5000, HIGH: 15000, PREMIUM: 35000 },
        "3-5mm": { LOW: 5000, MEDIUM: 15000, HIGH: 35000, PREMIUM: 90000 },
        "5-8mm": { LOW: 15000, MEDIUM: 35000, HIGH: 90000, PREMIUM: 250000 },
      },
      EMERALD: {
        "1-3mm": { LOW: 3000, MEDIUM: 8000, HIGH: 20000, PREMIUM: 50000 },
        "3-5mm": { LOW: 8000, MEDIUM: 20000, HIGH: 50000, PREMIUM: 150000 },
        "5-8mm": { LOW: 20000, MEDIUM: 50000, HIGH: 150000, PREMIUM: 400000 },
      },
      MOISSANITE: {
        "1-3mm": { LOW: 1500, MEDIUM: 3000, HIGH: 5000, PREMIUM: 8000 },
        "3-5mm": { LOW: 3000, MEDIUM: 6000, HIGH: 10000, PREMIUM: 15000 },
        "5-8mm": { LOW: 6000, MEDIUM: 12000, HIGH: 20000, PREMIUM: 30000 },
      },
      CZ: {
        "1-3mm": { LOW: 50, MEDIUM: 100, HIGH: 200, PREMIUM: 300 },
        "3-5mm": { LOW: 100, MEDIUM: 200, HIGH: 400, PREMIUM: 600 },
        "5-8mm": { LOW: 200, MEDIUM: 400, HIGH: 800, PREMIUM: 1200 },
      },
    };

    // Build response: for each stone type & size & quality, show system default + shop override
    const rates: any[] = [];
    for (const [stoneType, sizes] of Object.entries(defaultPrices)) {
      for (const [sizeCategory, qualities] of Object.entries(sizes)) {
        for (const [qualityTier, defaultPrice] of Object.entries(qualities)) {
          const origin = stoneType === "DIAMOND_LAB" ? "LAB_GROWN" : "NATURAL";
          const normalizedStone =
            stoneType === "DIAMOND_LAB" ? "DIAMOND" : stoneType;
          const shopRate = shop.gemstoneRates.find(
            (r) =>
              r.stoneType === normalizedStone &&
              r.origin === origin &&
              r.sizeCategory === sizeCategory &&
              r.qualityTier === qualityTier,
          );

          rates.push({
            stoneType: normalizedStone,
            origin,
            sizeCategory,
            qualityTier,
            systemDefault: defaultPrice,
            shopPrice: shopRate?.pricePerStone ?? null,
            effectivePrice: shopRate?.pricePerStone ?? defaultPrice,
            lastUpdatedAt: shopRate?.lastUpdatedAt ?? null,
          });
        }
      }
    }

    return { rates };
  }

  /**
   * Update shop gemstone pricing (set per-stone overrides)
   */
  async updateShopGemstonePricing(
    shopId: string,
    userId: string,
    rates: Array<{
      stoneType: string;
      origin: string;
      sizeCategory: string;
      qualityTier: string;
      pricePerStone: number;
    }>,
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

    // Upsert each gemstone rate
    await Promise.all(
      rates.map((rate) =>
        this.prisma.shopGemstoneRate.upsert({
          where: {
            shopId_stoneType_origin_sizeCategory_qualityTier: {
              shopId,
              stoneType: rate.stoneType,
              origin: rate.origin,
              sizeCategory: rate.sizeCategory,
              qualityTier: rate.qualityTier,
            },
          },
          update: {
            pricePerStone: rate.pricePerStone,
            lastUpdatedAt: new Date(),
          },
          create: {
            shopId,
            stoneType: rate.stoneType,
            origin: rate.origin,
            sizeCategory: rate.sizeCategory,
            qualityTier: rate.qualityTier,
            pricePerStone: rate.pricePerStone,
          },
        }),
      ),
    );

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "UPDATE",
      resourceType: "SHOP_GEMSTONE_RATES",
      resourceId: shopId,
      newValue: { ratesUpdated: rates.length },
    });

    return { success: true, updatedCount: rates.length };
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

  /**
   * Find matching sellers for an RFQ with dynamic pricing
   * Sellers are ranked by: same city first, then by rating/reviews
   * By default, only shows sellers from the same country unless includeInternational is true
   */
  async findMatchingSellers(params: {
    jewelleryType: string;
    buildMethod: string;
    metalType?: string;
    surfaceFinish?: string;
    estimatedWeight: number;
    customerCity?: string;
    customerState?: string;
    customerCountry?: string;
    // Filters
    minRating?: number;
    maxPrice?: number;
    sortBy?: "price" | "rating" | "location" | "popularity";
    page?: number;
    pageSize?: number;
    includeInternational?: boolean; // Default false - only same country sellers
  }) {
    const {
      jewelleryType,
      buildMethod,
      metalType,
      surfaceFinish,
      estimatedWeight,
      customerCity,
      customerState,
      customerCountry = "IN",
      minRating,
      maxPrice,
      sortBy = "location",
      page = 1,
      pageSize = 20,
      includeInternational = false,
    } = params;

    // Debug: Log incoming params
    console.log("[findMatchingSellers] Params:", {
      jewelleryType,
      buildMethod,
      metalType,
      customerCity,
      customerState,
      customerCountry,
    });

    // First, let's see how many shops exist total
    const totalShops = await this.prisma.shop.count();
    const activeShops = await this.prisma.shop.count({
      where: { isActive: true },
    });
    const verifiedShops = await this.prisma.shop.count({
      where: { isVerified: true },
    });
    const activeAndVerified = await this.prisma.shop.count({
      where: { isActive: true, isVerified: true },
    });

    console.log("[findMatchingSellers] Shop counts:", {
      totalShops,
      activeShops,
      verifiedShops,
      activeAndVerified,
    });

    // Build base query for shops that can fulfill this order
    // We use OR conditions to include shops with empty arrays (treat as "supports all")
    const where: any = {
      isActive: true,
      isVerified: true,
      OR: [
        // Shop explicitly supports this jewellery type
        { supportedJewelleryTypes: { has: jewelleryType } },
        // OR shop has empty array (legacy/unset = supports all)
        { supportedJewelleryTypes: { equals: [] } },
      ],
      AND: [
        {
          OR: [
            // Shop explicitly supports this build method
            { supportedMethods: { has: buildMethod } },
            // OR shop has empty array (legacy/unset = supports all)
            { supportedMethods: { equals: [] } },
          ],
        },
      ],
    };

    // If metal type specified, check if shop supports it (or has empty array)
    if (metalType) {
      where.AND.push({
        OR: [
          { supportedMaterials: { has: metalType } },
          { supportedMaterials: { equals: [] } },
        ],
      });
    }

    // By default, only show same-country sellers unless includeInternational is true
    if (!includeInternational && customerCountry) {
      where.AND.push({
        country: {
          equals: customerCountry,
          mode: "insensitive",
        },
      });
    }

    // Debug: Log the where clause and check matching count before material filter
    const withoutMaterialFilter = await this.prisma.shop.count({
      where: {
        isActive: true,
        isVerified: true,
        supportedJewelleryTypes: { has: jewelleryType },
        supportedMethods: { has: buildMethod },
      },
    });
    console.log(
      "[findMatchingSellers] Shops matching jewelleryType+buildMethod:",
      withoutMaterialFilter,
    );
    console.log(
      "[findMatchingSellers] Final where clause:",
      JSON.stringify(where, null, 2),
    );

    // Fetch all matching shops with their pricing and ratings
    const shops = (await this.prisma.shop.findMany({
      where,
      include: {
        metalRates: true,
        finishPricing: true,
        ratings: {
          select: { overall: true },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            ratings: true,
          },
        },
        badges: {
          where: { isActive: true },
          select: { badgeType: true, awardedAt: true },
        },
        performance: {
          select: {
            totalOrders: true,
            successfulOrders: true,
            avgRating: true,
            onTimeDispatchRate: true,
          },
        },
      },
    })) as any[];

    console.log("[findMatchingSellers] Found shops:", shops.length);

    // Calculate price for each shop and enrich data
    const enrichedShops = shops.map((shop) => {
      // Calculate average rating
      const avgRating =
        shop.ratings.length > 0
          ? shop.ratings.reduce((sum: number, r: any) => sum + r.overall, 0) /
            shop.ratings.length
          : 0;

      // Calculate estimated price for this shop
      // Use shop's custom rate if available, otherwise use a default
      const shopMetalRate = shop.metalRates.find(
        (r: any) => r.metalType === metalType,
      );
      const baseRatePerGram = shopMetalRate?.ratePerGramNpr || 8500; // Default gold rate
      const materialCost = baseRatePerGram * estimatedWeight;
      const makingCharge =
        materialCost * ((shop.makingChargePercent || 10) / 100);
      const estimatedPrice = materialCost + makingCharge;

      // Calculate location score (0-3: same city = 3, same state = 2, same country = 1, other = 0)
      let locationScore = 0;
      if (
        customerCity &&
        shop.city?.toLowerCase() === customerCity.toLowerCase()
      ) {
        locationScore = 3;
      } else if (
        customerState &&
        shop.state?.toLowerCase() === customerState.toLowerCase()
      ) {
        locationScore = 2;
      } else if (
        customerCountry &&
        shop.country?.toLowerCase() === customerCountry.toLowerCase()
      ) {
        locationScore = 1;
      }

      return {
        id: shop.id,
        shopName: shop.shopName,
        shopNameNe: shop.shopNameNe,
        city: shop.city,
        state: shop.state,
        country: shop.country,
        address: shop.address,
        contactPhone: shop.contactPhone,
        whatsappNumber: shop.whatsappNumber,
        isVerified: shop.isVerified,
        makingChargePercent: shop.makingChargePercent || 10,
        codEnabled: shop.codEnabled,
        // Seller tier & badges
        sellerTier: shop.sellerTier || "STANDARD",
        badges: shop.badges?.map((b: any) => b.badgeType) || [],
        sellerPerformance: shop.performance
          ? {
              totalOrders: shop.performance.totalOrders,
              successfulOrders: shop.performance.successfulOrders,
              avgRating: shop.performance.avgRating,
              onTimeDispatchRate: shop.performance.onTimeDispatchRate,
            }
          : null,
        // Pricing
        estimatedPrice: Math.round(estimatedPrice),
        materialCost: Math.round(materialCost),
        makingCharge: Math.round(makingCharge),
        hasCustomRate: !!shopMetalRate,
        // Ratings
        averageRating: Math.round(avgRating * 10) / 10,
        reviewCount: shop._count.ratings,
        // Location matching
        locationScore,
        locationMatch:
          locationScore === 3
            ? "same_city"
            : locationScore === 2
              ? "same_state"
              : locationScore === 1
                ? "same_country"
                : "other",
        // Capabilities
        supportedJewelleryTypes: shop.supportedJewelleryTypes,
        supportedMethods: shop.supportedMethods,
        supportedFinishes: shop.supportedFinishes,
      };
    });

    // Apply filters
    let filtered = enrichedShops;

    if (minRating !== undefined) {
      filtered = filtered.filter((s) => s.averageRating >= minRating);
    }

    if (maxPrice !== undefined) {
      filtered = filtered.filter((s) => s.estimatedPrice <= maxPrice);
    }

    // Sort based on sortBy parameter
    switch (sortBy) {
      case "price":
        filtered.sort((a, b) => a.estimatedPrice - b.estimatedPrice);
        break;
      case "rating":
        filtered.sort((a, b) => b.averageRating - a.averageRating);
        break;
      case "popularity":
        filtered.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case "location":
      default:
        // Sort by location score (descending), then by rating (descending)
        filtered.sort((a, b) => {
          if (b.locationScore !== a.locationScore) {
            return b.locationScore - a.locationScore;
          }
          return b.averageRating - a.averageRating;
        });
        break;
    }

    // Paginate
    const total = filtered.length;
    const skip = (page - 1) * pageSize;
    const paginated = filtered.slice(skip, skip + pageSize);

    return {
      sellers: paginated,
      meta: {
        page,
        pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / pageSize),
      },
      stats: {
        totalMatching: total,
        sameCityCount: filtered.filter((s) => s.locationScore === 3).length,
        sameStateCount: filtered.filter((s) => s.locationScore === 2).length,
        avgPrice:
          filtered.length > 0
            ? Math.round(
                filtered.reduce((sum, s) => sum + s.estimatedPrice, 0) /
                  filtered.length,
              )
            : 0,
        minPrice:
          filtered.length > 0
            ? Math.min(...filtered.map((s) => s.estimatedPrice))
            : 0,
        maxPrice:
          filtered.length > 0
            ? Math.max(...filtered.map((s) => s.estimatedPrice))
            : 0,
      },
      // Diagnostics to help understand why no sellers matched
      diagnostics: {
        totalShops,
        activeShops,
        verifiedShops,
        activeAndVerified,
        matchingBeforeCountryFilter: withoutMaterialFilter,
        customerCountry,
        includeInternational,
        filtersApplied: {
          jewelleryType,
          buildMethod,
          metalType: metalType || null,
          minRating: minRating || null,
          maxPrice: maxPrice || null,
        },
      },
    };
  }

  // ── Shop Profile Methods ──────────────────────────────

  /**
   * Update shop profile (about, images, name) with content moderation
   */
  async updateShopProfile(
    userId: string,
    data: {
      about?: string;
      profileImage?: string;
      coverImage?: string;
      shopName?: string;
    },
  ) {
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
      throw new NotFoundException("Shop not found");
    }

    // Moderate about text if provided
    if (data.about !== undefined && data.about.trim().length > 0) {
      const modResult = await this.moderationService.moderateAboutText(
        data.about,
      );
      if (!modResult.safe) {
        throw new BadRequestException({
          message:
            "Your about section contains content that violates our policy",
          violations: modResult.violations,
        });
      }
    }

    const updateData: any = {};
    if (data.about !== undefined) updateData.about = data.about;
    if (data.profileImage !== undefined)
      updateData.profileImage = data.profileImage;
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
    if (data.shopName) updateData.shopName = data.shopName;

    const updated = await this.prisma.shop.update({
      where: { id: shop.id },
      data: updateData,
    });

    return updated;
  }

  // ── Review Management Methods ────────────────────────

  /**
   * Get reviews for a shop (seller dashboard view)
   */
  async getShopReviews(
    shopId: string,
    opts: { page: number; pageSize: number },
  ) {
    if (!shopId) throw new BadRequestException("Shop ID required");

    const [reviews, total] = await Promise.all([
      this.prisma.shopRating.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" },
        skip: (opts.page - 1) * opts.pageSize,
        take: opts.pageSize,
      }),
      this.prisma.shopRating.count({ where: { shopId } }),
    ]);

    // Fetch customer names separately (avoid direct relation since schema doesn't have FK)
    const customerIds = [...new Set(reviews.map((r) => r.customerId))];
    const customers = await this.prisma.user.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const customerMap = new Map(customers.map((c) => [c.id, c]));

    const enrichedReviews = reviews.map((r) => ({
      ...r,
      customer: customerMap.get(r.customerId) || {
        firstName: "Customer",
        lastName: "",
      },
    }));

    return {
      reviews: enrichedReviews,
      meta: {
        page: opts.page,
        pageSize: opts.pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / opts.pageSize),
      },
    };
  }

  /**
   * Reply to a customer review
   */
  async replyToReview(shopId: string, reviewId: string, reply: string) {
    if (!shopId) throw new BadRequestException("Shop ID required");
    if (!reply?.trim()) throw new BadRequestException("Reply cannot be empty");

    const review = await this.prisma.shopRating.findFirst({
      where: { id: reviewId, shopId },
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    // Moderate reply text too
    const modResult = await this.moderationService.moderateAboutText(reply);
    if (!modResult.safe) {
      throw new BadRequestException({
        message: "Your reply contains content that violates our policy",
        violations: modResult.violations,
      });
    }

    return this.prisma.shopRating.update({
      where: { id: reviewId },
      data: {
        sellerReply: reply.trim(),
        sellerRepliedAt: new Date(),
      },
    });
  }

  /**
   * Request admin to delete a review (seller explains why)
   */
  async requestReviewDeletion(
    shopId: string,
    reviewId: string,
    reason: string,
  ) {
    if (!shopId) throw new BadRequestException("Shop ID required");
    if (!reason?.trim() || reason.trim().length < 20) {
      throw new BadRequestException(
        "Please provide a detailed reason (at least 20 characters)",
      );
    }

    const review = await this.prisma.shopRating.findFirst({
      where: { id: reviewId, shopId },
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    if (review.deleteRequested && review.deleteRequestStatus === "PENDING") {
      throw new BadRequestException(
        "A deletion request is already pending for this review",
      );
    }

    return this.prisma.shopRating.update({
      where: { id: reviewId },
      data: {
        deleteRequested: true,
        deleteRequestReason: reason.trim(),
        deleteRequestAt: new Date(),
        deleteRequestStatus: "PENDING",
      },
    });
  }

  /**
   * Admin handles review deletion request (approve/reject)
   */
  async handleReviewDeletionRequest(
    reviewId: string,
    adminId: string,
    action: "APPROVED" | "REJECTED",
  ) {
    const review = await this.prisma.shopRating.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    if (review.deleteRequestStatus !== "PENDING") {
      throw new BadRequestException(
        "No pending deletion request for this review",
      );
    }

    const updateData: any = {
      deleteRequestStatus: action,
      deleteReviewedBy: adminId,
      deleteReviewedAt: new Date(),
    };

    // If approved, hide the review
    if (action === "APPROVED") {
      updateData.isPublic = false;
    }

    return this.prisma.shopRating.update({
      where: { id: reviewId },
      data: updateData,
    });
  }
}
