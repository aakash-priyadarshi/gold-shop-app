import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  InventoryStatus,
  InventoryVisibility,
  JewelleryType,
  Prisma,
} from "@prisma/client";
import { calculateGrossWeightGrams } from "@gold-shop/shared";
import { PrismaService } from "../../prisma/prisma.service";
import {
  PlanLimitExceededException,
  PlanLimitsService,
} from "../core/subscriptions/plan-limits.service";
import {
  CreateSetDto,
  SetComponentInputDto,
  TransferLocationDto,
  UpdateSetDto,
} from "./dto/sets-locations.dto";

@Injectable()
export class InventorySetsService {
  constructor(
    private prisma: PrismaService,
    private planLimitsService: PlanLimitsService,
  ) {}

  private async assertShopOwner(shopId: string, userId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId },
    });
    if (!shop) throw new ForbiddenException("You do not own this shop");
    return shop;
  }

  computeSetPrice(
    components: { metalValueNpr: number; makingChargeNpr: number; gemstoneValueNpr: number; taxNpr: number; totalPriceNpr: number }[],
    discountType?: string | null,
    discountValue?: number | null,
  ) {
    const sum = components.reduce(
      (acc, c) => acc + (c.totalPriceNpr || 0),
      0,
    );
    const metal = components.reduce((a, c) => a + (c.metalValueNpr || 0), 0);
    const making = components.reduce((a, c) => a + (c.makingChargeNpr || 0), 0);
    const gem = components.reduce((a, c) => a + (c.gemstoneValueNpr || 0), 0);
    const tax = components.reduce((a, c) => a + (c.taxNpr || 0), 0);
    let discount = 0;
    if (discountType === "PERCENT" && discountValue != null) {
      discount = (sum * Number(discountValue)) / 100;
    } else if (discountType === "FIXED" && discountValue != null) {
      discount = Number(discountValue);
    }
    discount = Math.min(Math.max(0, discount), sum);
    return {
      sum,
      discount,
      totalPriceNpr: Math.max(0, sum - discount),
      metalValueNpr: metal,
      makingChargeNpr: making,
      gemstoneValueNpr: gem,
      taxNpr: tax,
    };
  }

  private setInclude = {
    setComponents: {
      orderBy: { sortOrder: "asc" as const },
      include: {
        componentItem: {
          select: {
            id: true,
            sku: true,
            nameEn: true,
            jewelleryType: true,
            composition: true,
            totalWeightGrams: true,
            grossWeightGrams: true,
            metalValueNpr: true,
            makingChargeNpr: true,
            gemstoneValueNpr: true,
            taxNpr: true,
            totalPriceNpr: true,
            images: true,
            status: true,
            stockQuantity: true,
            locationId: true,
            visibility: true,
          },
        },
      },
    },
    location: true,
  };

  async createSet(shopId: string, userId: string, dto: CreateSetDto) {
    await this.assertShopOwner(shopId, userId);
    if (!dto.components?.length) {
      throw new BadRequestException("A set needs at least one component");
    }

    await this.planLimitsService.checkProductLimit(shopId);
    const existingSku = await this.prisma.inventoryItem.findFirst({
      where: { shopId, sku: dto.sku },
    });
    if (existingSku) {
      throw new BadRequestException("SKU already exists in your shop");
    }

    const { max: maxProducts, planName } =
      await this.planLimitsService.getProductLimit(shopId);

    const set = await this.prisma.$transaction(
      async (tx) => {
        if (maxProducts !== null) {
          // set + new inline components
          const inlineCount = dto.components.filter((c) => !c.componentItemId)
            .length;
          const currentCount = await tx.inventoryItem.count({
            where: { shopId },
          });
          if (currentCount + 1 + inlineCount > maxProducts) {
            throw new PlanLimitExceededException(
              "products",
              currentCount,
              maxProducts,
              planName,
            );
          }
        }

        const resolvedComponents: {
          componentItemId: string;
          role?: string;
          sortOrder: number;
          pricing: {
            metalValueNpr: number;
            makingChargeNpr: number;
            gemstoneValueNpr: number;
            taxNpr: number;
            totalPriceNpr: number;
            totalWeightGrams: number;
            grossWeightGrams: number;
          };
        }[] = [];

        for (let i = 0; i < dto.components.length; i++) {
          const input = dto.components[i];
          const item = await this.resolveOrCreateComponent(
            tx,
            shopId,
            input,
            dto.locationId,
          );
          resolvedComponents.push({
            componentItemId: item.id,
            role: input.role,
            sortOrder: input.sortOrder ?? i,
            pricing: {
              metalValueNpr: item.metalValueNpr,
              makingChargeNpr: item.makingChargeNpr,
              gemstoneValueNpr: item.gemstoneValueNpr,
              taxNpr: item.taxNpr,
              totalPriceNpr: item.totalPriceNpr,
              totalWeightGrams: item.totalWeightGrams,
              grossWeightGrams:
                item.grossWeightGrams || item.totalWeightGrams,
            },
          });
        }

        const priced = this.computeSetPrice(
          resolvedComponents.map((c) => c.pricing),
          dto.setDiscountType,
          dto.setDiscountValue,
        );

        const weight = resolvedComponents.reduce(
          (a, c) => a + c.pricing.totalWeightGrams,
          0,
        );
        const grossWeight = resolvedComponents.reduce(
          (a, c) => a + c.pricing.grossWeightGrams,
          0,
        );

        const setItem = await tx.inventoryItem.create({
          data: {
            shopId,
            sku: dto.sku,
            nameEn: dto.nameEn,
            descriptionEn: dto.descriptionEn,
            jewelleryType: JewelleryType.SET,
            buildMethod: "METHOD_A",
            composition: {
              kind: "SET",
              componentIds: resolvedComponents.map((c) => c.componentItemId),
              componentSum: priced.sum,
              discount: priced.discount,
            },
            totalWeightGrams: weight || 0.01,
            grossWeightGrams: grossWeight || weight || 0.01,
            metalValueNpr: priced.metalValueNpr,
            makingChargeNpr: priced.makingChargeNpr,
            gemstoneValueNpr: priced.gemstoneValueNpr,
            taxNpr: priced.taxNpr,
            totalPriceNpr: priced.totalPriceNpr,
            setDiscountType: dto.setDiscountType || null,
            setDiscountValue: dto.setDiscountValue ?? null,
            images: dto.images || [],
            videos: [],
            labels: [],
            locationId: dto.locationId || null,
            stockQuantity: 1,
            status: InventoryStatus.AVAILABLE,
            visibility: InventoryVisibility.PUBLIC,
          },
        });

        await tx.inventorySetComponent.createMany({
          data: resolvedComponents.map((c) => ({
            setItemId: setItem.id,
            componentItemId: c.componentItemId,
            role: c.role || null,
            sortOrder: c.sortOrder,
          })),
        });

        return setItem;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return this.prisma.inventoryItem.findUnique({
      where: { id: set.id },
      include: this.setInclude,
    });
  }

  private async resolveOrCreateComponent(
    tx: Prisma.TransactionClient,
    shopId: string,
    input: SetComponentInputDto,
    setLocationId?: string,
    /** When updating a set, allow re-linking pieces that belong to this set */
    allowSetId?: string,
  ) {
    if (input.componentItemId) {
      const item = await tx.inventoryItem.findFirst({
        where: { id: input.componentItemId, shopId },
      });
      if (!item) {
        throw new NotFoundException(
          `Component ${input.componentItemId} not found`,
        );
      }
      if (item.jewelleryType === JewelleryType.SET) {
        throw new BadRequestException("Cannot nest a set inside a set");
      }
      const already = await tx.inventorySetComponent.findUnique({
        where: { componentItemId: item.id },
      });
      if (already && already.setItemId !== allowSetId) {
        throw new ConflictException(
          `${item.nameEn} is already part of another set`,
        );
      }
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          visibility: InventoryVisibility.HIDDEN,
          ...(setLocationId ? { locationId: setLocationId } : {}),
        },
      });
      return item;
    }

    if (!input.nameEn || !input.sku || !input.jewelleryType) {
      throw new BadRequestException(
        "Inline components require nameEn, sku, and jewelleryType",
      );
    }
    const skuClash = await tx.inventoryItem.findFirst({
      where: { shopId, sku: input.sku },
    });
    if (skuClash) {
      throw new BadRequestException(`SKU ${input.sku} already exists`);
    }

    const metal = input.metalValueNpr || 0;
    const making = input.makingChargeNpr || 0;
    const gem = input.gemstoneValueNpr || 0;
    const total = metal + making + gem;

    const comp = (input.composition || {}) as Record<string, unknown>;
    const gemstones = Array.isArray(comp.gemstones)
      ? comp.gemstones
      : Array.isArray(input.gemstones)
        ? input.gemstones
        : [];
    const baseAlloy =
      comp.baseAlloy && typeof comp.baseAlloy === "object"
        ? comp.baseAlloy
        : { metal: "GOLD", purity: "22K" };

    return tx.inventoryItem.create({
      data: {
        shopId,
        sku: input.sku,
        nameEn: input.nameEn,
        jewelleryType: input.jewelleryType as JewelleryType,
        buildMethod: "METHOD_A",
        composition: {
          ...comp,
          baseAlloy,
          gemstones,
        },
        totalWeightGrams: input.totalWeightGrams || 0.01,
        grossWeightGrams: calculateGrossWeightGrams(
          input.totalWeightGrams || 0.01,
          gemstones,
        ),
        metalValueNpr: metal,
        makingChargeNpr: making,
        gemstoneValueNpr: gem,
        taxNpr: 0,
        totalPriceNpr: total,
        images: [],
        videos: [],
        labels: [],
        locationId: setLocationId || null,
        stockQuantity: 1,
        status: InventoryStatus.AVAILABLE,
        visibility: InventoryVisibility.HIDDEN,
      },
    });
  }

  async updateSet(
    shopId: string,
    userId: string,
    setId: string,
    dto: UpdateSetDto,
  ) {
    await this.assertShopOwner(shopId, userId);
    const set = await this.prisma.inventoryItem.findFirst({
      where: { id: setId, shopId, jewelleryType: JewelleryType.SET },
      include: { setComponents: true },
    });
    if (!set) throw new NotFoundException("Set not found");

    await this.prisma.$transaction(async (tx) => {
      if (dto.components) {
        // Detach old components (restore visibility)
        for (const link of set.setComponents) {
          await tx.inventoryItem.update({
            where: { id: link.componentItemId },
            data: { visibility: InventoryVisibility.PUBLIC },
          });
        }
        await tx.inventorySetComponent.deleteMany({
          where: { setItemId: setId },
        });

        const resolved: {
          componentItemId: string;
          role?: string;
          sortOrder: number;
          pricing: any;
        }[] = [];
        for (let i = 0; i < dto.components.length; i++) {
          const item = await this.resolveOrCreateComponent(
            tx,
            shopId,
            dto.components[i],
            dto.locationId ?? set.locationId ?? undefined,
            setId,
          );
          resolved.push({
            componentItemId: item.id,
            role: dto.components[i].role,
            sortOrder: dto.components[i].sortOrder ?? i,
            pricing: item,
          });
        }
        await tx.inventorySetComponent.createMany({
          data: resolved.map((c) => ({
            setItemId: setId,
            componentItemId: c.componentItemId,
            role: c.role || null,
            sortOrder: c.sortOrder,
          })),
        });

        const priced = this.computeSetPrice(
          resolved.map((c) => c.pricing),
          dto.setDiscountType !== undefined
            ? dto.setDiscountType
            : set.setDiscountType,
          dto.setDiscountValue !== undefined
            ? dto.setDiscountValue
            : set.setDiscountValue,
        );
        const weight = resolved.reduce(
          (a, c) => a + (c.pricing.totalWeightGrams || 0),
          0,
        );
        const grossWeight = resolved.reduce(
          (a, c) =>
            a +
            (c.pricing.grossWeightGrams ||
              c.pricing.totalWeightGrams ||
              0),
          0,
        );

        await tx.inventoryItem.update({
          where: { id: setId },
          data: {
            ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn } : {}),
            ...(dto.descriptionEn !== undefined
              ? { descriptionEn: dto.descriptionEn }
              : {}),
            ...(dto.images !== undefined ? { images: dto.images } : {}),
            ...(dto.locationId !== undefined
              ? { locationId: dto.locationId }
              : {}),
            ...(dto.setDiscountType !== undefined
              ? { setDiscountType: dto.setDiscountType }
              : {}),
            ...(dto.setDiscountValue !== undefined
              ? { setDiscountValue: dto.setDiscountValue }
              : {}),
            metalValueNpr: priced.metalValueNpr,
            makingChargeNpr: priced.makingChargeNpr,
            gemstoneValueNpr: priced.gemstoneValueNpr,
            taxNpr: priced.taxNpr,
            totalPriceNpr: priced.totalPriceNpr,
            totalWeightGrams: weight || 0.01,
            grossWeightGrams: grossWeight || weight || 0.01,
            composition: {
              kind: "SET",
              componentIds: resolved.map((c) => c.componentItemId),
              componentSum: priced.sum,
              discount: priced.discount,
            },
          },
        });
      } else {
        // Pricing-only / metadata update — recompute from existing components
        const links = await tx.inventorySetComponent.findMany({
          where: { setItemId: setId },
          include: { componentItem: true },
        });
        const discountType =
          dto.setDiscountType !== undefined
            ? dto.setDiscountType
            : set.setDiscountType;
        const discountValue =
          dto.setDiscountValue !== undefined
            ? dto.setDiscountValue
            : set.setDiscountValue;
        const priced = this.computeSetPrice(
          links.map((l) => l.componentItem),
          discountType,
          discountValue,
        );
        await tx.inventoryItem.update({
          where: { id: setId },
          data: {
            ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn } : {}),
            ...(dto.descriptionEn !== undefined
              ? { descriptionEn: dto.descriptionEn }
              : {}),
            ...(dto.images !== undefined ? { images: dto.images } : {}),
            ...(dto.locationId !== undefined
              ? { locationId: dto.locationId }
              : {}),
            ...(dto.setDiscountType !== undefined
              ? { setDiscountType: dto.setDiscountType }
              : {}),
            ...(dto.setDiscountValue !== undefined
              ? { setDiscountValue: dto.setDiscountValue }
              : {}),
            metalValueNpr: priced.metalValueNpr,
            makingChargeNpr: priced.makingChargeNpr,
            gemstoneValueNpr: priced.gemstoneValueNpr,
            taxNpr: priced.taxNpr,
            totalPriceNpr: priced.totalPriceNpr,
            composition: {
              kind: "SET",
              componentIds: links.map((l) => l.componentItemId),
              componentSum: priced.sum,
              discount: priced.discount,
            },
          },
        });
      }
    });

    return this.prisma.inventoryItem.findUnique({
      where: { id: setId },
      include: this.setInclude,
    });
  }

  async breakSet(shopId: string, userId: string, setId: string) {
    await this.assertShopOwner(shopId, userId);
    const set = await this.prisma.inventoryItem.findFirst({
      where: { id: setId, shopId, jewelleryType: JewelleryType.SET },
      include: { setComponents: true },
    });
    if (!set) throw new NotFoundException("Set not found");

    await this.prisma.$transaction(async (tx) => {
      for (const link of set.setComponents) {
        await tx.inventoryItem.update({
          where: { id: link.componentItemId },
          data: { visibility: InventoryVisibility.PUBLIC },
        });
      }
      await tx.inventorySetComponent.deleteMany({ where: { setItemId: setId } });
      await tx.inventoryItem.update({
        where: { id: setId },
        data: {
          status: InventoryStatus.DISCONTINUED,
          stockQuantity: 0,
          composition: { kind: "SET", broken: true, componentIds: [] },
        },
      });
    });

    return { success: true, releasedComponents: set.setComponents.length };
  }

  async getSet(shopId: string, userId: string, setId: string) {
    await this.assertShopOwner(shopId, userId);
    const set = await this.prisma.inventoryItem.findFirst({
      where: { id: setId, shopId, jewelleryType: JewelleryType.SET },
      include: this.setInclude,
    });
    if (!set) throw new NotFoundException("Set not found");
    return set;
  }

  /**
   * After selling a SET, cascade components to SOLD / stock 0 and write movements.
   * Call inside or after the stock decrement transaction.
   */
  async cascadeSetSale(
    tx: Prisma.TransactionClient,
    shopId: string,
    setItemId: string,
    referenceType: string,
    referenceId: string,
  ) {
    const set = await tx.inventoryItem.findFirst({
      where: { id: setItemId, shopId },
      include: { setComponents: true },
    });
    if (!set || set.jewelleryType !== JewelleryType.SET) return;

    await tx.inventoryItem.update({
      where: { id: setItemId },
      data: { status: InventoryStatus.SOLD },
    });

    for (const link of set.setComponents) {
      await tx.inventoryItem.update({
        where: { id: link.componentItemId },
        data: {
          status: InventoryStatus.SOLD,
          stockQuantity: 0,
        },
      });
      await tx.inventoryStockMovement.create({
        data: {
          shopId,
          inventoryItemId: link.componentItemId,
          delta: -1,
          reason: "SET_SALE",
          referenceType,
          referenceId,
          notes: `Component of set ${set.sku}`,
        },
      });
    }
  }

  /** Reject selling a piece that is bound to an active set */
  async assertNotBoundComponent(inventoryItemId: string) {
    const bound = await this.prisma.inventorySetComponent.findUnique({
      where: { componentItemId: inventoryItemId },
      include: { setItem: { select: { sku: true, nameEn: true } } },
    });
    if (bound) {
      throw new BadRequestException(
        `This piece is part of set "${bound.setItem.nameEn}" (${bound.setItem.sku}). Sell the set or break it first.`,
      );
    }
  }
}

