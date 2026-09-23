/**
 * Workshop metal weights — integer micrograms, never JS Float.
 *
 * Authoritative storage is Prisma Decimal(20, 6) (1e-6 g = 1 µg).
 * Gold Scale accepts multiples of 0.01 g; Stone Scale 0.001 g.
 *
 * Gold 995 is a distinct physical workshop material. It is NOT
 * goldGrains24k / PreciousMetal.GOLD_24K (0.999).
 */

export const WORKSHOP_GOLD_995_MATERIAL_KEY = "goldGrains995";
export const WORKSHOP_GOLD_995_LABEL = "Gold 995";
export const WORKSHOP_GOLD_995_PURITY = "0.995";

export const MICROGRAMS_PER_GRAM = BigInt(1000000);
/** 0.01 g */
export const GOLD_SCALE_QUANTUM_MICROGRAMS = BigInt(10000);
/** 0.001 g */
export const STONE_SCALE_QUANTUM_MICROGRAMS = BigInt(1000);
export const GOLD_SCALE_QUANTUM_GRAMS = "0.01";
export const STONE_SCALE_QUANTUM_GRAMS = "0.001";

export type WorkshopScalePurpose = "GOLD" | "STONE";
export type WorkshopLedgerVersion = "LEGACY" | "TRACEABLE";

const GRAMS_PATTERN = /^-?\d+(\.\d{1,6})?$/;

export class WorkshopDecimalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkshopDecimalError";
  }
}

export function gramsToMicrograms(grams: string): bigint {
  const trimmed = grams.trim();
  if (!GRAMS_PATTERN.test(trimmed)) {
    throw new WorkshopDecimalError(
      "Weight must be a decimal gram string with at most 6 decimal places",
    );
  }
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole, frac = ""] = unsigned.split(".");
  const fracPadded = (frac + "000000").slice(0, 6);
  const micrograms = BigInt(whole) * MICROGRAMS_PER_GRAM + BigInt(fracPadded);
  return negative ? -micrograms : micrograms;
}

export function microgramsToGrams(micrograms: bigint): string {
  const zero = BigInt(0);
  const negative = micrograms < zero;
  const abs = negative ? -micrograms : micrograms;
  const whole = abs / MICROGRAMS_PER_GRAM;
  const frac = (abs % MICROGRAMS_PER_GRAM).toString().padStart(6, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${frac}`;
}

export function quantumMicrograms(purpose: WorkshopScalePurpose): bigint {
  return purpose === "GOLD"
    ? GOLD_SCALE_QUANTUM_MICROGRAMS
    : STONE_SCALE_QUANTUM_MICROGRAMS;
}

export function isQuantumMultiple(
  grams: string,
  purpose: WorkshopScalePurpose,
): boolean {
  try {
    const ug = gramsToMicrograms(grams);
    return ug % quantumMicrograms(purpose) === BigInt(0);
  } catch {
    return false;
  }
}

export function assertPositiveQuantumGrams(
  grams: string,
  purpose: WorkshopScalePurpose,
): bigint {
  const ug = gramsToMicrograms(grams);
  if (ug <= BigInt(0)) {
    throw new WorkshopDecimalError("Weight must be greater than zero");
  }
  if (ug % quantumMicrograms(purpose) !== BigInt(0)) {
    throw new WorkshopDecimalError(
      purpose === "GOLD"
        ? "Gold Scale weights must be multiples of 0.01 g"
        : "Stone Scale weights must be multiples of 0.001 g",
    );
  }
  return ug;
}

export function sumMicrograms(values: readonly bigint[]): bigint {
  return values.reduce((sum, value) => sum + value, BigInt(0));
}

/** Signed gram lines must sum to zero (balanced metal journal). */
export function assertBalancedMicrograms(signedGrams: readonly string[]): void {
  const total = sumMicrograms(signedGrams.map(gramsToMicrograms));
  if (total !== BigInt(0)) {
    throw new WorkshopDecimalError(
      `Metal journal lines must sum to 0 g (got ${microgramsToGrams(total)} g)`,
    );
  }
}
