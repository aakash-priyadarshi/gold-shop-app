import type { GemstoneEntry as GemstoneEntryV2 } from "@/components/pricing/GemstoneEditorV2";
import type { BuildMethod } from "@/lib/pricing/calculate-estimate";

export interface QuoteDesignFormSlice {
  jewelleryType: string;
  buildMethod: BuildMethod;
  metalType: string;
  targetTotalWeightG: string;
  surfaceFinish: string;
  description: string;
  specialInstructions: string;
  hasGemstones: boolean;
  gemstonesV2: GemstoneEntryV2[];
  alloyConfig: {
    baseMetal: string;
    karat?: string;
    alloyFamily?: string;
    recipePresetId?: string;
  };
  methodCConfig: {
    baseMetal: string;
    platingType: string;
    platingTier: string;
  };
  methodDConfig: {
    purity: string;
    chainStyle: string;
  };
  composition?: Record<string, unknown>;
}

/** Infer metal type from free-text description (e.g. "22k gold ring"). */
export function resolveMetalTypeFromDescription(
  description: string,
  fallback: string,
): string {
  const text = description.toLowerCase();
  const karatMatch = text.match(/\b(10|14|18|22|24)\s*k(?:t|arat)?\b/);
  if (/\bgold\b/.test(text) && karatMatch) {
    return `GOLD_${karatMatch[1]}K`;
  }
  if (/\bgold\b/.test(text) && !/\bsilver\b/.test(text)) {
    return fallback.startsWith("GOLD_") ? fallback : "GOLD_22K";
  }
  if (/\bsterling\b/.test(text) || /\b925\b/.test(text)) return "SILVER_925";
  if (/\bsilver\b/.test(text) && !/\bgold\b/.test(text)) return "SILVER_925";
  if (/\bplatinum\b/.test(text)) return "PLATINUM_PT950";
  return fallback;
}

export function buildMetalDescription(form: QuoteDesignFormSlice): string {
  if (form.buildMethod === "METHOD_B" && form.alloyConfig) {
    const { alloyFamily, karat } = form.alloyConfig;
    if (alloyFamily && karat) {
      const colorMap: Record<string, string> = {
        YELLOW_GOLD: "warm yellow gold",
        WHITE_GOLD: "white gold alloy",
        ROSE_GOLD: "rose gold",
        GREEN_GOLD: "green gold",
      };
      return `${karat} ${colorMap[alloyFamily] || alloyFamily}`;
    }
  }
  if (form.buildMethod === "METHOD_C" && form.methodCConfig) {
    const baseMetalMap: Record<string, string> = {
      BRASS: "brass",
      COPPER: "copper",
      BRONZE: "bronze",
      STAINLESS_STEEL: "stainless steel",
    };
    const platingMap: Record<string, string> = {
      GOLD_PLATED: "gold plated",
      ROSE_GOLD_PLATED: "rose gold plated",
      RHODIUM_PLATED: "rhodium plated",
      SILVER_PLATED: "silver plated",
    };
    const base =
      baseMetalMap[form.methodCConfig.baseMetal] ||
      form.methodCConfig.baseMetal;
    const plating =
      platingMap[form.methodCConfig.platingType] ||
      form.methodCConfig.platingType;
    return `${base} with ${plating} finish`;
  }
  if (form.buildMethod === "METHOD_D" && form.methodDConfig) {
    const purity = form.methodDConfig.purity;
    const style = form.methodDConfig.chainStyle;
    return `${purity} Italian machine-made ${style || "chain"}`;
  }
  const metalMap: Record<string, string> = {
    GOLD_24K: "24 karat yellow gold",
    GOLD_22K: "22 karat yellow gold",
    GOLD_18K: "18 karat yellow gold",
    GOLD_14K: "14 karat yellow gold",
    GOLD_10K: "10 karat yellow gold",
    SILVER_999: "fine silver",
    SILVER_925: "sterling silver",
    PLATINUM_PT950: "platinum",
  };
  return metalMap[form.metalType] || form.metalType.replace(/_/g, " ").toLowerCase();
}

