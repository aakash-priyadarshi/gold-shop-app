/**
 * Client-Side Pricing Calculator
 *
 * Unified pricing calculation for all build methods (A, B, C)
 * This provides instant estimates on the frontend before server validation
 */

import {
  calculateAlloyPremium,
  getRecipePresetById,
  type AlloyFamily,
  type GoldKarat,
} from "./alloy-constants";

import {
  calculateBaseMetalCost,
  calculatePlatingCost,
  getBaseMetal,
  getPlatingOption,
  getPlatingTier,
  type BaseMetalType,
  type PlatingTierC,
  type PlatingTypeC,
} from "./base-metal-constants";

import {
  calculateTax,
  type CartBreakdown,
  type TaxResult,
} from "../tax/engine";
import { SETTING_STYLES } from "./constants";
import { getGemstonePreset } from "./gemstone-presets";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type BuildMethod = "METHOD_A" | "METHOD_B" | "METHOD_C" | "METHOD_D";

export type EstimateStatus = "complete" | "incomplete" | "error";

export interface MethodADetails {
  metal: string; // e.g., 'GOLD_24K', 'GOLD_22K', 'SILVER_925', etc.
  weightGrams: number;
}

export interface MethodBDetails {
  baseMetal: "GOLD" | "SILVER";
  karat?: GoldKarat;
  silverPurity?: "STERLING_925" | "ARGENTIUM_935";
  alloyFamily?: AlloyFamily;
  recipePresetId?: string;
  weightGrams: number;
}

export interface MethodCDetails {
  baseMetal: BaseMetalType;
  weightGrams: number;
  platingType: PlatingTypeC;
  platingTier: PlatingTierC;
}

// Method D: Italian Machine Made chain style type
export type ChainStyleType =
  | "ROPE"
  | "FIGARO"
  | "CURB"
  | "BOX"
  | "SNAKE"
  | "SINGAPORE"
  | "FRANCO"
  | "WHEAT"
  | "MARINER"
  | "HERRINGBONE"
  | "BYZANTINE"
  | "HOLLOW_BANGLE"
  | "LASER_CUT"
  | "MACHINE_WOVEN";

// Method D chain styles with descriptions and pricing multipliers
export const CHAIN_STYLE_OPTIONS: Record<
  ChainStyleType,
  {
    label: string;
    description: string;
    howItLooks: string;
    hollowDiscount: number; // % discount due to hollow construction
    makingChargePercent: number; // Making charge for this style
    minWeight: number; // Minimum typical weight in grams
  }
