import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventoryFilterDto,
} from './dto/inventory.dto';
import { JewelleryType, InventoryStatus } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // Create inventory item
  async create(shopId: string, userId: string, dto: CreateInventoryItemDto) {
    // Verify shop ownership
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId },
    });

    if (!shop) {
      throw new ForbiddenException('You do not own this shop');
    }

    // Check SKU uniqueness within shop
    const existingSku = await this.prisma.inventoryItem.findFirst({
      where: { shopId, sku: dto.sku },
    });

    if (existingSku) {
      throw new BadRequestException('SKU already exists in your shop');
    }

    // Calculate total price
    const metalValue = dto.metalValueNpr || 0;
    const makingCharge = dto.makingChargeNpr || 0;
    const gemstoneValue = dto.gemstoneValueNpr || 0;
    const tax = dto.taxNpr || 0;
    const totalPrice = metalValue + makingCharge + gemstoneValue + tax;

    const item = await this.prisma.inventoryItem.create({
      data: {
        shopId,
        nameEn: dto.nameEn,
        nameNe: dto.nameNe,
        nameHi: dto.nameHi,
        descriptionEn: dto.descriptionEn,
        descriptionNe: dto.descriptionNe,
        descriptionHi: dto.descriptionHi,
        sku: dto.sku,
        jewelleryType: dto.jewelleryType as JewelleryType,
        buildMethod: dto.buildMethod,
        composition: dto.composition as object,
        totalWeightGrams: dto.totalWeightGrams || 0,
        dimensions: dto.dimensions as object || null,
        gemstones: dto.gemstones as object || null,
        metalValueNpr: metalValue,
        makingChargeNpr: makingCharge,
        gemstoneValueNpr: gemstoneValue,
        taxNpr: tax,
        totalPriceNpr: totalPrice,
        images: dto.images || [],
        videos: dto.videos || [],
        certificateUrl: dto.certificateUrl,
        hallmarkNumber: dto.hallmarkNumber,
        purityCertUrl: dto.purityCertUrl,
        labels: dto.labels || [],
        stockQuantity: dto.stockQuantity || 1,
        status: InventoryStatus.AVAILABLE,
      },
      include: {
        shop: { select: { id: true, shopName: true } },
      },
    });

    return item;
  }

  // Update inventory item
  async update(
    itemId: string,
    userId: string,
    dto: UpdateInventoryItemDto,
  ) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: { shop: true },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    // Verify shop ownership
    const shop = await this.prisma.shop.findFirst({
      where: { id: item.shopId, userId },
    });

    if (!shop) {
      throw new ForbiddenException('You do not own this shop');
    }

    // Prepare update data
    const updateData: any = {};
    
    if (dto.nameEn !== undefined) updateData.nameEn = dto.nameEn;
    if (dto.nameNe !== undefined) updateData.nameNe = dto.nameNe;
    if (dto.nameHi !== undefined) updateData.nameHi = dto.nameHi;
    if (dto.descriptionEn !== undefined) updateData.descriptionEn = dto.descriptionEn;
    if (dto.descriptionNe !== undefined) updateData.descriptionNe = dto.descriptionNe;
    if (dto.descriptionHi !== undefined) updateData.descriptionHi = dto.descriptionHi;
    if (dto.stockQuantity !== undefined) updateData.stockQuantity = dto.stockQuantity;
    if (dto.status !== undefined) updateData.status = dto.status as InventoryStatus;
    if (dto.images !== undefined) updateData.images = dto.images;
    if (dto.videos !== undefined) updateData.videos = dto.videos;
    if (dto.labels !== undefined) updateData.labels = dto.labels;
    if (dto.metalValueNpr !== undefined) updateData.metalValueNpr = dto.metalValueNpr;
    if (dto.makingChargeNpr !== undefined) updateData.makingChargeNpr = dto.makingChargeNpr;
    if (dto.gemstoneValueNpr !== undefined) updateData.gemstoneValueNpr = dto.gemstoneValueNpr;
    if (dto.taxNpr !== undefined) updateData.taxNpr = dto.taxNpr;
    
    // Recalculate total if any price component changed
    if (dto.metalValueNpr !== undefined || dto.makingChargeNpr !== undefined || 
        dto.gemstoneValueNpr !== undefined || dto.taxNpr !== undefined) {
      const metalValue = dto.metalValueNpr ?? item.metalValueNpr;
      const makingCharge = dto.makingChargeNpr ?? item.makingChargeNpr;
      const gemstoneValue = dto.gemstoneValueNpr ?? item.gemstoneValueNpr;
      const tax = dto.taxNpr ?? item.taxNpr;
      updateData.totalPriceNpr = metalValue + makingCharge + gemstoneValue + tax;
    }

    const updatedItem = await this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: updateData,
    });

    return updatedItem;
  }

  // Delete inventory item (soft delete)
  async delete(itemId: string, userId: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: { shop: true },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    // Verify shop ownership
    const shop = await this.prisma.shop.findFirst({
      where: { id: item.shopId, userId },
    });

    if (!shop) {
      throw new ForbiddenException('You do not own this shop');
    }

    // Soft delete by setting status to DISCONTINUED
    await this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: { status: InventoryStatus.DISCONTINUED },
    });

    return { success: true };
  }

  // Get single item
  async findOne(itemId: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: {
        shop: {
          select: {
            id: true,
            shopName: true,
            shopNameNe: true,
            shopNameHi: true,
            city: true,
            isVerified: true,
            metalRates: {
              orderBy: { lastUpdatedAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!item || item.status === InventoryStatus.DISCONTINUED) {
      throw new NotFoundException('Inventory item not found');
    }

    return item;
  }

  // Search inventory (public)
  async findAll(filters: InventoryFilterDto) {
    const {
      search,
      jewelleryType,
      buildMethod,
      shopId,
      minPrice,
      maxPrice,
      minWeight,
      maxWeight,
      status = 'AVAILABLE',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = filters;

    const where: any = {
      status: status as InventoryStatus,
    };

    if (search) {
      where.OR = [
        { nameEn: { contains: search, mode: 'insensitive' } },
        { descriptionEn: { contains: search, mode: 'insensitive' } },
        { labels: { has: search.toLowerCase() } },
      ];
    }

    if (jewelleryType) {
      where.jewelleryType = jewelleryType as JewelleryType;
    }

    if (buildMethod) {
      where.buildMethod = buildMethod;
    }

    if (shopId) {
      where.shopId = shopId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.totalPriceNpr = {};
      if (minPrice !== undefined) where.totalPriceNpr.gte = minPrice;
      if (maxPrice !== undefined) where.totalPriceNpr.lte = maxPrice;
    }

    if (minWeight !== undefined || maxWeight !== undefined) {
      where.totalWeightGrams = {};
      if (minWeight !== undefined) where.totalWeightGrams.gte = minWeight;
      if (maxWeight !== undefined) where.totalWeightGrams.lte = maxWeight;
    }

    const [items, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        include: {
          shop: {
            select: { id: true, shopName: true, city: true, isVerified: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get shop inventory (for shopkeeper)
  async findShopInventory(shopId: string, userId: string, filters: InventoryFilterDto) {
    // Verify shop ownership
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId },
    });

    if (!shop) {
      throw new ForbiddenException('You do not own this shop');
    }

    const {
      search,
      status,
      jewelleryType,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = filters;

    const where: any = { shopId };

    if (search) {
      where.OR = [
        { nameEn: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status as InventoryStatus;
    }

    if (jewelleryType) {
      where.jewelleryType = jewelleryType as JewelleryType;
    }

    const [items, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Bulk update prices
  async bulkUpdatePrices(
    shopId: string,
    userId: string,
    updates: { itemId: string; totalPriceNpr: number }[],
  ) {
    // Verify shop ownership
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId },
    });

    if (!shop) {
      throw new ForbiddenException('You do not own this shop');
    }

    const results = await this.prisma.$transaction(
      updates.map((update) =>
        this.prisma.inventoryItem.update({
          where: { id: update.itemId },
          data: { totalPriceNpr: update.totalPriceNpr },
        }),
      ),
    );

    return { updated: results.length };
  }

  // Get inventory statistics
  async getInventoryStats(shopId: string) {
    const [
      totalItems,
      availableItems,
      soldItems,
      totalValue,
      categoryBreakdown,
    ] = await Promise.all([
      this.prisma.inventoryItem.count({ where: { shopId } }),
      this.prisma.inventoryItem.count({
        where: { shopId, status: InventoryStatus.AVAILABLE },
      }),
      this.prisma.inventoryItem.count({
        where: { shopId, status: InventoryStatus.SOLD },
      }),
      this.prisma.inventoryItem.aggregate({
        where: { shopId, status: InventoryStatus.AVAILABLE },
        _sum: { totalPriceNpr: true },
      }),
      this.prisma.inventoryItem.groupBy({
        by: ['jewelleryType'],
        where: { shopId, status: InventoryStatus.AVAILABLE },
        _count: true,
      }),
    ]);

    return {
      totalItems,
      availableItems,
      soldItems,
      totalValue: totalValue._sum?.totalPriceNpr || 0,
      categoryBreakdown: categoryBreakdown.map((cat) => ({
        type: cat.jewelleryType,
        count: cat._count,
      })),
    };
  }
}
