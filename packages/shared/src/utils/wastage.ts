/**
 * Country-aware billing wastage (jarti) configuration and calculator.
 *
 * Distinct from karigar/workshop wastage limits — this is the customer-facing
 * manufacturing loss charge shown on invoices, quotes, and POS.
 * Physical factory loss (issued vs finished vs sprue) lives in gold-loss.ts.
 */

import { mapCountryToMarket, type MarketRegion } from "./market-config";

export type WastageCalcMode = "DISABLED" | "WEIGHT_PERCENT" | "METAL_VALUE_PERCENT";

/** Shop setting: AUTO follows the invoice country's market default. */
export type ShopWastageMode = "AUTO" | WastageCalcMode;

export interface MarketWastageConfig {
  /** Default calculation mode for this market */
  mode: WastageCalcMode;
  /** Typical default % shops start with (editable) */
  defaultPercent: number;
  /** Suggested range for UI hints */
  typicalRange: { min: number; max: number };
  /** Display label (Wastage / Jarti) */
  label: string;
  /** Short market practice note */
  description: string;
}

export const MARKET_WASTAGE_CONFIG: Record<MarketRegion, MarketWastageConfig> = {
  LK: {
    mode: "WEIGHT_PERCENT",
    defaultPercent: 6,
    typicalRange: { min: 2, max: 15 },
    label: "Wastage",
    description:
      "Common on Sri Lankan jewellery bills — extra gold charged for manufacturing loss.",
  },
  IN: {
    mode: "WEIGHT_PERCENT",
    defaultPercent: 5,
    typicalRange: { min: 2, max: 12 },
    label: "Wastage (Jarti)",
    description:
      "Often shown separately from making charges on Indian jewellery invoices.",
  },
  NP: {
    mode: "WEIGHT_PERCENT",
    defaultPercent: 4,
    typicalRange: { min: 2, max: 10 },
    label: "Wastage",
    description:
      "Common in Nepal jewellery retail; usually a % of net gold weight.",
  },
  AE: {
    mode: "DISABLED",
    defaultPercent: 0,
    typicalRange: { min: 0, max: 5 },
    label: "Wastage",
    description:
      "Usually folded into making; enable only if your shop bills wastage separately.",
  },
  UK: {
    mode: "DISABLED",
    defaultPercent: 0,
    typicalRange: { min: 0, max: 3 },
    label: "Wastage",
    description: "Not typical on UK bills — labour is usually in making charges.",
  },
  EU: {
    mode: "DISABLED",
    defaultPercent: 0,
    typicalRange: { min: 0, max: 3 },
    label: "Wastage",
    description: "Not typical on EU bills — labour is usually in making charges.",
  },
  US: {
    mode: "DISABLED",
    defaultPercent: 0,
    typicalRange: { min: 0, max: 3 },
    label: "Wastage",
    description: "Not typical on US bills — margin is usually in making charges.",
  },
};

export interface ResolvedWastageRule {
  mode: WastageCalcMode;
  percent: number;
  label: string;
  description: string;
  market: MarketRegion;
  /** Whether shop overrode country defaults */
  source: "shop" | "country";
  typicalRange: { min: number; max: number };
}

export interface ShopWastageSettings {
  billingWastageMode?: ShopWastageMode | string | null;
  billingWastagePercent?: number | null;
}

export function getMarketWastageConfig(
  countryOrMarket: string,
): MarketWastageConfig {
  const market = mapCountryToMarket(countryOrMarket);
  return MARKET_WASTAGE_CONFIG[market];
}

/**
 * Resolve effective wastage rule from invoice country + optional shop overrides.
 */
export function resolveWastageRule(
  invoiceCountry: string,
  shop?: ShopWastageSettings | null,
): ResolvedWastageRule {
  const market = mapCountryToMarket(invoiceCountry);
  const countryCfg = MARKET_WASTAGE_CONFIG[market];
  const shopMode = (shop?.billingWastageMode || "AUTO").toUpperCase() as ShopWastageMode;
  const shopPct =
    shop?.billingWastagePercent != null &&
    Number.isFinite(Number(shop.billingWastagePercent))
      ? Number(shop.billingWastagePercent)
      : null;

  if (shopMode === "DISABLED") {
    return {
      mode: "DISABLED",
      percent: 0,
      label: countryCfg.label,
      description: countryCfg.description,
      market,
      source: "shop",
      typicalRange: countryCfg.typicalRange,
    };
  }

  if (
    shopMode === "WEIGHT_PERCENT" ||
    shopMode === "METAL_VALUE_PERCENT"
  ) {
    return {
      mode: shopMode,
      percent: shopPct ?? countryCfg.defaultPercent,
      label: countryCfg.label,
      description: countryCfg.description,
      market,
      source: "shop",
      typicalRange: countryCfg.typicalRange,
    };
  }

  // AUTO — country default (shops can still override %)
  return {
    mode: countryCfg.mode,
    percent: shopPct ?? countryCfg.defaultPercent,
    label: countryCfg.label,
    description: countryCfg.description,
    market,
    source: shopPct != null ? "shop" : "country",
    typicalRange: countryCfg.typicalRange,
  };
}

