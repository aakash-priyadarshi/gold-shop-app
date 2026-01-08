// ══════════════════════════════════════════════════════════════════════════════
// GOLD SHOP MARKETPLACE - MATERIAL CLASSIFICATION ENUMS
// STRICT ENUMS — DO NOT CHANGE NAMES
// ══════════════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────────────
// A) PRECIOUS METALS
// ──────────────────────────────────────────────────────────────────────────────
export enum PreciousMetal {
  // Gold variants
  GOLD_24K = 'GOLD_24K',
  GOLD_22K = 'GOLD_22K',
  GOLD_18K = 'GOLD_18K',
  GOLD_14K = 'GOLD_14K',
  GOLD_10K = 'GOLD_10K',
  
  // Silver variants
  SILVER_999 = 'SILVER_999',      // Fine Silver 99.9%
  SILVER_925 = 'SILVER_925',      // Sterling Silver 92.5%
  
  // Platinum variants
  PLATINUM_950 = 'PLATINUM_950',  // PT950
  PLATINUM_900 = 'PLATINUM_900',  // PT900
  
  // Palladium
  PALLADIUM_950 = 'PALLADIUM_950', // PD950
}

export const PRECIOUS_METAL_PURITY: Record<PreciousMetal, number> = {
  [PreciousMetal.GOLD_24K]: 0.999,
  [PreciousMetal.GOLD_22K]: 0.916,
  [PreciousMetal.GOLD_18K]: 0.750,
  [PreciousMetal.GOLD_14K]: 0.585,
  [PreciousMetal.GOLD_10K]: 0.417,
  [PreciousMetal.SILVER_999]: 0.999,
  [PreciousMetal.SILVER_925]: 0.925,
  [PreciousMetal.PLATINUM_950]: 0.950,
  [PreciousMetal.PLATINUM_900]: 0.900,
  [PreciousMetal.PALLADIUM_950]: 0.950,
};

// ──────────────────────────────────────────────────────────────────────────────
// B) JEWELLERY ALLOYS (Real metal mixes for alloying)
// ──────────────────────────────────────────────────────────────────────────────
export enum JewelleryAlloyMetal {
  COPPER = 'COPPER',
  ZINC = 'ZINC',
  NICKEL = 'NICKEL',              // RESTRICTED: allowed only if compliant flag = true
  PALLADIUM_ALLOY = 'PALLADIUM_ALLOY',   // For white gold
  SILVER_ALLOY = 'SILVER_ALLOY',
  BRASS_ALLOY = 'BRASS_ALLOY',    // Copper + Zinc
  BRONZE_ALLOY = 'BRONZE_ALLOY',  // Copper + Tin
}

// ──────────────────────────────────────────────────────────────────────────────
// C) BASE METALS (Budget builds)
// ──────────────────────────────────────────────────────────────────────────────
export enum BaseMetal {
  BRASS = 'BRASS',
  BRONZE = 'BRONZE',
  COPPER = 'COPPER',
  STAINLESS_STEEL_316L = 'STAINLESS_STEEL_316L',
  TITANIUM = 'TITANIUM',
  TUNGSTEN_CARBIDE = 'TUNGSTEN_CARBIDE',
  COBALT_CHROME = 'COBALT_CHROME',
}

// ──────────────────────────────────────────────────────────────────────────────
// D) FINISHES / COATINGS (NOT MATERIAL %)
// Plating is NEVER measured in percentages
// ──────────────────────────────────────────────────────────────────────────────
export enum FinishType {
  GOLD_PLATING = 'GOLD_PLATING',
  VERMEIL = 'VERMEIL',            // Gold plating over Sterling Silver ONLY
  PVD_COATING = 'PVD_COATING',
  RHODIUM_PLATING = 'RHODIUM_PLATING',
  OXIDISED_FINISH = 'OXIDISED_FINISH',
  ENAMEL_COATING = 'ENAMEL_COATING',
}

// Plating tiers for METHOD_C
export enum PlatingTier {
  LIGHT = 'LIGHT',       // ~0.5 microns
  STANDARD = 'STANDARD', // ~1-2 microns
  PREMIUM = 'PREMIUM',   // ~2.5+ microns
}