> = {
  ROPE: {
    label: "Rope Chain",
    description:
      "Classic twisted pattern where links interlock to create a spiral rope-like appearance.",
    howItLooks:
      "Elegant twisted spiral pattern. Catches light from multiple angles. Very popular for pendants.",
    hollowDiscount: 0.4, // 40% lighter than solid
    makingChargePercent: 8,
    minWeight: 3,
  },
  FIGARO: {
    label: "Figaro Chain",
    description:
      "Italian design with alternating pattern: 3 small circular links followed by 1 elongated oval link.",
    howItLooks:
      "Distinctive repeating pattern. Flat links lie nicely against skin. Classic Italian style.",
    hollowDiscount: 0.35,
    makingChargePercent: 10,
    minWeight: 4,
  },
  CURB: {
    label: "Curb Chain",
    description:
      "Interlocking uniform flat links that lie flat when worn. Can be twisted or diamond-cut.",
    howItLooks:
      "Uniform flat links create a bold, masculine look. Very durable. Great for everyday wear.",
    hollowDiscount: 0.35,
    makingChargePercent: 8,
    minWeight: 3,
  },
  BOX: {
    label: "Box Chain",
    description:
      "Square links connected at right angles creating a smooth, flexible chain.",
    howItLooks:
      "Modern, geometric appearance. Smooth and sleek. Excellent for pendants as it doesn't twist.",
    hollowDiscount: 0.45,
    makingChargePercent: 12,
    minWeight: 2,
  },
  SNAKE: {
    label: "Snake Chain",
    description:
      "Tightly connected rings create a smooth, round, flexible tube-like chain.",
    howItLooks:
      "Sleek, smooth, and fluid like a snake. Very comfortable against skin. Elegant and modern.",
    hollowDiscount: 0.5,
    makingChargePercent: 15,
    minWeight: 2,
  },
  SINGAPORE: {
    label: "Singapore Chain",
    description:
      "Twisted curb links with diamond-cut facets that create exceptional sparkle.",
    howItLooks:
      "Brilliant sparkle from diamond-cut facets. Twisted design catches light beautifully. Very feminine.",
    hollowDiscount: 0.45,
    makingChargePercent: 12,
    minWeight: 2,
  },
  FRANCO: {
    label: "Franco Chain",
    description:
      "V-shaped links interlock in all four directions creating a strong, flexible chain.",
    howItLooks:
      "Dense, substantial appearance. Very strong and durable. Popular for heavier pendants.",
    hollowDiscount: 0.3,
    makingChargePercent: 14,
    minWeight: 5,
  },
  WHEAT: {
    label: "Wheat Chain",
    description:
      "Four strands of twisted oval links woven together resembling a wheat stalk.",
    howItLooks:
      "Intricate braided appearance. Very elegant and detailed. Excellent light reflection.",
    hollowDiscount: 0.4,
    makingChargePercent: 16,
    minWeight: 3,
  },
  MARINER: {
    label: "Mariner/Anchor Chain",
    description:
      "Oval links with a bar across the center, resembling the chain used on ship anchors.",
    howItLooks:
      "Nautical, bold look. Links have distinctive center bar. Great for statement pieces.",
    hollowDiscount: 0.35,
    makingChargePercent: 10,
    minWeight: 5,
  },
  HERRINGBONE: {
    label: "Herringbone Chain",
    description:
      "Flat, slanted links arranged in a V-pattern creating a smooth, liquid-like appearance.",
    howItLooks:
      "Extremely flat and fluid. Shimmers like liquid gold. Lies perfectly flat on skin.",
    hollowDiscount: 0.5,
    makingChargePercent: 18,
    minWeight: 4,
  },
  BYZANTINE: {
    label: "Byzantine Chain",
    description:
      "Ancient design with intricately woven links creating a decorative, rope-like pattern.",
    howItLooks:
      "Ornate, historical appearance. Rich texture and detail. Premium craftsmanship look.",
    hollowDiscount: 0.35,
    makingChargePercent: 20,
    minWeight: 6,
  },
  HOLLOW_BANGLE: {
    label: "Hollow Bangle",
    description:
      "Machine-made hollow bangle with consistent wall thickness and precise finish.",
    howItLooks:
      "Full-sized bangle appearance at fraction of weight. Comfortable for all-day wear.",
    hollowDiscount: 0.5,
    makingChargePercent: 12,
    minWeight: 8,
  },
  LASER_CUT: {
    label: "Laser Cut Pattern",
    description:
      "Precision laser-cut diamond facets for maximum sparkle and light reflection.",
    howItLooks:
      "Exceptional sparkle from precisely cut facets. Modern, high-tech appearance.",
    hollowDiscount: 0.4,
    makingChargePercent: 15,
    minWeight: 3,
  },
  MACHINE_WOVEN: {
    label: "Machine Woven",
    description:
      "Computer-controlled intricate weaving patterns not possible by hand.",
    howItLooks:
      "Complex, detailed patterns. Consistent quality throughout. Unique designs.",
    hollowDiscount: 0.35,
    makingChargePercent: 18,
    minWeight: 4,
  },
};

export interface MethodDDetails {
  purity: "22K" | "18K" | "14K" | "SILVER_925";
  chainStyle?: ChainStyleType;
  weightGrams: number;
}

export interface GemstoneInput {
  presetId?: string;
  stoneType?: string;
  shape?: string;
  sizeValue?: string;
  sizeUnit?: "MM" | "CARAT";
  color?: string;
  clarity?: string;
  cut?: string;
  settingStyle?: string;
  count: number;
}

export interface FinishInput {
  finishType: string;
  additionalCost?: number;
}

export interface EstimateRequest {
  buildMethod: BuildMethod;
  jewelleryType: string;
  country: string;
  currency: string;

  // Method-specific details
  methodA?: MethodADetails;
  methodB?: MethodBDetails;
  methodC?: MethodCDetails;
  methodD?: MethodDDetails;

  // Common options
  gemstones?: GemstoneInput[];
  surfaceFinish?: FinishInput;
  makingChargePercent?: number;

  // Market rates (passed from API)
  marketRates?: {
    metals: Record<string, number>;
    fx?: { rate: number };
  };
}

export interface LineItem {
  label: string;
  category:
    | "METAL"
    | "ALLOY_PREMIUM"
    | "BASE_METAL"
    | "PLATING"
    | "GEMSTONE"
    | "SETTING"
    | "FINISH"
    | "MAKING"
    | "CHAIN_STYLE"
    | "TAX";
  amount: number;
  details?: string;
}

export interface EstimateBreakdown {
  status: EstimateStatus;
  statusMessage?: string;
  missingFields?: string[];

  // Cost breakdown
  metalCost: number;
  alloyPremiumCost: number; // Method B only
  baseMetalCost: number; // Method C only
  platingCost: number; // Method C only
  gemstoneCost: number;
  settingCost: number;
  finishCost: number;
  makingCharge: number;

  // Totals
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;

  // Tax details (new tax engine)
  taxResult?: TaxResult;