export interface WastageLineInput {
  metalCost: number;
  metalWeightG?: number | null;
  /** Per-line override; falls back to rule.percent */
  wastagePercent?: number | null;
}

export interface WastageLineResult {
  mode: WastageCalcMode;
  percent: number;
  netWeightG: number;
  wastageWeightG: number;
  billableWeightG: number;
  ratePerGram: number | null;
  wastageCost: number;
  /** True when WEIGHT_PERCENT requested but weight missing — used value % instead */
  fellBackToValuePercent: boolean;
  explanation: string[];
}

function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function roundWeight(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

/**
 * Calculate wastage for a single line item.
 */
export function calculateLineWastage(
  input: WastageLineInput,
  rule: Pick<ResolvedWastageRule, "mode" | "percent" | "label">,
): WastageLineResult {
  const metalCost = Math.max(0, Number(input.metalCost) || 0);
  const netWeightG = Math.max(0, Number(input.metalWeightG) || 0);
  const percent = Math.max(
    0,
    Number(
      input.wastagePercent != null && Number.isFinite(Number(input.wastagePercent))
        ? input.wastagePercent
        : rule.percent,
    ) || 0,
  );

  if (rule.mode === "DISABLED" || percent <= 0 || metalCost <= 0) {
    return {
      mode: rule.mode === "DISABLED" ? "DISABLED" : rule.mode,
      percent,
      netWeightG,
      wastageWeightG: 0,
      billableWeightG: netWeightG,
      ratePerGram: netWeightG > 0 ? metalCost / netWeightG : null,
      wastageCost: 0,
      fellBackToValuePercent: false,
      explanation:
        rule.mode === "DISABLED"
          ? [`${rule.label} is disabled for this market.`]
          : metalCost <= 0
            ? ["Add metal cost before calculating wastage."]
            : [`${rule.label} % is 0 — nothing to charge.`],
    };
  }

  // Prefer weight-based when mode says so and weight is available
  if (rule.mode === "WEIGHT_PERCENT" && netWeightG > 0) {
    const ratePerGram = metalCost / netWeightG;
    const wastageWeightG = roundWeight(netWeightG * (percent / 100));
    const wastageCost = roundMoney(wastageWeightG * ratePerGram);
    const billableWeightG = roundWeight(netWeightG + wastageWeightG);
    return {
      mode: "WEIGHT_PERCENT",
      percent,
      netWeightG,
      wastageWeightG,
      billableWeightG,
      ratePerGram,
      wastageCost,
      fellBackToValuePercent: false,
      explanation: [
        `Net weight ${netWeightG}g × ${percent}% = ${wastageWeightG}g wastage`,
        `Rate ${roundMoney(ratePerGram)} / g × ${wastageWeightG}g = ${wastageCost}`,
        `Billable weight ${billableWeightG}g (net + wastage)`,
      ],
    };
  }

  // METAL_VALUE_PERCENT, or weight mode without weight
  const fellBack =
    rule.mode === "WEIGHT_PERCENT" && netWeightG <= 0;
  const wastageCost = roundMoney(metalCost * (percent / 100));
  return {
    mode: "METAL_VALUE_PERCENT",
    percent,
    netWeightG,
    wastageWeightG: 0,
    billableWeightG: netWeightG,
    ratePerGram: null,
    wastageCost,
    fellBackToValuePercent: fellBack,
    explanation: fellBack
      ? [
          "No metal weight on this line — using metal value % instead.",
          `Metal ${roundMoney(metalCost)} × ${percent}% = ${wastageCost}`,
        ]
      : [`Metal value ${roundMoney(metalCost)} × ${percent}% = ${wastageCost}`],
  };
}

/**
 * Human-readable formula for tooltips / help links.
 */
export function getWastageFormulaText(mode: WastageCalcMode): string {
  switch (mode) {
    case "WEIGHT_PERCENT":
      return [
        "Wastage (weight %):",
        "1. Wastage grams = Net weight × (Wastage % ÷ 100)",
        "2. Rate per gram = Metal cost ÷ Net weight",
        "3. Wastage amount = Wastage grams × Rate per gram",
        "Bill = Metal + Wastage + Making + Stones (+ tax)",
      ].join("\n");
    case "METAL_VALUE_PERCENT":
      return [
        "Wastage (metal value %):",
        "Wastage amount = Metal cost × (Wastage % ÷ 100)",
        "Bill = Metal + Wastage + Making + Stones (+ tax)",
      ].join("\n");
    case "DISABLED":
    default:
      return "Wastage is turned off — no extra charge is added.";
  }
}

export function getWastageModeLabel(mode: WastageCalcMode | ShopWastageMode): string {
  switch (mode) {
    case "AUTO":
      return "Auto (follow invoice country)";
    case "WEIGHT_PERCENT":
      return "Weight % (extra grams × rate)";
    case "METAL_VALUE_PERCENT":
      return "Metal value %";
    case "DISABLED":
      return "Disabled";
    default:
      return mode;
  }
}
