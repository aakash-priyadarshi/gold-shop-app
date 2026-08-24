import {
  calculateLineWastage,
  type ResolvedWastageRule,
} from "@gold-shop/shared";
import type {
  CountryTaxConfig,
  InvoiceTaxBreakdown,
  RichLineItem,
} from "./lineItemTypes";

export function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function gemstoneTotal(item: RichLineItem): number {
  return item.gemstones.reduce((s, g) => s + (parseFloat(g.cost) || 0), 0);
}

/** Line total WITHOUT wastage — wastage is a separate invoice add-on. */
export function lineItemTotal(item: RichLineItem): number {
  const mc = parseFloat(item.metalCost) || 0;
  const gc = gemstoneTotal(item);
  const mk = parseFloat(item.makingCost) || 0;
  const rawTotal = (mc + gc + mk) * item.quantity;
  const discount = (item.setDiscountAmount || 0) * item.quantity;
  return Math.max(0, roundMoney2(rawTotal - discount));
}

export function isBlankLine(li: RichLineItem): boolean {
  return (
    !li.inventoryItemId &&
    !li.label?.trim() &&
    lineItemTotal(li) === 0 &&
    !li.details?.trim() &&
    !li.metalType &&
    !li.metalWeightG
  );
}

export function lineMakingPercentBase(item: RichLineItem): number {
  return (
    ((parseFloat(item.metalCost) || 0) + gemstoneTotal(item)) * item.quantity
  );
}

export function isMakingManagedLine(li: RichLineItem): boolean {
  return (
    li.source === "CATALOG" ||
    li.source === "QUOTE" ||
    (parseFloat(li.baseMakingCost || "") || 0) > 0
  );
}

export function resolveLineWastageCost(
  item: RichLineItem,
  invoiceWastagePct: number,
  wastageRule: Pick<ResolvedWastageRule, "mode" | "label">,
): number {
  let wc = parseFloat(item.wastageCost || "") || 0;
  const mc = parseFloat(item.metalCost) || 0;
  const pct =
    parseFloat(item.wastagePercent || "") || invoiceWastagePct || 0;
  if (mc > 0 && pct > 0 && wc <= 0) {
    const mode =
      wastageRule.mode === "DISABLED" ? "WEIGHT_PERCENT" : wastageRule.mode;
    wc = calculateLineWastage(
      {
        metalCost: mc,
        metalWeightG: parseFloat(item.metalWeightG) || 0,
        wastagePercent: pct,
      },
      { mode, percent: pct, label: wastageRule.label },
    ).wastageCost;
  }
  return wc;
}

export function recalcLineWastage(
  item: RichLineItem,
  invoiceWastagePct: number,
  wastageRule: Pick<ResolvedWastageRule, "mode" | "label" | "percent">,
): RichLineItem {
  const mc = parseFloat(item.metalCost) || 0;
  if (mc <= 0) {
    return { ...item, wastageCost: "0" };
  }
  const pct =
    parseFloat(item.wastagePercent || "") ||
    invoiceWastagePct ||
    wastageRule.percent ||
    0;
  if (pct <= 0) {
    return { ...item, wastagePercent: "0", wastageCost: "0" };
  }
  const mode =
    wastageRule.mode === "DISABLED" ? "WEIGHT_PERCENT" : wastageRule.mode;
  const result = calculateLineWastage(
    {
      metalCost: mc,
      metalWeightG: parseFloat(item.metalWeightG) || 0,
      wastagePercent: pct,
    },
    { mode, percent: pct, label: wastageRule.label },
  );
  return {
    ...item,
    wastagePercent: String(pct),
    wastageCost: String(roundMoney2(result.wastageCost)),
  };
}

export function computeWastageTotal(
  lineItems: RichLineItem[],
  invoiceWastagePct: number,
  wastageRule: Pick<ResolvedWastageRule, "mode" | "label">,
): number {
  return roundMoney2(
    lineItems.reduce((sum, item) => {
      const wc = resolveLineWastageCost(item, invoiceWastagePct, wastageRule);
      return sum + wc * item.quantity;
    }, 0),
  );
}

