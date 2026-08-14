import {
  BuildMethod,
  DiamondOrigin,
  EstimateRequest,
  MaterialCode,
  QualityTier,
  SettingType,
  StoneType,
  SupportedCountry,
  SupportedCurrency,
} from "../core/pricing/types";
import type { DesignVariationSpec } from "./design-variations.service";

const COUNTRIES: SupportedCountry[] = ["IN", "NP", "AE", "UK", "EU", "US", "LK"];
const CURRENCIES: SupportedCurrency[] = [
  "INR",
  "NPR",
  "AED",
  "USD",
  "GBP",
  "EUR",
  "LKR",
];

const STONE_MAP: Record<string, StoneType> = {
  DIAMOND: StoneType.DIAMOND,
  MOISSANITE: StoneType.MOISSANITE,
  CZ: StoneType.CZ,
  CUBIC_ZIRCONIA: StoneType.CZ,
  RUBY: StoneType.RUBY,
  SAPPHIRE: StoneType.SAPPHIRE,
  EMERALD: StoneType.EMERALD,
  PEARL: StoneType.PEARL,
};

const SETTING_MAP: Record<string, SettingType> = {
  PRONG: SettingType.PRONG,
  BEZEL: SettingType.BEZEL,
  PAVE: SettingType.PAVE,
  CHANNEL: SettingType.CHANNEL,
  HALO: SettingType.HALO,
  FLUSH: SettingType.FLUSH,
  TENSION: SettingType.TENSION,
};

export function asSupportedCountry(value?: string): SupportedCountry {
  const code = (value || "IN").toUpperCase();
  return COUNTRIES.includes(code as SupportedCountry)
    ? (code as SupportedCountry)
    : "IN";
}

export function asSupportedCurrency(value?: string): SupportedCurrency {
  const code = (value || "INR").toUpperCase();
  return CURRENCIES.includes(code as SupportedCurrency)
    ? (code as SupportedCurrency)
    : "INR";
}

function mapStone(raw?: string): StoneType {
  const key = (raw || "").toUpperCase().replace(/\s+/g, "_");
  return STONE_MAP[key] || StoneType.SEMI_PRECIOUS;
}

function mapSetting(raw?: string): SettingType {
  const key = (raw || "").toUpperCase();
  return SETTING_MAP[key] || SettingType.PRONG;
}

function mapQuality(raw?: string): QualityTier {
  const q = (raw || "").toUpperCase();
  if (/FL|IF|VVS|VS|EXCELLENT|PREMIUM/.test(q)) return QualityTier.PREMIUM;
  if (/SI|STANDARD|GOOD/.test(q)) return QualityTier.STANDARD;
  if (/I[1-3]|BUDGET/.test(q)) return QualityTier.BUDGET;
  return QualityTier.STANDARD;
}

function isPreciousMetal(metalType?: string): boolean {
  const m = (metalType || "").toUpperCase();
  return (
    m.startsWith("GOLD") ||
    m.startsWith("SILVER") ||
    m.startsWith("PLATINUM") ||
    m.startsWith("PALLADIUM")
  );
}

