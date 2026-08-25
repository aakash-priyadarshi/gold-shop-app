/**
 * Composition & Gemstone Canonical Helpers
 * Used across API, Web, Desktop, and Shared packages.
 */

export interface CanonicalGemstone {
  value: string;
  label: string;
}

/** The production origin of a diamond, independent from its grading laboratory. */
export type GemstoneOrigin = "NATURAL" | "LAB";

/** Pricing bands are intentionally separate from gemological clarity. */
export type GemstoneQualityTier = "BUDGET" | "STANDARD" | "PREMIUM";

/**
 * Immutable product/invoice gemstone metadata.  `type` is the seller-facing
 * stone identity; `getGemstonePricingStoneType` derives the narrower pricing
 * category without losing that identity.
 */
export interface CanonicalGemstoneSnapshot {
  type: string;
  /** Diamond production origin (NATURAL/LAB) or provenance retained for other stones. */
  origin?: string;
  cut?: string;
  shape?: string;
  caratWeight?: number;
  sizeMm?: number;
  color?: string;
  clarity?: string;
  qualityTier?: GemstoneQualityTier;
  cutGrade?: string;
  gradingLab?: string;
  certNumber?: string;
  reportUrl?: string;
  reportDate?: string;
  count?: number;
  value?: number;
  cost?: number;
}

export const CANONICAL_GEMSTONE_TYPES: readonly CanonicalGemstone[] = [
  { value: "DIAMOND", label: "Diamond" },
  { value: "RUBY", label: "Ruby" },
  { value: "EMERALD", label: "Emerald" },
  { value: "SAPPHIRE", label: "Sapphire" },
  { value: "PEARL", label: "Pearl" },
  { value: "AMETHYST", label: "Amethyst" },
  { value: "TOPAZ", label: "Topaz" },
  { value: "OPAL", label: "Opal" },
  { value: "GARNET", label: "Garnet" },
  { value: "TURQUOISE", label: "Turquoise" },
  { value: "CORAL", label: "Coral" },
  { value: "JADE", label: "Jade" },
  { value: "CITRINE", label: "Citrine" },
  { value: "PERIDOT", label: "Peridot" },
  { value: "AQUAMARINE", label: "Aquamarine" },
  { value: "TOURMALINE", label: "Tourmaline" },
  { value: "OTHER", label: "Other" },
] as const;

export const CANONICAL_GEMSTONE_CUTS = [
  "Round Brilliant",
  "Princess",
  "Oval",
  "Cushion",
  "Emerald",
  "Pear",
  "Marquise",
  "Radiant",
  "Heart",
  "Asscher",
  "Cabochon",
  "Other",
] as const;

export const CANONICAL_GEMSTONE_CLARITIES = [
  "FL",
  "IF",
  "VVS1",
  "VVS2",
  "VS1",
  "VS2",
  "SI1",
  "SI2",
  "I1",
  "I2",
  "I3",
  "N/A",
] as const;

export const CANONICAL_GEMSTONE_COLORS = [
  "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "Fancy",
] as const;

export const CANONICAL_GEMSTONE_CUT_GRADES = [
  "Excellent",
  "Very Good",
  "Good",
  "Fair",
  "Poor",
] as const;

export const CANONICAL_GEMSTONE_LABS = [
  "GIA",
  "IGI",
  "AGS",
  "SGL",
  "GII",
  "Other",
] as const;

/**
 * Normalize a gemstone type string to canonical uppercase code (e.g. "Diamond" -> "DIAMOND")
 */
export function normalizeGemstoneType(raw?: string | null): string {
  if (!raw) return "";
  const cleaned = String(raw).trim().toUpperCase().replace(/\s+/g, "_");
  if (!cleaned) return "";
  const found = CANONICAL_GEMSTONE_TYPES.find(
    (g) => g.value === cleaned || g.label.toUpperCase() === cleaned,
  );
  if (found) return found.value;
  if (cleaned === "EMERALD_CUT") return "EMERALD";
  if (cleaned === "CZ") return "CUBIC_ZIRCONIA";
  if (cleaned === "DIAMOND_LAB" || cleaned === "DIAMOND_LAB_GROWN") {
    return "DIAMOND";
  }
  if (cleaned === "DIAMOND_NATURAL") return "DIAMOND";
  return cleaned;
}

