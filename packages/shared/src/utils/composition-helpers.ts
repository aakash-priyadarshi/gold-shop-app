/**
 * Composition & Gemstone Canonical Helpers
 * Used across API, Web, Desktop, and Shared packages.
 */

export interface CanonicalGemstone {
  value: string;
  label: string;
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
  if (!raw) return "OTHER";
  const cleaned = String(raw).trim().toUpperCase().replace(/\s+/g, "_");
  const found = CANONICAL_GEMSTONE_TYPES.find(
    (g) => g.value === cleaned || g.label.toUpperCase() === cleaned,
  );
  if (found) return found.value;
  if (cleaned === "EMERALD_CUT") return "EMERALD";
  return cleaned || "OTHER";
}

/**
 * Get human display label for a gemstone code (e.g. "DIAMOND" -> "Diamond")
 */
export function getGemstoneDisplayLabel(code?: string | null): string {
  if (!code) return "Other";
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
    return "PALLADIUM_950";
  }

  return m;
}

/**
 * Extract normalized metal type from any composition structure
 * Handles { baseAlloy: { metal, purity } }, { preciousMetal }, { metal, purity }, etc.
 */
export function extractMetalTypeFromComposition(composition: unknown): string | undefined {
  if (!composition || typeof composition !== "object") return undefined;
  const c = composition as Record<string, unknown>;

  // 1. Direct explicit metal code if already valid
  if (typeof c.metalType === "string" && c.metalType) {
    return normalizeMetalCode(c.metalType, typeof c.purity === "string" || typeof c.purity === "number" ? c.purity : undefined);
  }

  // 2. Direct string fields
  for (const key of [
    "preciousMetal",
    "metal",
    "primaryMetal",
    "alloy",
    "coreMetal",
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

/**
 * Purity as fraction (0–1). Returns 0.916 for 22K, 0.999 for 24K, etc.
 */
export function extractPurityFromComposition(composition: unknown): number {
  if (!composition || typeof composition !== "object") return 1;
  const c = composition as Record<string, unknown>;

  // Check direct number
  const raw = c.purity ?? (typeof c.baseAlloy === "object" && c.baseAlloy ? (c.baseAlloy as any).purity : undefined);
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw <= 1 && raw > 0) return raw;
    if (raw > 1 && raw <= 100) return raw / 100;
    if (raw > 100 && raw <= 1000) return raw / 1000;
  }

  if (typeof c.purityPercent === "number" && Number.isFinite(c.purityPercent)) {
    return c.purityPercent / 100;
  }

  // Derive from normalized metal code
  const metalCode = extractMetalTypeFromComposition(composition);
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
  cutGrade?: string;
  lab?: string;
  certNumber?: string;
  reportUrl?: string;
  sourceItemLabel?: string;
}

/**
 * Recursively extract and normalize all gemstones from a catalog item or SET
 */
export function extractGemstonesFromItem(item: any): ExtractedGemstone[] {
  if (!item) return [];

  // Check if item is a SET with components
  const links = Array.isArray(item.setComponents) ? item.setComponents : [];
  if ((item.jewelleryType === "SET" || item.composition?.kind === "SET") && links.length > 0) {
    const result: ExtractedGemstone[] = [];
    for (const link of links) {
      const comp = link.componentItem || link;
      const compGems = extractGemstonesFromItem(comp);
      for (const g of compGems) {
        result.push({
          ...g,
          sourceItemLabel: g.sourceItemLabel || comp.nameEn || comp.sku || "Set component",
        });
      }
    }
    return result;
  }

  // Regular item
  const rawGems = Array.isArray(item.composition?.gemstones)
    ? item.composition.gemstones
    : [];

  if (rawGems.length > 0) {
    return rawGems.map((g: any) => ({
      type: normalizeGemstoneType(g.type || g.stoneType),
      cut: normalizeGemstoneCut(g.cut),
      clarity: String(g.clarity || ""),
      caratWeight: g.caratWeight != null ? String(g.caratWeight) : "",
      color: String(g.color || ""),
      cost: g.valueNpr != null ? String(g.valueNpr) : g.cost != null ? String(g.cost) : "",
      cutGrade: g.cutGrade,
      lab: g.lab,
      certNumber: g.certNumber,
      reportUrl: g.reportUrl,
      sourceItemLabel: item.nameEn || item.sku,
    }));
  }

  // Fallback to single gemstone value if gemstoneValueNpr is present
  const gemValue = Number(item.gemstoneValueNpr) || 0;
  if (gemValue > 0) {
    return [
      {
        type: "GEMSTONE",
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
