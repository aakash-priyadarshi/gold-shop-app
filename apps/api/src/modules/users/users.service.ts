import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// Currency codes matching the Prisma enum (CurrencyCode will be available after Prisma regeneration)
type CurrencyCode = 'NPR' | 'INR' | 'AED' | 'USD' | 'GBP' | 'EUR';
const DEFAULT_CURRENCY: CurrencyCode = 'NPR';

interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  country?: string;
  preferredLanguage?: string;
  preferredCurrency?: CurrencyCode;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
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
        preferredCountry: true, // New field - may need regenerating Prisma client
        createdAt: true,
        shops: {
          select: {
            id: true,
            shopName: true,
          },
          take: 1,
        },
      } as any, // Type cast needed until Prisma client is regenerated
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Transform to maintain backward compatibility
    return {
      ...user,
      shop: (user as any).shops?.[0] || null,
    };
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileData,
  ) {
    // Handle combined 'name' field by splitting into firstName/lastName
    let firstName = data.firstName;
    let lastName = data.lastName;
    
    if (data.name && !firstName && !lastName) {
      const nameParts = data.name.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    // Build update data with all supported fields
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.preferredLanguage !== undefined) updateData.preferredLanguage = data.preferredLanguage;
    if (data.preferredCurrency !== undefined) updateData.preferredCurrency = data.preferredCurrency;
    if (data.country !== undefined) updateData.preferredCountry = data.country; // Map 'country' from DTO to 'preferredCountry' in schema
    
    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        preferredLanguage: true,
        preferredCurrency: true,
        preferredCountry: true, // New field
      } as any, // Type cast needed until Prisma client is regenerated
    });
  }

  async findAll(role?: UserRole, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: role ? { role } : undefined,
        skip,
        take: pageSize,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          createdAt: true,
          shops: {
            select: {
              id: true,
              shopName: true,
              isVerified: true,
            },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({
        where: role ? { role } : undefined,
      }),
    ]);

    // Transform to maintain backward compatibility
    const transformedUsers = users.map(user => ({
      ...user,
      shop: user.shops?.[0] || null,
    }));

    return {
      data: transformedUsers,
      meta: {
        page,
        pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async suspendUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Cannot suspend admin users');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED' },
    });
  }

  async activateUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
    });
  }

  /**
   * Get user preferences (language, currency, country, theme)
   */
  async getPreferences(userId: string) {
    // Use raw query approach to handle new fields that TypeScript may not recognize yet
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      language: user.preferredLanguage || 'en',
      currency: (user as any).preferredCurrency || DEFAULT_CURRENCY,
      country: (user as any).preferredCountry || 'US',
      theme: (user as any).themeMode || 'system',
    };
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    data: {
      preferredLanguage?: string;
      preferredCurrency?: CurrencyCode;
      preferredCountry?: string;
      themeMode?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Use any cast for new fields until Prisma client is regenerated
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.preferredLanguage && { preferredLanguage: data.preferredLanguage }),
        ...(data.preferredCurrency && { preferredCurrency: data.preferredCurrency } as any),
        ...(data.preferredCountry && { preferredCountry: data.preferredCountry } as any),
        ...(data.themeMode && { themeMode: data.themeMode } as any),
      },
    });

    return {
      language: updated.preferredLanguage || 'en',
      currency: (updated as any).preferredCurrency || DEFAULT_CURRENCY,
      country: (updated as any).preferredCountry || 'US',
      theme: (updated as any).themeMode || 'system',
    };
  }

  /**
   * Set active shop for multi-shop users
   */
  async setActiveShop(userId: string, shopId: string) {
    // Verify the shop belongs to the user
    const shop = await this.prisma.shop.findFirst({
      where: {
        id: shopId,
        userId: userId,
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found or not owned by user');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { activeShopId: shopId },
    });

    return {
      message: 'Active shop updated',
      activeShopId: shopId,
      shopName: shop.shopName,
    };
  }

  /**
   * Update user password
   */
  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Password updated successfully' };
  }
}
