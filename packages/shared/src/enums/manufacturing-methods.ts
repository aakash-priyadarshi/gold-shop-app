// ══════════════════════════════════════════════════════════════════════════════
// GOLD SHOP MARKETPLACE - MANUFACTURING METHODS
// Every CUSTOM order MUST choose exactly ONE method
// ══════════════════════════════════════════════════════════════════════════════

import { PreciousMetal, BaseMetal, FinishType, PlatingTier, PRECIOUS_METAL_PURITY } from './materials';

// ──────────────────────────────────────────────────────────────────────────────
// MANUFACTURING METHOD ENUM
// ──────────────────────────────────────────────────────────────────────────────
export enum BuildMethod {
  METHOD_A = 'METHOD_A',  // Solid Precious Metal
  METHOD_B = 'METHOD_B',  // Standard Alloy
  METHOD_C = 'METHOD_C',  // Core Metal + Finish
  METHOD_D = 'METHOD_D',  // Multi-Metal Construction
}

// ──────────────────────────────────────────────────────────────────────────────
// METHOD A: SOLID PRECIOUS METAL
// 100% precious metal, optional target weight or budget
// Eligible for hallmarking
// ──────────────────────────────────────────────────────────────────────────────
export interface MethodAComposition {
  method: BuildMethod.METHOD_A;
  preciousMetal: PreciousMetal;
  purity: number;  // Derived from precious metal
  targetTotalWeightG?: number;
  budgetNpr?: number;
  eligibleForHallmark: true;
  labels: ['Solid Gold' | 'Solid Silver' | 'Solid Platinum' | 'Solid Palladium'];
}

// ──────────────────────────────────────────────────────────────────────────────
// METHOD B: STANDARD ALLOY
// Preset alloys ONLY - NO custom percentages allowed
// ──────────────────────────────────────────────────────────────────────────────
export enum StandardAlloy {
  GOLD_18K = 'GOLD_18K',
  GOLD_14K = 'GOLD_14K',
  GOLD_10K = 'GOLD_10K',
  STERLING_SILVER_925 = 'STERLING_SILVER_925',
}

export interface MethodBComposition {
  method: BuildMethod.METHOD_B;
  standardAlloy: StandardAlloy;
  targetTotalWeightG?: number;
  eligibleForHallmark: boolean;  // True for recognized alloys
  labels: string[];
}

// ──────────────────────────────────────────────────────────────────────────────
// METHOD C: CORE METAL + FINISH
// Base metal with optional plating
// NOT eligible for hallmarking
// ──────────────────────────────────────────────────────────────────────────────
export interface MethodCComposition {
  method: BuildMethod.METHOD_C;
  coreMetal: BaseMetal | PreciousMetal.SILVER_925;
  coreWeightG?: number;
  addGoldPlating: boolean;
  platingTier?: PlatingTier;  // Required if addGoldPlating = true
  finishType?: FinishType;
  isVermeil: boolean;  // True only if coreMetal = SILVER_925 and gold plating
  eligibleForHallmark: false;
  labels: ['Not solid gold'];  // Mandatory label
}

// ──────────────────────────────────────────────────────────────────────────────
// METHOD D: MULTI-METAL CONSTRUCTION
// Gold or precious metal used in SPECIFIC PARTS or BY WEIGHT
// NOT plating, NOT alloy mixing
// ──────────────────────────────────────────────────────────────────────────────

// Multi-metal patterns
export enum MultiMetalPattern {
  TOP_PLATE = 'TOP_PLATE',
  INLAY = 'INLAY',
  OUTER_SLEEVE = 'OUTER_SLEEVE',
  TWO_TONE_SPLIT = 'TWO_TONE_SPLIT',
}

// Multi-metal modes (exactly one required)
export enum MultiMetalMode {
  MODE_D1 = 'MODE_D1',  // Percent by Weight
  MODE_D2 = 'MODE_D2',  // Gold Grams
  MODE_D3 = 'MODE_D3',  // Part Dimensions
}

// Mode D1: Percent by Weight
export interface ModeD1Config {
  mode: MultiMetalMode.MODE_D1;
  goldPercentByWeight: number;  // 10-90
  goldPurity: PreciousMetal;
  baseMetal: BaseMetal;
  targetTotalWeightG?: number;
  // System calculated
  estimatedGoldWeightG?: number;
  estimatedBaseWeightG?: number;
}

// Mode D2: Gold Grams
export interface ModeD2Config {
  mode: MultiMetalMode.MODE_D2;
  targetGoldWeightG: number;
  goldPurity: PreciousMetal;
  baseMetal: BaseMetal;
  targetTotalWeightG?: number;
  // System calculated
  estimatedBaseWeightG?: number;
}

// Mode D3: Part Dimensions
export interface ModeD3Config {
  mode: MultiMetalMode.MODE_D3;
  pattern: MultiMetalPattern;
  dimensions: PartDimensions;
  goldPurity: PreciousMetal;
  baseMetal: BaseMetal;
  // Weight deferred to shopkeeper
  weightConfirmationRequired: true;
  weightConfirmationMessage: 'Final weight subject to confirmation';
}

// Dimensions for each pattern type
export interface PartDimensions {
  // For TOP_PLATE
  topPlateThicknessMm?: number;
  topPlateLengthMm?: number;
  topPlateWidthMm?: number;
  
