/**
 * Base Metal & Plating Configuration for Method C
 * 
 * Contains base metals, plating types, tiers, and pricing calculations
 */

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type BaseMetalType = 
  | 'BRASS' | 'COPPER' | 'BRONZE' | 'STAINLESS_STEEL_316L' 
  | 'STAINLESS_STEEL_304' | 'TITANIUM' | 'NICKEL_SILVER' | 'PEWTER';

export type PlatingTypeC = 
  | 'NONE' | 'GOLD_PLATED' | 'GOLD_FILLED' | 'VERMEIL' 
  | 'ROSE_GOLD_PLATED' | 'RHODIUM_PLATED' | 'PVD_GOLD' | 'PVD_ROSE' | 'PVD_BLACK'
  | 'SILVER_PLATED' | 'RUTHENIUM_PLATED';

export type PlatingTierC = 'ECONOMY' | 'STANDARD' | 'PREMIUM';

// ═══════════════════════════════════════════
// BASE METALS FOR METHOD C
// ═══════════════════════════════════════════

export interface BaseMetal {
  value: BaseMetalType;
  label: string;
  ratePerGramNpr: number;
  description: string;
  tooltip: {
    what: string;
    durability: string;
    allergyRisk: string;
    bestFor: string;
  };
  allergyRisk: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  nickelRequired: boolean;
}

export const BASE_METALS: BaseMetal[] = [
  {
    value: 'BRASS',
    label: 'Brass',
    ratePerGramNpr: 1.5, // Very affordable
    description: 'Copper-zinc alloy with gold-like appearance',
    tooltip: {
      what: 'Alloy of copper and zinc. Has a warm, gold-like color naturally.',
      durability: 'Good durability. May tarnish over time without plating.',
      allergyRisk: 'May cause reactions in sensitive individuals due to copper/zinc.',
      bestFor: 'Fashion jewellery, costume pieces, statement jewellery.',
    },
    allergyRisk: 'MEDIUM',
    nickelRequired: false,
  },
  {
    value: 'COPPER',
    label: 'Copper',
    ratePerGramNpr: 1.2,
    description: 'Pure copper with warm reddish tone',
    tooltip: {
      what: 'Pure copper metal with distinctive reddish-brown color.',
      durability: 'Soft metal. Will develop green patina (verdigris) over time.',
      allergyRisk: 'Generally safe. May turn skin green temporarily.',
      bestFor: 'Artisan jewellery, bohemian styles, patina-effect pieces.',
    },
    allergyRisk: 'LOW',
    nickelRequired: false,
  },
  {
    value: 'BRONZE',
    label: 'Bronze',
    ratePerGramNpr: 2.0,
    description: 'Copper-tin alloy with antique appeal',
    tooltip: {
      what: 'Alloy of copper and tin. Warm brown-gold color.',
      durability: 'Very durable and hard. Develops beautiful patina.',
      allergyRisk: 'Generally safe for most people.',
      bestFor: 'Vintage-style pieces, sculptures, medallions.',
    },
    allergyRisk: 'LOW',
    nickelRequired: false,
  },
  {
    value: 'STAINLESS_STEEL_316L',
    label: 'Stainless Steel 316L (Surgical)',
    ratePerGramNpr: 0.8,
    description: 'Medical-grade hypoallergenic steel',
    tooltip: {
      what: 'Medical/surgical grade stainless steel. Contains molybdenum for corrosion resistance.',
      durability: 'Extremely durable. Highly scratch and tarnish resistant.',
      allergyRisk: 'Hypoallergenic. Safe for most people including those with metal sensitivities.',
      bestFor: 'Everyday wear, men\'s jewellery, body jewellery, active lifestyles.',
    },
    allergyRisk: 'NONE',
    nickelRequired: false,
  },
  {
    value: 'STAINLESS_STEEL_304',
    label: 'Stainless Steel 304',
    ratePerGramNpr: 0.6,
    description: 'Standard grade stainless steel',
    tooltip: {
      what: 'Common stainless steel grade. Good corrosion resistance.',
      durability: 'Very durable. Resistant to rust and tarnish.',
      allergyRisk: 'Contains some nickel. May cause reactions in sensitive individuals.',
      bestFor: 'Budget fashion jewellery, industrial-style pieces.',
    },
    allergyRisk: 'MEDIUM',
    nickelRequired: false,
  },
  {
    value: 'TITANIUM',
    label: 'Titanium',
    ratePerGramNpr: 25.0, // More expensive base metal
    description: 'Lightweight, strong, hypoallergenic',
    tooltip: {
      what: 'Aerospace-grade metal. Extremely lightweight yet strong.',
      durability: 'Exceptional durability. Won\'t tarnish or corrode.',
      allergyRisk: 'Completely hypoallergenic. Best for severe metal allergies.',
      bestFor: 'Men\'s wedding bands, medical alert jewellery, active wear.',
    },
    allergyRisk: 'NONE',
    nickelRequired: false,
  },
  {
    value: 'NICKEL_SILVER',
    label: 'Nickel Silver (German Silver)',
    ratePerGramNpr: 1.0,
    description: 'Copper-nickel-zinc alloy (no actual silver)',
    tooltip: {
      what: 'Despite name, contains no silver. Copper-nickel-zinc alloy with silver-like appearance.',
      durability: 'Good durability. Tarnishes slowly.',
      allergyRisk: '⚠️ HIGH NICKEL CONTENT. Not suitable for those with nickel allergies.',
      bestFor: 'Budget jewellery where nickel allergy is not a concern.',
    },
    allergyRisk: 'HIGH',
    nickelRequired: true, // Only show if nickel compliance is off
  },
  {
    value: 'PEWTER',
    label: 'Pewter (Lead-Free)',
    ratePerGramNpr: 3.0,
    description: 'Soft tin-based alloy',
    tooltip: {
      what: 'Modern lead-free pewter (tin-antimony-copper). Soft and malleable.',
      durability: 'Soft metal. Can dent. Best for low-impact pieces.',
      allergyRisk: 'Generally hypoallergenic if lead-free.',
      bestFor: 'Detailed castings, vintage reproductions, medallions.',
    },
    allergyRisk: 'LOW',
    nickelRequired: false,
  },
];