  // Detailed line items for display
  lineItems: LineItem[];

  // Currency info
  currency: string;
  currencySymbol: string;

  // Build method info
  buildMethod: BuildMethod;
  buildMethodLabel: string;
}

// ═══════════════════════════════════════════
// TAX RATES BY COUNTRY
// ═══════════════════════════════════════════

// Legacy tax rates kept for fallback
const LEGACY_TAX_RATES: Record<string, { rate: number; name: string }> = {
  NP: { rate: 0.13, name: "VAT 13%" },
  IN: { rate: 0.03, name: "GST 3%" },
  AE: { rate: 0.05, name: "VAT 5%" },
  US: { rate: 0.0, name: "No Federal Tax" },
  GB: { rate: 0.2, name: "VAT 20%" },
  EU: { rate: 0.19, name: "VAT 19%" },
  AU: { rate: 0.1, name: "GST 10%" },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  NPR: "₨",
  INR: "₹",
  AED: "د.إ",
  USD: "$",
  GBP: "£",
  EUR: "€",
  AUD: "A$",
};

const BUILD_METHOD_LABELS: Record<BuildMethod, string> = {
  METHOD_A: "Solid Precious Metal",
  METHOD_B: "Precious Metal Alloy",
  METHOD_C: "Base Metal + Plating",
  METHOD_D: "Italian Machine Made",
};

// ═══════════════════════════════════════════
// MAIN CALCULATION FUNCTION
// ═══════════════════════════════════════════