  // For INLAY
  inlayWidthMm?: number;
  inlayDepthMm?: number;
  
  // For OUTER_SLEEVE
  sleeveThicknessMm?: number;
  
  // For TWO_TONE_SPLIT
  splitRatio?: number;  // e.g., 0.5 for 50-50
}

// Complete Method D composition
export interface MethodDComposition {
  method: BuildMethod.METHOD_D;
  multiMetalPattern: MultiMetalPattern;
  multiMetalMode: MultiMetalMode;
  modeConfig: ModeD1Config | ModeD2Config | ModeD3Config;
  eligibleForHallmark: boolean;  // Only if 100% gold selected
  labels: string[];  // "Multi-metal construction. Not solid gold unless 100% gold is selected."
}

// ──────────────────────────────────────────────────────────────────────────────
// UNION TYPE FOR ALL COMPOSITIONS
// ──────────────────────────────────────────────────────────────────────────────
export type Composition = 
  | MethodAComposition 
  | MethodBComposition 
  | MethodCComposition 
  | MethodDComposition;

// ──────────────────────────────────────────────────────────────────────────────
// MANDATORY LABELS BY METHOD
// ──────────────────────────────────────────────────────────────────────────────
export const MANDATORY_LABELS: Record<BuildMethod, string[]> = {
  [BuildMethod.METHOD_A]: [], // No special label needed - it's solid
  [BuildMethod.METHOD_B]: [], // Standard alloy, hallmark label if applicable
  [BuildMethod.METHOD_C]: ['Not solid gold'],
  [BuildMethod.METHOD_D]: ['Multi-metal construction. Not solid gold unless 100% gold is selected.'],
};

// ──────────────────────────────────────────────────────────────────────────────
// HALLMARK ELIGIBILITY
// ──────────────────────────────────────────────────────────────────────────────
export function isEligibleForHallmark(composition: Composition): boolean {
  switch (composition.method) {
    case BuildMethod.METHOD_A:
      return true;
    case BuildMethod.METHOD_B:
      return true;  // Standard recognized alloys
    case BuildMethod.METHOD_C:
      return false;  // Plated items never eligible
    case BuildMethod.METHOD_D:
      // Only if 100% gold is selected (which doesn't make sense for multi-metal)
      return false;
    default:
      return false;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// CALCULATION HELPERS FOR METHOD D
// ──────────────────────────────────────────────────────────────────────────────
export function calculateMethodD1Weights(
  goldPercentByWeight: number,
  targetTotalWeightG: number
): { goldWeightG: number; baseWeightG: number } {
  const goldWeightG = (goldPercentByWeight / 100) * targetTotalWeightG;
  const baseWeightG = targetTotalWeightG - goldWeightG;
  return { goldWeightG, baseWeightG };
}

export function calculateMethodD2Weights(
  targetGoldWeightG: number,
  targetTotalWeightG: number
): { baseWeightG: number } {
  const baseWeightG = targetTotalWeightG - targetGoldWeightG;
  return { baseWeightG };
}

// ──────────────────────────────────────────────────────────────────────────────
// PRICE ESTIMATION HELPER
// ──────────────────────────────────────────────────────────────────────────────
export interface PriceEstimation {
  metalCost: number;
  makingCharge: number;
  finishCost: number;
  totalEstimate: number;
  breakdown: PriceBreakdownItem[];
}

export interface PriceBreakdownItem {
  description: string;
  quantity: number;
  unit: string;
  ratePerUnit: number;
  amount: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// METHOD DESCRIPTIONS (for UI)
// ──────────────────────────────────────────────────────────────────────────────
export const METHOD_DESCRIPTIONS: Record<BuildMethod, { en: string; ne: string; hi: string }> = {
  [BuildMethod.METHOD_A]: {
    en: 'Solid Precious Metal - 100% pure precious metal construction',
    ne: 'शुद्ध बहुमूल्य धातु - १००% शुद्ध बहुमूल्य धातु निर्माण',
    hi: 'शुद्ध कीमती धातु - 100% शुद्ध कीमती धातु निर्माण',
  },
  [BuildMethod.METHOD_B]: {
    en: 'Standard Alloy - Industry-standard alloy compositions (18K, 14K, Sterling)',
    ne: 'मानक मिश्र धातु - उद्योग-मानक मिश्र धातु संरचना',
    hi: 'मानक मिश्र धातु - उद्योग-मानक मिश्र धातु रचनाएँ',
  },
  [BuildMethod.METHOD_C]: {
    en: 'Core Metal + Finish - Base metal with plating or coating',
    ne: 'कोर धातु + फिनिश - आधार धातुमा प्लेटिङ वा कोटिंग',
    hi: 'कोर धातु + फिनिश - प्लेटिंग या कोटिंग के साथ बेस मेटल',
  },
  [BuildMethod.METHOD_D]: {
    en: 'Multi-Metal Construction - Gold/precious metal in specific parts by weight',
    ne: 'बहु-धातु निर्माण - तौलद्वारा विशिष्ट भागहरूमा सुन/बहुमूल्य धातु',
    hi: 'बहु-धातु निर्माण - वजन के हिसाब से विशिष्ट भागों में सोना/कीमती धातु',
  },
};