/** Normalize legacy and current diamond-origin values without conflating origin and laboratory. */
export function normalizeGemstoneOrigin(
  raw?: string | null,
  gemstoneType?: string | null,
): GemstoneOrigin | undefined {
  const type = String(gemstoneType || "").trim().toUpperCase();
  const value = String(raw || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (type === "DIAMOND_LAB" || type === "DIAMOND_LAB_GROWN") return "LAB";
  if (type === "DIAMOND_NATURAL") return "NATURAL";
  if (value === "LAB" || value === "LAB_GROWN" || value === "LABORATORY_GROWN") return "LAB";
  if (value === "NATURAL") return "NATURAL";
  return undefined;
}

/**
 * Canonicalize a persisted/read gemstone object while retaining all useful
 * seller metadata. `lab` is the legacy name for gradingLab, not origin.
 */
export function normalizeGemstoneSnapshot(
  raw: Record<string, unknown> | null | undefined,
): CanonicalGemstoneSnapshot | null {
  if (!raw || typeof raw !== "object") return null;

  const originalType = String(raw.type ?? raw.stoneType ?? "");
  const type = normalizeGemstoneType(originalType);
  if (!type) return null;
  const toNumber = (value: unknown): number | undefined => {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const text = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim() ? value.trim() : undefined;
  const quality = String(raw.qualityTier ?? raw.pricingQuality ?? raw.quality ?? "")
    .trim()
    .toUpperCase();

  return {
    type,
    origin:
      normalizeGemstoneOrigin(String(raw.origin ?? ""), originalType) ??
      text(raw.origin),
    cut: normalizeGemstoneCut(text(raw.cut) ?? text(raw.shape)),
    shape: text(raw.shape),
    caratWeight: toNumber(raw.caratWeight),
    sizeMm: toNumber(raw.sizeMm),
    color: text(raw.color),
    clarity: text(raw.clarity),
    qualityTier:
      quality === "BUDGET" || quality === "STANDARD" || quality === "PREMIUM"
        ? quality
        : undefined,
    cutGrade: text(raw.cutGrade),
    gradingLab: text(raw.gradingLab) ?? text(raw.lab),
    certNumber: text(raw.certNumber),
    reportUrl: text(raw.reportUrl),
    reportDate: text(raw.reportDate),
    count: toNumber(raw.count ?? raw.pieces),
    value: toNumber(raw.value ?? raw.valueNpr),
    cost: toNumber(raw.cost),
  };
}

/** Return the core pricing category without changing the persisted stone type. */
export function getGemstonePricingStoneType(raw?: string | null): string {
  const type = normalizeGemstoneType(raw);
  if (type === "CUBIC_ZIRCONIA") return "CZ";
  if (
    ["DIAMOND", "MOISSANITE", "RUBY", "SAPPHIRE", "EMERALD", "PEARL"].includes(type)
  ) {
    return type;
  }
  return "SEMI_PRECIOUS";
}

/**
 * Get human display label for a gemstone code (e.g. "DIAMOND" -> "Diamond")
 */
export function getGemstoneDisplayLabel(code?: string | null): string {
  if (!code) return "";
  const normalized = normalizeGemstoneType(code);
  const found = CANONICAL_GEMSTONE_TYPES.find((g) => g.value === normalized);
  return found ? found.label : code;
}

/**
 * Normalize a gemstone cut string to standard title case (e.g. "round" -> "Round Brilliant", "emerald cut" -> "Emerald")
 */
export function normalizeGemstoneCut(raw?: string | null): string {
  if (!raw) return "";
  const str = String(raw).trim();
  const lower = str.toLowerCase();
  if (lower === "round" || lower === "round brilliant") return "Round Brilliant";
  if (lower === "emerald" || lower === "emerald cut") return "Emerald";
  const matched = CANONICAL_GEMSTONE_CUTS.find(
    (c) => c.toLowerCase() === lower,
  );
  return matched || str;
}

/**
 * Normalize metal + purity to standard code (e.g. ("GOLD", "22K") -> "GOLD_22K")
 */
export function normalizeMetalCode(metal?: string | null, purity?: string | number | null): string {
  const m = String(metal || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  if (!m) return "";

  // Already formatted (e.g. GOLD_22K, SILVER_925, PLATINUM_950)
  if (/^(GOLD|SILVER|PLATINUM|PALLADIUM)_\w+/.test(m)) {
    // Standardize platinum/palladium naming
    if (m === "PLATINUM_PT950") return "PLATINUM_950";
    if (m === "PLATINUM_PT900") return "PLATINUM_900";
    if (m === "PALLADIUM_PD950") return "PALLADIUM_950";
    if (m === "PALLADIUM_PD500") return "PALLADIUM_500";
    return m;
  }

  const p = String(purity ?? "")
    .toUpperCase()
    .replace(/\s+/g, "");

  if (m === "GOLD" || m.startsWith("GOLD")) {
    if (p.includes("24") || p === "999" || p === "0.999" || p === "99.9") return "GOLD_24K";
    if (p.includes("22") || p === "916" || p === "0.916" || p === "91.6") return "GOLD_22K";
    if (p.includes("18") || p === "750" || p === "0.75" || p === "75") return "GOLD_18K";
    if (p.includes("14") || p === "585" || p === "0.585" || p === "58.5") return "GOLD_14K";
    if (p.includes("10") || p === "417" || p === "0.417" || p === "41.7") return "GOLD_10K";
    return "GOLD_22K";
  }

  if (m === "SILVER" || m.startsWith("SILVER")) {
    if (p.includes("999") || p === "0.999" || p === "99.9") return "SILVER_999";
    return "SILVER_925";
  }

  if (m === "PLATINUM" || m.startsWith("PLATINUM")) {
    if (p.includes("900") || p === "PT900") return "PLATINUM_900";
    return "PLATINUM_950";
  }

  if (m === "PALLADIUM" || m.startsWith("PALLADIUM")) {
    if (p.includes("500") || p === "PD500" || p === "0.5" || p === "50") return "PALLADIUM_500";
    return "PALLADIUM_950";
  }

  return m;
}

/**
 * Extract normalized precious metal code from various composition structures:
 * - Direct alloyType / metalType / composition string ("GOLD_22K")
 * - Composition object with preciousMetal + purity: { preciousMetal: "GOLD", purity: "22K" }
 * - Composition object with nested baseAlloy: { baseAlloy: { metal: "GOLD", purity: "22K" } }
 */
export function extractMetalTypeFromComposition(composition: unknown): string | undefined {
  if (!composition) return undefined;

  // 1. Direct string
  if (typeof composition === "string") {
    return normalizeMetalCode(composition);
  }

  if (typeof composition !== "object") return undefined;
  const c = composition as Record<string, unknown>;

  // 2. Direct top-level metal key: metalType, metal, alloyType, baseMetal, preciousMetal, etc.
  for (const key of [
    "metalType",
    "alloyType",
    "preciousMetal",
    "metal",
    "baseMetal",
    "standardAlloy",
  ]) {
    if (typeof c[key] === "string" && c[key]) {
      return normalizeMetalCode(
        c[key] as string,
        typeof c.purity === "string" || typeof c.purity === "number" ? c.purity : undefined,
      );
    }
  }

  // 3. Nested baseAlloy object: { baseAlloy: { metal: "GOLD", purity: "22K" } }
  const baseAlloy = c.baseAlloy;
  if (baseAlloy && typeof baseAlloy === "object") {
    const ba = baseAlloy as Record<string, unknown>;
    if (typeof ba.metal === "string" && ba.metal) {
      return normalizeMetalCode(
        ba.metal,
        typeof ba.purity === "string" || typeof ba.purity === "number" ? ba.purity : undefined,
      );
    }
  }

  return undefined;
}

export const METAL_TO_MARKET_KEY_MAP: Record<string, string> = {
  PLATINUM_950: "PLATINUM_PT950",
  PLATINUM_PT950: "PLATINUM_PT950",
  PLATINUM_900: "PLATINUM_PT900",
  PLATINUM_PT900: "PLATINUM_PT900",
  PALLADIUM_950: "PALLADIUM_PD950",
  PALLADIUM_PD950: "PALLADIUM_PD950",
  PALLADIUM_500: "PALLADIUM_PD500",
  PALLADIUM_PD500: "PALLADIUM_PD500",
};

export function normalizeMetalMarketKey(metal?: string | null): string {
  if (!metal) return "";
  const code = normalizeMetalCode(metal);
  return (
    METAL_TO_MARKET_KEY_MAP[code] ||
    METAL_TO_MARKET_KEY_MAP[metal.toUpperCase()] ||
    code ||
    metal
  );
}

/**
 * Purity as fraction (0–1). Returns 0.916 for 22K, 0.999 for 24K, etc.
 */
export function extractPurityFromComposition(composition: unknown): number {
  if (!composition || typeof composition !== "object") return 1;
  const c = composition as Record<string, unknown>;

  const metalCode = extractMetalTypeFromComposition(composition);
  const isExplicitGold = Boolean(
    metalCode === "GOLD" || metalCode?.startsWith("GOLD_"),
  );

  // Check direct number
  const raw =
    c.purity ??
    (typeof c.baseAlloy === "object" && c.baseAlloy
      ? (c.baseAlloy as any).purity
      : undefined);
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw <= 1 && raw > 0) return raw;
    // Map numeric 8–24 values as karats ONLY when composition is explicitly GOLD
    if (isExplicitGold) {
      const KARAT_FRACTIONS: Record<number, number> = {
        24: 0.999,
        23: 0.958,
        22: 0.916,
        21: 0.875,
        20: 0.833,
        18: 0.75,
        16: 0.667,
        14: 0.585,
        12: 0.5,
        10: 0.417,
        9: 0.375,
        8: 0.333,
      };
      const rounded = Math.round(raw);
      if (KARAT_FRACTIONS[rounded]) {
        return KARAT_FRACTIONS[rounded];
      }
    }
    if (raw > 1 && raw <= 100) return raw / 100;
    if (raw > 100 && raw <= 1000) return raw / 1000;
  }

  if (typeof c.purityPercent === "number" && Number.isFinite(c.purityPercent)) {
    return c.purityPercent / 100;
  }

  // Derive from normalized metal code
  if (metalCode) {
    const purityMap: Record<string, number> = {
      GOLD_24K: 0.999,
      GOLD_22K: 0.916,
      GOLD_18K: 0.75,
      GOLD_14K: 0.585,
      GOLD_10K: 0.417,
      SILVER_999: 0.999,
      SILVER_925: 0.925,
      PLATINUM_950: 0.95,
      PLATINUM_900: 0.9,
      PALLADIUM_950: 0.95,
      PALLADIUM_500: 0.5,
      PALLADIUM_PD950: 0.95,
      PALLADIUM_PD500: 0.5,
    };
    if (purityMap[metalCode]) return purityMap[metalCode];
  }

  return 1;
}

export interface ExtractedGemstone {
  type: string;
  cut: string;
  clarity: string;
  caratWeight: string;
  color: string;
  cost: string;
  shape?: string;
  quality?: string;
  qualityTier?: GemstoneQualityTier;
  origin?: string;
  sizeMm?: number | string;
  count?: number | string;
  cutGrade?: string;
  /** Legacy alias retained for older consumers; use gradingLab for new data. */
  lab?: string;
  gradingLab?: string;
  certNumber?: string;
  reportUrl?: string;
  reportDate?: string;
  sourceItemLabel?: string;
}

/**
 * Resolves the raw gemstone list with direct canonical InventoryItem.gemstones precedence:
 * 1. direct non-empty array
 * 2. direct raw gemstone object (e.g. { type: "DIAMOND", ... })
 * 3. direct wrapper's nested gemstones array
 * 4. composition.gemstones array
 * 5. empty-array fallbacks
 */
export function resolveGemstoneRawList(
  direct: unknown,
  compGemstones: unknown,
): any[] {
  // 1. Direct non-empty array
  if (Array.isArray(direct) && direct.length > 0) {
    return direct;
  }
  // 2 & 3. Direct object (plain gemstone object or wrapper with non-empty gemstones array)
  if (direct && typeof direct === "object" && !Array.isArray(direct)) {
    const directObj = direct as Record<string, unknown>;
    // 3. Direct wrapper with non-empty nested gemstones array
    if (Array.isArray(directObj.gemstones) && directObj.gemstones.length > 0) {
      return directObj.gemstones;
    }
    // 2. Direct raw gemstone object (e.g. { type: "DIAMOND", ... })
    if (
      directObj.type ||
      directObj.stoneType ||
      directObj.caratWeight != null ||
      directObj.sizeMm != null ||
      directObj.cost != null ||
      directObj.value != null ||
      directObj.valueNpr != null
    ) {
      return [directObj];
    }
  }
  // 4. Fallback to composition.gemstones when populated
  if (Array.isArray(compGemstones) && compGemstones.length > 0) {
    return compGemstones;
  }
  // 5. Empty-array fallbacks
  if (Array.isArray(direct)) {
    return direct;
  }
  if (direct && typeof direct === "object" && !Array.isArray(direct)) {
    const directObj = direct as Record<string, unknown>;
    if (Array.isArray(directObj.gemstones)) {
      return directObj.gemstones;
    }
  }
  if (Array.isArray(compGemstones)) {
    return compGemstones;
  }
  return [];
}

/**
 * Recursively extract and normalize all gemstones from a catalog item or SET
 * Prefers direct `item.gemstones` array (canonical), falling back to `item.composition.gemstones`.
 */
export function extractGemstonesFromItem(item: any): ExtractedGemstone[] {
  if (!item) return [];

  // SET items: extract gemstones from all linked components
  const links = item.setComponents || item.components || [];
  if (
    (item.jewelleryType === "SET" || item.composition?.kind === "SET") &&
    links.length > 0
  ) {
    const result: ExtractedGemstone[] = [];
    for (const link of links) {
      const comp = link.componentItem || link;
      const compGems = extractGemstonesFromItem(comp);
      for (const g of compGems) {
        result.push({
          ...g,
          sourceItemLabel:
            g.sourceItemLabel || comp.nameEn || comp.sku || "Set component",
        });
      }
    }
    return result;
  }

  const rawGems = resolveGemstoneRawList(
    item.gemstones,
    item.composition?.gemstones,
  );

  if (rawGems.length > 0) {
    return rawGems.flatMap((g: any) => {
      const normalized = normalizeGemstoneSnapshot(g);
      if (!normalized) return [];
      return [{
        type: normalized.type,
        shape: normalized.shape,
        cut: normalized.cut || "",
        clarity: normalized.clarity || "",
        caratWeight: normalized.caratWeight != null ? String(normalized.caratWeight) : "",
        color: normalized.color || "",
        cost:
          normalized.cost != null
            ? String(normalized.cost)
            : normalized.value != null
              ? String(normalized.value)
              : "",
        quality: typeof g.quality === "string" ? g.quality : undefined,
        qualityTier: normalized.qualityTier,
        origin: normalized.origin,
        sizeMm: normalized.sizeMm,
        count: normalized.count,
        cutGrade: normalized.cutGrade,
        lab: normalized.gradingLab,
        gradingLab: normalized.gradingLab,
        certNumber: normalized.certNumber,
        reportUrl: normalized.reportUrl,
        reportDate: normalized.reportDate,
        sourceItemLabel: item.nameEn || item.sku,
      }];
    });
  }

  // Fallback to single gemstone value if gemstoneValueNpr is present
  const gemValue = Number(item.gemstoneValueNpr) || 0;
  if (gemValue > 0) {
    return [
      {
        type: "OTHER",
        cut: "",
        clarity: "",
        caratWeight: "",
        color: "",
        cost: String(gemValue),
        sourceItemLabel: item.nameEn || item.sku,
      },
    ];
  }

  return [];
}
