import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Post,
  Delete,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { PrismaService } from '../../prisma/prisma.service';

class UpdatePasswordDto {
  currentPassword: string;
  newPassword: string;
}

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('me/active-shop')
  @ApiOperation({ summary: 'Set active shop for multi-shop users' })
  async setActiveShop(
    @CurrentUser('id') userId: string,
    @Body() dto: { shopId: string },
  ) {
    return this.usersService.setActiveShop(userId, dto.shopId);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Update current user password' })
  async updatePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(userId, dto.currentPassword, dto.newPassword);
  }

  @Get('me/preferences')
  @ApiOperation({ summary: 'Get user preferences (language, currency, theme)' })
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.usersService.getPreferences(userId);
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.usersService.updatePreferences(userId, {
      preferredLanguage: dto.preferredLanguage,
      preferredCurrency: dto.preferredCurrency,
      themeMode: dto.themeMode,
    });
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  @ApiOperation({ summary: 'List all users (Admin/Support only)' })
  async findAll(
    @Query('role') role?: UserRole,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.usersService.findAll(
      role, 
      page ? parseInt(page, 10) : 1, 
      pageSize ? parseInt(pageSize, 10) : 20
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  @ApiOperation({ summary: 'Get user by ID (Admin/Support only)' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/suspend')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Suspend a user (Admin only)' })
  async suspendUser(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.suspendUser(id, adminId);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activate a user (Admin only)' })
  async activateUser(@Param('id') id: string) {
    return this.usersService.activateUser(id);
  }

  @Get(':id/details')
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  @ApiOperation({ summary: 'Get full user details including shop info (Admin/Support only)' })
  async getUserDetails(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        preferredLanguage: true,
        preferredCurrency: true,
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
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Transform for backward compatibility
    const result = user as any;
    return {
      ...result,
      shop: result.shops?.[0] || null,
    };
  }

  @Patch(':id/admin-update')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user details (Admin only)' })
  async adminUpdateUser(
    @Param('id') id: string,
    @Body() data: {
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
      throw new NotFoundException('User not found');
    }

    // Prevent changing the last admin's role
    if (user.role === UserRole.ADMIN && data.role && data.role !== UserRole.ADMIN) {
      const adminCount = await this.prisma.user.count({ where: { role: UserRole.ADMIN } });
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot change role of the last admin');
      }
    }

    const updateData: any = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.status !== undefined) updateData.status = data.status;

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
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a user (Admin only)' })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    // Prevent self-deletion
    if (id === adminId) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({ 
      where: { id },
      include: { shops: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent deleting the last admin
    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.prisma.user.count({ where: { role: UserRole.ADMIN } });
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot delete the last admin');
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

    return { success: true, message: 'User deleted successfully' };
  }
}
