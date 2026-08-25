import {
  getGemstonePricingStoneType,
  normalizeGemstoneOrigin,
  normalizeGemstoneSnapshot,
  normalizeMetalCode,
  toGrams,
} from "@gold-shop/shared";

/** Build the server-facing metal suggestion input from the Product form. */
export function buildProductMetalPricingComposition(input: {
  metalType: string;
  purity?: string | number;
  enteredWeight: number;
  weightUnit: "gram" | "tola";
}) {
  return {
    metalType: normalizeMetalCode(input.metalType, input.purity),
    purity: input.purity,
    metalWeightG:
      input.weightUnit === "tola"
        ? toGrams(input.enteredWeight, "TOLA")
        : input.enteredWeight,
  };
}

export type GemstonePricingErrorCode =
  | "GEMSTONE_TYPE_REQUIRED"
  | "DIAMOND_CARAT_REQUIRED"
  | "GEMSTONE_SIZE_MM_REQUIRED";

export class GemstonePricingError extends Error {
  readonly code: GemstonePricingErrorCode;
  constructor(code: GemstonePricingErrorCode, message: string) {
    super(message);
    this.name = "GemstonePricingError";
    this.code = code;
  }
}

export function buildProductGemstonePricingRequest(
  shopId: string,
  gemstone: object,
) {
  const normalized = normalizeGemstoneSnapshot(gemstone as Record<string, unknown>);
  if (!normalized) {
    throw new GemstonePricingError(
      "GEMSTONE_TYPE_REQUIRED",
      "Select gemstone type first",
    );
  }
  const isDiamond = normalized.type === "DIAMOND";
  if (isDiamond && !(normalized.caratWeight && normalized.caratWeight > 0)) {
    throw new GemstonePricingError(
      "DIAMOND_CARAT_REQUIRED",
      "Carat weight is required for diamond pricing",
    );
  }
  if (!isDiamond && !(normalized.sizeMm && normalized.sizeMm > 0)) {
    throw new GemstonePricingError(
      "GEMSTONE_SIZE_MM_REQUIRED",
      "Size in mm is required for this gemstone pricing",
    );
  }
  return {
    shopId,
    stoneType: getGemstonePricingStoneType(normalized.type),
    caratWeight: normalized.caratWeight,
    sizeMm: normalized.sizeMm,
    qualityTier: normalized.qualityTier || "STANDARD",
    origin: normalizeGemstoneOrigin(normalized.origin, normalized.type),
    count: normalized.count || 1,
  } as const;
}