// ═══════════════════════════════════════════
// PLATING TYPES FOR METHOD C
// ═══════════════════════════════════════════

export interface PlatingOption {
  value: PlatingTypeC;
  label: string;
  baseRateNpr: number; // Base rate per piece (surface-area adjusted)
  description: string;
  goldContent?: string; // If applicable
  minimumThickness: string;
  tooltip: {
    what: string;
    durability: string;
    care: string;
    replatFrequency: string;
    allergyInfo: string;
    disclaimer: string;
  };
  requiresBase?: BaseMetalType; // If specific base required (like Vermeil)
}

export const PLATING_OPTIONS: PlatingOption[] = [
  {
    value: 'GOLD_PLATED',
    label: 'Gold Plated',
    baseRateNpr: 1500,
    description: 'Thin layer of gold electroplated',
    goldContent: '10K-14K gold layer',
    minimumThickness: '0.5-2.5μm',
    tooltip: {
      what: 'A thin layer of real gold (0.5-2.5 microns) electroplated onto base metal.',
      durability: 'Typical lifespan: 6 months to 2 years depending on wear and care.',
      care: 'Avoid water, perfumes, lotions, and chemicals. Remove before sleeping. Store separately.',
      replatFrequency: 'Re-plating available every 1-2 years to restore appearance.',
      allergyInfo: 'Safe if gold layer is intact. May react if plating wears through to base metal.',
      disclaimer: 'Gold plating wears with friction. Daily wear pieces will fade faster.',
    },
  },
  {
    value: 'GOLD_FILLED',
    label: 'Gold Filled',
    baseRateNpr: 7500,
    description: 'Thick gold layer bonded to base',
    goldContent: '12K-14K gold (5% by weight)',
    minimumThickness: '25-100μm',
    tooltip: {
      what: 'Thick layer of gold (5% or 1/20 by weight) pressure-bonded to base metal. Much thicker than plating.',
      durability: 'Long-lasting: 10-30 years with care. Can last a lifetime if well maintained.',
      care: 'More durable than plating. Can get wet occasionally. Polish gently.',
      replatFrequency: 'Rarely needs re-doing. May need polishing after many years.',
      allergyInfo: 'Very safe for sensitive skin due to thick gold layer.',
      disclaimer: 'Not solid gold, but excellent alternative. Worth the investment for regular wear.',
    },
  },
  {
    value: 'VERMEIL',
    label: 'Vermeil (Gold over Sterling)',
    baseRateNpr: 10000,
    description: 'Gold over sterling silver',
    goldContent: '10K+ gold (2.5+ microns)',
    minimumThickness: '2.5+μm over .925 silver',
    tooltip: {
      what: 'Legally defined: 2.5+ micron gold layer over .925 sterling silver. Premium plating.',
      durability: 'Lasts 2-5 years with proper care. Can be replated easily.',
      care: 'Store in anti-tarnish pouch. Clean gently. Can handle occasional water.',
      replatFrequency: 'Re-plating every 2-4 years depending on wear.',
      allergyInfo: 'Hypoallergenic - no nickel in sterling silver base.',
      disclaimer: 'Premium option. Requires sterling silver base - no substitutes.',
    },
    requiresBase: 'STAINLESS_STEEL_316L', // We'll validate this - should be SILVER_925 but that's Method A
  },
  {
    value: 'ROSE_GOLD_PLATED',
    label: 'Rose Gold Plated',
    baseRateNpr: 1800,
    description: 'Pink-tinted gold plating',
    goldContent: '10K-14K rose gold alloy layer',
    minimumThickness: '0.5-2.5μm',
    tooltip: {
      what: 'Thin layer of rose gold alloy (copper-rich gold) electroplated.',
      durability: 'Similar to gold plating. Color may fade slightly faster due to copper.',
      care: 'Same care as gold plating. Avoid chlorine especially (affects copper).',
      replatFrequency: 'May need re-plating every 6 months to 2 years.',
      allergyInfo: 'Check base metal. Rose gold itself is usually safe.',
      disclaimer: 'Romantic pink tone may shift slightly over time.',
    },
  },
  {
    value: 'RHODIUM_PLATED',
    label: 'Rhodium Plated',
    baseRateNpr: 2500,
    description: 'Platinum-group metal coating',
    minimumThickness: '0.75-2.5μm',
    tooltip: {
      what: 'Coating of rhodium (platinum group metal). Extremely hard and reflective.',
      durability: 'Very scratch-resistant. Lasts 1-3 years before showing wear.',
      care: 'Low maintenance. Avoid harsh chemicals. Professional polishing recommended.',
      replatFrequency: 'Re-plating every 1-3 years to maintain bright white finish.',
      allergyInfo: 'Hypoallergenic. Excellent for sensitive skin.',
      disclaimer: 'Creates bright white finish. Often used to brighten white gold.',
    },
  },
  {
    value: 'PVD_GOLD',
    label: 'PVD Gold Coating',
    baseRateNpr: 6000,
    description: 'Ultra-durable molecular bond',
    minimumThickness: '0.3-3μm (molecular bond)',
    tooltip: {
      what: 'Physical Vapor Deposition - gold-color coating with molecular bond to metal. Not real gold.',
      durability: 'Exceptional: 3-10+ years. Most durable "gold look" option.',
      care: 'Very low maintenance. Highly resistant to scratches, tarnish, fading.',
      replatFrequency: 'Rarely needs redoing. May be difficult to re-coat.',
      allergyInfo: 'Hypoallergenic and biocompatible.',
      disclaimer: 'Not real gold, but most durable gold-tone finish available.',
    },
  },
  {
    value: 'PVD_ROSE',
    label: 'PVD Rose Gold Coating',
    baseRateNpr: 6000,
    description: 'Ultra-durable rose gold tone',
    minimumThickness: '0.3-3μm (molecular bond)',
    tooltip: {
      what: 'PVD coating in rose gold color. Molecular bond for extreme durability.',
      durability: 'Exceptional: 3-10+ years. Will not fade or chip easily.',
      care: 'Minimal care needed. Resistant to most chemicals.',
      replatFrequency: 'May never need redoing for typical wear.',
      allergyInfo: 'Hypoallergenic and biocompatible.',
      disclaimer: 'Color match may vary from real rose gold.',
    },
  },
  {
    value: 'PVD_BLACK',
    label: 'PVD Black Coating',
    baseRateNpr: 3500,
    description: 'Durable black finish',
    minimumThickness: '0.3-3μm (molecular bond)',
    tooltip: {
      what: 'PVD coating in black. Popular for modern/industrial aesthetics.',
      durability: 'Exceptional: 3-10+ years. Highly scratch resistant.',
      care: 'Very low maintenance. Shows fingerprints but easy to wipe.',
      replatFrequency: 'Rarely needs redoing.',
      allergyInfo: 'Hypoallergenic.',
      disclaimer: 'Black coating. Industrial/modern look.',
    },
  },
  {
    value: 'SILVER_PLATED',
    label: 'Silver Plated',
    baseRateNpr: 900,
    description: 'Thin silver coating',
    minimumThickness: '1-3μm',
    tooltip: {
      what: 'Thin layer of silver electroplated onto base metal.',
      durability: 'Budget option. Lasts 3-12 months. Will tarnish.',
      care: 'Polish regularly with silver cloth. Store in anti-tarnish bag.',
      replatFrequency: 'May need re-plating frequently for regular wear.',
      allergyInfo: 'Check base metal. Silver layer may wear quickly.',
      disclaimer: 'Most affordable option but requires regular maintenance.',
    },
  },
  {
    value: 'RUTHENIUM_PLATED',
    label: 'Ruthenium Plated (Gunmetal)',
    baseRateNpr: 3500,
    description: 'Dark platinum-group coating',
    minimumThickness: '0.5-1.5μm',
    tooltip: {
      what: 'Platinum-group metal coating. Creates dark gray/gunmetal finish.',
      durability: 'Good durability: 1-3 years. Very hard surface.',
      care: 'Low maintenance. Resistant to tarnish.',
      replatFrequency: 'Re-plating every 2-3 years if worn daily.',
      allergyInfo: 'Hypoallergenic.',
      disclaimer: 'Sophisticated dark finish. Popular for men\'s jewellery.',
    },
  },
];

