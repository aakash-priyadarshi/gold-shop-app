/** One metric carat is exactly 200 milligrams. */
export const CARAT_TO_GRAMS = 0.2;

type GemstoneWeightLine = {
  caratWeight?: unknown;
  count?: unknown;
  quantity?: unknown;
};

function asFiniteNonNegative(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function gemstoneLines(value: unknown): GemstoneWeightLine[] {
  if (Array.isArray(value)) return value as GemstoneWeightLine[];
  if (!value || typeof value !== "object") return [];

  const nested = (value as { gemstones?: unknown }).gemstones;
  return Array.isArray(nested) ? (nested as GemstoneWeightLine[]) : [];
}

function roundWeight(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/** Sum gemstone carats, including an optional count/quantity on each line. */
export function calculateGemstoneCarats(value: unknown): number {
  return roundWeight(
    gemstoneLines(value).reduce((total, line) => {
      const carats = asFiniteNonNegative(line?.caratWeight);
      const rawCount = line?.count ?? line?.quantity;
      const count = rawCount == null ? 1 : asFiniteNonNegative(rawCount);
      return total + carats * count;
    }, 0),
  );
}

export function calculateGemstoneWeightGrams(value: unknown): number {
  return roundWeight(calculateGemstoneCarats(value) * CARAT_TO_GRAMS);
}

/** Gross jewellery weight = metal weight + total gemstone weight. */
export function calculateGrossWeightGrams(
  metalWeightGrams: unknown,
  gemstonesOrComposition: unknown,
): number {
  return roundWeight(
    asFiniteNonNegative(metalWeightGrams) +
      calculateGemstoneWeightGrams(gemstonesOrComposition),
  );
}