@Injectable()
export class InventoryLocationTransferService {
  constructor(private prisma: PrismaService) {}

  async transfer(shopId: string, userId: string, dto: TransferLocationDto) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId },
    });
    if (!shop) throw new ForbiddenException("You do not own this shop");

    if (dto.locationId) {
      const loc = await this.prisma.storageLocation.findFirst({
        where: { id: dto.locationId, shopId, isActive: true },
      });
      if (!loc) throw new NotFoundException("Location not found");
    }

    const owned = await this.prisma.inventoryItem.count({
      where: { id: { in: dto.itemIds }, shopId },
    });
    if (owned !== dto.itemIds.length) {
      throw new ForbiddenException("One or more items do not belong to this shop");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.updateMany({
        where: { id: { in: dto.itemIds }, shopId },
        data: { locationId: dto.locationId ?? null },
      });
      for (const itemId of dto.itemIds) {
        await tx.inventoryStockMovement.create({
          data: {
            shopId,
            inventoryItemId: itemId,
            delta: 0,
            reason: "LOCATION_TRANSFER",
            referenceType: "StorageLocation",
            referenceId: dto.locationId || null,
            notes: dto.locationId
              ? `Moved to location ${dto.locationId}`
              : "Cleared location",
          },
        });
      }
    });

    return { updated: dto.itemIds.length };
  }
}