// ═══════════════════════════════════════════
// PLATING TIERS
// ═══════════════════════════════════════════

export interface PlatingTier {
  value: PlatingTierC;
  label: string;
  multiplier: number;
  thicknessDescription: string;
  tooltip: string;
}

export const PLATING_TIERS: PlatingTier[] = [
  {
    value: 'ECONOMY',
    label: 'Economy',
    multiplier: 0.6,
    thicknessDescription: 'Minimum thickness (0.5-1μm)',
    tooltip: 'Thinnest layer. Best for occasional wear pieces. 3-6 month typical lifespan.',
  },
  {
    value: 'STANDARD',
    label: 'Standard',
    multiplier: 1.0,
    thicknessDescription: 'Standard thickness (1-2.5μm)',
    tooltip: 'Recommended. Good balance of cost and durability. 1-2 year typical lifespan.',
  },
  {
    value: 'PREMIUM',
    label: 'Premium',
    multiplier: 1.8,
    thicknessDescription: 'Maximum thickness (2.5-5μm)',
    tooltip: 'Thickest layer. Best for daily wear. 2-5 year typical lifespan. Worth the investment.',
  },
];

// ═══════════════════════════════════════════
// JEWELLERY TYPE SURFACE AREA FACTORS
// ═══════════════════════════════════════════