export function computeSubtotal(lineItems: RichLineItem[]): number {
  return roundMoney2(lineItems.reduce((s, li) => s + lineItemTotal(li), 0));
}

export function computeDiscountAmount(
  base: number,
  discountType: "PERCENT" | "FIXED",
  discountValue: number,
): number {
  if (!discountValue || discountValue <= 0) return 0;
  if (discountType === "PERCENT") {
    return roundMoney2((base * discountValue) / 100);
  }
  return roundMoney2(Math.min(discountValue, base));
}

export function computeTaxBreakdown(opts: {
  lineItems: RichLineItem[];
  countryTax: CountryTaxConfig;
  makingChargeAmount: number;
  invoiceWastagePct: number;
  wastageRule: Pick<ResolvedWastageRule, "mode" | "label">;
  isTaxExempt?: boolean;
}): InvoiceTaxBreakdown {
  if (opts.isTaxExempt) {
    return {
      metalTax: 0,
      gemstoneTax: 0,
      makingTax: 0,
      wastageTax: 0,
      totalTax: 0,
    };
  }
  const rates = opts.countryTax.rates;
  let metalTax = 0;
  let gemstoneTax = 0;
  let makingTax = 0;
  let wastageTax = 0;

  for (const item of opts.lineItems) {
    const mc = parseFloat(item.metalCost) || 0;
    const wc = resolveLineWastageCost(
      item,
      opts.invoiceWastagePct,
      opts.wastageRule,
    );
    const gc = gemstoneTotal(item);
    const mk = parseFloat(item.makingCost) || 0;

    metalTax += mc * item.quantity * rates.PRECIOUS_METAL;
    wastageTax += wc * item.quantity * rates.PRECIOUS_METAL;
    gemstoneTax += gc * item.quantity * rates.GEMSTONE;
    makingTax += mk * item.quantity * rates.MAKING_CHARGE;
  }

  makingTax += opts.makingChargeAmount * rates.MAKING_CHARGE;

  for (const item of opts.lineItems) {
    const mc = parseFloat(item.metalCost) || 0;
    const wc = parseFloat(item.wastageCost || "") || 0;
    const gc = gemstoneTotal(item);
    const mk = parseFloat(item.makingCost) || 0;
    const tot = lineItemTotal(item);
    if (mc === 0 && wc === 0 && gc === 0 && mk === 0 && tot > 0) {
      metalTax += tot * opts.countryTax.defaultRate;
    }
  }

  return {
    metalTax: roundMoney2(metalTax),
    gemstoneTax: roundMoney2(gemstoneTax),
    makingTax: roundMoney2(makingTax),
    wastageTax: roundMoney2(wastageTax),
    totalTax: roundMoney2(metalTax + gemstoneTax + makingTax + wastageTax),
  };
}

export function computeGrandTotal(opts: {
  subtotal: number;
  makingChargeAmount: number;
  wastageTotal: number;
  taxTotal: number;
  discountAmount: number;
}): number {
  return roundMoney2(
    opts.subtotal +
      opts.makingChargeAmount +
      opts.wastageTotal +
      opts.taxTotal -
      opts.discountAmount,
  );
}

/** Apply making % or fixed amount onto a single line (manual editor). */
export function applyMakingToLine(
  item: RichLineItem,
  mode: "PERCENT" | "PER_GRAM" | "FIXED",
  value: number,
): RichLineItem {
  if (!value || value <= 0) {
    return { ...item, makingCost: "0" };
  }
  const metal = parseFloat(item.metalCost) || 0;
  const gems = gemstoneTotal(item);
  const weight = parseFloat(item.metalWeightG) || 0;
  let making = 0;
  if (mode === "PERCENT") {
    making = ((metal + gems) * value) / 100;
  } else if (mode === "PER_GRAM") {
    making = weight * value;
  } else {
    making = value;
  }
  return { ...item, makingCost: String(roundMoney2(making)) };
}