export function calculateEstimate(request: EstimateRequest): EstimateBreakdown {
  const lineItems: LineItem[] = [];
  const missingFields: string[] = [];

  let metalCost = 0;
  let alloyPremiumCost = 0;
  let baseMetalCost = 0;
  let platingCost = 0;
  let gemstoneCost = 0;
  let settingCost = 0;
  let finishCost = 0;

  const currencySymbol = CURRENCY_SYMBOLS[request.currency] || "₹";
  const makingChargePercent = request.makingChargePercent ?? 12;

  // ─────────────────────────────────────────
  // METHOD A: Solid Precious Metal
  // ─────────────────────────────────────────
  if (request.buildMethod === "METHOD_A") {
    if (!request.methodA?.metal) {
      missingFields.push("Precious metal type");
    }
    if (!request.methodA?.weightGrams || request.methodA.weightGrams <= 0) {
      missingFields.push("Weight in grams");
    }

    if (
      request.methodA?.metal &&
      request.methodA?.weightGrams &&
      request.marketRates?.metals
    ) {
      const rate = request.marketRates.metals[request.methodA.metal] || 0;
      metalCost = request.methodA.weightGrams * rate;

      if (metalCost > 0) {
        lineItems.push({
          label: `${formatMetalName(request.methodA.metal)} (${request.methodA.weightGrams}g × ${currencySymbol}${rate.toLocaleString()}/g)`,
          category: "METAL",
          amount: metalCost,
        });
      }
    }
  }

  // ─────────────────────────────────────────
  // METHOD B: Precious Metal Alloy
  // ─────────────────────────────────────────
  else if (request.buildMethod === "METHOD_B") {
    if (!request.methodB?.baseMetal) {
      missingFields.push("Base precious metal (Gold/Silver)");
    }
    if (request.methodB?.baseMetal === "GOLD" && !request.methodB?.karat) {
      missingFields.push("Gold karat");
    }
    if (
      request.methodB?.baseMetal === "GOLD" &&
      !request.methodB?.alloyFamily
    ) {
      missingFields.push("Alloy family (Yellow/White/Rose)");
    }
    if (
      request.methodB?.baseMetal === "GOLD" &&
      !request.methodB?.recipePresetId
    ) {
      missingFields.push("Alloy recipe preset");
    }
    if (!request.methodB?.weightGrams || request.methodB.weightGrams <= 0) {
      missingFields.push("Weight in grams");
    }

    if (request.methodB && request.marketRates?.metals) {
      const { baseMetal, karat, weightGrams, recipePresetId } = request.methodB;

      // Calculate base metal cost
      let metalKey = "";
      if (baseMetal === "GOLD" && karat) {
        metalKey = `GOLD_${karat}`;
      } else if (baseMetal === "SILVER") {
        metalKey = "SILVER_925";
      }

      const rate = request.marketRates.metals[metalKey] || 0;
      metalCost = weightGrams * rate;

      if (metalCost > 0) {
        lineItems.push({
          label: `${formatMetalName(metalKey)} base (${weightGrams}g × ${currencySymbol}${rate.toLocaleString()}/g)`,
          category: "METAL",
          amount: metalCost,
        });
      }

      // Calculate alloy premium
      if (recipePresetId) {
        const recipe = getRecipePresetById(recipePresetId);
        if (recipe) {
          alloyPremiumCost = calculateAlloyPremium(metalCost, recipe);

          if (alloyPremiumCost > 0) {
            lineItems.push({
              label: `${recipe.name} alloy premium (+${((recipe.priceMultiplier - 1) * 100).toFixed(0)}%)`,
              category: "ALLOY_PREMIUM",
              amount: alloyPremiumCost,
              details: recipe.tooltip,
            });
          }
        }
      }
    }
  }

  // ─────────────────────────────────────────
  // METHOD C: Base Metal + Plating
  // ─────────────────────────────────────────
  else if (request.buildMethod === "METHOD_C") {
    if (!request.methodC?.baseMetal) {
      missingFields.push("Base metal type");
    }
    if (!request.methodC?.platingType) {
      missingFields.push("Plating type (required for Method C)");
    }
    if (!request.methodC?.platingTier) {
      missingFields.push("Plating tier");
    }
    if (!request.methodC?.weightGrams || request.methodC.weightGrams <= 0) {
      missingFields.push("Weight in grams");
    }

    if (request.methodC) {
      const { baseMetal, weightGrams, platingType, platingTier } =
        request.methodC;

      // Calculate base metal cost
      if (baseMetal && weightGrams > 0) {
        baseMetalCost = calculateBaseMetalCost(baseMetal, weightGrams);
        const metalInfo = getBaseMetal(baseMetal);
        const actualRatePerGram =
          weightGrams > 0 ? baseMetalCost / weightGrams : 0;

        if (baseMetalCost > 0) {
          lineItems.push({
            label: `${metalInfo?.label || baseMetal} (${weightGrams}g × ${currencySymbol}${actualRatePerGram.toFixed(2)}/g)`,
            category: "BASE_METAL",
            amount: baseMetalCost,
          });
        }
      }

      // Calculate plating cost (REQUIRED for Method C)
      if (platingType && platingTier && weightGrams > 0) {
        platingCost = calculatePlatingCost(
          platingType,
          platingTier,
          request.jewelleryType,
          weightGrams,
        );

        const platingInfo = getPlatingOption(platingType);
        const tierInfo = getPlatingTier(platingTier);

        if (platingCost > 0) {
          lineItems.push({
            label: `${platingInfo?.label || platingType} (${tierInfo?.label || platingTier})`,
            category: "PLATING",
            amount: platingCost,
            details: platingInfo?.tooltip.durability,
          });
        }
      }
    }
  }

  // ─────────────────────────────────────────
  // METHOD D: Italian Machine Made
  // ─────────────────────────────────────────
  else if (request.buildMethod === "METHOD_D") {
    if (!request.methodD?.purity) {
      missingFields.push("Metal purity (22K, 18K, 14K, or Silver)");
    }
    if (!request.methodD?.weightGrams || request.methodD.weightGrams <= 0) {
      missingFields.push("Weight in grams");
    }

    if (request.methodD && request.marketRates?.metals) {
      const { purity, chainStyle, weightGrams } = request.methodD;

      // Get the chain style config for pricing
      const styleConfig = chainStyle
        ? CHAIN_STYLE_OPTIONS[chainStyle]
        : undefined;

      // Calculate effective weight after hollow discount
      const hollowDiscount = styleConfig?.hollowDiscount || 0.4; // Default 40% hollow
      const effectiveWeight = weightGrams * (1 - hollowDiscount);

      // Map purity to metal key for rate lookup
      let metalKey = "";
      let purityLabel = "";
      if (purity === "22K") {
        metalKey = "GOLD_22K";
        purityLabel = "22K Gold";
      } else if (purity === "18K") {
        metalKey = "GOLD_18K";
        purityLabel = "18K Gold";
      } else if (purity === "14K") {
        metalKey = "GOLD_14K";
        purityLabel = "14K Gold";
      } else if (purity === "SILVER_925") {
        metalKey = "SILVER_925";
        purityLabel = "Sterling Silver";
      }

      const rate = request.marketRates.metals[metalKey] || 0;

      // Metal cost is based on EFFECTIVE weight (after hollow discount)
      metalCost = effectiveWeight * rate;

      if (metalCost > 0) {
        const savingsPercent = Math.round(hollowDiscount * 100);
        lineItems.push({
          label: `${purityLabel} (${effectiveWeight.toFixed(1)}g effective × ${currencySymbol}${rate.toLocaleString()}/g)`,
          category: "METAL",
          amount: metalCost,
          details: `Hollow construction saves ~${savingsPercent}% gold. Visual size: ${weightGrams}g solid equivalent.`,
        });
      }

      // Add chain style making charge
      if (styleConfig) {
        const styleMakingCharge =
          metalCost * (styleConfig.makingChargePercent / 100);
        if (styleMakingCharge > 0) {
          lineItems.push({
            label: `${styleConfig.label} craftsmanship (+${styleConfig.makingChargePercent}%)`,
            category: "CHAIN_STYLE",
            amount: styleMakingCharge,
            details: styleConfig.description,
          });
          // Add to alloy premium cost for total calculation
          alloyPremiumCost = styleMakingCharge;
        }
      }
    }
  }

  // ─────────────────────────────────────────
  // GEMSTONES (all methods)
  // ─────────────────────────────────────────
  if (request.gemstones && request.gemstones.length > 0) {
    for (const gem of request.gemstones) {
      let stoneCost = 0;
      let stoneLabel = "";

      // Use preset if available
      if (gem.presetId) {
        const preset = getGemstonePreset(gem.presetId);
        if (preset) {
          stoneCost = preset.estimatedPriceNpr * gem.count;
          stoneLabel = `${preset.name} × ${gem.count}`;
        }
      }
      // Otherwise estimate based on type and size
      else if (gem.stoneType) {
        // Basic estimation logic (can be enhanced with more data)
        const basePrice = estimateGemstonePrice(gem);
        stoneCost = basePrice * gem.count;
        stoneLabel = `${gem.stoneType} ${gem.sizeValue || ""}${gem.sizeUnit || "mm"} × ${gem.count}`;
      }

      if (stoneCost > 0) {
        gemstoneCost += stoneCost;
        lineItems.push({
          label: stoneLabel,
          category: "GEMSTONE",
          amount: stoneCost,
        });
      }

      // Setting cost
      if (gem.settingStyle) {
        const setting = SETTING_STYLES.find(
          (s) => s.value === gem.settingStyle,
        );
        if (setting) {
          const settingItemCost = setting.pricePerStone * gem.count;
          settingCost += settingItemCost;
          lineItems.push({
            label: `${setting.label} setting × ${gem.count}`,
            category: "SETTING",
            amount: settingItemCost,
          });
        }
      }
    }
  }

  // ─────────────────────────────────────────
  // SURFACE FINISH (all methods)
  // ─────────────────────────────────────────
  if (request.surfaceFinish?.additionalCost) {
    finishCost = request.surfaceFinish.additionalCost;
    lineItems.push({
      label: `${request.surfaceFinish.finishType} finish`,
      category: "FINISH",
      amount: finishCost,
    });
  }

  // ─────────────────────────────────────────
  // CALCULATE TOTALS
  // ─────────────────────────────────────────

  // Subtotal before making charge
  const materialsTotal =
    metalCost +
    alloyPremiumCost +
    baseMetalCost +
    platingCost +
    gemstoneCost +
    settingCost +
    finishCost;

  // Making charge (percentage of metal/base materials cost)
  const makingChargeBase =
    metalCost + alloyPremiumCost + baseMetalCost + platingCost;
  const makingCharge = makingChargeBase * (makingChargePercent / 100);

  if (makingCharge > 0) {
    lineItems.push({
      label: `Making charge (${makingChargePercent}%)`,
      category: "MAKING",
      amount: makingCharge,
    });
  }

  const subtotal = materialsTotal + makingCharge;

  // ─────────────────────────────────────────
  // CALCULATE TAX USING NEW TAX ENGINE
  // ─────────────────────────────────────────

  let taxAmount = 0;
  let taxRate = 0;
  let taxResult: TaxResult | undefined;

  try {
    // Determine if this is studded jewellery
    const hasGemstones = gemstoneCost > 0;
    // Consider everything as jewellery unless explicitly bullion/bar/coin
    // This ensures tax rules apply correctly
    const isJewellery = request.jewelleryType
      ? !request.jewelleryType.toLowerCase().match(/bullion|bar|coin/)
      : true;
    const isGold =
      request.buildMethod === "METHOD_A" && request.methodA?.metal
        ? request.methodA.metal.toUpperCase().includes("GOLD")
        : false;

    // Build cart breakdown for tax engine
    const cartBreakdown: CartBreakdown = {
      metalSubtotal: metalCost,
      alloyPremiumSubtotal: alloyPremiumCost,
      baseMetalSubtotal: baseMetalCost,
      platingSubtotal: platingCost,
      makingChargeSubtotal: makingCharge,
      gemstoneSubtotal: gemstoneCost,
      finishSubtotal: finishCost,
      total: subtotal,
      isJewellery,
      isGold,
      hasGemstones,
    };

    // Calculate tax using new engine
    taxResult = calculateTax({
      country: request.country,
      cartBreakdown,
    });

    // Sum all tax amounts
    taxAmount = taxResult.lineItems.reduce((sum, item) => sum + item.amount, 0);

    // Calculate effective tax rate for legacy compatibility
    taxRate = subtotal > 0 ? taxAmount / subtotal : 0;

    // Add tax line items to display
    taxResult.lineItems.forEach((item) => {
      const taxLineItem: LineItem = {
        label: item.displayName || item.name,
        category: "TAX",
        amount: item.amount,
        details: `${(item.rate * 100).toFixed(1)}% of ${currencySymbol}${item.applicableToAmount.toLocaleString()}`,
      };
      lineItems.push(taxLineItem);
    });
  } catch (error) {
    // Fallback to legacy tax calculation if engine fails
    console.error(
      "[Tax Engine] Error occurred, falling back to legacy rates:",
      error,
    );
    console.error(
      "[Tax Engine] Stack trace:",
      error instanceof Error ? error.stack : "No stack",
    );
    const legacyInfo = LEGACY_TAX_RATES[request.country] || {
      rate: 0.13,
      name: "Tax",
    };
    taxRate = legacyInfo.rate;
    taxAmount = subtotal * taxRate;
    // Add legacy tax as line item
    if (taxAmount > 0) {
      const legacyTaxItem: LineItem = {
        label: legacyInfo.name,
        category: "TAX",
        amount: taxAmount,
        details: `${(taxRate * 100).toFixed(1)}% (fallback)`,
      };
      lineItems.push(legacyTaxItem);
    }
  }

  const total = subtotal + taxAmount;

  // ─────────────────────────────────────────
  // DETERMINE STATUS
  // ─────────────────────────────────────────
  let status: EstimateStatus = "complete";
  let statusMessage: string | undefined;

  if (missingFields.length > 0) {
    status = "incomplete";
    statusMessage = `Please select: ${missingFields.join(", ")}`;
  } else if (total <= 0) {
    status = "incomplete";
    statusMessage =
      "Unable to calculate estimate. Please check your selections.";
  }

  return {
    status,
    statusMessage,
    missingFields: missingFields.length > 0 ? missingFields : undefined,

    metalCost,
    alloyPremiumCost,
    baseMetalCost,
    platingCost,
    gemstoneCost,
    settingCost,
    finishCost,
    makingCharge,

    subtotal,
    taxRate,
    taxAmount,
    total,
    taxResult,

    lineItems,

    currency: request.currency,
    currencySymbol,

    buildMethod: request.buildMethod,
    buildMethodLabel: BUILD_METHOD_LABELS[request.buildMethod],
  };
}

