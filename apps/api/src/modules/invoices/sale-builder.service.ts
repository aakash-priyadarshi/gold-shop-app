import { Injectable } from "@nestjs/common";
import { InventoryItem, ProductVariant } from "@prisma/client";
import { normalizeGemstoneSnapshot, resolveGemstoneRawList } from "@gold-shop/shared";
import type { InvoiceGemstoneSnapshotDto } from "./dto/invoice.dto";

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
  gemstones?: InvoiceGemstoneSnapshotDto[];
  wastageCost?: number;
  discountAmount?: number;
  setDiscountAmount?: number;
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
> & {
  hallmarkNumber?: string | null;
  assayOffice?: string | null;
  gemstones?: any;
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

function toGemstoneSnapshots(raw: unknown): InvoiceGemstoneSnapshotDto[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((gem): InvoiceGemstoneSnapshotDto[] => {
    const normalized = normalizeGemstoneSnapshot(
      gem && typeof gem === "object" ? gem as Record<string, unknown> : undefined,
    );
    if (!normalized) return [];
    return [{
      type: normalized.type,
      origin: normalized.origin,
      shape: normalized.shape,
      cut: normalized.cut,
      caratWeight: normalized.caratWeight,
      sizeMm: normalized.sizeMm,
      color: normalized.color,
      clarity: normalized.clarity,
      qualityTier: normalized.qualityTier,
      cutGrade: normalized.cutGrade,
      gradingLab: normalized.gradingLab,
      certNumber: normalized.certNumber,
      reportUrl: normalized.reportUrl,
      reportDate: normalized.reportDate,
      count: normalized.count,
      cost: normalized.cost ?? normalized.value,
    }];
  });
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
    const rawGemstones = resolveGemstoneRawList(
      (item as any).gemstones,
      (item.composition as any)?.gemstones,
    );
    const gemstones = toGemstoneSnapshots(rawGemstones);
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

    const metalType = (item.composition as any)?.metalType ?? (item.composition as any)?.type;

    if (hasBreakdown && opts.expandBreakdown === true) {
      const lines: BuiltSaleLine[] = [];
      let stockAttached = false;
      const attachStock = () => {
        if (stockAttached) return undefined;
        stockAttached = true;
        return item.id;
      };
      if (metalCost > 0) {
        lines.push({
          label: `${label} — Metal`,
          category: "METAL",
          quantity: qty,
          unitPrice: metalCost,
          amount: metalCost * qty,
          details,
          inventoryItemId: attachStock(),
          variantId: variant?.id,
          source,
          metalType,
          metalWeightG: item.totalWeightGrams,
          metalCost,
          gemstones: gemstoneCost > 0 ? undefined : gemstones,
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
          inventoryItemId: attachStock(),
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
          inventoryItemId: attachStock(),
          variantId: variant?.id,
          source,
          gemstoneCost,
          gemstones,
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
        gemstones: gemstones.length ? gemstones : undefined,
      },
    ];
  }

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

  /**
   * Categories that already map cleanly to the tax engine / Nepal reports.
   * Jewellery types (RING, NECKLACE, PRODUCT, SET, …) are NOT tax categories.
   */
  static isTaxCategory(category: string): boolean {
    const v = (category || "").trim().toUpperCase();
    return [
      "METAL",
      "MAKING",
      "GEMSTONE",
      "DIAMOND",
      "FINISH",
      "PLATING",
      "DISCOUNT",
      "TAX",
      "GOLD_METAL",
      "GOLD_MAKING",
      "SILVER_METAL",
      "SILVER_MAKING",
    ].includes(v);
  }

  /**
   * Expand a collapsed jewellery / PRODUCT line into METAL / MAKING / GEMSTONE
   * when breakdown amounts are present. Otherwise remap jewellery categories to
   * METAL so NP/IN tax engines don't treat the amount as untaxed OTHER.
   *
   * Stock-safe: inventoryItemId is attached only to the first emitted line so
   * StockCommitService.linesFromInvoiceItems does not over-decrement.
   */
  expandCollapsedLine(input: {
    label: string;
    category: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    details?: string;
    inventoryItemId?: string;
    variantId?: string;
    metalCost?: number;
    makingCost?: number;
    gemstoneCost?: number;
    gemstones?: InvoiceGemstoneSnapshotDto[];
    wastageCost?: number;
    metalType?: string;
    metalWeightG?: number;
    source?: SaleLineSource;
    taxTreatment?: "TAXABLE" | "EXEMPT";
    discountAmount?: number;
    setDiscountAmount?: number;
  }): Array<
    BuiltSaleLine & { taxTreatment?: "TAXABLE" | "EXEMPT" }
  > {
    const qty = Math.max(1, input.quantity || 1);
    const source = input.source ?? "MANUAL";
    const cat = (input.category || "").trim().toUpperCase();

    // Already a tax-category line — keep as-is (drop zero PRODUCT headers upstream).
    if (SaleBuilderService.isTaxCategory(cat)) {
      return [
        {
          label: input.label,
          category: cat as SaleLineCategory,
          quantity: qty,
          unitPrice: input.unitPrice,
          amount: input.amount,
          details: input.details,
          inventoryItemId: input.inventoryItemId,
          variantId: input.variantId,
          source,
          metalType: input.metalType,
          metalWeightG: input.metalWeightG,
          metalCost: input.metalCost,
          makingCost: input.makingCost,
          gemstoneCost: input.gemstoneCost,
          gemstones: input.gemstones,
          wastageCost: input.wastageCost,
          taxTreatment: input.taxTreatment,
          discountAmount: input.discountAmount,
          setDiscountAmount: input.setDiscountAmount,
        },
      ];
    }

    const metalCost = Math.max(0, Number(input.metalCost) || 0);
    const makingCost = Math.max(0, Number(input.makingCost) || 0);
    const gemstoneCost = Math.max(0, Number(input.gemstoneCost) || 0);
    const wastageCost = Math.max(0, Number(input.wastageCost) || 0);
    const hasBreakdown =
      metalCost > 0 || makingCost > 0 || gemstoneCost > 0 || wastageCost > 0;

    if (hasBreakdown) {
      const lines: Array<BuiltSaleLine & { taxTreatment?: "TAXABLE" | "EXEMPT" }> =
        [];
      let stockAttached = false;
      const attachStock = () => {
        if (stockAttached || !input.inventoryItemId) return undefined;
        stockAttached = true;
        return input.inventoryItemId;
      };

      if (metalCost > 0) {
        lines.push({
          label: `${input.label} — Metal`,
          category: "METAL",
          quantity: qty,
          unitPrice: metalCost,
          amount: Math.round(metalCost * qty * 100) / 100,
          details: input.details,
          inventoryItemId: attachStock(),
          variantId: input.variantId,
          source,
          metalType: input.metalType,
          metalWeightG: input.metalWeightG,
          metalCost,
          gemstones: gemstoneCost > 0 ? undefined : input.gemstones,
          taxTreatment: input.taxTreatment,
          discountAmount: input.discountAmount,
          setDiscountAmount: input.setDiscountAmount,
        });
      }
      // Wastage is taxed like precious metal in South Asian jewellery billing.
      if (wastageCost > 0) {
        lines.push({
          label: `${input.label} — Wastage`,
          category: "METAL",
          quantity: qty,
          unitPrice: wastageCost,
          amount: Math.round(wastageCost * qty * 100) / 100,
          details: input.details,
          inventoryItemId: attachStock(),
          variantId: input.variantId,
          source,
          wastageCost,
          taxTreatment: input.taxTreatment,
          discountAmount: input.discountAmount,
          setDiscountAmount: input.setDiscountAmount,
        });
      }
      if (makingCost > 0) {
        lines.push({
          label: `${input.label} — Making`,
          category: "MAKING",
          quantity: qty,
          unitPrice: makingCost,
          amount: Math.round(makingCost * qty * 100) / 100,
          details: input.details,
          inventoryItemId: attachStock(),
          variantId: input.variantId,
          source,
          makingCost,
          taxTreatment: input.taxTreatment,
          discountAmount: input.discountAmount,
          setDiscountAmount: input.setDiscountAmount,
        });
      }
      if (gemstoneCost > 0) {
        lines.push({
          label: `${input.label} — Gemstone`,
          category: "GEMSTONE",
          quantity: qty,
          unitPrice: gemstoneCost,
          amount: Math.round(gemstoneCost * qty * 100) / 100,
          details: input.details,
          inventoryItemId: attachStock(),
          variantId: input.variantId,
          source,
          gemstoneCost,
          gemstones: input.gemstones,
          taxTreatment: input.taxTreatment,
          discountAmount: input.discountAmount,
          setDiscountAmount: input.setDiscountAmount,
        });
      }
      if (lines.length > 0) {
        const eligibleBase = (metalCost + makingCost + gemstoneCost) * qty;
        const totalWastage = Math.round(wastageCost * qty * 100) / 100;
        const targetEligibleAmount = Math.max(
          0,
          Math.round((input.amount - totalWastage) * 100) / 100,
        );

        if (
          eligibleBase > 0 &&
          Math.abs(eligibleBase - targetEligibleAmount) > 0.001
        ) {
          const scale = targetEligibleAmount / eligibleBase;
          const eligibleLines = lines.filter(
            (l) => l.wastageCost === undefined || l.wastageCost === 0,
          );
          let runningEligible = 0;
          for (let i = 0; i < eligibleLines.length; i++) {
            const rawUnit = eligibleLines[i].unitPrice;
            if (i === eligibleLines.length - 1) {
              const remainingAmount = Math.max(
                0,
                Math.round((targetEligibleAmount - runningEligible) * 100) / 100,
              );
              // Amounts are persisted at currency precision, but a final
              // allocation can be indivisible by quantity (e.g. 100.00 / 3).
              // Keep a high-precision unit price in the JSON line item and
              // make the persisted invariant explicit:
              // round(unitPrice * quantity, 2) === amount.
              // Rounding unitPrice to cents here would make that impossible.
              eligibleLines[i].unitPrice = remainingAmount / qty;
              eligibleLines[i].amount =
                Math.round(eligibleLines[i].unitPrice * qty * 100) / 100;
            } else {
              eligibleLines[i].unitPrice =
                Math.round(rawUnit * scale * 100) / 100;
              eligibleLines[i].amount =
                Math.round(eligibleLines[i].unitPrice * qty * 100) / 100;
              runningEligible += eligibleLines[i].amount;
            }
            if (eligibleLines[i].metalCost != null) {
              eligibleLines[i].metalCost = eligibleLines[i].unitPrice;
            }
            if (eligibleLines[i].makingCost != null) {
              eligibleLines[i].makingCost = eligibleLines[i].unitPrice;
            }
            if (eligibleLines[i].gemstoneCost != null) {
              eligibleLines[i].gemstoneCost = eligibleLines[i].unitPrice;
            }
          }
        }
        return lines;
      }
    }

    // No breakdown: treat full jewellery amount as METAL for tax engines
    // (NP skill fee / IN metal GST). PRODUCT/SET/RING/OTHER → METAL.
    return [
      {
        label: input.label,
        category: "METAL",
        quantity: qty,
        unitPrice: input.unitPrice,
        amount: input.amount,
        details: input.details,
        inventoryItemId: input.inventoryItemId,
        variantId: input.variantId,
        source,
        metalType: input.metalType,
        metalWeightG: input.metalWeightG,
        gemstones: input.gemstones,
        taxTreatment: input.taxTreatment,
        discountAmount: input.discountAmount,
        setDiscountAmount: input.setDiscountAmount,
      },
    ];
  }

  /**
   * Normalize a full invoice line list: drop $0 PRODUCT headers, expand
   * collapsed jewellery lines, fold invoice-level makingChargesAmt.
   */
  normalizeInvoiceLines(
    lines: Array<{
      label: string;
      category: string;
      quantity: number;
      unitPrice: number;
      amount: number;
      details?: string;
      inventoryItemId?: string;
      variantId?: string;
      metalCost?: number;
      makingCost?: number;
      gemstoneCost?: number;
      gemstones?: InvoiceGemstoneSnapshotDto[];
      wastageCost?: number;
      metalType?: string;
      metalWeightG?: number;
      taxTreatment?: "TAXABLE" | "EXEMPT";
      discountAmount?: number;
      setDiscountAmount?: number;
    }>,
    opts: {
      makingChargesAmt?: number;
      makingChargeRate?: number;
    } = {},
  ): Array<
    BuiltSaleLine & { taxTreatment?: "TAXABLE" | "EXEMPT" }
  > {
    const expanded = lines.flatMap((li) => {
      // Drop zero-amount PRODUCT headers (quote convert legacy)
      if (
        (li.category || "").toUpperCase() === "PRODUCT" &&
        (li.amount || 0) <= 0
      ) {
        return [];
      }
      return this.expandCollapsedLine({
        ...li,
        source: li.inventoryItemId ? "CATALOG" : "MANUAL",
      });
    });

    const hasMakingLine = expanded.some(
      (l) => (l.category || "").toUpperCase() === "MAKING" && l.amount > 0,
    );
    const invoiceMaking = Math.max(0, Number(opts.makingChargesAmt) || 0);
    if (invoiceMaking > 0 && !hasMakingLine) {
      const making = this.makingChargeLine(
        invoiceMaking,
        opts.makingChargeRate,
      );
      if (making) expanded.push(making);
    }

    return expanded;
  }

  private extractMetalType(composition: unknown): string | undefined {
    if (!composition || typeof composition !== "object") return undefined;
    const c = composition as Record<string, unknown>;
    if (typeof c.preciousMetal === "string") return c.preciousMetal;
    if (typeof c.metal === "string") return c.metal;
    if (typeof c.primaryMetal === "string") return c.primaryMetal;
    if (typeof c.alloy === "string") return c.alloy;
    if (typeof c.coreMetal === "string") return c.coreMetal;
    const baseAlloy = c.baseAlloy;
    if (baseAlloy && typeof baseAlloy === "object") {
      const ba = baseAlloy as Record<string, unknown>;
      if (typeof ba.metal === "string" && ba.metal) {
        const metal = ba.metal.toUpperCase();
        if (/^(GOLD|SILVER|PLATINUM|PALLADIUM)_\w+/.test(metal)) return metal;
        const p = String(ba.purity || "")
          .toUpperCase()
          .replace(/\s+/g, "");
        if (metal === "GOLD" || metal.startsWith("GOLD")) {
          if (p.includes("24") || p === "999") return "GOLD_24K";
          if (p.includes("22") || p === "916") return "GOLD_22K";
          if (p.includes("18") || p === "750") return "GOLD_18K";
          if (p.includes("14") || p === "585") return "GOLD_14K";
          return "GOLD_22K";
        }
        if (metal === "SILVER" || metal.startsWith("SILVER")) {
          return p.includes("999") ? "SILVER_999" : "SILVER_925";
        }
        if (metal === "PLATINUM" || metal.startsWith("PLATINUM")) {
          return p.includes("900") ? "PLATINUM_900" : "PLATINUM_950";
        }
        return metal;
      }
    }
    return undefined;
  }
}