export function buildDesignSpecsPayload(
  form: QuoteDesignFormSlice,
  options: {
    regenerationFeedback?: string;
    jewelleryTypeLabel?: string;
    weightDisplay?: string;
  } = {},
) {
  const combinedDescription = [form.description, form.specialInstructions]
    .filter(Boolean)
    .join(". ");

  let metalType = form.metalType;
  if (form.buildMethod === "METHOD_B" && form.alloyConfig.karat) {
    const k = form.alloyConfig.karat.replace(/K/i, "");
    if (form.alloyConfig.baseMetal === "GOLD") metalType = `GOLD_${k}K`;
    else if (form.alloyConfig.baseMetal === "SILVER") metalType = "SILVER_925";
  }
  metalType = resolveMetalTypeFromDescription(combinedDescription, metalType);

  const metalDescription = buildMetalDescription({
    ...form,
    metalType,
  });

  const weight = parseFloat(form.targetTotalWeightG) || undefined;
  const gemstonesDetails =
    form.hasGemstones && form.gemstonesV2.length > 0
      ? form.gemstonesV2.map((gem) => ({
          stoneType: gem.stoneType,
          shape: gem.shape,
          color: gem.color,
          clarity: gem.clarity,
          cut: gem.cut,
          settingStyle: gem.settingStyle,
          count: gem.count,
          sizeValue: parseFloat(String(gem.sizeValue)) || 0,
          sizeUnit: gem.sizeUnit,
        }))
      : [];

  const descriptionParts = [
    combinedDescription,
    options.jewelleryTypeLabel
      ? `A ${options.jewelleryTypeLabel}`
      : undefined,
    metalDescription ? `made in ${metalDescription}` : undefined,
    options.weightDisplay,
    form.surfaceFinish
      ? `with ${form.surfaceFinish.replace(/_/g, " ").toLowerCase()} finish`
      : undefined,
    form.hasGemstones && form.gemstonesV2.length > 0
      ? `with ${form.gemstonesV2.map((g) => `${g.count}x ${g.stoneType.replace(/_/g, " ").toLowerCase()}`).join(", ")}`
      : undefined,
  ].filter(Boolean);

  const metalColor =
    form.buildMethod === "METHOD_B" && form.alloyConfig.alloyFamily
      ? form.alloyConfig.alloyFamily === "WHITE_GOLD"
        ? "WHITE"
        : form.alloyConfig.alloyFamily === "ROSE_GOLD"
          ? "ROSE"
          : "YELLOW"
      : metalType.startsWith("GOLD_")
        ? "YELLOW"
        : undefined;

  return {
    jewelryType: form.jewelleryType,
    buildMethod: form.buildMethod,
    metalType,
    metalDescription,
    metalColor,
    estimatedWeight: weight,
    surfaceFinish:
      form.surfaceFinish ||
      (form.composition as { surfaceFinish?: string } | undefined)
        ?.surfaceFinish ||
      "",
    hasGemstones: form.hasGemstones,
    gemstones: gemstonesDetails,
    ...(form.hasGemstones &&
      form.gemstonesV2.length > 0 && {
        primaryStone: form.gemstonesV2[0].stoneType,
        stoneCut: form.gemstonesV2[0].shape,
        stoneColor: form.gemstonesV2[0].color,
        stoneClarity: form.gemstonesV2[0].clarity,
        stoneCutGrade: form.gemstonesV2[0].cut,
        settingStyle: form.gemstonesV2[0].settingStyle,
        stoneCount: form.gemstonesV2[0].count,
      }),
    ...(form.buildMethod === "METHOD_B" && {
      alloyDetails: {
        baseMetal: form.alloyConfig.baseMetal,
        karat: form.alloyConfig.karat,
        alloyFamily: form.alloyConfig.alloyFamily,
        recipePresetId: form.alloyConfig.recipePresetId,
      },
    }),
    ...(form.buildMethod === "METHOD_C" && {
      platingDetails: {
        baseMetal: form.methodCConfig.baseMetal,
        platingType: form.methodCConfig.platingType,
        platingTier: form.methodCConfig.platingTier,
      },
    }),
    ...(form.buildMethod === "METHOD_D" && {
      italianMachineDetails: {
        purity: form.methodDConfig.purity,
        chainStyle: form.methodDConfig.chainStyle,
      },
    }),
    additionalSpecs: {
      description: descriptionParts.join(". "),
      regenerationFeedback: options.regenerationFeedback || undefined,
    },
    shareToGallery: false,
  };
}