// ═══════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════

function formatMetalName(metalKey: string): string {
  const names: Record<string, string> = {
    GOLD_24K: "24K Gold",
    GOLD_22K: "22K Gold",
    GOLD_18K: "18K Gold",
    GOLD_14K: "14K Gold",
    GOLD_10K: "10K Gold",
    SILVER_999: "Fine Silver 999",
    SILVER_925: "Sterling Silver 925",
    PLATINUM_PT950: "Platinum PT950",
    PLATINUM_PT900: "Platinum PT900",
    PALLADIUM_PD950: "Palladium PD950",
  };
  return names[metalKey] || metalKey;
}

function estimateGemstonePrice(gem: GemstoneInput): number {
  // Basic price estimation based on stone type
  // This is a simplified version - real prices come from catalog
  const basePrices: Record<string, number> = {
    DIAMOND_NATURAL: 50000,
    DIAMOND_LAB: 15000,
    DIAMOND: 15000,
    MOISSANITE: 5000,
    CUBIC_ZIRCONIA: 200,
    RUBY: 15000,
    SAPPHIRE: 12000,
    EMERALD: 18000,
    PEARL: 2000,
    AMETHYST: 500,
    TOPAZ: 400,
    GARNET: 600,
    OPAL: 1500,
    TURQUOISE: 800,
    AQUAMARINE: 1200,
    PERIDOT: 500,
    CITRINE: 400,
  };

  let price = basePrices[gem.stoneType || ""] || 500;

  // Adjust by size
  if (gem.sizeValue) {
    const size = parseFloat(gem.sizeValue);
    if (gem.sizeUnit === "CARAT") {
      // Exponential pricing for carats
      price *= Math.pow(size, 1.5);
    } else {
      // Linear for mm
      price *= size / 5; // 5mm is baseline
    }
  }

  // Apply color multiplier (especially for diamonds)
  if (gem.color) {
    const colorMultipliers: Record<string, number> = {
      // Diamond colors
      D: 1.5,
      E: 1.4,
      F: 1.3,
      G: 1.15,
      H: 1.1,
      I: 1.0,
      J: 0.9,
      K: 0.8,
      L: 0.7,
      M: 0.6,
      // Colored gemstone intensity
      VIVID: 1.5,
      DEEP: 1.3,
      MEDIUM: 1.0,
      LIGHT: 0.7,
    };
    price *= colorMultipliers[gem.color] || 1.0;
  }

  // Apply clarity multiplier
  if (gem.clarity) {
    const clarityMultipliers: Record<string, number> = {
      // Diamond clarity
      IF: 1.6,
      VVS1: 1.4,
      VVS2: 1.3,
      VS1: 1.15,
      VS2: 1.1,
      SI1: 1.0,
      SI2: 0.9,
      I1: 0.7,
      I2: 0.5,
      I3: 0.3,
      // Colored gem clarity
      EYE_CLEAN: 1.3,
      SLIGHTLY_INCLUDED: 1.0,
      MODERATELY_INCLUDED: 0.7,
      HEAVILY_INCLUDED: 0.4,
    };
    price *= clarityMultipliers[gem.clarity] || 1.0;
  }

  // Apply cut multiplier (diamonds only)
  if (gem.cut) {
    const cutMultipliers: Record<string, number> = {
      EXCELLENT: 1.2,
      VERY_GOOD: 1.1,
      GOOD: 1.0,
      FAIR: 0.85,
    };
    price *= cutMultipliers[gem.cut] || 1.0;
  }

  // Apply shape multiplier
  if (gem.shape) {
    const shapeMultipliers: Record<string, number> = {
      ROUND: 1.0,
      OVAL: 1.08,
      PRINCESS: 1.05,
      CUSHION: 1.1,
      EMERALD_CUT: 1.1,
      MARQUISE: 1.12,
      PEAR: 1.08,
      HEART: 1.15,
      RADIANT: 1.08,
      ASSCHER: 1.12,
      BAGUETTE: 0.95,
      TRILLION: 1.05,
      CABOCHON: 0.9,
    };
    price *= shapeMultipliers[gem.shape] || 1.0;
  }

  return Math.round(price);
}

