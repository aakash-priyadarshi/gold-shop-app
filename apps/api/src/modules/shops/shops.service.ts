import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { UpdateMetalRatesDto } from './dto/update-metal-rates.dto';

@Injectable()
export class ShopsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(userId: string, dto: CreateShopDto) {
    // Check if user already has a shop
    const existingShop = await this.prisma.shop.findUnique({
      where: { userId },
    });

    if (existingShop) {
      throw new BadRequestException('User already has a shop');
    }

    const shop = await this.prisma.shop.create({
      data: {
        userId,
        shopName: dto.shopName,
        shopNameNe: dto.shopNameNe,
        shopNameHi: dto.shopNameHi,
        description: dto.description,
        country: dto.country || 'NP',
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
      actorType: 'USER',
      action: 'CREATE',
      resourceType: 'SHOP',
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
    const { country, city, jewelleryType, method, verified, page = 1, pageSize = 20 } = params;
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
          country: true,
          isVerified: true,
          supportedJewelleryTypes: true,
          supportedMethods: true,
          codEnabled: true,
          makingChargePercent: true,
          ratings: {
            select: { overall: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shop.count({ where }),
    ]);

    return {
      data: shops.map((shop) => ({
        ...shop,
        averageRating:
          shop.ratings.length > 0
            ? shop.ratings.reduce((sum, r) => sum + r.overall, 0) / shop.ratings.length
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
          orderBy: { createdAt: 'desc' },
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
      throw new NotFoundException('Shop not found');
    }

    return {
      ...shop,
      averageRating:
        shop.ratings.length > 0
          ? shop.ratings.reduce((sum, r) => sum + r.overall, 0) / shop.ratings.length
          : null,
    };
  }

  async findByUserId(userId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { userId },
      include: {
        metalRates: true,
        finishPricing: true,
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found for this user');
    }

    return shop;
  }

  async update(shopId: string, userId: string, dto: UpdateShopDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this shop');
    }

    const previousValue = { ...shop };

    const updated = await this.prisma.shop.update({
      where: { id: shopId },
      data: dto,
    });

    await this.auditService.log({
      userId,
      actorType: 'USER',
      action: 'UPDATE',
      resourceType: 'SHOP',
      resourceId: shopId,
      previousValue,
      newValue: dto,
    });

    return updated;
  }

  async updateMetalRates(shopId: string, userId: string, dto: UpdateMetalRatesDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.userId !== userId) {
      throw new ForbiddenException('Not authorized');
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
      actorType: 'USER',
      action: 'UPDATE',
      resourceType: 'SHOP_RATES',
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
      throw new NotFoundException('Shop not found');
    }

    const updated = await this.prisma.shop.update({
      where: { id: shopId },
      data: { isVerified: true },
    });

    await this.auditService.log({
      userId: adminId,
      actorType: 'ADMIN',
      action: 'APPROVE',
      resourceType: 'SHOP',
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
            status: 'SENT_TO_SHOPS',
          },
        },
      }),
      this.prisma.order.count({
        where: {
          shopId,
          status: {
            in: ['PAID', 'IN_PRODUCTION', 'QC_PENDING', 'READY_TO_SHIP'],
          },
        },
      }),
      this.prisma.shopRating.findMany({
        where: { shopId },
        take: 5,
        orderBy: { createdAt: 'desc' },
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
            ? recentRatings.reduce((sum, r) => sum + r.overall, 0) / recentRatings.length
            : null,
      },
    };
  }
}