export function specToEstimateRequest(
  spec: DesignVariationSpec,
  opts: {
    country: SupportedCountry;
    currency: SupportedCurrency;
    shopId?: string;
  },
): EstimateRequest {
  const weight = Math.max(0.1, spec.estimatedWeight || 5);
  const method = isPreciousMetal(spec.metalType)
    ? BuildMethod.METHOD_A
    : spec.buildMethod === "METHOD_C"
      ? BuildMethod.METHOD_C
      : spec.buildMethod === "METHOD_D"
        ? BuildMethod.METHOD_D
        : BuildMethod.METHOD_B;

  const gemstones = (spec.gemstones || [])
    .filter((g) => g.stoneType)
    .map((g) => ({
      stoneType: mapStone(g.stoneType),
      origin: DiamondOrigin.NATURAL,
      caratWeight: g.sizeUnit === "CARAT" ? g.sizeValue : undefined,
      sizeMm: g.sizeUnit === "MM" ? g.sizeValue : undefined,
      qualityTier: mapQuality(g.clarity || g.cut),
      settingType: mapSetting(g.settingStyle || spec.settingStyle),
      count: Math.max(1, g.count || 1),
    }));

  if (!gemstones.length && spec.hasGemstones && spec.primaryStone) {
    gemstones.push({
      stoneType: mapStone(spec.primaryStone),
      origin: DiamondOrigin.NATURAL,
      caratWeight: spec.stoneCarat,
      sizeMm: undefined,
      qualityTier: QualityTier.STANDARD,
      settingType: mapSetting(spec.settingStyle),
      count: Math.max(1, spec.stoneCount || 1),
    });
  }

  const request: EstimateRequest = {
    country: opts.country,
    currency: opts.currency,
    jewelleryType: spec.jewelryType,
    buildMethod: method,
    totalWeightG: weight,
    shopId: opts.shopId,
    gemstones: gemstones.length ? gemstones : undefined,
  };

  if (method === BuildMethod.METHOD_A) {
    request.methodA = { metal: spec.metalType || "GOLD_22K", totalWeightG: weight };
  } else if (method === BuildMethod.METHOD_B) {
    request.methodB = {
      alloy: spec.alloyDetails?.baseMetal || spec.metalType || "BRASS",
      totalWeightG: weight,
    };
  } else if (method === BuildMethod.METHOD_C) {
    const core = (spec.platingDetails?.baseMetal || "BRASS").toUpperCase();
    request.methodC = {
      coreMetal: (MaterialCode as Record<string, MaterialCode>)[core] || MaterialCode.BRASS,
      totalWeightG: weight,
    };
  } else {
    request.methodD = {
      primaryMetal: spec.metalType || "GOLD_22K",
      secondaryMetal: MaterialCode.BRASS,
      totalWeightG: weight,
      pattern: "TWO_TONE_SPLIT",
    };
  }

  return request;
}

export function specToResolverComposition(spec: DesignVariationSpec) {
  const gems = (spec.gemstones || [])
    .filter((g) => g.stoneType)
    .map((g) => ({
      type: g.stoneType || spec.primaryStone || "DIAMOND",
      caratWeight: g.sizeUnit === "CARAT" ? g.sizeValue : spec.stoneCarat,
      sizeMm: g.sizeUnit === "MM" ? g.sizeValue : undefined,
      quality: g.clarity || "STANDARD",
      count: Math.max(1, g.count || spec.stoneCount || 1),
    }));

  if (!gems.length && spec.hasGemstones && spec.primaryStone) {
    gems.push({
      type: spec.primaryStone,
      caratWeight: spec.stoneCarat,
      sizeMm: undefined,
      quality: "STANDARD",
      count: Math.max(1, spec.stoneCount || 1),
    });
  }

  return {
    method: spec.buildMethod,
    metalType: spec.metalType,
    metalWeightG: spec.estimatedWeight,
    gemstones: gems,
    platingType: spec.platingDetails?.platingType,
    finishType: spec.surfaceFinish,
    baseMetalType: spec.platingDetails?.baseMetal || spec.alloyDetails?.baseMetal,
  };
}

export function applyCostBreakdown(
  spec: DesignVariationSpec,
  parts: {
    metal: number;
    making: number;
    gemstones: number;
    finish: number;
    total: number;
    currency: string;
  },
): DesignVariationSpec {
  if (!(parts.total > 0)) return spec;
  return {
    ...spec,
    estimatedCost: {
      metal: Math.round(parts.metal),
      making: Math.round(parts.making),
      gemstones: Math.round(parts.gemstones),
      finish: Math.round(parts.finish),
      total: Math.round(parts.total),
      currency: parts.currency || spec.estimatedCost.currency,
    },
  };
}
