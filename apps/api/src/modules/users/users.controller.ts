import {
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateAddressDto, UpdateAddressDto } from "./dto/address.dto";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersService } from "./users.service";

class UpdatePasswordDto {
  currentPassword: string;
  newPassword: string;
}

@ApiTags("users")
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
  ) {}

  @Get("me")
  @ApiOperation({ summary: "Get current user profile" })
  async getProfile(@CurrentUser("id") userId: string) {
    return this.usersService.findById(userId);
  }

  @Patch("me")
  @ApiOperation({ summary: "Update current user profile" })
  async updateProfile(
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch("me/active-shop")
  @ApiOperation({ summary: "Set active shop for multi-shop users" })
  async setActiveShop(
    @CurrentUser("id") userId: string,
    @Body() dto: { shopId: string },
  ) {
    return this.usersService.setActiveShop(userId, dto.shopId);
  }

  @Patch("me/password")
  @ApiOperation({ summary: "Update current user password" })
  async updatePassword(
    @CurrentUser("id") userId: string,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  // ================================
  // DELIVERY ADDRESS ENDPOINTS
  // ================================

  @Get("me/addresses")
  @ApiOperation({ summary: "Get all delivery addresses" })
  async getAddresses(@CurrentUser("id") userId: string) {
    return this.usersService.getAddresses(userId);
  }

  @Get("me/addresses/:id")
  @ApiOperation({ summary: "Get a specific delivery address" })
  async getAddress(
    @CurrentUser("id") userId: string,
    @Param("id") addressId: string,
  ) {
    return this.usersService.getAddress(userId, addressId);
  }

  @Post("me/addresses")
  @ApiOperation({ summary: "Create a new delivery address" })
  async createAddress(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.createAddress(userId, dto);
  }

  @Patch("me/addresses/:id")
  @ApiOperation({ summary: "Update a delivery address" })
  async updateAddress(
    @CurrentUser("id") userId: string,
    @Param("id") addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(userId, addressId, dto);
  }

  @Delete("me/addresses/:id")
  @ApiOperation({ summary: "Delete a delivery address" })
  async deleteAddress(
    @CurrentUser("id") userId: string,
    @Param("id") addressId: string,
  ) {
    return this.usersService.deleteAddress(userId, addressId);
  }

  @Patch("me/addresses/:id/default")
  @ApiOperation({ summary: "Set a delivery address as default" })
  async setDefaultAddress(
    @CurrentUser("id") userId: string,
    @Param("id") addressId: string,
  ) {
    return this.usersService.setDefaultAddress(userId, addressId);
  }

  @Get("me/preferences")
  @ApiOperation({ summary: "Get user preferences (language, currency, theme)" })
  async getPreferences(@CurrentUser("id") userId: string) {
    return this.usersService.getPreferences(userId);
  }

  @Patch("me/preferences")
  @ApiOperation({ summary: "Update user preferences" })
  async updatePreferences(
    @CurrentUser("id") userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.usersService.updatePreferences(userId, {
      preferredLanguage: dto.preferredLanguage,
      preferredCurrency: dto.preferredCurrency,
      preferredCountry: dto.preferredCountry,
      preferredState: dto.preferredState,
      preferredCity: dto.preferredCity,
      themeMode: dto.themeMode,
    });
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  async findAll(
    @Query("role") role?: UserRole,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.usersService.findAll(
      role,
      search,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  @ApiOperation({ summary: "Get user by ID (Admin/Support only)" })
  async findOne(@Param("id") id: string) {
    return this.usersService.findById(id);
  }

  @Patch(":id/suspend")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Suspend a user (Admin only)" })
  async suspendUser(
    @Param("id") id: string,
    @CurrentUser("id") adminId: string,
  ) {
    return this.usersService.suspendUser(id, adminId);
  }

  @Patch(":id/activate")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Activate a user (Admin only)" })
  async activateUser(@Param("id") id: string) {
    return this.usersService.activateUser(id);
  }

  @Get(":id/details")
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  @ApiOperation({
    summary: "Get full user details including shop info (Admin/Support only)",
  })
  async getUserDetails(@Param("id") id: string) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [user, sessionStats, riskData] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          phone: true,
          phoneVerifiedAt: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          preferredLanguage: true,
          preferredCurrency: true,
          preferredCountry: true,
          preferredCity: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          shops: {
            select: {
              id: true,
              shopName: true,
              city: true,
              address: true,
              country: true,
              contactPhone: true,
              contactEmail: true,
              isVerified: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
              supportedMaterials: true,
              supportedJewelleryTypes: true,
              supportedMethods: true,
              codMaxValueNpr: true,
            },
          },
        },
      }),
      // Session stats
      this.prisma.webSession.aggregate({
        where: { userId: id },
        _count: { id: true },
        _sum: { durationSec: true, pageViews: true },
        _avg: { durationSec: true },
        _max: { lastActive: true },
      }),
      // Risk indicators
      Promise.all([
        this.prisma.message.count({ where: { senderId: id, hasViolation: true } }),
        this.prisma.securityEvent.count({
          where: { userId: id, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        }),
      ]),
    ]);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const [chatViolations, recentSecurityEvents] = riskData;

    // Compute risk score
    let riskScore = 0;
    if (chatViolations >= 3) riskScore += 40;
    else if (chatViolations >= 1) riskScore += 20;
    if (recentSecurityEvents >= 5) riskScore += 40;
    else if (recentSecurityEvents >= 2) riskScore += 20;
    if (user.status === "SUSPENDED") riskScore += 20;
    const riskLevel = riskScore >= 60 ? "HIGH" : riskScore >= 30 ? "MEDIUM" : "LOW";

    const isOnlineNow = sessionStats._max.lastActive
      ? sessionStats._max.lastActive >= fiveMinutesAgo
      : false;

    const result = user as any;
    return {
      ...result,
      shop: result.shops?.[0] || null,
      sessionSummary: {
        totalSessions: sessionStats._count.id,
        totalTimeSec: sessionStats._sum.durationSec ?? 0,
        totalPageViews: sessionStats._sum.pageViews ?? 0,
        avgSessionSec: Math.round(sessionStats._avg.durationSec ?? 0),
        lastSeen: sessionStats._max.lastActive,
        isOnlineNow,
      },
      riskScore: { score: riskScore, level: riskLevel, chatViolations, recentSecurityEvents },
    };
  }

  @Get(":id/sessions")
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  @ApiOperation({ summary: "Get web sessions for a user (Admin only)" })
  async getUserSessions(
    @Param("id") id: string,
    @Query("page") page?: string,
  ) {
    const skip = ((parseInt(page ?? "1", 10) - 1)) * 15;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [sessions, total] = await Promise.all([
      this.prisma.webSession.findMany({
        where: { userId: id },
        orderBy: { startedAt: "desc" },
        skip,
        take: 15,
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          durationSec: true,
          pageViews: true,
          lastActive: true,
          ipAddress: true,
          country: true,
          userAgent: true,
          platform: true,
          referrer: true,
          closedBy: true,
        },
      }),
      this.prisma.webSession.count({ where: { userId: id } }),
    ]);

    return {
      sessions: sessions.map((s) => ({
        ...s,
        isActive: !s.endedAt && s.lastActive >= fiveMinutesAgo,
      })),
      total,
      page: parseInt(page ?? "1", 10),
      totalPages: Math.ceil(total / 15),
    };
  }

  @Get(":id/auth-sessions")
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  @ApiOperation({ summary: "Get active auth (JWT) sessions for a user (Admin only)" })
  async getUserAuthSessions(@Param("id") id: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId: id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
    });
    return { sessions };
  }

  @Delete(":id/auth-sessions/:sessionId")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Revoke a specific auth session (Admin only)" })
  async revokeAuthSession(
    @Param("id") userId: string,
    @Param("sessionId") sessionId: string,
  ) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new NotFoundException("Session not found");
    await this.prisma.session.delete({ where: { id: sessionId } });
    return { success: true };
  }

  @Get(":id/audit-log")
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  @ApiOperation({ summary: "Get audit log for a user (Admin only)" })
  async getUserAuditLog(
    @Param("id") id: string,
    @Query("page") page?: string,
  ) {
    const skip = (parseInt(page ?? "1", 10) - 1) * 20;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        skip,
        take: 20,
        select: {
          id: true,
          action: true,
          actorType: true,
          resourceType: true,
          resourceId: true,
          createdAt: true,
          ipAddress: true,
          metadata: true,
        },
      }),
      this.prisma.auditLog.count({ where: { userId: id } }),
    ]);
    return { logs, total, page: parseInt(page ?? "1", 10), totalPages: Math.ceil(total / 20) };
  }

  @Get("stats/online-now")
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  @ApiOperation({ summary: "Count of users active in the last 5 minutes" })
  async getOnlineNow() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const count = await this.prisma.webSession.count({
      where: {
        userId: { not: null },
        lastActive: { gte: fiveMinutesAgo },
        endedAt: null,
      },
    });
    return { onlineNow: count };
  }

  @Patch(":id/admin-update")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update user details (Admin only)" })
  async adminUpdateUser(
    @Param("id") id: string,
    @Body()
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      role?: UserRole;
      status?: string;
    },
  ) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Prevent changing the last admin's role
    if (
      user.role === UserRole.ADMIN &&
      data.role &&
      data.role !== UserRole.ADMIN
    ) {
      const adminCount = await this.prisma.user.count({
        where: { role: UserRole.ADMIN },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException("Cannot change role of the last admin");
      }
    }

    const updateData: any = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone || null; // Allow clearing phone
    if (data.role !== undefined) updateData.role = data.role;
    if (data.status !== undefined) updateData.status = data.status;

    try {
      // Check if phone is being updated and if it's already taken
      if (data.phone) {
        const existingUserWithPhone = await this.prisma.user.findUnique({
          where: { phone: data.phone },
        });
        if (existingUserWithPhone && existingUserWithPhone.id !== id) {
          throw new ConflictException(
            "Phone number is already in use by another user",
          );
        }
      }

      // Check if email is being updated and if it's already taken
      if (data.email) {
        const existingUserWithEmail = await this.prisma.user.findUnique({
          where: { email: data.email },
        });
        if (existingUserWithEmail && existingUserWithEmail.id !== id) {
          throw new ConflictException(
            "Email is already in use by another user",
          );
        }
      }

      const updated = await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
        },
      });

      return { success: true, user: updated };
    } catch (error: any) {
      // Handle Prisma unique constraint violation
      if (error.code === "P2002") {
        const field = error.meta?.target?.[0] || "field";
        throw new ConflictException(`A user with this ${field} already exists`);
      }
      throw error;
    }
  }

  @Patch(":id/admin-phone-verify")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Manually set phone verification status (Admin only)",
  })
  async adminSetPhoneVerified(
    @Param("id") id: string,
    @Body() data: { verified: boolean },
  ) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const updateData: any = {
      phoneVerifiedAt: data.verified ? new Date() : null,
    };

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        phoneVerifiedAt: true,
        role: true,
        status: true,
      },
    });

    return {
      success: true,
      user: updated,
      phoneVerified: !!updated.phoneVerifiedAt,
    };
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Delete a user (Admin only)" })
  async deleteUser(
    @Param("id") id: string,
    @CurrentUser("id") adminId: string,
  ) {
    // Prevent self-deletion
    if (id === adminId) {
      throw new ForbiddenException("Cannot delete your own account");
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { shops: true },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Prevent deleting the last admin
    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: UserRole.ADMIN },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException("Cannot delete the last admin");
      }
    }

    // Delete user and associated shops (cascade)
    await this.prisma.$transaction(async (tx) => {
      // If user has shops, delete shop-related data first
      for (const shop of user.shops) {
        // Delete shop metal rates
        await tx.shopMetalRate.deleteMany({ where: { shopId: shop.id } });
        // Delete verification requests
        await tx.verificationRequest.deleteMany({ where: { shopId: shop.id } });
        // Delete shop
        await tx.shop.delete({ where: { id: shop.id } });
      }

      // Delete user's notifications
      await tx.notification.deleteMany({ where: { userId: id } });
      // Delete user
      await tx.user.delete({ where: { id } });
    });

    return { success: true, message: "User deleted successfully" };
  }
}
