import { Injectable } from "@nestjs/common";
import { InventoryItem, ProductVariant } from "@prisma/client";

export type SaleLineSource = "CATALOG" | "POS" | "MANUAL" | "QUOTE";

export type SaleLineCategory =
  | "PRODUCT"
  | "SET"
  | "METAL"
  | "MAKING"
  | "GEMSTONE"
  | "DIAMOND"
  | "DISCOUNT"
  | "OTHER";

export interface BuiltSaleLine {
  label: string;
  category: SaleLineCategory;
  quantity: number;
  unitPrice: number;
  amount: number;
  details?: string;
  inventoryItemId?: string;
  variantId?: string;
  source?: SaleLineSource;
  metalType?: string;
  metalWeightG?: number;
  metalCost?: number;
  makingCost?: number;
  gemstoneCost?: number;
}

type InventoryLike = Pick<
  InventoryItem,
  | "id"
  | "nameEn"
  | "sku"
  | "jewelleryType"
  | "totalWeightGrams"
  | "metalValueNpr"
  | "makingChargeNpr"
  | "gemstoneValueNpr"
  | "taxNpr"
  | "totalPriceNpr"
  | "composition"
  | "hallmarkNumber"
  | "assayOffice"
> & {
  variants?: Pick<ProductVariant, "id" | "sizeLabel" | "sku" | "priceOverride">[];
};

export interface FromInventoryOpts {
  qty?: number;
  variantId?: string | null;
  /** Override unit price (e.g. offline POS agreed price) */
  unitPrice?: number;
  source?: SaleLineSource;
  /**
   * When true, emit separate METAL / MAKING / GEMSTONE lines when breakdown
   * amounts exist; otherwise a single PRODUCT line.
   */
  expandBreakdown?: boolean;
}

@Injectable()
export class SaleBuilderService {
  /**
   * Build invoice line item(s) from a catalog InventoryItem.
   * Amounts are in shop base currency (legacy *Npr field names).
   */
  fromInventoryItem(
    item: InventoryLike,
    opts: FromInventoryOpts = {},
  ): BuiltSaleLine[] {
    const qty = Math.max(1, opts.qty ?? 1);
    const source = opts.source ?? "CATALOG";
    const variant =
      opts.variantId && item.variants
        ? item.variants.find((v) => v.id === opts.variantId)
        : undefined;

    const unitPrice =
      opts.unitPrice ??
      variant?.priceOverride ??
      item.totalPriceNpr;

    const label =
      item.nameEn + (variant?.sizeLabel ? ` (${variant.sizeLabel})` : "");
    const details = [
      variant?.sku || item.sku || null,
      item.hallmarkNumber ? `Hallmark: ${item.hallmarkNumber}` : null,
      item.assayOffice ? `Assay: ${item.assayOffice}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || undefined;

    const metalCost = item.metalValueNpr || 0;
    const makingCost = item.makingChargeNpr || 0;
    const gemstoneCost = item.gemstoneValueNpr || 0;
    const hasBreakdown =
      opts.expandBreakdown !== false &&
      (metalCost > 0 || makingCost > 0 || gemstoneCost > 0) &&
      // Prefer single PRODUCT line when price override differs from sum
      Math.abs(unitPrice - (metalCost + makingCost + gemstoneCost + (item.taxNpr || 0))) < 0.01;

    const metalType = this.extractMetalType(item.composition);

    if (hasBreakdown && opts.expandBreakdown === true) {
      const lines: BuiltSaleLine[] = [];
      if (metalCost > 0) {
        lines.push({
          label: `${label} — Metal`,
          category: "METAL",
          quantity: qty,
          unitPrice: metalCost,
          amount: metalCost * qty,
          details,
          inventoryItemId: item.id,
          variantId: variant?.id,
          source,
          metalType,
          metalWeightG: item.totalWeightGrams,
          metalCost,
        });
      }
      if (makingCost > 0) {
        lines.push({
          label: `${label} — Making`,
          category: "MAKING",
          quantity: qty,
          unitPrice: makingCost,
          amount: makingCost * qty,
          details,
          inventoryItemId: item.id,
          variantId: variant?.id,
          source,
          makingCost,
        });
      }
      if (gemstoneCost > 0) {
        lines.push({
          label: `${label} — Gemstone`,
          category: "GEMSTONE",
          quantity: qty,
          unitPrice: gemstoneCost,
          amount: gemstoneCost * qty,
          details,
          inventoryItemId: item.id,
          variantId: variant?.id,
          source,
          gemstoneCost,
        });
      }
      if (lines.length > 0) return lines;
    }

    return [
      {
        label,
        category: item.jewelleryType === "SET" ? "SET" : "PRODUCT",
        quantity: qty,
        unitPrice,
        amount: unitPrice * qty,
        details,
        inventoryItemId: item.id,
        variantId: variant?.id,
        source,
        metalType,
        metalWeightG: item.totalWeightGrams,
        metalCost: metalCost || undefined,
        makingCost: makingCost || undefined,
        gemstoneCost: gemstoneCost || undefined,
      },
    ];
  }

  /**
   * Build lines from POS session items (keeps inventory refs for void restore).
   */
  fromPosSessionItems(
    items: Array<{
      qty: number;
      unitPrice: number;
      lineTotal: number;
      inventoryItemId: string;
      variantId?: string | null;
      inventoryItem: InventoryLike;
      variant?: Pick<
        ProductVariant,
        "id" | "sizeLabel" | "sku" | "priceOverride"
      > | null;
    }>,
  ): BuiltSaleLine[] {
    return items.flatMap((item) =>
      this.fromInventoryItem(
        {
          ...item.inventoryItem,
          variants: item.variant ? [item.variant] : item.inventoryItem.variants,
        },
        {
          qty: item.qty,
          variantId: item.variantId,
          unitPrice: item.unitPrice,
          source: "POS",
          expandBreakdown: false,
        },
      ),
    );
  }

  /** Optional invoice-level making charge as a dedicated MAKING line. */
  makingChargeLine(
    amount: number,
    ratePercent?: number,
  ): BuiltSaleLine | null {
    if (amount <= 0) return null;
    const label =
      ratePercent && ratePercent > 0
        ? `Making Charges (${ratePercent}%)`
        : "Making Charges";
    return {
      label,
      category: "MAKING",
      quantity: 1,
      unitPrice: amount,
      amount,
      source: "POS",
    };
  }

  private extractMetalType(composition: unknown): string | undefined {
    if (!composition || typeof composition !== "object") return undefined;
    const c = composition as Record<string, unknown>;
    if (typeof c.preciousMetal === "string") return c.preciousMetal;
    if (typeof c.metal === "string") return c.metal;
    if (typeof c.primaryMetal === "string") return c.primaryMetal;
    return undefined;
  }
}