// ═══════════════════════════════════════════
// GEMSTONE PRICE BREAKDOWN
// ═══════════════════════════════════════════

export interface GemstonePriceBreakdown {
  basePrice: number;
  basePriceLabel: string;
  sizeMultiplier: number;
  sizeLabel: string;
  colorMultiplier: number;
  colorLabel: string;
  clarityMultiplier: number;
  clarityLabel: string;
  cutMultiplier: number;
  cutLabel: string;
  shapeMultiplier: number;
  shapeLabel: string;
  settingCost: number;
  settingLabel: string;
  totalPerStone: number;
  count: number;
  grandTotal: number;
}

// Expose base prices for breakdown display
export const GEMSTONE_BASE_PRICES: Record<string, number> = {
  DIAMOND_NATURAL: 50000,
  DIAMOND_LAB: 15000,
  DIAMOND: 15000,
  MOISSANITE: 5000,
  CUBIC_ZIRCONIA: 200,
  RUBY: 15000,
  SAPPHIRE: 12000,
  EMERALD: 18000,
  PEARL: 2000,
  AMETHYST: 500,
  TOPAZ: 400,
  GARNET: 600,
  OPAL: 1500,
  TURQUOISE: 800,
  AQUAMARINE: 1200,
  PERIDOT: 500,
  CITRINE: 400,
};