export const JEWELLERY_SURFACE_FACTORS: Record<string, number> = {
  'RING': 1.0,
  'PENDANT': 1.2,
  'EARRING': 0.8,
  'BRACELET': 2.0,
  'BANGLE': 2.5,
  'NECKLACE': 3.0,
  'CHAIN': 2.5,
  'ANKLET': 1.8,
  'BROOCH': 1.5,
  'OTHER': 1.5,
};

// ═══════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════

/**
 * Get base metals filtered by nickel compliance
 */
export function getAvailableBaseMetals(nickelAllowed: boolean): BaseMetal[] {
  return BASE_METALS.filter(m => nickelAllowed || !m.nickelRequired);
}

/**
 * Get a specific base metal by value
 */
export function getBaseMetal(value: BaseMetalType): BaseMetal | undefined {
  return BASE_METALS.find(m => m.value === value);
}

/**
 * Get a specific plating option
 */
export function getPlatingOption(value: PlatingTypeC): PlatingOption | undefined {
  return PLATING_OPTIONS.find(p => p.value === value);
}

/**
 * Get a specific plating tier
 */
export function getPlatingTier(value: PlatingTierC): PlatingTier | undefined {
  return PLATING_TIERS.find(t => t.value === value);
}

/**
 * Calculate base metal cost
 */
export function calculateBaseMetalCost(
  metalType: BaseMetalType,
  weightGrams: number
): number {
  const metal = getBaseMetal(metalType);
  if (!metal) return 0;
  return weightGrams * metal.ratePerGramNpr;
}

/**
 * Calculate plating cost for Method C
 * 
 * Formula: basePlatingRate * tierMultiplier * surfaceAreaFactor * (1 + weightFactor)
 * Weight factor adds 10% per 5g to account for larger pieces
 */
export function calculatePlatingCost(
  platingType: PlatingTypeC,
  tier: PlatingTierC,
  jewelleryType: string,
  weightGrams: number
): number {
  const plating = getPlatingOption(platingType);
  const tierInfo = getPlatingTier(tier);
  
  if (!plating || !tierInfo) return 0;
  
  const surfaceFactor = JEWELLERY_SURFACE_FACTORS[jewelleryType] || 1.5;
  const weightFactor = 1 + (Math.floor(weightGrams / 5) * 0.1); // +10% per 5g
  
  return plating.baseRateNpr * tierInfo.multiplier * surfaceFactor * weightFactor;
}

/**
 * Validate Method C configuration
 */
export function validateMethodC(
  baseMetal: BaseMetalType | undefined,
  platingType: PlatingTypeC | undefined,
  tier: PlatingTierC | undefined
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!baseMetal) {
    errors.push('Base metal is required for Method C');
  }
  
  if (!platingType) {
    errors.push('Plating type is required for Method C');
  }
  
  if (!tier) {
    errors.push('Plating tier is required for Method C');
  }
  
  // Validate Vermeil requires sterling silver - but in Method C we can't use sterling
  // So Vermeil is actually not valid in pure Method C (it's a hybrid)
  if (platingType === 'VERMEIL') {
    errors.push('Vermeil requires Sterling Silver base - use Method A with vermeil finish instead');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
