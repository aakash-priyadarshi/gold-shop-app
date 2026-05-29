import { randomUUID } from "crypto";
import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Logger,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import axios from "axios";
import * as bcrypt from "bcryptjs";
import { RedisService } from "../../common/redis";
import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { EmailTemplateService } from "../mail/email-template.service";
import { EMAIL_SENDERS, MailService } from "../mail/mail.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SellerEngagementService } from "../seller-performance/seller-engagement.service";

@ApiTags("admin")
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private mailService: MailService,
    private emailTemplateService: EmailTemplateService,
    private sellerEngagement: SellerEngagementService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  // ═══════════════════════════════════════
  // VERIFICATION REQUESTS
  // ═══════════════════════════════════════

  @Get("verifications")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "List all verification requests" })
  async getVerifications(@Query("status") status?: string) {
    const requests = await this.prisma.verificationRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        shop: {
          select: {
            id: true,
            shopName: true,
            city: true,
            contactPhone: true,
            contactEmail: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    const pending = requests.filter((r) => r.status === "PENDING").length;
    return { requests, pendingCount: pending };
  }

  @Patch("verifications/:id/approve")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Approve a verification request" })
  async approveVerification(
    @Param("id") id: string,
    @CurrentUser("id") _adminId: string,
  ) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id },
      include: { shop: true, user: true },
    });

    if (!request) {
      return { error: "Verification request not found" };
    }

    await this.prisma.verificationRequest.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    // Update the shop or user as verified
    if (request.type === "SHOP" && request.shopId) {
      await this.prisma.shop.update({
        where: { id: request.shopId },
        data: { isVerified: true },
      });

      // Notify shop owner
      if (request.shop?.userId) {
        await this.notificationsService.create({
          userId: request.shop.userId,
          type: "SYSTEM_ALERT",
          titleKey: "notification.shop_verified.title",
          bodyKey: "notification.shop_verified.body",
          channels: ["EMAIL", "PUSH"],
        });
      }
    } else if (request.type === "USER" && request.userId) {
      await this.prisma.user.update({
        where: { id: request.userId },
        data: { status: "ACTIVE" },
      });
    }

    return { success: true, message: "Verification approved" };
  }

  @Patch("verifications/:id/reject")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Reject a verification request" })
  async rejectVerification(
    @Param("id") id: string,
    @Body("reason") reason: string,
  ) {
    await this.prisma.verificationRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        details: { rejectionReason: reason },
      },
    });

    return { success: true, message: "Verification rejected" };
  }

  // ═══════════════════════════════════════
  // REPORTS
  // ═══════════════════════════════════════

  @Get("reports")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "List all user reports" })
  async getReports(@Query("status") status?: string) {
    const reports = await this.prisma.report.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        reported: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    return { reports };
  }

  @Patch("reports/:id/resolve")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Resolve a report" })
  async resolveReport(
    @Param("id") id: string,
    @Body("resolution") resolution: string,
  ) {
    await this.prisma.report.update({
      where: { id },
      data: {
        status: "RESOLVED",
        details: { resolution },
      },
    });
    return { success: true };
  }

  // ═══════════════════════════════════════
  // USER MANAGEMENT
  // ═══════════════════════════════════════

  @Post("users")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Create a new user" })
  async createUser(
    @Body()
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      phone?: string;
    },
  ) {
    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        phone: data.phone,
        status: "ACTIVE",
      },
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  // ═══════════════════════════════════════
  // SHOP MANAGEMENT
  // ═══════════════════════════════════════

  @Post("shops")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Create a new shop with owner" })
  async createShop(
    @Body()
    data: {
      ownerEmail: string;
      ownerPassword: string;
      ownerFirstName: string;
      ownerLastName: string;
      ownerPhone?: string;
      shopName: string;
      city: string;
      address: string;
      contactPhone: string;
      contactEmail?: string;
      country?: string;
    },
  ) {
    const passwordHash = await bcrypt.hash(data.ownerPassword, 10);

    // Create user and shop in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.ownerEmail,
          passwordHash,
          firstName: data.ownerFirstName,
          lastName: data.ownerLastName,
          phone: data.ownerPhone,
          role: "SHOPKEEPER",
          status: "ACTIVE",
        },
      });

      const shop = await tx.shop.create({
        data: {
          userId: user.id,
          shopName: data.shopName,
          city: data.city,
          address: data.address,
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail,
          country: data.country || "NP",
          isVerified: true, // Admin created = auto verified
        },
      });

      return { user, shop };
    });

    return {
      success: true,
      shop: {
        id: result.shop.id,
        shopName: result.shop.shopName,
        owner: `${result.user.firstName} ${result.user.lastName}`,
      },
    };
  }

  @Post("users/:userId/shops")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Create a new shop for an existing user" })
  async createShopForUser(
    @Param("userId") userId: string,
    @CurrentUser("id") adminId: string,
    @Body()
    data: {
      shopName: string;
      city: string;
      address: string;
      contactPhone: string;
      contactEmail?: string;
      country?: string;
      state?: string;
      pincode?: string;
      isVerified?: boolean;
    },
  ) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Update user role to SHOPKEEPER if they're a CUSTOMER
    if (user.role === "CUSTOMER") {
      await this.prisma.user.update({
        where: { id: userId },
        data: { role: "SHOPKEEPER" },
      });
    }

    // Create the shop
    const shop = await this.prisma.shop.create({
      data: {
        userId,
        shopName: data.shopName,
        city: data.city,
        address: data.address,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        country: data.country || "NP",
        state: data.state,
        pincode: data.pincode,
        isVerified: data.isVerified ?? true, // Admin created = verified by default
      },
    });

    // Set as active shop if user doesn't have one
    if (!user.activeShopId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { activeShopId: shop.id },
      });
    }

    // Log audit
    this.logger.log(
      `Admin ${adminId} created shop ${shop.id} for user ${userId}`,
    );

    return {
      success: true,
      shop: {
        id: shop.id,
        shopName: shop.shopName,
        city: shop.city,
        country: shop.country,
        isVerified: shop.isVerified,
      },
    };
  }

  @Delete("users/:userId/shops/:shopId")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Delete a shop from a user" })
  async deleteUserShop(
    @Param("userId") userId: string,
    @Param("shopId") shopId: string,
    @CurrentUser("id") adminId: string,
  ) {
    // Check if shop exists and belongs to user
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId },
    });

    if (!shop) {
      return {
        success: false,
        error: "Shop not found or does not belong to this user",
      };
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

      // Clear active shop if this was the active one
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (user?.activeShopId === shopId) {
        // Find another shop for this user
        const otherShop = await tx.shop.findFirst({ where: { userId } });
        await tx.user.update({
          where: { id: userId },
          data: { activeShopId: otherShop?.id || null },
        });
      }
    });

    this.logger.log(
      `Admin ${adminId} deleted shop ${shopId} from user ${userId}`,
    );

    return { success: true, message: "Shop deleted successfully" };
  }

  // ═══════════════════════════════════════
  // PLATFORM SETTINGS
  // ═══════════════════════════════════════

  @Get("settings")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get platform settings" })
  async getSettings() {
    const configs = await this.prisma.systemConfig.findMany();
    const settingsMap: Record<string, any> = {};
    configs.forEach((c) => {
      settingsMap[c.key] = c.value;
    });
    return { settings: settingsMap };
  }

  @Patch("settings")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update platform settings" })
  async updateSettings(
    @Body() data: Record<string, any>,
    @CurrentUser("id") adminId: string,
  ) {
    for (const [key, value] of Object.entries(data)) {
      await this.prisma.systemConfig.upsert({
        where: { key },
        update: { value, updatedBy: adminId },
        create: { key, value, updatedBy: adminId },
      });
    }
    return { success: true };
  }

  @Post("settings/refresh-rates")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Trigger market rate refresh" })
  @HttpCode(HttpStatus.OK)
  async refreshMarketRates() {
    // This would trigger a job to refresh market rates
    // For now, just return success
    return { success: true, message: "Market rate refresh triggered" };
  }

  @Post("settings/clear-cache")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Clear platform cache" })
  @HttpCode(HttpStatus.OK)
  async clearCache() {
    // TODO: Integrate with Redis to clear cache
    return { success: true, message: "Cache cleared" };
  }

  // ═══════════════════════════════════════
  // SYSTEM NOTIFICATIONS
  // ═══════════════════════════════════════

  @Post("notifications/broadcast")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Send system notification to all users" })
  async broadcastNotification(
    @Body()
    data: {
      title: string;
      message: string;
      type: string;
      targetRoles?: string[];
    },
    @CurrentUser("id") adminId: string,
  ) {
    await this.prisma.systemNotification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type,
        targetRoles: data.targetRoles || [],
        createdBy: adminId,
      },
    });

    return { success: true, message: "Notification broadcasted" };
  }

  @Get("notifications/system")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get system notifications" })
  async getSystemNotifications() {
    const notifications = await this.prisma.systemNotification.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { notifications };
  }

  // ═══════════════════════════════════════
  // EMAIL SETTINGS
  // ═══════════════════════════════════════

  @Post("email/test")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Send a test email to verify SMTP configuration" })
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(
    @Body() data: { email: string },
    @CurrentUser("id") adminId: string,
  ) {
    if (!data.email) {
      return { success: false, error: "Email address is required" };
    }

    this.logger.log(`Sending test email to ${data.email} by admin ${adminId}`);

    const result = await this.mailService.send({
      to: data.email,
      subject: "✅ Orivraa Test Email - SMTP Configuration Working",
      template: "test-email",
      context: {
        testTime: new Date().toISOString(),
        adminId,
      },
      allowAdminLinks: true,
    });

    if (result.success) {
      this.logger.log(`Test email sent successfully: ${result.messageId}`);
      return {
        success: true,
        message: "Test email sent successfully",
        messageId: result.messageId,
      };
    } else {
      this.logger.error(`Test email failed: ${result.error}`);
      return {
        success: false,
        error: result.error || "Failed to send test email",
      };
    }
  }

  @Patch("email/admin-address")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update admin email address" })
  async updateAdminEmail(
    @Body() data: { email: string; currentPassword: string },
    @CurrentUser("id") adminId: string,
  ) {
    if (!data.email || !data.currentPassword) {
      return {
        success: false,
        error: "Email and current password are required",
      };
    }

    // Verify current admin password
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      return { success: false, error: "Admin user not found" };
    }

    const isPasswordValid = await bcrypt.compare(
      data.currentPassword,
      admin.passwordHash,
    );
    if (!isPasswordValid) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Check if email is already in use
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser && existingUser.id !== adminId) {
      return {
        success: false,
        error: "Email is already in use by another user",
      };
    }

    // Update the admin email
    await this.prisma.user.update({
      where: { id: adminId },
      data: { email: data.email },
    });

    this.logger.log(`Admin email updated to ${data.email} by ${adminId}`);

    return {
      success: true,
      message: "Admin email updated successfully",
      newEmail: data.email,
    };
  }

  @Get("email/status")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get email configuration status" })
  async getEmailStatus() {
    const providerInfo = this.mailService.getProviderInfo();

    return {
      configured: providerInfo.configured,
      provider: providerInfo.provider,
      sender: providerInfo.sender,
    };
  }

  // ═══════════════════════════════════════
  // DASHBOARD STATS
  // ═══════════════════════════════════════

  @Get("stats")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get dashboard statistics" })
  async getDashboardStats() {
    const [
      totalUsers,
      totalShops,
      totalOrders,
      pendingVerifications,
      openReports,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.shop.count(),
      this.prisma.order.count(),
      this.prisma.verificationRequest.count({ where: { status: "PENDING" } }),
      this.prisma.report.count({ where: { status: "OPEN" } }),
    ]);

    return {
      totalUsers,
      totalShops,
      totalOrders,
      pendingVerifications,
      openReports,
    };
  }

  @Get("dashboard")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      "Comprehensive admin dashboard data: totals with period-over-period trends, revenue, and per-country breakdown",
  })
  async getDashboard(@Query("range") range?: string) {
    const validRange = (["today", "week", "month", "year"] as const).includes(
      range as "today" | "week" | "month" | "year",
    )
      ? (range as "today" | "week" | "month" | "year")
      : "month";

    // Rolling windows so the current period can be compared against the
    // immediately-preceding period of the same length (true trend %).
    const windowDays: Record<typeof validRange, number> = {
      today: 1,
      week: 7,
      month: 30,
      year: 365,
    };
    const windowMs = windowDays[validRange] * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const currentStart = new Date(now - windowMs);
    const previousStart = new Date(now - 2 * windowMs);

    // Orders that should NOT count as realised revenue.
    const nonRevenueStatuses = ["CANCELLED", "REFUNDED", "EXPIRED"] as const;

    const [
      totalUsers,
      totalShops,
      totalOrders,
      pendingShops,
      usersCurrent,
      usersPrevious,
      shopsCurrent,
      shopsPrevious,
      ordersCurrent,
      ordersPrevious,
      revenueCurrentAgg,
      revenuePreviousAgg,
      shopsByCountry,
      ordersByCountry,
      usersByCountry,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.shop.count(),
      this.prisma.order.count(),
      this.prisma.shop.count({ where: { isVerified: false } }),
      this.prisma.user.count({ where: { createdAt: { gte: currentStart } } }),
      this.prisma.user.count({
        where: { createdAt: { gte: previousStart, lt: currentStart } },
      }),
      this.prisma.shop.count({ where: { createdAt: { gte: currentStart } } }),
      this.prisma.shop.count({
        where: { createdAt: { gte: previousStart, lt: currentStart } },
      }),
      this.prisma.order.count({ where: { createdAt: { gte: currentStart } } }),
      this.prisma.order.count({
        where: { createdAt: { gte: previousStart, lt: currentStart } },
      }),
      this.prisma.order.aggregate({
        _sum: { totalNpr: true },
        where: {
          createdAt: { gte: currentStart },
          status: { notIn: [...nonRevenueStatuses] },
        },
      }),
      this.prisma.order.aggregate({
        _sum: { totalNpr: true },
        where: {
          createdAt: { gte: previousStart, lt: currentStart },
          status: { notIn: [...nonRevenueStatuses] },
        },
      }),
      this.prisma.shop.groupBy({ by: ["country"], _count: { _all: true } }),
      this.prisma.order.groupBy({
        by: ["marketCountry"],
        _count: { _all: true },
        _sum: { totalNpr: true },
        where: { status: { notIn: [...nonRevenueStatuses] } },
      }),
      this.prisma.user.groupBy({
        by: ["preferredCountry"],
        _count: { _all: true },
      }),
    ]);

    const revenueCurrent = revenueCurrentAgg._sum.totalNpr ?? 0;
    const revenuePrevious = revenuePreviousAgg._sum.totalNpr ?? 0;

    // Period-over-period trend. When there is no prior baseline, treat any
    // positive current value as +100% growth and zero as neutral.
    const trend = (current: number, previous: number) => {
      if (previous <= 0) {
        return {
          changePct: current > 0 ? 100 : 0,
          changeType: (current > 0 ? "positive" : "neutral") as
            | "positive"
            | "negative"
            | "neutral",
        };
      }
      const pct = ((current - previous) / previous) * 100;
      return {
        changePct: Math.round(pct * 10) / 10,
        changeType: (pct > 0 ? "positive" : pct < 0 ? "negative" : "neutral") as
          | "positive"
          | "negative"
          | "neutral",
      };
    };

    // Merge the three group-by results into a single per-country breakdown.
    type CountryRow = {
      country: string;
      users: number;
      shops: number;
      orders: number;
      revenueNpr: number;
    };
    const countryMap = new Map<string, CountryRow>();
    const ensure = (code: string): CountryRow => {
      const key = (code || "NP").toUpperCase();
      let row = countryMap.get(key);
      if (!row) {
        row = { country: key, users: 0, shops: 0, orders: 0, revenueNpr: 0 };
        countryMap.set(key, row);
      }
      return row;
    };

    for (const s of shopsByCountry) {
      ensure(s.country).shops += s._count._all;
    }
    for (const o of ordersByCountry) {
      const row = ensure(o.marketCountry);
      row.orders += o._count._all;
      row.revenueNpr += o._sum.totalNpr ?? 0;
    }
    for (const u of usersByCountry) {
      ensure(u.preferredCountry).users += u._count._all;
    }

    const countries = Array.from(countryMap.values())
      .filter((c) => c.shops > 0 || c.users > 0 || c.orders > 0)
      .sort((a, b) => b.revenueNpr - a.revenueNpr || b.shops - a.shops);

    return {
      range: validRange,
      totals: {
        users: {
          value: totalUsers,
          periodNew: usersCurrent,
          ...trend(usersCurrent, usersPrevious),
        },
        shops: {
          value: totalShops,
          periodNew: shopsCurrent,
          ...trend(shopsCurrent, shopsPrevious),
        },
        orders: {
          value: totalOrders,
          periodNew: ordersCurrent,
          ...trend(ordersCurrent, ordersPrevious),
        },
        pendingShops: {
          value: pendingShops,
        },
        revenueNpr: {
          value: revenueCurrent,
          ...trend(revenueCurrent, revenuePrevious),
        },
      },
      countries,
    };
  }


  // ═══════════════════════════════════════
  // USER SEARCH (for compose / messaging)
  // ═══════════════════════════════════════

  @Get("users/search")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Search all users by name or email (for compose)" })
  async searchUsers(@Query("q") q?: string) {
    if (!q || q.trim().length < 2) return { users: [] };
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
      take: 10,
      orderBy: { firstName: "asc" },
    });
    return { users };
  }

  // ═══════════════════════════════════════
  // CUSTOMER CRM (Admin-level, cross-shop)
  // ═══════════════════════════════════════

  @Get("customers")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "List all customers (registered + walk-in) across all shops",
  })
  async listCustomers(
    @Query("query") query?: string,
    @Query("type") type?: string, // 'all' | 'registered' | 'walkin'
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || "1") || 1);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || "25") || 25));
    const skip = (pageNum - 1) * limitNum;

    // Fast Redis cache for suggestions (when querying small text)
    const cacheKey = `admin:customers:search:${query || ""}:${type || "all"}:${pageNum}:${limitNum}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Registered customers (CUSTOMER role users)
    let registeredCustomers: any[] = [];
    let registeredTotal = 0;
    if (type !== "walkin") {
      const regWhere: any = { role: "CUSTOMER" };
      if (query) {
        regWhere.OR = [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
        ];
      }
      [registeredCustomers, registeredTotal] = await Promise.all([
        this.prisma.user.findMany({
          where: regWhere,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            preferredCountry: true,
            preferredCity: true,
            createdAt: true,
            lastLoginAt: true,
            _count: { select: { customerOrders: true, rfqRequests: true } },
            purchaseStats: { orderBy: { totalSpent: "desc" }, take: 1 },
            webSessions: {
              select: { lastActive: true },
              orderBy: { lastActive: "desc" },
              take: 1,
            },
          },
          orderBy: { createdAt: "desc" },
          skip: type === "registered" ? skip : skip,
          take: type === "registered" ? limitNum : Math.ceil(limitNum / 2),
        }),
        this.prisma.user.count({ where: regWhere }),
      ]);
    }

    // Walk-in customers
    let walkInCustomers: any[] = [];
    let walkInTotal = 0;
    if (type !== "registered") {
      const wiWhere: any = {};
      if (query) {
        wiWhere.OR = [
          { name: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ];
      }
      [walkInCustomers, walkInTotal] = await Promise.all([
        this.prisma.walkInCustomer.findMany({
          where: wiWhere,
          include: {
            createdByShop: { select: { id: true, shopName: true, city: true } },
            _count: { select: { shopQuotes: true } },
          },
          orderBy: { updatedAt: "desc" },
          skip: type === "walkin" ? skip : Math.max(0, skip - registeredTotal),
          take:
            type === "walkin"
              ? limitNum
              : Math.max(0, limitNum - registeredCustomers.length),
        }),
        this.prisma.walkInCustomer.count({ where: wiWhere }),
      ]);
    }

    const allCustomers = [
      ...registeredCustomers.map((c) => {
        const latestSession = (c.webSessions as any[])?.[0] ?? null;
        const isOnlineNow = latestSession
          ? (latestSession.lastActive as Date) >= fiveMinutesAgo
          : false;
        return {
          id: c.id,
          type: "REGISTERED" as const,
          name: `${c.firstName} ${c.lastName}`.trim(),
          email: c.email,
          phone: c.phone,
          country: c.preferredCountry,
          city: c.preferredCity,
          shop: null,
          orderCount: c._count.customerOrders,
          rfqCount: c._count.rfqRequests,
          quoteCount: 0,
          totalSpent: c.purchaseStats[0]?.totalSpent || 0,
          isOnlineNow,
          lastActive: (latestSession?.lastActive ?? c.lastLoginAt ?? c.createdAt) as any,
          createdAt: c.createdAt,
        };
      }),
      ...walkInCustomers.map((w) => ({
        id: w.id,
        type: "WALK_IN" as const,
        name: w.name,
        email: w.email,
        phone: w.phone,
        country: w.country,
        city: w.city,
        shop: w.createdByShop
          ? {
              id: w.createdByShop.id,
              name: w.createdByShop.shopName,
              city: w.createdByShop.city,
            }
          : null,
        orderCount: 0,
        rfqCount: 0,
        quoteCount: w._count.shopQuotes,
        totalSpent: 0,
        lastActive: w.updatedAt,
        createdAt: w.createdAt,
      })),
    ];

    const totalAll = registeredTotal + walkInTotal;
    const result = {
      customers: allCustomers,
      total: totalAll,
      registeredTotal,
      walkInTotal,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalAll / limitNum),
    };

    // Cache the search result for 15 minutes to allow blazing fast profile suggestions as admins type
    await this.redisService.set(cacheKey, JSON.stringify(result), 900);

    return result;
  }

  @Get("customers/:id")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get customer profile (registered or walk-in)" })
  async getCustomerProfile(@Param("id") id: string) {
    // Try registered user first
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        preferredCurrency: true,
        preferredCountry: true,
        preferredCity: true,
        createdAt: true,
        lastLoginAt: true,
        status: true,
        deliveryAddresses: true,
        purchaseStats: true,
        _count: { select: { customerOrders: true, rfqRequests: true } },
        customerOrders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalNpr: true,
            createdAt: true,
            shop: { select: { shopName: true } },
          },
        },
        rfqRequests: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            jewelleryType: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (user) {
      return {
        type: "REGISTERED",
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        status: user.status,
        country: user.preferredCountry,
        city: user.preferredCity,
        currency: user.preferredCurrency,
        addresses: user.deliveryAddresses,
        purchaseStats: user.purchaseStats,
        orderCount: user._count.customerOrders,
        rfqCount: user._count.rfqRequests,
        recentOrders: user.customerOrders,
        recentRfqs: user.rfqRequests,
        lastActive: user.lastLoginAt,
        memberSince: user.createdAt,
      };
    }

    // Try walk-in customer
    const walkIn = await this.prisma.walkInCustomer.findUnique({
      where: { id },
      include: {
        createdByShop: { select: { id: true, shopName: true, city: true } },
        shopQuotes: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            quoteNumber: true,
            jewelleryType: true,
            totalPriceNpr: true,
            status: true,
            createdAt: true,
          },
        },
        _count: { select: { shopQuotes: true } },
      },
    });

    if (walkIn) {
      return {
        type: "WALK_IN",
        id: walkIn.id,
        name: walkIn.name,
        email: walkIn.email,
        phone: walkIn.phone,
        country: walkIn.country,
        city: walkIn.city,
        address: walkIn.address,
        shop: walkIn.createdByShop,
        quoteCount: walkIn._count.shopQuotes,
        recentQuotes: walkIn.shopQuotes,
        notes: walkIn.notes,
        lastActive: walkIn.updatedAt,
        memberSince: walkIn.createdAt,
      };
    }

    return null;
  }

  @Post("customers/:id/notes")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Add a note to a customer" })
  async addCustomerNote(
    @Param("id") customerId: string,
    @CurrentUser("id") adminId: string,
    @Body() body: { note: string; category?: string },
  ) {
    // Admin notes have no shopId (null) — they are platform-level
    return this.prisma.customerNote.create({
      data: {
        customerId,
        authorId: adminId,
        note: body.note,
        category: body.category || "GENERAL",
      },
      include: { author: { select: { firstName: true, lastName: true } } },
    });
  }

  @Get("customers/:id/notes")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get all notes for a customer" })
  async getCustomerNotes(@Param("id") customerId: string) {
    return this.prisma.customerNote.findMany({
      where: { customerId },
      include: { author: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  // ═══════════════════════════════════════
  // SELLER CRM
  // ═══════════════════════════════════════

  @Get("sellers")
  @Roles(UserRole.ADMIN, UserRole.SALES)
  @ApiOperation({ summary: "List all sellers with engagement data" })
  async getSellerDirectory(
    @Query("search") search?: string,
    @Query("tier") tier?: string,
    @Query("status") status?: string,
    @Query("sortBy") sortBy?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.sellerEngagement.getSellerDirectory({
      search,
      tier,
      status,
      sortBy,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get("sellers/stats")
  @Roles(UserRole.ADMIN, UserRole.SALES)
  @ApiOperation({ summary: "Get seller CRM stats" })
  async getSellerCrmStats() {
    return this.sellerEngagement.getSellerCrmStats();
  }

  @Get("sellers/export")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get seller data for CSV export" })
  async getSellerExport() {
    return this.sellerEngagement.getExportData();
  }

  @Get("sellers/:shopId")
  @Roles(UserRole.ADMIN, UserRole.SALES)
  @ApiOperation({
    summary: "Get detailed seller profile with all engagement data",
  })
  async getSellerProfile(@Param("shopId") shopId: string) {
    return this.sellerEngagement.getSellerProfile(shopId);
  }

  @Patch("sellers/:shopId")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Update seller shop fields (isOnHold, isActive, etc.)",
  })
  async updateSeller(
    @Param("shopId") shopId: string,
    @Body() body: Record<string, any>,
  ) {
    const allowedFields = ["isOnHold", "isActive", "isVerified", "sellerTier"];
    const data: Record<string, any> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    // When removing hold, also clear holdReason
    if (body.isOnHold === false) {
      data.holdReason = null;
    }

    const updatedShop = await this.prisma.shop.update({
      where: { id: shopId },
      data,
      select: {
        id: true,
        userId: true,
        shopName: true,
        isOnHold: true,
        isActive: true,
        isVerified: true,
      },
    });

    // ── Sync User.status when isOnHold changes ──
    // Removing hold → also reactivate the user account + unlock conversations
    // Putting on hold → also suspend the user account
    if (body.isOnHold === false && updatedShop.userId) {
      try {
        await this.prisma.user.update({
          where: { id: updatedShop.userId },
          data: { status: "ACTIVE" },
        });
        // Unlock any locked conversations for this shop owner
        await this.prisma.conversation.updateMany({
          where: {
            OR: [
              { buyerId: updatedShop.userId },
              { shop: { userId: updatedShop.userId } },
            ],
            status: "LOCKED",
          },
          data: { status: "ACTIVE" },
        });
        this.logger.log(
          `Shop ${shopId} unhold: User ${updatedShop.userId} reactivated, conversations unlocked`,
        );
      } catch (e) {
        this.logger.error(
          `Failed to sync user status on unhold for shop ${shopId}: ${e}`,
        );
      }
    } else if (body.isOnHold === true && updatedShop.userId) {
      try {
        await this.prisma.user.update({
          where: { id: updatedShop.userId },
          data: { status: "SUSPENDED" },
        });
        this.logger.log(
          `Shop ${shopId} put on hold: User ${updatedShop.userId} suspended`,
        );
      } catch (e) {
        this.logger.error(
          `Failed to sync user status on hold for shop ${shopId}: ${e}`,
        );
      }
    }

    return updatedShop;
  }

  @Get("sellers/:shopId/health-score")
  @Roles(UserRole.ADMIN, UserRole.SALES)
  @ApiOperation({ summary: "Get seller health score" })
  async getSellerHealthScore(@Param("shopId") shopId: string) {
    return this.sellerEngagement.calculateHealthScore(shopId);
  }

  @Get("sellers/:shopId/onboarding")
  @Roles(UserRole.ADMIN, UserRole.SALES)
  @ApiOperation({ summary: "Get seller onboarding progress" })
  async getSellerOnboarding(@Param("shopId") shopId: string) {
    return this.sellerEngagement.getOnboardingProgress(shopId);
  }

  @Get("sellers/:shopId/milestones")
  @Roles(UserRole.ADMIN, UserRole.SALES)
  @ApiOperation({ summary: "Get seller milestones" })
  async getSellerMilestones(@Param("shopId") shopId: string) {
    return this.sellerEngagement.getMilestones(shopId);
  }

  @Get("sellers/:shopId/rfq-funnel")
  @Roles(UserRole.ADMIN, UserRole.SALES)
  @ApiOperation({ summary: "Get seller RFQ funnel" })
  async getSellerRfqFunnel(
    @Param("shopId") shopId: string,
    @Query("days") days?: string,
  ) {
    return this.sellerEngagement.getRfqFunnel(
      shopId,
      days ? parseInt(days) : 90,
    );
  }

  @Post("sellers/:shopId/notes")
  @Roles(UserRole.ADMIN, UserRole.SALES)
  @ApiOperation({ summary: "Add a note to a seller" })
  async addSellerNote(
    @Param("shopId") shopId: string,
    @CurrentUser("id") adminId: string,
    @Body() body: { note: string; category?: string },
  ) {
    return this.sellerEngagement.addSellerNote(
      shopId,
      adminId,
      body.note,
      body.category,
    );
  }

  @Get("sellers/:shopId/notes")
  @Roles(UserRole.ADMIN, UserRole.SALES)
  @ApiOperation({ summary: "Get all notes for a seller" })
  async getSellerNotes(@Param("shopId") shopId: string) {
    return this.sellerEngagement.getSellerNotes(shopId);
  }

  // ═══════════════════════════════════════
  // SYSTEM HEALTH & MONITORING
  // ═══════════════════════════════════════

  @Get("health/apis")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Check health of all connected APIs" })
  @HttpCode(HttpStatus.OK)
  async checkApisHealth() {
    const results: Record<string, any> = {};
    
    // Check Database - use Prisma direct query
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      results.database = {
        status: "up",
        latency: Date.now() - start,
        type: "PostgreSQL (Prisma)",
        message: "Connection successful",
      };
    } catch (error: any) {
      this.logger.error("Database health check failed:", error);
      results.database = {
        status: "down",
        type: "PostgreSQL (Prisma)",
        message: error?.message || "Connection failed",
        error: true,
      };
    }

    // Check Twilio SMS API
    const twilioStatus = await this.checkTwilioHealth();
    results.twilio = twilioStatus;

    // Check Email Service (Mail configuration)
    const emailStatus = this.mailService.getProviderInfo();
    results.email = {
      status: emailStatus.configured ? "up" : "not-configured",
      provider: emailStatus.provider,
      sender: emailStatus.sender,
      message: emailStatus.configured ? "Email service ready" : "Email service not configured",
    };

    // Determine overall status
    const hasErrors = Object.values(results).some((r: any) => r.status === "down" || r.error);
    
    return {
      overallStatus: hasErrors ? "degraded" : "healthy",
      timestamp: new Date().toISOString(),
      checks: results,
    };
  }

  @Post("health/test-sms")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Send a test SMS via Twilio to verify SMS configuration" })
  @HttpCode(HttpStatus.OK)
  async testTwilioSms(
    @Body() data: { phoneNumber: string },
    @CurrentUser("id") adminId: string,
  ) {
    if (!data.phoneNumber) {
      return { success: false, error: "Phone number is required" };
    }

    // Normalize phone number
    const normalizedPhone = this.normalizePhoneNumber(data.phoneNumber);

    // Check Twilio configuration
    const accountSid = this.configService.get<string>("TWILIO_ACCOUNT_SID");
    const authToken = this.configService.get<string>("TWILIO_AUTH_TOKEN");
    const fromNumber = this.configService.get<string>("TWILIO_PHONE_NUMBER");
    const messagingServiceSid = this.configService.get<string>("TWILIO_MESSAGING_SERVICE_SID");

    if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
      return {
        success: false,
        error: "Twilio SMS is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and either TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID.",
      };
    }

    const testMessage = `🟢 Orivraa Admin Test - SMS Gateway Working! [${new Date().toISOString()}]`;

    try {
      const payload = new URLSearchParams({
        To: normalizedPhone,
        Body: testMessage,
      });

      if (messagingServiceSid) {
        payload.append("MessagingServiceSid", messagingServiceSid);
      } else if (fromNumber) {
        payload.append("From", fromNumber);
      }

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        payload,
        {
          auth: {
            username: accountSid,
            password: authToken,
          },
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 15000,
        },
      );

      this.logger.log(
        `Admin ${adminId} sent test SMS to ${this.maskPhoneNumber(normalizedPhone)} - SID: ${response.data?.sid}`,
      );

      return {
        success: true,
        message: "Test SMS sent successfully",
        messageSid: response.data?.sid,
        sentTo: this.maskPhoneNumber(normalizedPhone),
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.message ||
        "Unknown Twilio error";

      this.logger.error(`Failed to send test SMS: ${errorMessage}`);

      return {
        success: false,
        error: `Failed to send test SMS: ${errorMessage}`,
        details: error?.response?.data,
      };
    }
  }

  // Helper method to check Twilio API health
  private async checkTwilioHealth(): Promise<any> {
    const accountSid = this.configService.get<string>("TWILIO_ACCOUNT_SID");
    const authToken = this.configService.get<string>("TWILIO_AUTH_TOKEN");

    if (!accountSid || !authToken) {
      return {
        status: "not-configured",
        message: "Twilio credentials not configured",
        service: "Twilio SMS API",
      };
    }

    try {
      const start = Date.now();
      
      // Try to verify account by making a simple API call
      const response = await axios.get(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`,
        {
          auth: {
            username: accountSid,
            password: authToken,
          },
          timeout: 10000,
        },
      );

      return {
        status: "up",
        latency: Date.now() - start,
        service: "Twilio SMS API",
        accountStatus: response.data?.status,
        message: "Twilio API accessible",
      };
    } catch (error: any) {
      this.logger.error("Twilio health check failed:", error?.message);
      return {
        status: "down",
        service: "Twilio SMS API",
        message: error?.response?.data?.message || error?.message || "API check failed",
        error: true,
      };
    }
  }

  // Helper method to normalize phone number
  private normalizePhoneNumber(phone: string): string {
    const normalized = (phone || "").trim().replace(/[\s\-()]/g, "");

    if (!normalized) {
      throw new BadRequestException("Phone number is required.");
    }

    if (!/^\+[1-9]\d{6,14}$/.test(normalized)) {
      throw new BadRequestException(
        "Please enter a valid phone number in international format (for example: +9779812345678).",
      );
    }

    return normalized;
  }

  // Helper method to mask phone number for logging
  private maskPhoneNumber(phone: string): string {
    return `***${phone.slice(-4)}`;
  }

  // ═══════════════════════════════════════
  // MESSAGING & EMAILS
  // ═══════════════════════════════════════

  @Get("emails")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get email interaction history" })
  async getEmailLogs(
    @Query("limit") limit?: string,
    @Query("page") page?: string,
    @Query("type") type?: string,      // 'manual' | 'automated' | 'all'
    @Query("direction") direction?: string, // 'OUTBOUND' | 'INBOUND' | 'all'
  ) {
    const limitNum = Math.min(200, Math.max(1, parseInt(limit || "50", 10) || 50));
    const pageNum = Math.max(1, parseInt(page || "1", 10) || 1);
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, any> = {};
    if (type === "manual") {
      where.adminId = { not: null };
    } else if (type === "automated") {
      where.adminId = null;
    }
    if (direction && direction.toLowerCase() !== "all") {
      where.direction = direction.toUpperCase();
    }

    const [emails, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return { emails, total, page: pageNum, limit: limitNum };
  }

  @Get("email/triggers")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get email trigger and template inventory" })
  async getEmailTriggers() {
    const defaultNoReply = `Orivraa <${EMAIL_SENDERS.NO_REPLY}>`;
    const ordersSender = `Orivraa Orders <${EMAIL_SENDERS.ORDERS}>`;
    const adminSender = `Orivraa Admin <${EMAIL_SENDERS.ADMIN}>`;
    const supportSender = `Orivraa Support <${EMAIL_SENDERS.SUPPORT}>`;

    const triggers = [
      {
        key: "manual_user_message",
        name: "Manual support message",
        audience: "Selected customer, seller, or user",
        trigger: "Admin sends a manual message from CRM, user detail, or email reply views",
        backend: "POST /admin/messages/send",
        template: "support-message",
        sender: supportSender,
        replyTo: EMAIL_SENDERS.SUPPORT,
        variables: ["title", "recipientName", "message", "sentAt", "appName", "appUrl", "supportEmail", "year"],
        editable: true,
        notes: "Customer-safe template with no admin dashboard links.",
      },
      {
        key: "email_verification_otp",
        name: "Email verification code",
        audience: "User verifying their email address",
        trigger: "User requests or resends email verification OTP",
        backend: "OtpService.sendEmailOtp",
        template: "otp",
        sender: defaultNoReply,
        replyTo: null,
        variables: ["name", "otp", "expiresIn", "appName", "appUrl", "supportEmail", "year"],
        editable: false,
        notes: "Transactional security email.",
      },
      {
        key: "password_reset_otp",
        name: "Password reset code",
        audience: "User resetting their password",
        trigger: "User requests password reset OTP",
        backend: "OtpService.sendEmailOtp",
        template: "password-reset-otp",
        sender: defaultNoReply,
        replyTo: null,
        variables: ["name", "otp", "expiresIn", "appName", "appUrl", "supportEmail", "year"],
        editable: false,
        notes: "Transactional security email.",
      },
      {
        key: "customer_welcome",
        name: "Customer welcome",
        audience: "New customer account",
        trigger: "Customer account registration or OAuth first sign-in",
        backend: "AuthService.sendWelcome",
        template: "welcome",
        sender: defaultNoReply,
        replyTo: null,
        variables: ["name", "appName", "appUrl", "supportEmail", "year"],
        editable: false,
        notes: "Sent after customer onboarding.",
      },
      {
        key: "shopkeeper_welcome",
        name: "Shopkeeper welcome",
        audience: "New seller/shopkeeper account",
        trigger: "Shopkeeper account registration or OAuth first sign-in",
        backend: "AuthService.sendShopkeeperWelcome",
        template: "welcome-shopkeeper",
        sender: defaultNoReply,
        replyTo: null,
        variables: ["name", "appName", "appUrl", "supportEmail", "year"],
        editable: false,
        notes: "Points sellers to the shop dashboard.",
      },
      {
        key: "order_confirmation",
        name: "Order confirmation",
        audience: "Customer who placed an order",
        trigger: "Order is created successfully",
        backend: "OrdersService.createOrder",
        template: "order-confirmation",
        sender: ordersSender,
        replyTo: null,
        variables: ["customerName", "orderNumber", "items", "subtotal", "shipping", "tax", "total", "currency", "shippingAddress", "shopName"],
        editable: false,
        notes: "Transactional order receipt.",
      },
      {
        key: "order_status_update",
        name: "Order status update",
        audience: "Customer with an active order",
        trigger: "Order status, shipping, or delivery helper is called",
        backend: "MailService order helpers",
        template: "order-status / order-shipped / order-delivered",
        sender: ordersSender,
        replyTo: null,
        variables: ["customerName", "orderNumber", "status", "trackingNumber", "trackingUrl", "carrier", "estimatedDelivery", "shopName"],
        editable: false,
        notes: "Uses a more specific template for shipped and delivered events.",
      },
      {
        key: "seller_new_order",
        name: "Seller new order notification",
        audience: "Shop owner",
        trigger: "New order is placed in the seller's shop",
        backend: "OrdersService.createOrder",
        template: "seller-new-order",
        sender: ordersSender,
        replyTo: null,
        variables: ["shopOwnerName", "orderNumber", "customerName", "items", "total", "currency", "dashboardUrl"],
        editable: false,
        notes: "Seller-facing order alert.",
      },
      {
        key: "seller_new_rfq",
        name: "Seller new RFQ notification",
        audience: "Shop owner",
        trigger: "New quote request is created for a seller",
        backend: "MailService.sendNewRfqNotification",
        template: "seller-new-rfq",
        sender: defaultNoReply,
        replyTo: null,
        variables: ["shopOwnerName", "rfqNumber", "customerName", "itemDescription", "material", "weight", "dashboardUrl"],
        editable: false,
        notes: "Seller-facing quote request alert.",
      },
      {
        key: "shop_quote_tracking_link",
        name: "Shop quote tracking link",
        audience: "Walk-in quote customer",
        trigger: "Shop sends tracking link by email from shop quote tools",
        backend: "ShopQuotesService.sendTrackingLink",
        template: "tracking-link",
        sender: ordersSender,
        replyTo: null,
        variables: ["customerName", "quoteNumber", "shopName", "jewelleryType", "estimatedDays", "trackingUrl"],
        editable: false,
        notes: "Sent only when the shop chooses email delivery.",
      },
      {
        key: "shop_verification_status",
        name: "Shop verification status",
        audience: "Shop owner",
        trigger: "Admin approves or rejects shop verification",
        backend: "MailService.sendShopVerificationStatus",
        template: "shop-verification",
        sender: adminSender,
        replyTo: null,
        variables: ["shopOwnerName", "shopName", "status", "reason", "dashboardUrl"],
        editable: false,
        notes: "Admin-originated seller account status email.",
      },
      {
        key: "commission_reminder",
        name: "Commission payment reminder",
        audience: "Shop owner",
        trigger: "Commission reminder helper is called",
        backend: "MailService.sendCommissionReminder",
        template: "commission-reminder",
        sender: adminSender,
        replyTo: null,
        variables: ["shopOwnerName", "shopName", "pendingAmount", "currency", "dueDate", "paymentUrl"],
        editable: false,
        notes: "Finance/admin-originated reminder.",
      },
      {
        key: "system_admin_alert",
        name: "Internal admin alert",
        audience: "Admins only",
        trigger: "Backup, AI description, or system health service sends an admin alert",
        backend: "MailService.sendAdminAlert",
        template: "admin-alert",
        sender: `Orivraa System <${EMAIL_SENDERS.ADMIN}>`,
        replyTo: null,
        variables: ["alertType", "title", "message", "details", "actionUrl", "actionText", "now"],
        editable: false,
        notes: "Only internal/admin emails may contain admin dashboard links.",
      },
      {
        key: "contact_form",
        name: "Website inquiry",
        audience: "Sales inbox",
        trigger: "Visitor submits contact form",
        backend: "ContactController",
        template: "contact-form",
        sender: defaultNoReply,
        replyTo: "Visitor email address",
        variables: ["name", "email", "phone", "company", "interest", "message", "source"],
        editable: false,
        notes: "Reply-to is the visitor's submitted email.",
      },
    ];

    return {
      triggers,
      total: triggers.length,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get("email/templates")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "List editable email templates" })
  async getEmailTemplates() {
    const templates = await this.emailTemplateService.listTemplates();
    return { templates };
  }

  @Get("email/templates/:id")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get an editable email template" })
  async getEmailTemplate(@Param("id") id: string) {
    const template = await this.emailTemplateService.getTemplate(id);
    return { template };
  }

  @Post("email/templates")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Create an email template" })
  async createEmailTemplate(
    @Body() data: any,
    @CurrentUser("id") adminId: string,
  ) {
    const template = await this.emailTemplateService.createTemplate(data, adminId);
    return { template };
  }

  @Patch("email/templates/:id")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update an email template" })
  async updateEmailTemplate(
    @Param("id") id: string,
    @Body() data: any,
    @CurrentUser("id") adminId: string,
  ) {
    const template = await this.emailTemplateService.updateTemplate(id, data, adminId);
    return { template };
  }

  @Delete("email/templates/:id")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Delete an email template" })
  async deleteEmailTemplate(@Param("id") id: string) {
    return this.emailTemplateService.deleteTemplate(id);
  }

  @Post("email/templates/:id/preview")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Preview an email template" })
  async previewEmailTemplate(
    @Param("id") id: string,
    @Body() data: { context?: Record<string, any> },
  ) {
    return this.emailTemplateService.previewTemplate(id, data?.context || {});
  }

  @Post("email/templates/preview")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Preview an email template draft" })
  async previewEmailTemplateDraft(@Body() data: any) {
    return this.emailTemplateService.previewDraft(data);
  }

  @Post("messages/send")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Send an email/message to a registered user or a manual email address" })
  async sendMessage(
    @Body()
    data: {
      recipientId?: string;
      recipientEmail?: string;
      recipientName?: string;
      content: string;
      subject?: string;
      threadId?: string;
    },
    @CurrentUser("id") adminId: string,
  ) {
    const message = data.content?.trim();
    if (!message) {
      throw new BadRequestException("Message content is required");
    }

    const subject = data.subject?.trim() || "Message from Orivraa Support";

    // ── Resolve recipient ──────────────────────────────────────────────────
    let toEmail: string;
    let toName: string;
    let toUserId: string | undefined;

    if (data.recipientId) {
      // Registered user path
      const user = await this.prisma.user.findUnique({
        where: { id: data.recipientId },
      });
      if (!user) throw new BadRequestException("User not found");
      toEmail = user.email;
      toName = user.firstName || user.email;
      toUserId = user.id;
    } else if (data.recipientEmail) {
      // Manual email path
      toEmail = data.recipientEmail.trim();
      toName = data.recipientName?.trim() || toEmail;
    } else {
      throw new BadRequestException("Either recipientId or recipientEmail is required");
    }

    // ── Render template ────────────────────────────────────────────────────
    const rendered = await this.emailTemplateService.renderByKey(
      "manual_user_message",
      {
        title: subject,
        message,
        recipientName: toName,
        sentAt: new Date(),
      },
      {
        subject,
        templateName: "support-message",
        senderName: "Orivraa Support",
        senderEmail: EMAIL_SENDERS.SUPPORT,
        replyTo: EMAIL_SENDERS.SUPPORT,
        audience: "customer",
      },
    );

    // ── Send email ─────────────────────────────────────────────────────────
    const result = await this.mailService.sendHtml({
      to: toEmail,
      subject: rendered.subject,
      html: rendered.html,
      from: rendered.from,
      replyTo: rendered.replyTo || EMAIL_SENDERS.SUPPORT,
    });

    if (!result.success) {
      throw new BadRequestException("Failed to send email");
    }

    // ── Log email ──────────────────────────────────────────────────────────
    const loggedThreadId = data.threadId || randomUUID();
    await this.prisma.emailLog.create({
      data: {
        direction: "OUTBOUND",
        fromAddress: rendered.from,
        toAddress: toEmail,
        subject: rendered.subject,
        body: message,
        ...(toUserId ? { userId: toUserId } : {}),
        adminId,
        messageId: result.messageId,
        templateKey: rendered.key,
        threadId: loggedThreadId,
      },
    });

    // ── In-app notification (registered users only) ────────────────────────
    if (toUserId) {
      await this.notificationsService.create({
        userId: toUserId,
        type: "SYSTEM_ALERT",
        titleKey: subject,
        bodyKey: data.content,
        channels: ["IN_APP", "PUSH"],
      });
    }

    this.logger.log(`Admin ${adminId} sent email to ${toEmail}${toUserId ? ` (userId: ${toUserId})` : " (external)"}`);

    return { success: true, messageId: result.messageId, threadId: loggedThreadId };
  }

  @Post("messages/ai-compose")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Generate an email subject + body using Gemini 2.5 Flash" })
  async aiComposeMessage(
    @Body() data: { prompt: string; recipientName?: string; recipientRole?: string },
  ) {
    if (!data.prompt?.trim()) {
      throw new BadRequestException("Prompt is required");
    }

    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (!apiKey) {
      throw new BadRequestException("GEMINI_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert admin support agent for Orivraa (a B2B jewellery marketplace).
Generate a professional email based on the admin's instruction.
Recipient Name: ${data.recipientName || "Valued User"}
Recipient Role: ${data.recipientRole || "Customer/Seller"}
Admin instruction: ${data.prompt.trim()}

Rules:
- Write in first-person from "The Orivraa Team".
- Keep it concise and professional.
- Do NOT include placeholders like "[Your Name]" or "[Date]".
- Sign off with "The Orivraa Team".
- Respond ONLY with a valid JSON object on a single line, no markdown, no explanation:
{"subject":"<email subject line>","message":"<full email body text>"}`;

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
            responseMimeType: "application/json",
          },
        },
      );

      const raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      let parsed: { subject?: string; message?: string };
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Fallback: extract from raw text if JSON parsing fails
        parsed = { subject: "", message: raw.trim() };
      }

      return {
        success: true,
        subject: (parsed.subject || "").trim(),
        message: (parsed.message || "").trim(),
      };
    } catch (error: any) {
      this.logger.error("Gemini AI Compose failed:", error.message);
      throw new BadRequestException("Failed to generate email using AI");
    }
  }
}
