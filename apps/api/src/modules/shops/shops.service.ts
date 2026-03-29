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
import { SellerSubscriptionsService } from "../subscriptions/seller-subscriptions.service";
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
    private sellerSubscriptionsService: SellerSubscriptionsService,
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

    // Auto-activate FREE subscription plan
    await this.sellerSubscriptionsService.autoActivateFreePlan(
      shop.id,
      dto.country || "NP",
    );

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

    // Auto-activate FREE subscription plan
    await this.sellerSubscriptionsService.autoActivateFreePlan(
      shop.id,
      dto.country || "NP",
    );

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

  /**
   * Get KYC documents for a shop by shop ID (admin use)
   */
  async getShopKycByShopId(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        shopName: true,
        country: true,
        panNumber: true,
        vatNumber: true,
        bisLicenseNumber: true,
        verificationDocuments: true,
        isVerified: true,
        userId: true,
        verificationRequests: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!shop) {
      throw new NotFoundException("Shop not found");
    }

    return shop;
  }

  /**
   * Admin approve or reject shop KYC verification
   */
  async updateShopKycStatus(
    shopId: string,
    adminId: string,
    action: "approve" | "reject",
    reason?: string,
  ) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException("Shop not found");
    }

    const isApproved = action === "approve";

    const updated = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        isVerified: isApproved,
      },
      select: {
        id: true,
        shopName: true,
        isVerified: true,
        country: true,
        panNumber: true,
        vatNumber: true,
        bisLicenseNumber: true,
        verificationDocuments: true,
      },
    });

    const vrStatus = isApproved ? "APPROVED" : "ACTION_REQUIRED";
    const existingVr = await this.prisma.verificationRequest.findFirst({
      where: { shopId, type: "SHOP_KYC" },
      orderBy: { createdAt: "desc" },
    });
    let adminNotePayload = reason ? { adminNote: reason } : { adminNote: null };

    if (existingVr) {
      // Merge with existing details if there
      const existingDetails = (existingVr.details as any) || {};
      const newDetails = { ...existingDetails, adminNote: reason ? reason : null };
      
      await this.prisma.verificationRequest.update({
        where: { id: existingVr.id },
        data: { status: vrStatus, details: newDetails },
      });
    } else {
      await this.prisma.verificationRequest.create({
        data: {
          type: "SHOP_KYC",
          status: vrStatus,
          shopId,
          details: adminNotePayload,
        },
      });
    }

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: isApproved ? "APPROVE" : "REJECT",
      resourceType: "SHOP_KYC",
      resourceId: shopId,
      newValue: { action, reason },
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
   * Get KYC/verification data for a shop
   */
  async getShopKyc(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeShopId: true },
    });

    const shop = await this.prisma.shop.findFirst({
      where: user?.activeShopId
        ? { id: user.activeShopId, userId }
        : { userId },
      select: {
        id: true,
        country: true,
        panNumber: true,
        vatNumber: true,
        bisLicenseNumber: true,
        verificationDocuments: true,
        isVerified: true,
        verificationRequests: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!shop) {
      throw new NotFoundException("Shop not found for this user");
    }

    return shop;
  }

  /**
   * Update KYC/verification documents for a shop
   */
  async updateShopKyc(
    userId: string,
    dto: {
      panNumber?: string;
      vatNumber?: string;
      bisLicenseNumber?: string;
      verificationDocuments?: Record<string, any>;
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
      throw new NotFoundException("Shop not found for this user");
    }

    // Merge new verification documents with existing ones
    const existingDocs =
      (shop.verificationDocuments as Record<string, any>) || {};
    const mergedDocs = dto.verificationDocuments
      ? { ...existingDocs, ...dto.verificationDocuments }
      : existingDocs;

    const previousValue = {
      panNumber: shop.panNumber,
      vatNumber: shop.vatNumber,
      bisLicenseNumber: shop.bisLicenseNumber,
      verificationDocuments: shop.verificationDocuments,
    };

    const updated = await this.prisma.shop.update({
      where: { id: shop.id },
      data: {
        ...(dto.panNumber !== undefined && { panNumber: dto.panNumber }),
        ...(dto.vatNumber !== undefined && { vatNumber: dto.vatNumber }),
        ...(dto.bisLicenseNumber !== undefined && {
          bisLicenseNumber: dto.bisLicenseNumber,
        }),
        verificationDocuments: mergedDocs,
      },
      select: {
        id: true,
        country: true,
        panNumber: true,
        vatNumber: true,
        bisLicenseNumber: true,
        verificationDocuments: true,
        isVerified: true,
      },
    });

    const vrType = "SHOP_KYC";
    const existingVr = await this.prisma.verificationRequest.findFirst({
      where: { shopId: shop.id, type: vrType },
      orderBy: { createdAt: "desc" },
    });
    
    // Automatically set verification mode back to PENDING on new uploads
    if (existingVr) {
      await this.prisma.verificationRequest.update({
        where: { id: existingVr.id },
        data: { status: "PENDING" },
      });
    } else {
      await this.prisma.verificationRequest.create({
        data: {
          type: vrType,
          status: "PENDING",
          shopId: shop.id,
        },
      });
    }

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "UPDATE",
      resourceType: "SHOP_KYC",
      resourceId: shop.id,
      previousValue,
      newValue: dto,
    });

    return updated;
  }

  async remindAdminKyc(userId: string) {
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

    const vrType = "SHOP_KYC";
    const existingVr = await this.prisma.verificationRequest.findFirst({
      where: { shopId: shop.id, type: vrType },
      orderBy: { createdAt: "desc" },
    });

    if (existingVr) {
      const existingDetails = (existingVr.details as any) || {};
      const newDetails = { ...existingDetails, adminNote: null }; // clear rejection note since they are reminding
      
      await this.prisma.verificationRequest.update({
        where: { id: existingVr.id },
        data: { status: "PENDING", details: newDetails },
      });
    } else {
      await this.prisma.verificationRequest.create({
        data: {
          type: vrType,
          status: "PENDING",
          shopId: shop.id,
        },
      });
    }

    return { success: true, message: "Admin has been reminded." };
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
        supportedAlloys: true,
        supportedBaseMetals: true,
        supportedPlatingTypes: true,
      },
    });

    if (!shop) {
      throw new NotFoundException("Shop not found");
    }

    // All available jewellery types (must match RFQ form JEWELLERY_TYPES)
    const allJewelleryTypes = [
      "RING",
      "NECKLACE",
      "BRACELET",
      "BANGLE",
      "EARRING",
      "PENDANT",
      "CHAIN",
      "ANKLET",
      "BROOCH",
      "TIE_PIN",
      "CUFFLINKS",
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

    // Standard alloys (Method B)
    const allAlloys = [
      { code: "GOLD_18K", name: "18K Gold Alloy" },
      { code: "GOLD_14K", name: "14K Gold Alloy" },
      { code: "GOLD_10K", name: "10K Gold Alloy" },
      { code: "STERLING_SILVER_925", name: "Sterling Silver 925" },
    ];

    // Base metals (Method C core / Method D base)
    const allBaseMetals = [
      { code: "BRASS", name: "Brass" },
      { code: "BRONZE", name: "Bronze" },
      { code: "COPPER", name: "Copper" },
      { code: "STAINLESS_STEEL_316L", name: "Stainless Steel 316L" },
      { code: "TITANIUM", name: "Titanium" },
      { code: "TUNGSTEN_CARBIDE", name: "Tungsten Carbide" },
      { code: "COBALT_CHROME", name: "Cobalt Chrome" },
    ];

    // Plating/finish types (Method C finish)
    const allPlatingTypes = [
      { code: "GOLD_PLATING", name: "Gold Plating" },
      { code: "VERMEIL", name: "Vermeil (Gold on Sterling Silver)" },
      { code: "PVD_COATING", name: "PVD Coating" },
      { code: "RHODIUM_PLATING", name: "Rhodium Plating" },
      { code: "OXIDISED_FINISH", name: "Oxidised Finish" },
      { code: "ENAMEL_COATING", name: "Enamel Coating" },
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
      alloys: allAlloys.map((a) => ({
        ...a,
        isSupported: (shop.supportedAlloys || []).includes(a.code),
      })),
      baseMetals: allBaseMetals.map((b) => ({
        ...b,
        isSupported: (shop.supportedBaseMetals || []).includes(b.code),
      })),
      platingTypes: allPlatingTypes.map((p) => ({
        ...p,
        isSupported: (shop.supportedPlatingTypes || []).includes(p.code),
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
      alloys?: string[];
      baseMetals?: string[];
      platingTypes?: string[];
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

    if (dto.alloys) {
      updateData.supportedAlloys = dto.alloys;
    }

    if (dto.baseMetals) {
      updateData.supportedBaseMetals = dto.baseMetals;
    }

    if (dto.platingTypes) {
      updateData.supportedPlatingTypes = dto.platingTypes;
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
   * Debug endpoint: show all shops and why each would or wouldn't match
   */
  async debugMatching(params: {
    jewelleryType: string;
    buildMethod: string;
    metalType?: string;
    customerCountry?: string;
  }) {
    const { jewelleryType, buildMethod, metalType, customerCountry } = params;

    // Get ALL shops (no filters)
    const allShops = await this.prisma.shop.findMany({
      select: {
        id: true,
        shopName: true,
        isActive: true,
        isVerified: true,
        country: true,
        state: true,
        city: true,
        supportedJewelleryTypes: true,
        supportedMethods: true,
        supportedMaterials: true,
        makingChargePercent: true,
        metalRates: {
          select: { metalType: true, ratePerGramNpr: true },
        },
      },
    });

    return {
      requestedFilters: {
        jewelleryType,
        buildMethod,
        metalType,
        customerCountry,
      },
      totalShops: allShops.length,
      shops: allShops.map((shop) => {
        const isActiveOk = shop.isActive === true;
        const isVerifiedOk = shop.isVerified === true;
        const jewelleryTypeOk =
          shop.supportedJewelleryTypes.length === 0 ||
          shop.supportedJewelleryTypes.includes(jewelleryType);
        const buildMethodOk =
          shop.supportedMethods.length === 0 ||
          shop.supportedMethods.includes(buildMethod);
        const MATERIAL_FAMILIES: Record<string, string[]> = {
          GOLD: ["GOLD_24K", "GOLD_22K", "GOLD_18K", "GOLD_14K", "GOLD_10K"],
          SILVER: ["SILVER_999", "SILVER_925"],
          PLATINUM: ["PLATINUM_950", "PLATINUM_PT950", "PLATINUM_PT900"],
          PALLADIUM: ["PALLADIUM_PD950", "PALLADIUM_PD500"],
        };
        const familyVariants = metalType
          ? MATERIAL_FAMILIES[metalType]
          : undefined;
        const materialOk =
          !metalType ||
          shop.supportedMaterials.length === 0 ||
          shop.supportedMaterials.includes(metalType) ||
          (familyVariants
            ? familyVariants.some((v) => shop.supportedMaterials.includes(v))
            : false);
        const countryOk =
          !customerCountry ||
          shop.country?.toLowerCase() === customerCountry.toLowerCase();

        const wouldMatch =
          isActiveOk &&
          isVerifiedOk &&
          jewelleryTypeOk &&
          buildMethodOk &&
          materialOk &&
          countryOk;

        return {
          shopName: shop.shopName,
          id: shop.id,
          wouldMatch,
          checks: {
            isActive: { value: shop.isActive, pass: isActiveOk },
            isVerified: { value: shop.isVerified, pass: isVerifiedOk },
            jewelleryType: {
              shopSupports: shop.supportedJewelleryTypes,
              requested: jewelleryType,
              pass: jewelleryTypeOk,
              reason:
                shop.supportedJewelleryTypes.length === 0
                  ? "empty array = supports all"
                  : jewelleryTypeOk
                    ? "explicitly supported"
                    : `NOT in shop's list`,
            },
            buildMethod: {
              shopSupports: shop.supportedMethods,
              requested: buildMethod,
              pass: buildMethodOk,
              reason:
                shop.supportedMethods.length === 0
                  ? "empty array = supports all"
                  : buildMethodOk
                    ? "explicitly supported"
                    : `NOT in shop's list`,
            },
            material: {
              shopSupports: shop.supportedMaterials,
              requested: metalType || "(none)",
              pass: materialOk,
            },
            country: {
              shopCountry: shop.country,
              customerCountry: customerCountry || "(any)",
              pass: countryOk,
            },
          },
          pricing: {
            makingChargePercent: shop.makingChargePercent,
            metalRates: shop.metalRates,
          },
          location: {
            country: shop.country,
            state: shop.state,
            city: shop.city,
          },
        };
      }),
    };
  }

  /**
   * Find matching sellers for an RFQ with dynamic pricing.
   * Uses SOFT MATCHING: sellers from customer's location always show,
   * with feature-based scoring to rank them (material, method, alloy, etc.).
   * Sellers matching everything rank highest; missing features lower rank.
   */
  async findMatchingSellers(params: {
    jewelleryType: string;
    buildMethod: string;
    metalType?: string;
    alloyType?: string;
    baseMetal?: string;
    platingType?: string;
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
    includeInternational?: boolean;
    gemstoneCost?: number;
    gemstones?: Array<{
      stoneType: string;
      sizeValue: string;
      sizeUnit: string;
      count: number;
      qualityTier: string;
      settingStyle?: string;
    }>;
    gemstoneCostFallback?: number;
  }) {
    const {
      jewelleryType,
      buildMethod,
      metalType,
      alloyType,
      baseMetal,
      platingType,
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
      gemstoneCost = 0,
      gemstones = [],
      gemstoneCostFallback = 0,
    } = params;

    console.log("[findMatchingSellers] Params:", {
      jewelleryType,
      buildMethod,
      metalType,
      alloyType,
      baseMetal,
      platingType,
      customerCity,
      customerState,
      customerCountry,
    });

    // ── Material family expansion map ──
    const MATERIAL_FAMILIES: Record<string, string[]> = {
      GOLD: ["GOLD_24K", "GOLD_22K", "GOLD_18K", "GOLD_14K", "GOLD_10K"],
      SILVER: ["SILVER_999", "SILVER_925"],
      PLATINUM: ["PLATINUM_950", "PLATINUM_PT950", "PLATINUM_PT900"],
      PALLADIUM: ["PALLADIUM_PD950", "PALLADIUM_PD500"],
    };

    // ── Step 1: Fetch ALL active & verified shops (no feature filtering) ──
    const where: any = {
      isActive: true,
      isVerified: true,
    };

    // Country filter: only same country unless includeInternational
    if (!includeInternational && customerCountry) {
      where.country = { equals: customerCountry, mode: "insensitive" };
    }

    const totalShops = await this.prisma.shop.count();
    const activeAndVerified = await this.prisma.shop.count({
      where: { isActive: true, isVerified: true },
    });

    const shops = (await this.prisma.shop.findMany({
      where,
      include: {
        metalRates: true,
        finishPricing: true,
        gemstoneRates: true,
        priceOverrides: {
          where: { isActive: true },
          select: { overrideType: true, itemCode: true, overrideValue: true },
        },
        ratings: { select: { overall: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { ratings: true } },
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

    console.log(
      "[findMatchingSellers] Fetched shops (active+verified+country):",
      shops.length,
    );

    // ── Fetch market rate for the requested metal from MarketRate table ──
    // MarketRate table is synced daily with live rates by MarketRatesService
    // Resolve the correct metalCode for market rate lookup based on build method:
    //   METHOD_A: metalType is already full code (e.g., "GOLD_22K")
    //   METHOD_B: metalType is base metal (e.g., "GOLD"), alloyType is full code (e.g., "GOLD_18K")
    //   METHOD_C: no precious metal — use baseMetal for component cost only
    //   METHOD_D: metalType should be full code, but handle bare purity (e.g., "22K" → "GOLD_22K")
    let targetMetal: string;
    if (buildMethod === "METHOD_B" && alloyType) {
      targetMetal = alloyType; // e.g., "GOLD_18K"
    } else if (metalType) {
      // Handle bare purity codes like "22K" → "GOLD_22K"
      if (/^\d+K$/i.test(metalType)) {
        targetMetal = `GOLD_${metalType.toUpperCase()}`;
      } else {
        targetMetal = metalType;
      }
    } else if (buildMethod === "METHOD_C") {
      // Method C: base metal + plating, no precious metal market rate needed
      targetMetal = "";
    } else {
      targetMetal = "GOLD_24K";
    }
    const rateCountry = (customerCountry || "IN").toUpperCase();
    let marketRatePerGram = 0;
    if (targetMetal) {
      const marketRate = await this.prisma.marketRate.findFirst({
        where: {
          metalCode: targetMetal,
          country: rateCountry,
          validUntil: null,
        },
        orderBy: { validFrom: "desc" },
      });
      marketRatePerGram = marketRate?.ratePerGram || 0;
      if (!marketRatePerGram) {
        // Fallback: try any country
        const fallbackRate = await this.prisma.marketRate.findFirst({
          where: { metalCode: targetMetal, validUntil: null },
          orderBy: { validFrom: "desc" },
        });
        marketRatePerGram = fallbackRate?.ratePerGram || 8500;
      }
    }
    console.log(
      `[findMatchingSellers] Market rate for ${targetMetal || "N/A (Method C)"} (${rateCountry}): ${marketRatePerGram}/g`,
    );

    // ── Step 2: Score each shop on feature matching ──
    const enrichedShops = shops.map((shop) => {
      // --- Feature scoring (each check: 0 or weight) ---
      const unsupportedFeatures: string[] = [];
      let featureScore = 0;
      const maxFeatureScore = 5; // total possible points

      // 2a. Jewellery type match (1 point)
      const jewelleryTypeOk =
        shop.supportedJewelleryTypes.length === 0 ||
        shop.supportedJewelleryTypes.includes(jewelleryType);
      if (jewelleryTypeOk) {
        featureScore += 1;
      } else {
        unsupportedFeatures.push(`jewelleryType:${jewelleryType}`);
      }

      // 2b. Build method match (1 point)
      const buildMethodOk =
        shop.supportedMethods.length === 0 ||
        shop.supportedMethods.includes(buildMethod);
      if (buildMethodOk) {
        featureScore += 1;
      } else {
        unsupportedFeatures.push(`buildMethod:${buildMethod}`);
      }

      // 2c. Material match (1 point) — expand base metals to family
      let materialOk = true;
      if (metalType) {
        const familyVariants = MATERIAL_FAMILIES[metalType];
        if (familyVariants) {
          materialOk =
            shop.supportedMaterials.length === 0 ||
            familyVariants.some((v: string) =>
              shop.supportedMaterials.includes(v),
            );
        } else {
          materialOk =
            shop.supportedMaterials.length === 0 ||
            shop.supportedMaterials.includes(metalType);
        }
      }
      if (materialOk) {
        featureScore += 1;
      } else {
        unsupportedFeatures.push(`material:${metalType}`);
      }

      // 2d. Alloy match for Method B (1 point)
      let alloyOk = true;
      if (alloyType && buildMethod === "METHOD_B") {
        alloyOk =
          (shop.supportedAlloys || []).length === 0 ||
          (shop.supportedAlloys || []).includes(alloyType);
        if (!alloyOk) {
          unsupportedFeatures.push(`alloy:${alloyType}`);
        }
      }
      if (alloyOk) featureScore += 0.5;

      // 2e. Base metal match for Method C/D (0.5 point)
      let baseMetalOk = true;
      if (
        baseMetal &&
        (buildMethod === "METHOD_C" || buildMethod === "METHOD_D")
      ) {
        baseMetalOk =
          (shop.supportedBaseMetals || []).length === 0 ||
          (shop.supportedBaseMetals || []).includes(baseMetal);
        if (!baseMetalOk) {
          unsupportedFeatures.push(`baseMetal:${baseMetal}`);
        }
      }
      if (baseMetalOk) featureScore += 0.5;

      // 2f. Plating type match for Method C (0.5 point)
      let platingOk = true;
      if (platingType && buildMethod === "METHOD_C") {
        platingOk =
          (shop.supportedPlatingTypes || []).length === 0 ||
          (shop.supportedPlatingTypes || []).includes(platingType);
        if (!platingOk) {
          unsupportedFeatures.push(`platingType:${platingType}`);
        }
      }
      if (platingOk) featureScore += 0.5;

      const isFullMatch = unsupportedFeatures.length === 0;

      // --- Price calculation ---
      // materialCost = live market rate × weight (this is the metal value)
      // makingCharge = shop's making charge (flat per-gram from ratePerGramNpr, or % of metal cost)
      const avgRating =
        shop.ratings.length > 0
          ? shop.ratings.reduce((sum: number, r: any) => sum + r.overall, 0) /
            shop.ratings.length
          : 0;

      // Use resolved targetMetal (e.g., "GOLD_18K") for shop rate lookup
      // so it matches the same code stored in ShopMetalRate.metalType
      const shopMetalRate = shop.metalRates.find(
        (r: any) => r.metalType === targetMetal,
      );
      // Material cost is based on MARKET rate, not shop's custom rate
      const materialCost = marketRatePerGram * estimatedWeight;
      // Shop's ratePerGramNpr is the making charge per gram (flat rate)
      // If shop has a flat making charge set, use it; otherwise calculate from percentage
      const makingCharge = shopMetalRate?.ratePerGramNpr
        ? shopMetalRate.ratePerGramNpr * estimatedWeight
        : materialCost * ((shop.makingChargePercent || 10) / 100);

      // --- Component costs from shop price overrides ---
      const overrides = (shop as any).priceOverrides || [];
      const overrideMap: Record<string, Record<string, number>> = {};
      for (const o of overrides) {
        if (!overrideMap[o.overrideType]) overrideMap[o.overrideType] = {};
        overrideMap[o.overrideType][o.itemCode] = o.overrideValue;
      }

      // System default finish prices (NPR per piece)
      const SYSTEM_FINISH_DEFAULTS: Record<string, number> = {
        POLISHED: 25,
        HIGH_POLISH: 25,
        MATTE: 30,
        SATIN: 30,
        BRUSHED: 35,
        OXIDISED_FINISH: 35,
        ANTIQUE: 40,
        SANDBLASTED: 45,
        BARK_TEXTURE: 45,
        HAMMERED: 50,
        FLORENTINE: 55,
        TWO_TONE: 60,
        ENGRAVED: 65,
        DIAMOND_CUT: 70,
        RHODIUM_PLATED: 80,
      };

      // Finish cost: shop override → system default
      let finishCost = 0;
      if (surfaceFinish) {
        finishCost =
          overrideMap["FINISH"]?.[surfaceFinish] ||
          SYSTEM_FINISH_DEFAULTS[surfaceFinish] ||
          0;
      }

      // Base metal cost (Method C): shop override → system defaults
      let baseMetalCost = 0;
      if (baseMetal && buildMethod === "METHOD_C") {
        const SYSTEM_BM_RATES: Record<string, number> = {
          BRASS: 1.5,
          COPPER: 2.0,
          BRONZE: 1.8,
          STAINLESS_STEEL_316L: 3.5,
          STAINLESS_STEEL_304: 3.0,
          TITANIUM: 8.0,
          NICKEL_SILVER: 2.5,
          PEWTER: 2.0,
        };
        const bmRate =
          overrideMap["BASE_METAL"]?.[baseMetal] ||
          SYSTEM_BM_RATES[baseMetal] ||
          0;
        baseMetalCost = bmRate * estimatedWeight;
      }

      // Plating cost (Method C): shop override → system defaults
      let platingCost = 0;
      if (platingType && buildMethod === "METHOD_C") {
        const SYSTEM_PLATING_RATES: Record<string, number> = {
          GOLD_PLATED: 45,
          GOLD_FILLED: 120,
          VERMEIL: 80,
          ROSE_GOLD_PLATED: 50,
          RHODIUM_PLATED: 40,
          PVD_GOLD: 75,
          PVD_ROSE: 75,
          PVD_BLACK: 65,
          SILVER_PLATED: 25,
          RUTHENIUM_PLATED: 55,
        };
        platingCost =
          overrideMap["PLATING"]?.[platingType] ||
          SYSTEM_PLATING_RATES[platingType] ||
          0;
      }

      // Gemstone cost: compute per-seller from ShopGemstoneRate → system defaults → fallback
      let sellerGemstoneCost = 0;
      if (gemstones && gemstones.length > 0) {
        // System default gemstone prices per stone (NPR)
        const SYSTEM_GEM_DEFAULTS: Record<
          string,
          Record<string, Record<string, number>>
        > = {
          DIAMOND: {
            "0.1-0.25ct": {
              LOW: 8000,
              MEDIUM: 15000,
              HIGH: 25000,
              PREMIUM: 30000,
            },
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
            "0.1-0.25ct": {
              LOW: 5200,
              MEDIUM: 9750,
              HIGH: 16250,
              PREMIUM: 19500,
            },
            "0.25-0.5ct": {
              LOW: 16250,
              MEDIUM: 32500,
              HIGH: 52000,
              PREMIUM: 65000,
            },
            "0.5-1ct": {
              LOW: 52000,
              MEDIUM: 97500,
              HIGH: 162500,
              PREMIUM: 227500,
            },
          },
          RUBY: {
            "1-3mm": { LOW: 2000, MEDIUM: 5000, HIGH: 15000, PREMIUM: 40000 },
            "3-5mm": { LOW: 5000, MEDIUM: 15000, HIGH: 40000, PREMIUM: 100000 },
            "5-8mm": {
              LOW: 15000,
              MEDIUM: 40000,
              HIGH: 100000,
              PREMIUM: 300000,
            },
          },
          SAPPHIRE: {
            "1-3mm": { LOW: 2000, MEDIUM: 5000, HIGH: 15000, PREMIUM: 35000 },
            "3-5mm": { LOW: 5000, MEDIUM: 15000, HIGH: 35000, PREMIUM: 90000 },
            "5-8mm": {
              LOW: 15000,
              MEDIUM: 35000,
              HIGH: 90000,
              PREMIUM: 250000,
            },
          },
          EMERALD: {
            "1-3mm": { LOW: 3000, MEDIUM: 8000, HIGH: 20000, PREMIUM: 50000 },
            "3-5mm": { LOW: 8000, MEDIUM: 20000, HIGH: 50000, PREMIUM: 150000 },
            "5-8mm": {
              LOW: 20000,
              MEDIUM: 50000,
              HIGH: 150000,
              PREMIUM: 400000,
            },
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
          PEARL: {
            "3-5mm": { LOW: 200, MEDIUM: 500, HIGH: 1200, PREMIUM: 3000 },
            "5-8mm": { LOW: 500, MEDIUM: 1200, HIGH: 3000, PREMIUM: 8000 },
          },
          SEMI_PRECIOUS: {
            "1-3mm": { LOW: 50, MEDIUM: 100, HIGH: 250, PREMIUM: 600 },
            "3-5mm": { LOW: 100, MEDIUM: 250, HIGH: 600, PREMIUM: 1500 },
            "5-8mm": { LOW: 250, MEDIUM: 600, HIGH: 1500, PREMIUM: 3000 },
          },
        };

        // Setting cost per stone (NPR)
        const SETTING_COSTS: Record<string, number> = {
          PRONG: 150,
          BEZEL: 250,
          PAVE: 100,
          CHANNEL: 180,
          HALO: 350,
          FLUSH: 200,
          TENSION: 400,
        };

        // Helper: map mm size to size category
        const getSizeCategory = (sizeMm: number, stoneType: string): string => {
          if (stoneType.includes("DIAMOND") && !stoneType.includes("LAB")) {
            // Diamonds use carat ranges; approximate: 1ct ≈ 6.5mm
            const caratApprox = Math.pow(sizeMm / 6.5, 3);
            if (caratApprox < 0.25) return "0.1-0.25ct";
            if (caratApprox < 0.5) return "0.25-0.5ct";
            if (caratApprox < 1) return "0.5-1ct";
            return "1-2ct";
          }
          if (stoneType === "DIAMOND_LAB") {
            const caratApprox = Math.pow(sizeMm / 6.5, 3);
            if (caratApprox < 0.25) return "0.1-0.25ct";
            if (caratApprox < 0.5) return "0.25-0.5ct";
            return "0.5-1ct";
          }
          // MM-based stones
          if (sizeMm <= 3) return "1-3mm";
          if (sizeMm <= 5) return "3-5mm";
          return "5-8mm";
        };

        for (const gem of gemstones) {
          const sizeMm = parseFloat(gem.sizeValue) || 3;
          const stoneType = gem.stoneType.toUpperCase();
          const quality = (gem.qualityTier || "MEDIUM").toUpperCase();
          const sizeCategory = getSizeCategory(sizeMm, stoneType);
          const count = gem.count || 1;

          // 1. Try shop-specific gemstone rate
          const shopGemRate = (shop as any).gemstoneRates?.find(
            (r: any) =>
              r.stoneType === stoneType &&
              r.sizeCategory === sizeCategory &&
              r.qualityTier === quality,
          );

          let pricePerStone = 0;
          if (shopGemRate) {
            pricePerStone = shopGemRate.pricePerStone;
          } else {
            // 2. Fall back to system default
            pricePerStone =
              SYSTEM_GEM_DEFAULTS[stoneType]?.[sizeCategory]?.[quality] || 0;
          }

          sellerGemstoneCost += pricePerStone * count;

          // Add setting cost
          const settingStyle = (gem.settingStyle || "PRONG").toUpperCase();
          sellerGemstoneCost += (SETTING_COSTS[settingStyle] || 150) * count;
        }
      } else if (gemstoneCost > 0) {
        // Legacy: use flat gemstoneCost passed from frontend
        sellerGemstoneCost = gemstoneCost;
      } else if (gemstoneCostFallback > 0) {
        // Frontend live-estimate fallback
        sellerGemstoneCost = gemstoneCostFallback;
      }

      const componentCost =
        finishCost + baseMetalCost + platingCost + sellerGemstoneCost;
      const estimatedPrice = materialCost + makingCharge + componentCost;

      // --- Location score ---
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
        userId: shop.user?.id || null,
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
        estimatedPrice: Math.round(estimatedPrice),
        materialCost: Math.round(materialCost),
        makingCharge: Math.round(makingCharge),
        finishCost: Math.round(finishCost),
        baseMetalCost: Math.round(baseMetalCost),
        platingCost: Math.round(platingCost),
        gemstoneCost: Math.round(sellerGemstoneCost),
        componentCost: Math.round(componentCost),
        hasCustomRate: !!shopMetalRate,
        averageRating: Math.round(avgRating * 10) / 10,
        reviewCount: shop._count.ratings,
        locationScore,
        locationMatch:
          locationScore === 3
            ? "same_city"
            : locationScore === 2
              ? "same_state"
              : locationScore === 1
                ? "same_country"
                : "other",
        supportedJewelleryTypes: shop.supportedJewelleryTypes,
        supportedMethods: shop.supportedMethods,
        supportedFinishes: shop.supportedFinishes,
        // Soft matching info
        featureScore: Math.round(featureScore * 10) / 10,
        maxFeatureScore,
        isFullMatch,
        unsupportedFeatures,
        matchLabel: isFullMatch
          ? "Full Match"
          : unsupportedFeatures.length <= 2
            ? "Partial Match"
            : "Ask Seller",
      };
    });

    // ── Step 2.5: Deduplicate by userId (same seller may have multiple shops) ──
    // Keep the shop with the highest feature score per user
    const seenUserIds = new Map<string, number>();
    const deduped = enrichedShops.filter((s, idx) => {
      const uid = s.userId;
      if (!uid) return true; // no user info, keep
      const prev = seenUserIds.get(uid);
      if (prev === undefined) {
        seenUserIds.set(uid, idx);
        return true;
      }
      // Keep the one with higher feature score
      if (s.featureScore > enrichedShops[prev].featureScore) {
        seenUserIds.set(uid, idx);
        return true;
      }
      return false;
    });

    // ── Step 3: Apply hard filters (rating, price) ──
    let filtered = deduped;
    if (minRating !== undefined) {
      filtered = filtered.filter((s) => s.averageRating >= minRating);
    }
    if (maxPrice !== undefined) {
      filtered = filtered.filter((s) => s.estimatedPrice <= maxPrice);
    }

    // ── Step 4: Sort by combined score ──
    // Primary: featureScore (desc) + locationScore (desc)
    // Then secondary sort within
    const combinedSort = (list: typeof filtered): typeof filtered => {
      const copy = [...list];
      copy.sort((a, b) => {
        // 1. Full match first, partial second, ask-seller last
        const matchOrder = (b.isFullMatch ? 10 : 0) - (a.isFullMatch ? 10 : 0);
        if (matchOrder !== 0) return matchOrder;

        // 2. Feature score (higher = better)
        const featureDiff = b.featureScore - a.featureScore;
        if (Math.abs(featureDiff) > 0.1) return featureDiff;

        // 3. Location score (higher = closer)
        const locDiff = b.locationScore - a.locationScore;
        if (locDiff !== 0) return locDiff;

        // 4. Secondary sort
        switch (sortBy) {
          case "price":
            return a.estimatedPrice - b.estimatedPrice;
          case "rating":
            return b.averageRating - a.averageRating;
          case "popularity":
            return b.reviewCount - a.reviewCount;
          default:
            return b.averageRating - a.averageRating;
        }
      });
      return copy;
    };

    const sortedAll = combinedSort(filtered);

    // Group by match quality for frontend sections
    const fullMatchSellers = sortedAll.filter((s) => s.isFullMatch);
    const partialMatchSellers = sortedAll.filter(
      (s) => !s.isFullMatch && s.unsupportedFeatures.length <= 2,
    );
    const askSellerList = sortedAll.filter(
      (s) => !s.isFullMatch && s.unsupportedFeatures.length > 2,
    );

    // Also group by location for backwards compatibility
    const sameCitySellers = sortedAll.filter((s) => s.locationScore === 3);
    const sameStateSellers = sortedAll.filter((s) => s.locationScore === 2);
    const sameCountrySellers = sortedAll.filter((s) => s.locationScore === 1);
    const otherSellers = sortedAll.filter((s) => s.locationScore === 0);

    // Paginate
    const total = sortedAll.length;
    const skip = (page - 1) * pageSize;
    const paginated = sortedAll.slice(skip, skip + pageSize);

    return {
      sellers: paginated,
      groups: {
        nearYou: {
          label: customerCity ? `In ${customerCity}` : "Near You",
          count: sameCitySellers.length,
          sellerIds: sameCitySellers.map((s) => s.id),
        },
        sameState: {
          label: customerState ? `In ${customerState}` : "Same State",
          count: sameStateSellers.length,
          sellerIds: sameStateSellers.map((s) => s.id),
        },
        sameCountry: {
          label: customerCountry ? `In ${customerCountry}` : "Same Country",
          count: sameCountrySellers.length,
          sellerIds: sameCountrySellers.map((s) => s.id),
        },
        international: {
          label: "International",
          count: otherSellers.length,
          sellerIds: otherSellers.map((s) => s.id),
        },
      },
      matchGroups: {
        fullMatch: {
          label: "Full Match",
          count: fullMatchSellers.length,
          sellerIds: fullMatchSellers.map((s) => s.id),
        },
        partialMatch: {
          label: "Partial Match — some features may not be listed",
          count: partialMatchSellers.length,
          sellerIds: partialMatchSellers.map((s) => s.id),
        },
        askSeller: {
          label: "Ask Seller — contact to confirm capabilities",
          count: askSellerList.length,
          sellerIds: askSellerList.map((s) => s.id),
        },
      },
      meta: {
        page,
        pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / pageSize),
      },
      stats: {
        totalMatching: total,
        fullMatchCount: fullMatchSellers.length,
        partialMatchCount: partialMatchSellers.length,
        askSellerCount: askSellerList.length,
        sameCityCount: sameCitySellers.length,
        sameStateCount: sameStateSellers.length,
        sameCountryCount: sameCountrySellers.length,
        internationalCount: otherSellers.length,
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
      diagnostics: {
        totalShops,
        activeAndVerified,
        fetchedForScoring: shops.length,
        customerCountry,
        customerState: customerState || null,
        customerCity: customerCity || null,
        includeInternational,
        filtersApplied: {
          jewelleryType,
          buildMethod,
          metalType: metalType || null,
          alloyType: alloyType || null,
          baseMetal: baseMetal || null,
          platingType: platingType || null,
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

  // ═══════════════════════════════════════════════════════════════
  // COMPONENT PRICING (base metals, plating, finishes)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get shop component pricing overrides for base metals, plating, and finishes.
   * Returns a structured object with prices keyed by item code.
   */
  async getShopComponentPricing(shopId: string) {
    const overrides = await this.prisma.shopPriceOverride.findMany({
      where: {
        shopId,
        overrideType: { in: ["BASE_METAL", "PLATING", "FINISH"] },
        isActive: true,
      },
    });

    const baseMetalPrices: Record<string, number> = {};
    const platingPrices: Record<string, number> = {};
    const finishPrices: Record<string, number> = {};

    for (const o of overrides) {
      if (o.overrideType === "BASE_METAL") {
        baseMetalPrices[o.itemCode] = o.overrideValue;
      } else if (o.overrideType === "PLATING") {
        platingPrices[o.itemCode] = o.overrideValue;
      } else if (o.overrideType === "FINISH") {
        finishPrices[o.itemCode] = o.overrideValue;
      }
    }

    return { baseMetalPrices, platingPrices, finishPrices };
  }

  /**
   * Upsert shop component pricing overrides.
   */
  async updateShopComponentPricing(
    shopId: string,
    userId: string,
    dto: {
      baseMetalPrices?: Record<string, number>;
      platingPrices?: Record<string, number>;
      finishPrices?: Record<string, number>;
    },
  ) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop || shop.userId !== userId) {
      throw new ForbiddenException("Not authorized");
    }

    const upserts: Promise<any>[] = [];

    const upsertPrice = (
      overrideType: string,
      itemCode: string,
      value: number,
    ) => {
      upserts.push(
        this.prisma.shopPriceOverride.upsert({
          where: {
            shopId_overrideType_itemCode: { shopId, overrideType, itemCode },
          },
          create: {
            shopId,
            overrideType,
            itemCode,
            overrideMode: "FIXED",
            overrideValue: value,
            isActive: true,
          },
          update: {
            overrideValue: value,
            isActive: true,
          },
        }),
      );
    };

    if (dto.baseMetalPrices) {
      for (const [code, price] of Object.entries(dto.baseMetalPrices)) {
        upsertPrice("BASE_METAL", code, price);
      }
    }
    if (dto.platingPrices) {
      for (const [code, price] of Object.entries(dto.platingPrices)) {
        upsertPrice("PLATING", code, price);
      }
    }
    if (dto.finishPrices) {
      for (const [code, price] of Object.entries(dto.finishPrices)) {
        upsertPrice("FINISH", code, price);
      }
    }

    await Promise.all(upserts);

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "UPDATE",
      resourceType: "SHOP_COMPONENT_PRICING",
      resourceId: shopId,
      newValue: dto,
    });

    return { success: true, ...dto };
  }
}
