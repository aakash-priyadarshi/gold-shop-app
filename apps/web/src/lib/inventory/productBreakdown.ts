export type ProductGemstone = {
  type: string;
  cut?: string;
  caratWeight?: number;
  color?: string;
  clarity?: string;
  cutGrade?: string;
  lab?: string;
  certNumber?: string;
  reportUrl?: string;
  reportDate?: string;
  valueNpr: number;
};

export type InventoryBreakdownSource = {
  composition?: unknown;
  gemstones?: unknown;
  totalWeightGrams?: number;
  weightGrams?: number;
  metalValueNpr?: number;
  makingChargeNpr?: number;
  wastagePercent?: number;
  gemstoneValueNpr?: number;
  taxNpr?: number;
  totalPriceNpr?: number;
  metalPurity?: string;
};

export type ProductBreakdown = {
  metalType: string;
  purity: string;
  weightGrams: number;
  metalValue: number;
  makingCharge: number;
  wastagePercent: number;
  wastageAmount: number;
  gemstones: ProductGemstone[];
  gemstoneValue: number;
  tax: number;
  catalogTotal: number;
  estimatedBill: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function parseMetalFromComposition(
  composition: unknown,
  fallbackPurity?: string,
): { metalType: string; purity: string } {
  const root = asRecord(composition);
  const alloy = asRecord(root?.baseAlloy) ?? root;
  return {
    metalType: readString(alloy?.metal) || readString(root?.metal),
    purity:
      readString(alloy?.purity) ||
      readString(root?.purity) ||
      readString(fallbackPurity),
  };
}

function parseGemstone(raw: unknown): ProductGemstone | null {
  const row = asRecord(raw);
  if (!row) return null;
  const type = readString(row.type);
  if (!type) return null;
  return {
    type,
    cut: readString(row.cut) || undefined,
    caratWeight: readNumber(row.caratWeight) || undefined,
    color: readString(row.color) || undefined,
    clarity: readString(row.clarity) || undefined,
    cutGrade: readString(row.cutGrade) || undefined,
    lab: readString(row.lab) || undefined,
    certNumber: readString(row.certNumber) || undefined,
    reportUrl: readString(row.reportUrl) || undefined,
    reportDate: readString(row.reportDate) || undefined,
    valueNpr: readNumber(row.valueNpr),
  };
}

export function parseProductGemstones(
  source: InventoryBreakdownSource,
): ProductGemstone[] {
  const composition = asRecord(source.composition);
  const fromField = source.gemstones;
  const nestedField = asRecord(fromField)?.gemstones;
  const raw = Array.isArray(composition?.gemstones)
    ? composition.gemstones
    : Array.isArray(fromField)
      ? fromField
      : Array.isArray(nestedField)
        ? nestedField
        : [];

  return raw
    .map(parseGemstone)
    .filter((gem): gem is ProductGemstone => gem != null);
}

/**
 * Catalog pricing breakdown for showing a piece to a walk-in customer.
 * Wastage (jarti) is stored as a default % and applied on the bill — it is
 * not part of `totalPriceNpr` (metal + making + gems + tax).
 */
export function buildProductBreakdown(
  source: InventoryBreakdownSource,
): ProductBreakdown {
  const { metalType, purity } = parseMetalFromComposition(
    source.composition,
    source.metalPurity,
  );
  const metalValue = readNumber(source.metalValueNpr);
  const makingCharge = readNumber(source.makingChargeNpr);
  const wastagePercent = readNumber(source.wastagePercent);
  const gemstones = parseProductGemstones(source);
  const gemstoneFromLines = gemstones.reduce((sum, gem) => sum + gem.valueNpr, 0);
  const gemstoneValue = readNumber(source.gemstoneValueNpr) || gemstoneFromLines;
  const tax = readNumber(source.taxNpr);
  const wastageAmount = roundMoney2(metalValue * (wastagePercent / 100));
  const catalogTotal =
    readNumber(source.totalPriceNpr) ||
    roundMoney2(metalValue + makingCharge + gemstoneValue + tax);

  return {
    metalType,
    purity,
    weightGrams: readNumber(source.totalWeightGrams ?? source.weightGrams),
    metalValue,
    makingCharge,
    wastagePercent,
    wastageAmount,
    gemstones,
    gemstoneValue,
    tax,
    catalogTotal,
    estimatedBill: roundMoney2(catalogTotal + wastageAmount),
  };
}

export function hasPricingBreakdown(breakdown: ProductBreakdown): boolean {
  return (
    breakdown.metalValue > 0 ||
    breakdown.makingCharge > 0 ||
    breakdown.gemstoneValue > 0 ||
    breakdown.wastagePercent > 0 ||
    breakdown.tax > 0 ||
    breakdown.gemstones.length > 0
  );
}