export const COLOR_MULTIPLIERS: Record<
  string,
  { multiplier: number; label: string }
> = {
  D: { multiplier: 1.5, label: "D (Colorless)" },
  E: { multiplier: 1.4, label: "E (Colorless)" },
  F: { multiplier: 1.3, label: "F (Colorless)" },
  G: { multiplier: 1.15, label: "G (Near Colorless)" },
  H: { multiplier: 1.1, label: "H (Near Colorless)" },
  I: { multiplier: 1.0, label: "I (Near Colorless)" },
  J: { multiplier: 0.9, label: "J (Faint)" },
  K: { multiplier: 0.8, label: "K (Faint)" },
  L: { multiplier: 0.7, label: "L (Light)" },
  M: { multiplier: 0.6, label: "M (Light)" },
  VIVID: { multiplier: 1.5, label: "Vivid" },
  DEEP: { multiplier: 1.3, label: "Deep" },
  MEDIUM: { multiplier: 1.0, label: "Medium" },
  LIGHT: { multiplier: 0.7, label: "Light" },
};

export const CLARITY_MULTIPLIERS: Record<
  string,
  { multiplier: number; label: string }
> = {
  IF: { multiplier: 1.6, label: "IF (Internally Flawless)" },
  VVS1: { multiplier: 1.4, label: "VVS1" },
  VVS2: { multiplier: 1.3, label: "VVS2" },
  VS1: { multiplier: 1.15, label: "VS1" },
  VS2: { multiplier: 1.1, label: "VS2" },
  SI1: { multiplier: 1.0, label: "SI1" },
  SI2: { multiplier: 0.9, label: "SI2" },
  I1: { multiplier: 0.7, label: "I1 (Included)" },
  I2: { multiplier: 0.5, label: "I2 (Included)" },
  I3: { multiplier: 0.3, label: "I3 (Included)" },
  EYE_CLEAN: { multiplier: 1.3, label: "Eye Clean" },
  SLIGHTLY_INCLUDED: { multiplier: 1.0, label: "Slightly Included" },
  MODERATELY_INCLUDED: { multiplier: 0.7, label: "Moderately Included" },
  HEAVILY_INCLUDED: { multiplier: 0.4, label: "Heavily Included" },
};