// ──────────────────────────────────────────────────────────────────────────────
// E) GEMSTONES
// ──────────────────────────────────────────────────────────────────────────────
export enum GemstoneType {
  DIAMOND_NATURAL = 'DIAMOND_NATURAL',
  DIAMOND_LAB_GROWN = 'DIAMOND_LAB_GROWN',
  MOISSANITE = 'MOISSANITE',
  CUBIC_ZIRCONIA = 'CUBIC_ZIRCONIA',
  RUBY = 'RUBY',
  SAPPHIRE = 'SAPPHIRE',
  EMERALD = 'EMERALD',
  PEARL = 'PEARL',
  SEMI_PRECIOUS = 'SEMI_PRECIOUS',
}

// ──────────────────────────────────────────────────────────────────────────────
// MATERIAL CATEGORY CLASSIFICATION
// ──────────────────────────────────────────────────────────────────────────────
export enum MaterialCategory {
  PRECIOUS_METAL = 'PRECIOUS_METAL',
  JEWELLERY_ALLOY = 'JEWELLERY_ALLOY',
  BASE_METAL = 'BASE_METAL',
  FINISH_COATING = 'FINISH_COATING',
  GEMSTONE = 'GEMSTONE',
}

// ──────────────────────────────────────────────────────────────────────────────
// COMPLIANCE FLAGS
// ──────────────────────────────────────────────────────────────────────────────
export enum ComplianceFlag {
  NICKEL_FREE = 'NICKEL_FREE',
  HYPOALLERGENIC = 'HYPOALLERGENIC',
  LEAD_FREE = 'LEAD_FREE',
  CADMIUM_FREE = 'CADMIUM_FREE',
  EU_NICKEL_COMPLIANT = 'EU_NICKEL_COMPLIANT',
}

// ──────────────────────────────────────────────────────────────────────────────
// JEWELLERY TYPES
// ──────────────────────────────────────────────────────────────────────────────
export enum JewelleryType {
  RING = 'RING',
  NECKLACE = 'NECKLACE',
  BRACELET = 'BRACELET',
  BANGLE = 'BANGLE',
  EARRING = 'EARRING',
  PENDANT = 'PENDANT',
  CHAIN = 'CHAIN',
  ANKLET = 'ANKLET',
  NOSE_PIN = 'NOSE_PIN',
  MANGALSUTRA = 'MANGALSUTRA',
  MAANG_TIKKA = 'MAANG_TIKKA',
  OTHER = 'OTHER',
}

// ──────────────────────────────────────────────────────────────────────────────
// MATERIAL DEFINITION WITH FULL PROPERTIES
// ──────────────────────────────────────────────────────────────────────────────
export interface MaterialDefinition {
  code: string;
  category: MaterialCategory;
  nameEn: string;
  nameNe?: string;
  nameHi?: string;
  purity?: number;
  allowedMethods: BuildMethod[];
  complianceFlags: ComplianceFlag[];
  baseUnit: 'gram' | 'piece' | 'carat';
  pricingModel: 'per_gram' | 'per_piece' | 'per_carat' | 'tiered';
  isRestricted?: boolean;
  restrictionNotes?: string;
}

// Import BuildMethod for reference
import { BuildMethod } from './manufacturing-methods';

