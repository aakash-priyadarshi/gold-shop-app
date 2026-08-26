import { ConflictException, Injectable, Logger } from "@nestjs/common";
import { CurrencyCode, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CurrencyCode as FxCurrencyCode,
  FxRatesService,
} from "../fx-rates";
import {
  SHOP_PRICE_REBASE_RESOURCE,
  fromCurrencyOfLastRebase,
  isShopMoneyCurrency,
  previousCurrencyFromAudit,
  rebaseAlreadyApplied,
  type ShopPriceConversion,
} from "./shop-price-rebase.util";

type DbClient = Prisma.TransactionClient | PrismaService;

export type ShopPriceRebaseResult = ShopPriceConversion & {
  skipped?: boolean;
};

@Injectable()
export class ShopPriceRebaseService {
  private readonly logger = new Logger(ShopPriceRebaseService.name);
  private readonly verified = new Set<string>();
  private readonly inFlight = new Map<string, Promise<ShopPriceRebaseResult | null>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly fxRates: FxRatesService,
  ) {}

  /**
   * Convert shop-denominated money fields from one currency to another.
   * Optionally updates the Shop row in the same locked transaction.
   */
  async rebaseShopPrices(params: {
    shopId: string;
    fromCurrency: string;
    toCurrency: string;
    userId?: string;
    shopUpdate?: Prisma.ShopUpdateInput;
  }): Promise<ShopPriceRebaseResult | null> {
    const { shopId, fromCurrency, toCurrency, userId, shopUpdate } = params;
    if (!isShopMoneyCurrency(fromCurrency) || !isShopMoneyCurrency(toCurrency)) {
      return null;
    }
    if (fromCurrency === toCurrency) {
      if (shopUpdate) {
        await this.prisma.shop.update({
          where: { id: shopId },
          data: shopUpdate,
        });
      }
      return null;
    }

    const fx = await this.fxRates.convertCurrency(
      1,
      fromCurrency as FxCurrencyCode,
      toCurrency as FxCurrencyCode,
    );
    const conversion: ShopPriceConversion = {
      fromCurrency,
      toCurrency,
      rate: fx.rate,
      source: fx.source,
      quotedAt: fx.quotedAt,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`shop-price-rebase:${shopId}`}))`;
      const last = await tx.auditLog.findFirst({
        where: {
          resourceType: SHOP_PRICE_REBASE_RESOURCE,
          resourceId: shopId,
        },
        orderBy: { createdAt: "desc" },
      });
      if (rebaseAlreadyApplied(last?.newValue, toCurrency)) {
        if (shopUpdate) {
          await tx.shop.update({ where: { id: shopId }, data: shopUpdate });
        }
        return;
      }

      const karigarEntriesCount = await tx.karigarFinancialEntry.count({
        where: { shopId },
      });
      if (karigarEntriesCount > 0) {
        throw new ConflictException(
          "Cannot rebase or change shop currency while active Karigar financial entries exist. Karigar ledger currencies must remain immutable.",
        );
      }

      await this.applyRate(tx, shopId, fx.rate, toCurrency as CurrencyCode);
      await tx.auditLog.create({
        data: {
          userId,
          actorType: userId ? "USER" : "SYSTEM",
          action: "REBASE",
          resourceType: SHOP_PRICE_REBASE_RESOURCE,
          resourceId: shopId,
          previousValue: { currency: fromCurrency },
          newValue: conversion,
        },
      });
      if (shopUpdate) {
        await tx.shop.update({ where: { id: shopId }, data: shopUpdate });
      }
    });

    this.verified.add(`${shopId}:${toCurrency}`);
    this.logger.log(
      `Rebased shop ${shopId} prices ${fromCurrency} → ${toCurrency} at ${fx.rate}`,
    );
    return conversion;
  }

  /**
   * Catch-up for shops that already changed country without converting amounts.
   */
  async ensureShopPricesMatchCurrency(
    shopId: string,
  ): Promise<ShopPriceRebaseResult | null> {
    const existing = this.inFlight.get(shopId);
    if (existing) return existing;

    const run = this.doEnsure(shopId).finally(() => {
      this.inFlight.delete(shopId);
    });
    this.inFlight.set(shopId, run);
    return run;
  }

  private async doEnsure(shopId: string): Promise<ShopPriceRebaseResult | null> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, currency: true, userId: true },
    });
    if (!shop || !isShopMoneyCurrency(shop.currency)) return null;

    const verifiedKey = `${shopId}:${shop.currency}`;
    if (this.verified.has(verifiedKey)) return null;

    const fromCurrency = await this.inferStoredPricingCurrency(
      shopId,
      shop.currency,
    );
    if (!fromCurrency) {
      this.verified.add(verifiedKey);
      return null;
    }

    try {
      return await this.rebaseShopPrices({
        shopId,
        fromCurrency,
        toCurrency: shop.currency,
        userId: shop.userId,
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.warn(
        `Could not rebase shop ${shopId} prices ${fromCurrency} → ${shop.currency}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return null;
    }
  }

  private async inferStoredPricingCurrency(
    shopId: string,
    currentCurrency: string,
  ): Promise<string | null> {
    const lastRebase = await this.prisma.auditLog.findFirst({
      where: {
        resourceType: SHOP_PRICE_REBASE_RESOURCE,
        resourceId: shopId,
      },
      orderBy: { createdAt: "desc" },
    });
    if (rebaseAlreadyApplied(lastRebase?.newValue, currentCurrency)) {
      return null;
    }
    const lastTo = fromCurrencyOfLastRebase(lastRebase?.newValue);
    if (lastTo && lastTo !== currentCurrency) return lastTo;

    const logs = await this.prisma.auditLog.findMany({
      where: {
        resourceType: "SHOP_SETTINGS",
        resourceId: shopId,
        action: "UPDATE",
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });
    const catchUpWindowMs = 30 * 24 * 60 * 60 * 1000;
    for (const log of logs) {
      const prev = previousCurrencyFromAudit(log.previousValue, currentCurrency);
      if (!prev) continue;
      if (Date.now() - log.createdAt.getTime() > catchUpWindowMs) {
        return null;
      }
      return prev;
    }
    return null;
  }

  private async applyRate(
    db: DbClient,
    shopId: string,
    rate: number,
    toCurrency: CurrencyCode,
  ) {
    await db.$executeRaw`
      UPDATE "InventoryItem"
      SET
        "metalValueNpr" = ROUND(("metalValueNpr" * ${rate})::numeric, 2),
        "makingChargeNpr" = ROUND(("makingChargeNpr" * ${rate})::numeric, 2),
        "gemstoneValueNpr" = ROUND(("gemstoneValueNpr" * ${rate})::numeric, 2),
        "taxNpr" = ROUND(("taxNpr" * ${rate})::numeric, 2),
        "totalPriceNpr" = ROUND(("totalPriceNpr" * ${rate})::numeric, 2),
        "setDiscountValue" = CASE
          WHEN "setDiscountType" = 'FIXED' AND "setDiscountValue" IS NOT NULL
            THEN ROUND(("setDiscountValue" * ${rate})::numeric, 2)
          ELSE "setDiscountValue"
        END
      WHERE "shopId" = ${shopId}
    `;

    await db.$executeRaw`
      UPDATE "ProductVariant" pv
      SET "priceOverride" = ROUND((pv."priceOverride" * ${rate})::numeric, 2)
      FROM "InventoryItem" i
      WHERE pv."inventoryItemId" = i.id
        AND i."shopId" = ${shopId}
        AND pv."priceOverride" IS NOT NULL
    `;

    await db.$executeRaw`
      UPDATE "CatalogueItem" ci
      SET "overridePrice" = ROUND((ci."overridePrice" * ${rate})::numeric, 2)
      FROM "Catalogue" c
      WHERE ci."catalogueId" = c.id
        AND c."shopId" = ${shopId}
        AND ci."overridePrice" IS NOT NULL
    `;

    await db.$executeRaw`
      UPDATE "ShopMetalRate"
      SET "ratePerGramNpr" = ROUND(("ratePerGramNpr" * ${rate})::numeric, 2)
      WHERE "shopId" = ${shopId}
    `;

    await db.$executeRaw`
      UPDATE "ShopFinishPricing"
      SET "priceNpr" = ROUND(("priceNpr" * ${rate})::numeric, 2)
      WHERE "shopId" = ${shopId}
    `;

    await db.$executeRaw`
      UPDATE "ShopGemstoneRate"
      SET "pricePerStone" = ROUND(("pricePerStone" * ${rate})::numeric, 2)
      WHERE "shopId" = ${shopId}
    `;

    await db.$executeRaw`
      UPDATE "ShopPriceOverride"
      SET
        "overrideValue" = CASE
          WHEN "overrideMode" = 'FIXED'
            THEN ROUND(("overrideValue" * ${rate})::numeric, 2)
          ELSE "overrideValue"
        END,
        "minValue" = CASE
          WHEN "minValue" IS NULL THEN NULL
          ELSE ROUND(("minValue" * ${rate})::numeric, 2)
        END,
        "maxValue" = CASE
          WHEN "maxValue" IS NULL THEN NULL
          ELSE ROUND(("maxValue" * ${rate})::numeric, 2)
        END
      WHERE "shopId" = ${shopId}
    `;
    await db.shopPriceOverride.updateMany({
      where: { shopId },
      data: { currency: toCurrency },
    });

    await db.$executeRaw`
      UPDATE "Shop"
      SET
        "minOrderValueNpr" = ROUND(("minOrderValueNpr" * ${rate})::numeric, 2),
        "maxOrderValueNpr" = CASE
          WHEN "maxOrderValueNpr" IS NULL THEN NULL
          ELSE ROUND(("maxOrderValueNpr" * ${rate})::numeric, 2)
        END,
        "codMaxValueNpr" = CASE
          WHEN "codMaxValueNpr" IS NULL THEN NULL
          ELSE ROUND(("codMaxValueNpr" * ${rate})::numeric, 2)
        END
      WHERE id = ${shopId}
    `;

    await db.$executeRaw`
      UPDATE "ShopQuote"
      SET
        "metalCostNpr" = CASE WHEN "metalCostNpr" IS NULL THEN NULL ELSE ROUND(("metalCostNpr" * ${rate})::numeric, 2) END,
        "makingChargeNpr" = CASE WHEN "makingChargeNpr" IS NULL THEN NULL ELSE ROUND(("makingChargeNpr" * ${rate})::numeric, 2) END,
        "gemstoneCostNpr" = ROUND(("gemstoneCostNpr" * ${rate})::numeric, 2),
        "finishCostNpr" = ROUND(("finishCostNpr" * ${rate})::numeric, 2),
        "taxNpr" = ROUND(("taxNpr" * ${rate})::numeric, 2),
        "totalPriceNpr" = CASE WHEN "totalPriceNpr" IS NULL THEN NULL ELSE ROUND(("totalPriceNpr" * ${rate})::numeric, 2) END,
        "goldPriceSnapshot" = CASE WHEN "goldPriceSnapshot" IS NULL THEN NULL ELSE ROUND(("goldPriceSnapshot" * ${rate})::numeric, 2) END,
        "advancePaidNpr" = ROUND(("advancePaidNpr" * ${rate})::numeric, 2),
        "balanceDueNpr" = CASE WHEN "balanceDueNpr" IS NULL THEN NULL ELSE ROUND(("balanceDueNpr" * ${rate})::numeric, 2) END
      WHERE "shopId" = ${shopId}
    `;

    await db.$executeRaw`
      UPDATE "ShopQuotePayment" p
      SET "amount" = ROUND((p."amount" * ${rate})::numeric, 2)
      FROM "ShopQuote" q
      WHERE p."shopQuoteId" = q.id
        AND q."shopId" = ${shopId}
    `;

    await db.$executeRaw`
      UPDATE "RfqRequest"
      SET
        "budgetMinNpr" = CASE WHEN "budgetMinNpr" IS NULL THEN NULL ELSE ROUND(("budgetMinNpr" * ${rate})::numeric, 2) END,
        "budgetMaxNpr" = CASE WHEN "budgetMaxNpr" IS NULL THEN NULL ELSE ROUND(("budgetMaxNpr" * ${rate})::numeric, 2) END,
        "estimatedPriceMinNpr" = CASE WHEN "estimatedPriceMinNpr" IS NULL THEN NULL ELSE ROUND(("estimatedPriceMinNpr" * ${rate})::numeric, 2) END,
        "estimatedPriceMaxNpr" = CASE WHEN "estimatedPriceMaxNpr" IS NULL THEN NULL ELSE ROUND(("estimatedPriceMaxNpr" * ${rate})::numeric, 2) END
      WHERE "createdByShopId" = ${shopId}
    `;

    await db.$executeRaw`
      UPDATE "RfqGemstone" g
      SET "estimatedPriceNpr" = CASE
        WHEN g."estimatedPriceNpr" IS NULL THEN NULL
        ELSE ROUND((g."estimatedPriceNpr" * ${rate})::numeric, 2)
      END
      FROM "RfqRequest" r
      WHERE g."rfqId" = r.id
        AND r."createdByShopId" = ${shopId}
    `;

    await db.$executeRaw`
      UPDATE "RfqOffer" o
      SET
        "metalCostNpr" = ROUND((o."metalCostNpr" * ${rate})::numeric, 2),
        "makingChargeNpr" = ROUND((o."makingChargeNpr" * ${rate})::numeric, 2),
        "finishCostNpr" = ROUND((o."finishCostNpr" * ${rate})::numeric, 2),
        "gemstoneCostNpr" = ROUND((o."gemstoneCostNpr" * ${rate})::numeric, 2),
        "taxNpr" = ROUND((o."taxNpr" * ${rate})::numeric, 2),
        "totalPriceNpr" = ROUND((o."totalPriceNpr" * ${rate})::numeric, 2),
        "bookingFeeNpr" = ROUND((o."bookingFeeNpr" * ${rate})::numeric, 2)
      FROM "RfqRequest" r
      WHERE o."rfqId" = r.id
        AND r."createdByShopId" = ${shopId}
    `;

    await db.$executeRaw`
      UPDATE "KarigarWorkshop"
      SET
        "wageRatePerGram" = ROUND(("wageRatePerGram" * ${rate})::numeric, 2)
      WHERE "shopId" = ${shopId}
    `;
  }
}