export const CUT_MULTIPLIERS: Record<
  string,
  { multiplier: number; label: string }
> = {
  EXCELLENT: { multiplier: 1.2, label: "Excellent" },
  VERY_GOOD: { multiplier: 1.1, label: "Very Good" },
  GOOD: { multiplier: 1.0, label: "Good" },
  FAIR: { multiplier: 0.85, label: "Fair" },
};

export const SHAPE_MULTIPLIERS: Record<
  string,
  { multiplier: number; label: string }
> = {
  ROUND: { multiplier: 1.0, label: "Round Brilliant" },
  OVAL: { multiplier: 1.08, label: "Oval" },
  PRINCESS: { multiplier: 1.05, label: "Princess" },
  CUSHION: { multiplier: 1.1, label: "Cushion" },
  EMERALD_CUT: { multiplier: 1.1, label: "Emerald Cut" },
  MARQUISE: { multiplier: 1.12, label: "Marquise" },
  PEAR: { multiplier: 1.08, label: "Pear" },
  HEART: { multiplier: 1.15, label: "Heart" },
  RADIANT: { multiplier: 1.08, label: "Radiant" },
  ASSCHER: { multiplier: 1.12, label: "Asscher" },
  BAGUETTE: { multiplier: 0.95, label: "Baguette" },
  TRILLION: { multiplier: 1.05, label: "Trillion" },
  CABOCHON: { multiplier: 0.9, label: "Cabochon" },
};

export function getGemstonePriceBreakdown(
  gem: GemstoneInput,
): GemstonePriceBreakdown {
  const basePrice = GEMSTONE_BASE_PRICES[gem.stoneType || ""] || 500;
  const basePriceLabel = gem.stoneType || "Unknown Stone";

  let sizeMultiplier = 1;
  let sizeLabel = "Standard size";
  if (gem.sizeValue) {
    const size = parseFloat(gem.sizeValue);
    if (gem.sizeUnit === "CARAT") {
      sizeMultiplier = Math.pow(size, 1.5);
      sizeLabel = `${size} carat`;
    } else {
      sizeMultiplier = size / 5;
      sizeLabel = `${size}mm`;
    }
  }

  const colorInfo = gem.color ? COLOR_MULTIPLIERS[gem.color] : null;
  const colorMultiplier = colorInfo?.multiplier || 1.0;
  const colorLabel = colorInfo?.label || "Not specified";

  const clarityInfo = gem.clarity ? CLARITY_MULTIPLIERS[gem.clarity] : null;
  const clarityMultiplier = clarityInfo?.multiplier || 1.0;
  const clarityLabel = clarityInfo?.label || "Not specified";

  const cutInfo = gem.cut ? CUT_MULTIPLIERS[gem.cut] : null;
  const cutMultiplier = cutInfo?.multiplier || 1.0;
  const cutLabel = cutInfo?.label || "Not specified";

  const shapeInfo = gem.shape ? SHAPE_MULTIPLIERS[gem.shape] : null;
  const shapeMultiplier = shapeInfo?.multiplier || 1.0;
  const shapeLabel = shapeInfo?.label || "Not specified";

  const totalPerStone = Math.round(
    basePrice *
      sizeMultiplier *
      colorMultiplier *
      clarityMultiplier *
      cutMultiplier *
      shapeMultiplier,
  );

  // Get setting cost
  const setting = gem.settingStyle
    ? SETTING_STYLES.find((s) => s.value === gem.settingStyle)
    : null;
  const settingCost = setting?.pricePerStone || 0;
  const settingLabel = setting?.label || "No setting";

  const count = gem.count || 1;
  const grandTotal = (totalPerStone + settingCost) * count;

  return {
    basePrice,
    basePriceLabel,
    sizeMultiplier,
    sizeLabel,
    colorMultiplier,
    colorLabel,
    clarityMultiplier,
    clarityLabel,
    cutMultiplier,
    cutLabel,
    shapeMultiplier,
    shapeLabel,
    settingCost,
    settingLabel,
    totalPerStone,
    count,
    grandTotal,
  };
}

// ═══════════════════════════════════════════
// EXPORTS FOR COMPONENTS
// ═══════════════════════════════════════════

export { BUILD_METHOD_LABELS, CURRENCY_SYMBOLS, LEGACY_TAX_RATES };
