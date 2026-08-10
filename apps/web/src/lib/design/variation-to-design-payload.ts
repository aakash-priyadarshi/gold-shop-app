import type { AiDesignVariation } from "@/components/ai/AiDesignStudio";

/** Map an AI variation spec to POST /designs body. */
export function variationToDesignPayload(
  spec: AiDesignVariation,
  prompt: string,
  variationIndex: number,
) {
  return {
    jewelryType: spec.jewelryType,
    buildMethod: spec.buildMethod,
    metalType: spec.metalType,
    metalColor: spec.metalColor,
    weightCategory: spec.weightCategory,
    estimatedWeight: spec.estimatedWeight,
    surfaceFinish: spec.surfaceFinish,
    hasGemstones: spec.hasGemstones,
    primaryStone: spec.primaryStone,
    stoneCut: spec.stoneCut,
    stoneCarat: spec.stoneCarat,
    stoneColor: spec.stoneColor,
    stoneCount: spec.stoneCount,
    settingStyle: spec.settingStyle,
    alloyDetails: spec.alloyDetails,
    platingDetails: spec.platingDetails,
    italianMachineDetails: spec.italianMachineDetails,
    gemstones: spec.gemstones,
    additionalSpecs: {
      variationOf: prompt,
      variationIndex,
      styleSummary: spec.styleSummary,
      description: spec.description,
    },
    shareToGallery: false,
  };
}
