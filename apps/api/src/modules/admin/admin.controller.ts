import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete,
  Body, 
  Param, 
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcryptjs';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private mailService: MailService,
  ) {}

  // ═══════════════════════════════════════
  // VERIFICATION REQUESTS
  // ═══════════════════════════════════════

  @Get('verifications')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all verification requests' })
  async getVerifications(@Query('status') status?: string) {
    const requests = await this.prisma.verificationRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
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
    
    const pending = requests.filter(r => r.status === 'PENDING').length;
    return { requests, pendingCount: pending };
  }

  @Patch('verifications/:id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve a verification request' })
  async approveVerification(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id },
      include: { shop: true, user: true },
    });

    if (!request) {
      return { error: 'Verification request not found' };
    }

    await this.prisma.verificationRequest.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    // Update the shop or user as verified
    if (request.type === 'SHOP' && request.shopId) {
      await this.prisma.shop.update({
        where: { id: request.shopId },
        data: { isVerified: true },
      });

      // Notify shop owner
      if (request.shop?.userId) {
        await this.notificationsService.create({
          userId: request.shop.userId,
          type: 'SYSTEM_ALERT',
          titleKey: 'notification.shop_verified.title',
          bodyKey: 'notification.shop_verified.body',
          channels: ['EMAIL', 'PUSH'],
        });
      }
    } else if (request.type === 'USER' && request.userId) {
      await this.prisma.user.update({
        where: { id: request.userId },
        data: { status: 'ACTIVE' },
      });
    }

    return { success: true, message: 'Verification approved' };
  }

  @Patch('verifications/:id/reject')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject a verification request' })
  async rejectVerification(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    await this.prisma.verificationRequest.update({
      where: { id },
      data: { 
        status: 'REJECTED',
        details: { rejectionReason: reason },
      },
    });

    return { success: true, message: 'Verification rejected' };
  }

  // ═══════════════════════════════════════
  // REPORTS
  // ═══════════════════════════════════════

  @Get('reports')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all user reports' })
  async getReports(@Query('status') status?: string) {
    const reports = await this.prisma.report.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
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

  @Patch('reports/:id/resolve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Resolve a report' })
  async resolveReport(
    @Param('id') id: string,
    @Body('resolution') resolution: string,
  ) {
    await this.prisma.report.update({
      where: { id },
      data: { 
        status: 'RESOLVED',
        details: { resolution },
      },
    });
    return { success: true };
  }

  // ═══════════════════════════════════════
  // USER MANAGEMENT
  // ═══════════════════════════════════════

  @Post('users')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new user' })
  async createUser(@Body() data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone?: string;
  }) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        phone: data.phone,
        status: 'ACTIVE',
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

  @Post('shops')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new shop with owner' })
  async createShop(@Body() data: {
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
  }) {
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
          role: 'SHOPKEEPER',
          status: 'ACTIVE',
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
          country: data.country || 'NP',
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

  // ═══════════════════════════════════════
  // PLATFORM SETTINGS
  // ═══════════════════════════════════════

  @Get('settings')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get platform settings' })
  async getSettings() {
    const configs = await this.prisma.systemConfig.findMany();
    const settingsMap: Record<string, any> = {};
    configs.forEach(c => {
      settingsMap[c.key] = c.value;
    });
    return { settings: settingsMap };
  }

  @Patch('settings')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update platform settings' })
  async updateSettings(
    @Body() data: Record<string, any>,
    @CurrentUser('id') adminId: string,
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

  @Post('settings/refresh-rates')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Trigger market rate refresh' })
  @HttpCode(HttpStatus.OK)
  async refreshMarketRates() {
    // This would trigger a job to refresh market rates
    // For now, just return success
    return { success: true, message: 'Market rate refresh triggered' };
  }

  @Post('settings/clear-cache')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Clear platform cache' })
  @HttpCode(HttpStatus.OK)
  async clearCache() {
    // TODO: Integrate with Redis to clear cache
    return { success: true, message: 'Cache cleared' };
  }

  // ═══════════════════════════════════════
  // SYSTEM NOTIFICATIONS
  // ═══════════════════════════════════════

  @Post('notifications/broadcast')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Send system notification to all users' })
  async broadcastNotification(
    @Body() data: {
      title: string;
      message: string;
      type: string;
      targetRoles?: string[];
    },
    @CurrentUser('id') adminId: string,
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

    return { success: true, message: 'Notification broadcasted' };
  }

  @Get('notifications/system')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get system notifications' })
  async getSystemNotifications() {
    const notifications = await this.prisma.systemNotification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { notifications };
  }

  // ═══════════════════════════════════════
  // EMAIL SETTINGS
  // ═══════════════════════════════════════

  @Post('email/test')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Send a test email to verify SMTP configuration' })
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(
    @Body() data: { email: string },
    @CurrentUser('id') adminId: string,
  ) {
    if (!data.email) {
      return { success: false, error: 'Email address is required' };
    }

    this.logger.log(`Sending test email to ${data.email} by admin ${adminId}`);

    const result = await this.mailService.send({
      to: data.email,
      subject: '✅ Orivraa Test Email - SMTP Configuration Working',
      template: 'test-email',
      context: {
        testTime: new Date().toISOString(),
        adminId,
      },
    });

    if (result.success) {
      this.logger.log(`Test email sent successfully: ${result.messageId}`);
      return { 
        success: true, 
        message: 'Test email sent successfully',
        messageId: result.messageId,
      };
    } else {
      this.logger.error(`Test email failed: ${result.error}`);
      return { 
        success: false, 
        error: result.error || 'Failed to send test email',
      };
    }
  }

  @Patch('email/admin-address')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update admin email address' })
  async updateAdminEmail(
    @Body() data: { email: string; currentPassword: string },
    @CurrentUser('id') adminId: string,
  ) {
    if (!data.email || !data.currentPassword) {
      return { success: false, error: 'Email and current password are required' };
    }

    // Verify current admin password
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      return { success: false, error: 'Admin user not found' };
    }

    const isPasswordValid = await bcrypt.compare(data.currentPassword, admin.passwordHash);
    if (!isPasswordValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Check if email is already in use
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser && existingUser.id !== adminId) {
      return { success: false, error: 'Email is already in use by another user' };
    }

    // Update the admin email
    await this.prisma.user.update({
      where: { id: adminId },
      data: { email: data.email },
    });

    this.logger.log(`Admin email updated to ${data.email} by ${adminId}`);

    return { 
      success: true, 
      message: 'Admin email updated successfully',
      newEmail: data.email,
    };
  }

  @Get('email/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get email configuration status' })
  async getEmailStatus() {
    // Check if SMTP is configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    
    return {
      configured: !!(smtpHost && smtpUser),
      smtpHost: smtpHost ? smtpHost.substring(0, 15) + '...' : null,
      smtpUser: smtpUser ? smtpUser.replace(/(.{3}).*(@.*)/, '$1***$2') : null,
    };
  }

  // ═══════════════════════════════════════
  // DASHBOARD STATS
  // ═══════════════════════════════════════

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get dashboard statistics' })
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
      this.prisma.verificationRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.report.count({ where: { status: 'OPEN' } }),
    ]);

    return {
      totalUsers,
      totalShops,
      totalOrders,
      pendingVerifications,
      openReports,
    };
  }
}
