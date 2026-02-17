import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVariantDto, UpdateVariantDto } from './dto/variant.dto';

@Injectable()
export class ProductVariantsService {
  private readonly logger = new Logger(ProductVariantsService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Toggle sizes support on an inventory item ───
  async toggleSizes(inventoryItemId: string, shopId: string, hasSizes: boolean) {
    const item = await this.verifyOwnership(inventoryItemId, shopId);
    return this.prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { hasSizes },
    });
  }

  // ─── Create a single variant ───
  async createVariant(inventoryItemId: string, shopId: string, dto: CreateVariantDto) {
    const item = await this.verifyOwnership(inventoryItemId, shopId);

    if (!item.hasSizes) {
      throw new BadRequestException('Enable sizes on this item first');
    }

    // Check SKU uniqueness
    const existing = await this.prisma.productVariant.findUnique({
      where: { sku: dto.sku },
    });
    if (existing) {
      throw new BadRequestException(`SKU "${dto.sku}" already exists`);
    }

    return this.prisma.productVariant.create({
      data: {
        inventoryItemId,
        sizeLabel: dto.sizeLabel,
        sizeSystem: dto.sizeSystem,
        sizeValue: dto.sizeValue,
        sku: dto.sku,
        stock: dto.stock,
        priceOverride: dto.priceOverride,
      },
    });
  }

  // ─── Bulk create variants ───
  async bulkCreateVariants(inventoryItemId: string, shopId: string, variants: CreateVariantDto[]) {
    await this.verifyOwnership(inventoryItemId, shopId);

    // Check all SKUs unique
    const skus = variants.map((v) => v.sku);
    const existing = await this.prisma.productVariant.findMany({
      where: { sku: { in: skus } },
      select: { sku: true },
    });
    if (existing.length) {
      throw new BadRequestException(
        `SKUs already exist: ${existing.map((e) => e.sku).join(', ')}`,
      );
    }

    return this.prisma.productVariant.createMany({
      data: variants.map((v) => ({
        inventoryItemId,
        sizeLabel: v.sizeLabel,
        sizeSystem: v.sizeSystem,
        sizeValue: v.sizeValue,
        sku: v.sku,
        stock: v.stock,
        priceOverride: v.priceOverride,
      })),
    });
  }

  // ─── Update variant ───
  async updateVariant(variantId: string, shopId: string, dto: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { inventoryItem: { select: { shopId: true } } },
    });

    if (!variant) throw new NotFoundException('Variant not found');
    if (variant.inventoryItem.shopId !== shopId) {
      throw new ForbiddenException('Not your product');
    }

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.priceOverride !== undefined && { priceOverride: dto.priceOverride }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  // ─── Delete variant ───
  async deleteVariant(variantId: string, shopId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { inventoryItem: { select: { shopId: true } } },
    });

    if (!variant) throw new NotFoundException('Variant not found');
    if (variant.inventoryItem.shopId !== shopId) {
      throw new ForbiddenException('Not your product');
    }

    return this.prisma.productVariant.delete({ where: { id: variantId } });
  }

  // ─── List variants for an item ───
  async listVariants(inventoryItemId: string) {
    return this.prisma.productVariant.findMany({
      where: { inventoryItemId, isActive: true },
      orderBy: { sizeValue: 'asc' },
    });
  }

  // ─── Get size chart reference data ───
  async getSizeChart(jewelleryType: string, region?: string) {
    const where: any = { jewelleryType };
    if (region) where.region = region;

    return this.prisma.sizeChart.findMany({
      where,
      orderBy: { sizeValue: 'asc' },
    });
  }

  // ─── Helpers ───
  private async verifyOwnership(inventoryItemId: string, shopId: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    });

    if (!item) throw new NotFoundException('Inventory item not found');
    if (item.shopId !== shopId) throw new ForbiddenException('Not your product');
    return item;
  }
}
