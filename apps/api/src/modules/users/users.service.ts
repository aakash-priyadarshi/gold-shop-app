import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

// Currency codes matching the Prisma enum (CurrencyCode will be available after Prisma regeneration)
type CurrencyCode = 'NPR' | 'INR' | 'AED' | 'USD' | 'GBP' | 'EUR';
const DEFAULT_CURRENCY: CurrencyCode = 'NPR';

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
        createdAt: true,
        shop: {
          select: {
            id: true,
            shopName: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      preferredLanguage?: string;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        preferredLanguage: true,
      },
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
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({
        where: role ? { role } : undefined,
      }),
    ]);

    return {
      data: users,
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
   * Get user preferences (language, currency, theme)
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
        ...(data.themeMode && { themeMode: data.themeMode } as any),
      },
    });

    return {
      language: updated.preferredLanguage || 'en',
      currency: (updated as any).preferredCurrency || DEFAULT_CURRENCY,
      theme: (updated as any).themeMode || 'system',
    };
  }
}
