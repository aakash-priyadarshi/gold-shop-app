import {
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
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { MailService } from "../mail/mail.service";
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
    private sellerEngagement: SellerEngagementService,
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
    @CurrentUser("id") adminId: string,
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
    const pageNum = parseInt(page || "1");
    const limitNum = parseInt(limit || "25");
    const skip = (pageNum - 1) * limitNum;

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

    const customers = [
      ...registeredCustomers.map((c) => ({
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
        lastActive: c.lastLoginAt || c.createdAt,
        createdAt: c.createdAt,
      })),
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
    return {
      customers,
      total: totalAll,
      registeredTotal,
      walkInTotal,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalAll / limitNum),
    };
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
  @Roles(UserRole.ADMIN)
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
  @Roles(UserRole.ADMIN)
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
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Get detailed seller profile with all engagement data",
  })
  async getSellerProfile(@Param("shopId") shopId: string) {
    return this.sellerEngagement.getSellerProfile(shopId);
  }

  @Patch("sellers/:shopId")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update seller shop fields (isOnHold, isActive, etc.)" })
  async updateSeller(
    @Param("shopId") shopId: string,
    @Body() body: Record<string, any>,
  ) {
    const allowedFields = ["isOnHold", "isActive", "isVerified", "sellerTier"];
    const data: Record<string, any> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    return this.prisma.shop.update({ where: { id: shopId }, data });
  }

  @Get("sellers/:shopId/health-score")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get seller health score" })
  async getSellerHealthScore(@Param("shopId") shopId: string) {
    return this.sellerEngagement.calculateHealthScore(shopId);
  }

  @Get("sellers/:shopId/onboarding")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get seller onboarding progress" })
  async getSellerOnboarding(@Param("shopId") shopId: string) {
    return this.sellerEngagement.getOnboardingProgress(shopId);
  }

  @Get("sellers/:shopId/milestones")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get seller milestones" })
  async getSellerMilestones(@Param("shopId") shopId: string) {
    return this.sellerEngagement.getMilestones(shopId);
  }

  @Get("sellers/:shopId/rfq-funnel")
  @Roles(UserRole.ADMIN)
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
  @Roles(UserRole.ADMIN)
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
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get all notes for a seller" })
  async getSellerNotes(@Param("shopId") shopId: string) {
    return this.sellerEngagement.getSellerNotes(shopId);
  }
}
