import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InventoryStatus, JewelleryType, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  PlanLimitExceededException,
  PlanLimitsService,
} from "../core/subscriptions/plan-limits.service";
import {
  CreateInventoryItemDto,
  InventoryFilterDto,
  UpdateInventoryItemDto,
} from "./dto/inventory.dto";

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private planLimitsService: PlanLimitsService,
  ) {}

  // Create inventory item
  async create(shopId: string, userId: string, dto: CreateInventoryItemDto) {
    // Verify shop ownership
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId },
    });

    if (!shop) {
      throw new ForbiddenException("You do not own this shop");
    }

    // ── Plan limit check (fast pre-check for a friendly error) ─────────
    await this.planLimitsService.checkProductLimit(shopId);

    // Check SKU uniqueness within shop
    const existingSku = await this.prisma.inventoryItem.findFirst({
      where: { shopId, sku: dto.sku },
    });

    if (existingSku) {
      throw new BadRequestException("SKU already exists in your shop");
    }

    // Calculate total price
    const metalValue = dto.metalValueNpr || 0;
    const makingCharge = dto.makingChargeNpr || 0;
    const gemstoneValue = dto.gemstoneValueNpr || 0;
    const tax = dto.taxNpr || 0;
    const totalPrice = metalValue + makingCharge + gemstoneValue + tax;

    // Resolve the authoritative cap once, then enforce it INSIDE the same
    // serializable transaction as the create. Two concurrent creates can no
    // longer both pass the count check and overshoot maxProducts — Postgres
    // SSI aborts one of them with a serialization error on the conflicting
    // count predicate.
    const { max: maxProducts, planName } =
      await this.planLimitsService.getProductLimit(shopId);

    const item = await this.prisma.$transaction(
      async (tx) => {
        if (maxProducts !== null) {
          const currentCount = await tx.inventoryItem.count({
            where: { shopId },
          });
          if (currentCount >= maxProducts) {
            throw new PlanLimitExceededException(
              "products",
              currentCount,
              maxProducts,
              planName,
            );
          }
        }

        return tx.inventoryItem.create({
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
        dimensions: (dto.dimensions as object) || null,
        gemstones: (dto.gemstones as object) || null,
        metalValueNpr: metalValue,
        makingChargeNpr: makingCharge,
        wastagePercent: dto.wastagePercent ?? 0,
        gemstoneValueNpr: gemstoneValue,
        taxNpr: tax,
        totalPriceNpr: totalPrice,
        images: dto.images || [],
        videos: dto.videos || [],
        certificateUrl: dto.certificateUrl,
        hallmarkNumber: dto.hallmarkNumber,
        assayOffice: dto.assayOffice || null,
        purityCertUrl: dto.purityCertUrl,
        labels: dto.labels || [],
        locationId: dto.locationId || null,
        stockQuantity: dto.stockQuantity || 1,
        status: InventoryStatus.AVAILABLE,
      },
      include: {
        shop: { select: { id: true, shopName: true } },
        location: true,
      },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return item;
  }

  // Update inventory item
  async update(itemId: string, userId: string, dto: UpdateInventoryItemDto) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: { shop: true },
    });

    if (!item) {
      throw new NotFoundException("Inventory item not found");
    }

    // Verify shop ownership
    const shop = await this.prisma.shop.findFirst({
      where: { id: item.shopId, userId },
    });

    if (!shop) {
      throw new ForbiddenException("You do not own this shop");
    }

    // Prepare update data
    const updateData: any = {};

    if (dto.nameEn !== undefined) updateData.nameEn = dto.nameEn;
    if (dto.nameNe !== undefined) updateData.nameNe = dto.nameNe;
    if (dto.nameHi !== undefined) updateData.nameHi = dto.nameHi;
    if (dto.descriptionEn !== undefined)
      updateData.descriptionEn = dto.descriptionEn;
    if (dto.descriptionNe !== undefined)
      updateData.descriptionNe = dto.descriptionNe;
    if (dto.descriptionHi !== undefined)
      updateData.descriptionHi = dto.descriptionHi;
    if (dto.stockQuantity !== undefined)
      updateData.stockQuantity = dto.stockQuantity;
    if (dto.status !== undefined)
      updateData.status = dto.status as InventoryStatus;
    if (dto.images !== undefined) updateData.images = dto.images;
    if (dto.videos !== undefined) updateData.videos = dto.videos;
    if (dto.labels !== undefined) updateData.labels = dto.labels;
    if (dto.locationId !== undefined) updateData.locationId = dto.locationId;
    if (dto.metalValueNpr !== undefined)
      updateData.metalValueNpr = dto.metalValueNpr;
    if (dto.makingChargeNpr !== undefined)
      updateData.makingChargeNpr = dto.makingChargeNpr;
    if (dto.wastagePercent !== undefined)
      updateData.wastagePercent = dto.wastagePercent;
    if (dto.gemstoneValueNpr !== undefined)
      updateData.gemstoneValueNpr = dto.gemstoneValueNpr;
    if (dto.taxNpr !== undefined) updateData.taxNpr = dto.taxNpr;
    if (dto.hallmarkNumber !== undefined)
      updateData.hallmarkNumber = dto.hallmarkNumber;
    if (dto.assayOffice !== undefined)
      updateData.assayOffice = dto.assayOffice;
    if (dto.certificateUrl !== undefined)
      updateData.certificateUrl = dto.certificateUrl;
    if (dto.purityCertUrl !== undefined)
      updateData.purityCertUrl = dto.purityCertUrl;

    // Recalculate total if any price component changed
    if (
      dto.metalValueNpr !== undefined ||
      dto.makingChargeNpr !== undefined ||
      dto.gemstoneValueNpr !== undefined ||
      dto.taxNpr !== undefined
    ) {
      const metalValue = dto.metalValueNpr ?? item.metalValueNpr;
      const makingCharge = dto.makingChargeNpr ?? item.makingChargeNpr;
      const gemstoneValue = dto.gemstoneValueNpr ?? item.gemstoneValueNpr;
      const tax = dto.taxNpr ?? item.taxNpr;
      updateData.totalPriceNpr =
        metalValue + makingCharge + gemstoneValue + tax;
    }

    const updatedItem = await this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: updateData,
      include: { location: true },
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
      throw new NotFoundException("Inventory item not found");
    }

    // Verify shop ownership
    const shop = await this.prisma.shop.findFirst({
      where: { id: item.shopId, userId },
    });

    if (!shop) {
      throw new ForbiddenException("You do not own this shop");
    }

    // Soft delete by setting status to DISCONTINUED
    await this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: { status: InventoryStatus.DISCONTINUED },
    });

    return { success: true };
  }

  /**
   * Lookup an inventory item (or variant) by barcode / SKU within a shop.
   * Used by the POS barcode scanner. Matches in order:
   *   1. InventoryItem.sku    (exact)
   *   2. ProductVariant.sku   (exact)
   *   3. InventoryItem.hallmarkNumber (exact)  – BIS hallmark also commonly barcoded
   * Returns { item, variant? } or null when nothing matches.
   */
  async findByCode(shopId: string, code: string) {
    const trimmed = code?.trim();
    if (!trimmed) return null;

    // 1. Direct SKU on inventory item
    const bySku = await this.prisma.inventoryItem.findFirst({
      where: {
        shopId,
        sku: trimmed,
        status: { not: InventoryStatus.DISCONTINUED },
      },
    });
    if (bySku) return { item: bySku, variant: null };

    // 2. Variant SKU
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        sku: trimmed,
        isActive: true,
        inventoryItem: { shopId },
      },
      include: { inventoryItem: true },
    });
    if (variant) {
      const { inventoryItem, ...rest } = variant;
      return { item: inventoryItem, variant: rest };
    }

    // 3. Hallmark number (some shops barcode the BIS hallmark)
    const byHallmark = await this.prisma.inventoryItem.findFirst({
      where: {
        shopId,
        hallmarkNumber: trimmed,
        status: { not: InventoryStatus.DISCONTINUED },
      },
    });
    if (byHallmark) return { item: byHallmark, variant: null };

    return null;
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
            country: true,
            city: true,
            address: true,
            contactPhone: true,
            isVerified: true,
            metalRates: {
              orderBy: { lastUpdatedAt: "desc" },
              take: 5,
            },
          },
        },
      },
    });

    if (!item || item.status === InventoryStatus.DISCONTINUED) {
      throw new NotFoundException("Inventory item not found");
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
      status = "AVAILABLE",
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = filters;

    const where: any = {
      status: status as InventoryStatus,
    };

    if (search) {
      where.OR = [
        { nameEn: { contains: search, mode: "insensitive" } },
        { descriptionEn: { contains: search, mode: "insensitive" } },
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
  async findShopInventory(
    shopId: string,
    userId: string,
    filters: InventoryFilterDto,
    locationIds?: string[],
  ) {
    // Verify shop ownership
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId },
    });

    if (!shop) {
      throw new ForbiddenException("You do not own this shop");
    }

    const {
      search,
      status,
      jewelleryType,
      inStock,
      excludeSetComponents,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = filters;

    const where: any = { shopId };

    if (search) {
      where.OR = [
        { nameEn: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { hallmarkNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status as InventoryStatus;
    }

    if (jewelleryType) {
      where.jewelleryType = jewelleryType as JewelleryType;
    }

    if (inStock === true || String(inStock) === "true") {
      where.stockQuantity = { gt: 0 };
    }

    if (locationIds?.length) {
      where.locationId = { in: locationIds };
    } else if (filters.locationId) {
      where.locationId = filters.locationId;
    }

    if (excludeSetComponents === true || String(excludeSetComponents) === "true") {
      where.memberOfSet = null;
    }

    const [items, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          location: true,
          setComponents: {
            orderBy: { sortOrder: "asc" },
            include: {
              componentItem: {
                select: {
                  id: true,
                  sku: true,
                  nameEn: true,
                  jewelleryType: true,
                  composition: true,
                  totalWeightGrams: true,
                  metalValueNpr: true,
                  makingChargeNpr: true,
                  gemstoneValueNpr: true,
                  taxNpr: true,
                  totalPriceNpr: true,
                  images: true,
                },
              },
            },
          },
          memberOfSet: {
            select: {
              setItemId: true,
              setItem: { select: { id: true, sku: true, nameEn: true } },
            },
          },
        },
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return {
      items,
      currency: shop.currency || undefined,
      shopCountry: shop.country,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Preview catalog repricing from shop component rates (or market rates).
   * Amounts are in shop base currency (legacy *Npr field names).
   */
  async repricePreview(
    shopId: string,
    userId: string,
    opts: {
      itemIds?: string[];
      metalTypes?: string[];
      mode?: "FROM_SHOP_RATES" | "FROM_MARKET_RATES";
      makingChargeMode?: "KEEP" | "RECALC_PERCENT";
      makingChargePercent?: number;
    },
  ) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId },
      select: {
        id: true,
        currency: true,
        country: true,
        makingChargePercent: true,
      },
    });
    if (!shop) throw new ForbiddenException("You do not own this shop");

    const where: any = {
      shopId,
      status: InventoryStatus.AVAILABLE,
      jewelleryType: { not: JewelleryType.SET },
    };
    if (opts.itemIds?.length) where.id = { in: opts.itemIds };

    const items = await this.prisma.inventoryItem.findMany({
      where,
      take: 500,
      select: {
        id: true,
        nameEn: true,
        sku: true,
        jewelleryType: true,
        totalWeightGrams: true,
        composition: true,
        metalValueNpr: true,
        makingChargeNpr: true,
        gemstoneValueNpr: true,
        taxNpr: true,
        totalPriceNpr: true,
      },
    });

    // Shop base-metal overrides (same source as Pricing Setup)
    const overrides = await this.prisma.shopPriceOverride.findMany({
      where: { shopId, overrideType: "BASE_METAL", isActive: true },
    });
    const rateByMetal: Record<string, number> = {};
    for (const o of overrides) {
      rateByMetal[o.itemCode] = o.overrideValue;
    }

    const makingMode = opts.makingChargeMode || "KEEP";
    const makingPct =
      opts.makingChargePercent ?? shop.makingChargePercent ?? 10;

    const preview = [];
    const skipped: Array<{ id: string; name: string; reason: string }> = [];

    for (const item of items) {
      const metalType = this.extractMetalType(item.composition);
      if (opts.metalTypes?.length && metalType && !opts.metalTypes.includes(metalType)) {
        continue;
      }
      if (!item.totalWeightGrams || item.totalWeightGrams <= 0) {
        skipped.push({
          id: item.id,
          name: item.nameEn,
          reason: "Missing weight",
        });
        continue;
      }
      if (!metalType || rateByMetal[metalType] == null) {
        skipped.push({
          id: item.id,
          name: item.nameEn,
          reason: metalType
            ? `No shop rate for ${metalType}`
            : "Unknown metal type in composition",
        });
        continue;
      }

      const rate = rateByMetal[metalType];
      const purity = this.extractPurity(item.composition);
      const newMetal = Math.round(
        item.totalWeightGrams * rate * (purity > 0 ? purity : 1),
      );
      const newMaking =
        makingMode === "RECALC_PERCENT"
          ? Math.round(newMetal * (makingPct / 100))
          : item.makingChargeNpr;
      const gemstone = item.gemstoneValueNpr || 0;
      const tax = item.taxNpr || 0;
      const newTotal = newMetal + newMaking + gemstone + tax;

      preview.push({
        id: item.id,
        name: item.nameEn,
        sku: item.sku,
        metalType,
        weightG: item.totalWeightGrams,
        ratePerGram: rate,
        old: {
          metalValueNpr: item.metalValueNpr,
          makingChargeNpr: item.makingChargeNpr,
          gemstoneValueNpr: gemstone,
          taxNpr: tax,
          totalPriceNpr: item.totalPriceNpr,
        },
        new: {
          metalValueNpr: newMetal,
          makingChargeNpr: newMaking,
          gemstoneValueNpr: gemstone,
          taxNpr: tax,
          totalPriceNpr: newTotal,
        },
        deltaPct:
          item.totalPriceNpr > 0
            ? +(((newTotal - item.totalPriceNpr) / item.totalPriceNpr) * 100).toFixed(2)
            : 0,
      });
    }

    return {
      currency: shop.currency,
      mode: opts.mode || "FROM_SHOP_RATES",
      makingChargeMode: makingMode,
      items: preview,
      skipped,
      rateSnapshot: rateByMetal,
    };
  }

  async repriceApply(
    shopId: string,
    userId: string,
    data: {
      updates: Array<{
        itemId: string;
        metalValueNpr: number;
        makingChargeNpr: number;
        gemstoneValueNpr?: number;
        taxNpr?: number;
        totalPriceNpr: number;
      }>;
      reason?: string;
      rateSnapshot?: Record<string, number>;
    },
  ) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId },
    });
    if (!shop) throw new ForbiddenException("You do not own this shop");

    const updates = data.updates || [];
    if (updates.length === 0) {
      throw new BadRequestException("No updates provided");
    }
    if (updates.length > 500) {
      throw new BadRequestException("At most 500 items per apply");
    }

    const itemIds = [...new Set(updates.map((u) => u.itemId))];
    const existing = await this.prisma.inventoryItem.findMany({
      where: { id: { in: itemIds }, shopId },
      select: {
        id: true,
        metalValueNpr: true,
        makingChargeNpr: true,
        gemstoneValueNpr: true,
        taxNpr: true,
        totalPriceNpr: true,
      },
    });
    if (existing.length !== itemIds.length) {
      throw new ForbiddenException(
        "One or more items do not belong to this shop",
      );
    }
    const byId = new Map(existing.map((e) => [e.id, e]));

    await this.prisma.$transaction(async (tx) => {
      for (const u of updates) {
        const old = byId.get(u.itemId)!;
        const gemstone = u.gemstoneValueNpr ?? old.gemstoneValueNpr;
        const tax = u.taxNpr ?? old.taxNpr;
        const total =
          u.totalPriceNpr ??
          u.metalValueNpr + u.makingChargeNpr + gemstone + tax;

        await tx.inventoryItem.update({
          where: { id: u.itemId },
          data: {
            metalValueNpr: u.metalValueNpr,
            makingChargeNpr: u.makingChargeNpr,
            gemstoneValueNpr: gemstone,
            taxNpr: tax,
            totalPriceNpr: total,
          },
        });

        await tx.inventoryPriceHistory.create({
          data: {
            shopId,
            inventoryItemId: u.itemId,
            oldValues: {
              metalValueNpr: old.metalValueNpr,
              makingChargeNpr: old.makingChargeNpr,
              gemstoneValueNpr: old.gemstoneValueNpr,
              taxNpr: old.taxNpr,
              totalPriceNpr: old.totalPriceNpr,
            },
            newValues: {
              metalValueNpr: u.metalValueNpr,
              makingChargeNpr: u.makingChargeNpr,
              gemstoneValueNpr: gemstone,
              taxNpr: tax,
              totalPriceNpr: total,
            },
            reason: data.reason || "REPRICE_FROM_RATES",
            rateSnapshot: data.rateSnapshot || undefined,
            userId,
          },
        });
      }
    });

    return { updated: updates.length };
  }

  private extractMetalType(composition: unknown): string | undefined {
    if (!composition || typeof composition !== "object") return undefined;
    const c = composition as Record<string, unknown>;
    if (typeof c.preciousMetal === "string") return c.preciousMetal;
    if (typeof c.metal === "string") return c.metal;
    if (typeof c.primaryMetal === "string") return c.primaryMetal;
    if (typeof c.alloy === "string") return c.alloy;
    if (typeof c.coreMetal === "string") return c.coreMetal;
    // Product catalog shape: { baseAlloy: { metal: "GOLD", purity: "22K" } }
    const baseAlloy = c.baseAlloy;
    if (baseAlloy && typeof baseAlloy === "object") {
      const ba = baseAlloy as Record<string, unknown>;
      if (typeof ba.metal === "string" && ba.metal) {
        const purity = typeof ba.purity === "string" ? ba.purity : undefined;
        const metal = ba.metal.toUpperCase();
        // Already coded (GOLD_22K)
        if (/^(GOLD|SILVER|PLATINUM|PALLADIUM)_\w+/.test(metal)) return metal;
        const p = (purity || "").toUpperCase().replace(/\s+/g, "");
        if (metal === "GOLD" || metal.startsWith("GOLD")) {
          if (p.includes("24") || p === "999") return "GOLD_24K";
          if (p.includes("22") || p === "916") return "GOLD_22K";
          if (p.includes("18") || p === "750") return "GOLD_18K";
          if (p.includes("14") || p === "585") return "GOLD_14K";
          if (p.includes("10")) return "GOLD_10K";
          return "GOLD_22K";
        }
        if (metal === "SILVER" || metal.startsWith("SILVER")) {
          if (p.includes("999")) return "SILVER_999";
          return "SILVER_925";
        }
        if (metal === "PLATINUM" || metal.startsWith("PLATINUM")) {
          if (p.includes("900")) return "PLATINUM_900";
          return "PLATINUM_950";
        }
        return metal;
      }
    }
    return undefined;
  }

  /** Purity as fraction (0–1). Composition may store 22, 0.916, or 916. */
  private extractPurity(composition: unknown): number {
    if (!composition || typeof composition !== "object") return 1;
    const c = composition as Record<string, unknown>;
    const raw = c.purity;
    if (typeof raw !== "number" || !Number.isFinite(raw)) return 1;
    if (raw > 10 && raw <= 100) return raw / 100; // 22 → unlikely; 91.6
    if (raw > 100) return raw / 1000; // 916 → 0.916
    if (raw > 1 && raw <= 24) return raw / 24; // karat
    return raw; // already 0–1
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
      throw new ForbiddenException("You do not own this shop");
    }

    // Reject the whole batch if any itemId does not belong to this shop
    // (prevents cross-tenant price tampering via forged itemIds in the payload).
    const itemIds = [...new Set(updates.map((u) => u.itemId))];
    if (itemIds.length > 0) {
      const ownedCount = await this.prisma.inventoryItem.count({
        where: { id: { in: itemIds }, shopId },
      });
      if (ownedCount !== itemIds.length) {
        throw new ForbiddenException(
          "One or more items do not belong to this shop",
        );
      }
    }

    const results = await this.prisma.$transaction(
      updates.map((update) =>
        this.prisma.inventoryItem.updateMany({
          where: { id: update.itemId, shopId },
          data: { totalPriceNpr: update.totalPriceNpr },
        }),
      ),
    );

    return { updated: results.reduce((sum, r) => sum + r.count, 0) };
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
        by: ["jewelleryType"],
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