// ──────────────────────────────────────────────────────────────────────────────
// COMPLETE MATERIAL REGISTRY
// ──────────────────────────────────────────────────────────────────────────────
export const MATERIAL_REGISTRY: Record<string, MaterialDefinition> = {
  // Precious Metals
  [PreciousMetal.GOLD_24K]: {
    code: PreciousMetal.GOLD_24K,
    category: MaterialCategory.PRECIOUS_METAL,
    nameEn: '24K Gold (99.9% Pure)',
    nameNe: '२४ क्यारेट सुन',
    nameHi: '24 कैरेट सोना',
    purity: 0.999,
    allowedMethods: [BuildMethod.METHOD_A, BuildMethod.METHOD_D],
    complianceFlags: [ComplianceFlag.HYPOALLERGENIC, ComplianceFlag.NICKEL_FREE],
    baseUnit: 'gram',
    pricingModel: 'per_gram',
  },
  [PreciousMetal.GOLD_22K]: {
    code: PreciousMetal.GOLD_22K,
    category: MaterialCategory.PRECIOUS_METAL,
    nameEn: '22K Gold (91.6% Pure)',
    nameNe: '२२ क्यारेट सुन',
    nameHi: '22 कैरेट सोना',
    purity: 0.916,
    allowedMethods: [BuildMethod.METHOD_A, BuildMethod.METHOD_B, BuildMethod.METHOD_D],
    complianceFlags: [ComplianceFlag.HYPOALLERGENIC],
    baseUnit: 'gram',
    pricingModel: 'per_gram',
  },
  [PreciousMetal.GOLD_18K]: {
    code: PreciousMetal.GOLD_18K,
    category: MaterialCategory.PRECIOUS_METAL,
    nameEn: '18K Gold (75% Pure)',
    nameNe: '१८ क्यारेट सुन',
    nameHi: '18 कैरेट सोना',
    purity: 0.750,
    allowedMethods: [BuildMethod.METHOD_A, BuildMethod.METHOD_B, BuildMethod.METHOD_D],
    complianceFlags: [],
    baseUnit: 'gram',
    pricingModel: 'per_gram',
  },
  [PreciousMetal.GOLD_14K]: {
    code: PreciousMetal.GOLD_14K,
    category: MaterialCategory.PRECIOUS_METAL,
    nameEn: '14K Gold (58.5% Pure)',
    nameNe: '१४ क्यारेट सुन',
    nameHi: '14 कैरेट सोना',
    purity: 0.585,
    allowedMethods: [BuildMethod.METHOD_A, BuildMethod.METHOD_B, BuildMethod.METHOD_D],
    complianceFlags: [],
    baseUnit: 'gram',
    pricingModel: 'per_gram',
  },
  [PreciousMetal.GOLD_10K]: {
    code: PreciousMetal.GOLD_10K,
    category: MaterialCategory.PRECIOUS_METAL,
    nameEn: '10K Gold (41.7% Pure)',
    nameNe: '१० क्यारेट सुन',
    nameHi: '10 कैरेट सोना',
    purity: 0.417,
    allowedMethods: [BuildMethod.METHOD_A, BuildMethod.METHOD_B, BuildMethod.METHOD_D],
    complianceFlags: [],
    baseUnit: 'gram',
    pricingModel: 'per_gram',
  },
  [PreciousMetal.SILVER_999]: {
    code: PreciousMetal.SILVER_999,
    category: MaterialCategory.PRECIOUS_METAL,
    nameEn: 'Fine Silver (99.9%)',
    nameNe: 'शुद्ध चाँदी',
    nameHi: 'शुद्ध चांदी',
    purity: 0.999,
    allowedMethods: [BuildMethod.METHOD_A, BuildMethod.METHOD_D],
    complianceFlags: [ComplianceFlag.HYPOALLERGENIC, ComplianceFlag.NICKEL_FREE],
    baseUnit: 'gram',
    pricingModel: 'per_gram',
  },
  [PreciousMetal.SILVER_925]: {
    code: PreciousMetal.SILVER_925,
    category: MaterialCategory.PRECIOUS_METAL,
    nameEn: 'Sterling Silver (92.5%)',
    nameNe: 'स्टर्लिङ चाँदी',
    nameHi: 'स्टर्लिंग चांदी',
    purity: 0.925,
    allowedMethods: [BuildMethod.METHOD_A, BuildMethod.METHOD_B, BuildMethod.METHOD_C, BuildMethod.METHOD_D],
    complianceFlags: [],
    baseUnit: 'gram',
    pricingModel: 'per_gram',
  },
  
  // Base Metals
  [BaseMetal.BRASS]: {
    code: BaseMetal.BRASS,
    category: MaterialCategory.BASE_METAL,
    nameEn: 'Brass',
    nameNe: 'पित्तल',
    nameHi: 'पीतल',
    allowedMethods: [BuildMethod.METHOD_C, BuildMethod.METHOD_D],
    complianceFlags: [],
    baseUnit: 'gram',
    pricingModel: 'per_gram',
  },
  [BaseMetal.STAINLESS_STEEL_316L]: {
    code: BaseMetal.STAINLESS_STEEL_316L,
    category: MaterialCategory.BASE_METAL,
    nameEn: 'Stainless Steel 316L',
    nameNe: 'स्टेनलेस स्टील',
    nameHi: 'स्टेनलेस स्टील',
    allowedMethods: [BuildMethod.METHOD_C, BuildMethod.METHOD_D],
    complianceFlags: [ComplianceFlag.HYPOALLERGENIC],
    baseUnit: 'gram',
    pricingModel: 'per_gram',
  },
  [BaseMetal.TITANIUM]: {
    code: BaseMetal.TITANIUM,
    category: MaterialCategory.BASE_METAL,
    nameEn: 'Titanium',
    nameNe: 'टाइटेनियम',
    nameHi: 'टाइटेनियम',
    allowedMethods: [BuildMethod.METHOD_C, BuildMethod.METHOD_D],
    complianceFlags: [ComplianceFlag.HYPOALLERGENIC, ComplianceFlag.NICKEL_FREE],
    baseUnit: 'gram',
    pricingModel: 'per_gram',
  },
  
  // Finishes
  [FinishType.GOLD_PLATING]: {
    code: FinishType.GOLD_PLATING,
    category: MaterialCategory.FINISH_COATING,
    nameEn: 'Gold Plating',
    nameNe: 'सुनको प्लेटिङ',
    nameHi: 'सोने की प्लेटिंग',
    allowedMethods: [BuildMethod.METHOD_C],
    complianceFlags: [],
    baseUnit: 'piece',
    pricingModel: 'tiered',
  },
  [FinishType.VERMEIL]: {
    code: FinishType.VERMEIL,
    category: MaterialCategory.FINISH_COATING,
    nameEn: 'Vermeil (Gold over Sterling Silver)',
    nameNe: 'भर्मेल',
    nameHi: 'वरमील',
    allowedMethods: [BuildMethod.METHOD_C],
    complianceFlags: [],
    baseUnit: 'piece',
    pricingModel: 'tiered',
  },
  [FinishType.RHODIUM_PLATING]: {
    code: FinishType.RHODIUM_PLATING,
    category: MaterialCategory.FINISH_COATING,
    nameEn: 'Rhodium Plating',
    nameNe: 'रोडियम प्लेटिङ',
    nameHi: 'रोडियम प्लेटिंग',
    allowedMethods: [BuildMethod.METHOD_C],
    complianceFlags: [ComplianceFlag.HYPOALLERGENIC],
    baseUnit: 'piece',
    pricingModel: 'tiered',
  },
  
  // Gemstones
  [GemstoneType.DIAMOND_NATURAL]: {
    code: GemstoneType.DIAMOND_NATURAL,
    category: MaterialCategory.GEMSTONE,
    nameEn: 'Natural Diamond',
    nameNe: 'प्राकृतिक हीरा',
    nameHi: 'प्राकृतिक हीरा',
    allowedMethods: [BuildMethod.METHOD_A, BuildMethod.METHOD_B, BuildMethod.METHOD_C, BuildMethod.METHOD_D],
    complianceFlags: [],
    baseUnit: 'carat',
    pricingModel: 'per_carat',
  },
  [GemstoneType.DIAMOND_LAB_GROWN]: {
    code: GemstoneType.DIAMOND_LAB_GROWN,
    category: MaterialCategory.GEMSTONE,
    nameEn: 'Lab-Grown Diamond',
    nameNe: 'प्रयोगशाला हीरा',
    nameHi: 'लैब-ग्रोन हीरा',
    allowedMethods: [BuildMethod.METHOD_A, BuildMethod.METHOD_B, BuildMethod.METHOD_C, BuildMethod.METHOD_D],
    complianceFlags: [],
    baseUnit: 'carat',
    pricingModel: 'per_carat',
  },
  [GemstoneType.MOISSANITE]: {
    code: GemstoneType.MOISSANITE,
    category: MaterialCategory.GEMSTONE,
    nameEn: 'Moissanite',
    nameNe: 'मोइसानाइट',
    nameHi: 'मोइसानाइट',
    allowedMethods: [BuildMethod.METHOD_A, BuildMethod.METHOD_B, BuildMethod.METHOD_C, BuildMethod.METHOD_D],
    complianceFlags: [],
    baseUnit: 'carat',
    pricingModel: 'per_carat',
  },
};

// Helper to check if a material is nickel-restricted
export function isNickelRestricted(material: string): boolean {
  return material === JewelleryAlloyMetal.NICKEL;
}

// Helper to get allowed methods for a material
export function getAllowedMethods(materialCode: string): BuildMethod[] {
  const material = MATERIAL_REGISTRY[materialCode];
  return material?.allowedMethods ?? [];
}

// Helper to check if material supports method
export function materialSupportsMethod(materialCode: string, method: BuildMethod): boolean {
  return getAllowedMethods(materialCode).includes(method);
}
