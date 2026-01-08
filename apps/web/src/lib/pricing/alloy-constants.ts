/**
 * Alloy Configuration Constants for Method B (Precious Metal Alloys)
 * 
 * Contains alloy families, recipe presets, and pricing multipliers
 * for the custom jewellery form.
 */

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type BasePreciousMetal = 'GOLD' | 'SILVER' | 'PLATINUM' | 'PALLADIUM';
export type AlloyFamily = 'YELLOW_GOLD' | 'WHITE_GOLD' | 'ROSE_GOLD' | 'GREEN_GOLD';
export type GoldKarat = '22K' | '18K' | '14K' | '10K'; // Note: 24K is NOT allowed in Method B (not an alloy)
export type SilverPurity = 'STERLING_925' | 'ARGENTIUM_935' | 'FINE_999';

export type AlloyComponent = 
  | 'SILVER' | 'COPPER' | 'ZINC' | 'PALLADIUM' | 'NICKEL' | 'PLATINUM';

// ═══════════════════════════════════════════
// BASE PRECIOUS METALS (for Method B)
// ═══════════════════════════════════════════

export const BASE_PRECIOUS_METALS = [
  { 
    value: 'GOLD', 
    label: 'Gold',
    description: 'The most popular precious metal for jewellery',
    hasKarats: true,
    hasAlloyFamilies: true,
  },
  { 
    value: 'SILVER', 
    label: 'Silver',
    description: 'Affordable precious metal with beautiful lustre',
    hasKarats: false,
    hasAlloyFamilies: false,
    defaultPurity: 'STERLING_925',
  },
] as const;

// ═══════════════════════════════════════════
// GOLD KARATS (Method B - excludes 24K)
// ═══════════════════════════════════════════

export const GOLD_KARATS_METHOD_B = [
  { 
    value: '22K', 
    label: '22 Karat (91.7%)', 
    purity: 0.917,
    tooltip: 'Very high gold content. Slightly softer than lower karats. Rich, deep gold color.',
    rateKey: 'GOLD_22K',
  },
  { 
    value: '18K', 
    label: '18 Karat (75%)', 
    purity: 0.75,
    tooltip: 'Perfect balance of purity and durability. Industry standard for fine jewellery.',
    rateKey: 'GOLD_18K',
  },
  { 
    value: '14K', 
    label: '14 Karat (58.3%)', 
    purity: 0.583,
    tooltip: 'Excellent durability. Popular in US market. Great for everyday wear.',
    rateKey: 'GOLD_14K',
  },
  { 
    value: '10K', 
    label: '10 Karat (41.7%)', 
    purity: 0.417,
    tooltip: 'Most durable gold alloy. Affordable entry point. Lighter gold color.',
    rateKey: 'GOLD_10K',
  },
] as const;

// ═══════════════════════════════════════════
// SILVER PURITIES
// ═══════════════════════════════════════════

export const SILVER_PURITIES = [
  { 
    value: 'STERLING_925', 
    label: 'Sterling Silver (92.5%)', 
    purity: 0.925,
    tooltip: 'Classic silver alloy. 92.5% silver with copper for strength. May tarnish over time.',
    rateKey: 'SILVER_925',
  },
  { 
    value: 'ARGENTIUM_935', 
    label: 'Argentium Silver (93.5%)', 
    purity: 0.935,
    tooltip: 'Premium tarnish-resistant silver. Contains germanium. Better for sensitive skin.',
    rateKey: 'SILVER_999', // Uses fine silver rate as base
    premiumMultiplier: 1.15,
  },
] as const;

// ═══════════════════════════════════════════
// ALLOY FAMILIES (Gold only)
// ═══════════════════════════════════════════

export const ALLOY_FAMILIES = [
  { 
    value: 'YELLOW_GOLD', 
    label: 'Yellow Gold',
    colorHex: '#FFD700',
    description: 'Classic warm gold color',
    tooltip: {
      color: 'Traditional warm yellow color. Timeless and classic.',
      allergy: 'Generally hypoallergenic depending on alloy metals.',
      maintenance: 'Easy care. Shows scratches less than white gold.',
      popularity: 'Most traditional choice. Popular worldwide.',
    },
    availableKarats: ['22K', '18K', '14K', '10K'],
  },
  { 
    value: 'WHITE_GOLD', 
    label: 'White Gold',
    colorHex: '#E8E8E8',
    description: 'Silvery-white finish',
    tooltip: {
      color: 'Cool silvery-white appearance. Modern and elegant.',
      allergy: 'Check alloy metals. Nickel versions may cause reactions.',
      maintenance: 'May need rhodium re-plating every 1-2 years to maintain bright white color.',
      popularity: 'Very popular for engagement rings and modern designs.',
    },
    availableKarats: ['18K', '14K', '10K'], // 22K not common for white gold
  },
  { 
    value: 'ROSE_GOLD', 
    label: 'Rose Gold',
    colorHex: '#B76E79',
    description: 'Warm pink-tinted gold',
    tooltip: {
      color: 'Romantic pink/copper tones. Flatters all skin tones.',
      allergy: 'Contains copper. Very rarely causes reactions.',
      maintenance: 'Color deepens slightly with age. Very durable.',
      popularity: 'Trendy choice. Vintage and romantic appeal.',
    },
    availableKarats: ['18K', '14K', '10K'], // 22K not common for rose gold
  },
  { 
    value: 'GREEN_GOLD', 
    label: 'Green Gold (Electrum)',
    colorHex: '#BDBD5D',
    description: 'Subtle greenish gold',
    tooltip: {
      color: 'Subtle yellow-green tint. Unique and artistic.',
      allergy: 'Typically hypoallergenic (silver alloy).',
      maintenance: 'Rare choice. May need specialist for repairs.',
      popularity: 'Uncommon. Chosen for unique artistic pieces.',
    },
    availableKarats: ['18K', '14K'],
  },
] as const;

// ═══════════════════════════════════════════
// ALLOY COMPONENTS
// ═══════════════════════════════════════════

export const ALLOY_COMPONENTS = [
  {
    value: 'SILVER',
    label: 'Silver',
    tooltip: 'Softens color, adds malleability. Used in yellow and green gold.',
    useInFamilies: ['YELLOW_GOLD', 'GREEN_GOLD', 'WHITE_GOLD'],
    allergyRisk: 'LOW',
  },
  {
    value: 'COPPER',
    label: 'Copper',
    tooltip: 'Adds durability and warmth. Primary component in rose gold.',
    useInFamilies: ['YELLOW_GOLD', 'ROSE_GOLD'],
    allergyRisk: 'LOW',
  },
  {
    value: 'ZINC',
    label: 'Zinc',
    tooltip: 'Lightens color and adds hardness. Used in small amounts.',
    useInFamilies: ['YELLOW_GOLD', 'WHITE_GOLD'],
    allergyRisk: 'LOW',
  },
  {
    value: 'PALLADIUM',
    label: 'Palladium (Premium)',
    tooltip: 'Creates bright white color. Nickel-free, hypoallergenic. Premium cost.',
    useInFamilies: ['WHITE_GOLD'],
    allergyRisk: 'NONE',
    isPremium: true,
  },
  {
    value: 'NICKEL',
    label: 'Nickel (Restricted)',
    tooltip: 'Traditional white gold alloy. May cause allergic reactions. Banned in EU for skin contact.',
    useInFamilies: ['WHITE_GOLD'],
    allergyRisk: 'HIGH',
    isRestricted: true,
    restrictionNote: 'Not recommended. Only available where nickel compliance is enabled.',
  },
] as const;

// ═══════════════════════════════════════════
// ALLOY RECIPE PRESETS
// ═══════════════════════════════════════════

export interface AlloyRecipePreset {
  id: string;
  family: AlloyFamily;
  karat: GoldKarat;
  name: string;
  description: string;
  components: {
    metal: AlloyComponent;
    percentage: number;
  }[];
  characteristics: {
    durability: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
    colorTone: string;
    allergyRisk: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
    maintenanceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  priceMultiplier: number; // Added to metal cost
  tooltip: string;
  nickelCompliant: boolean;
}

export const ALLOY_RECIPE_PRESETS: AlloyRecipePreset[] = [
  // 18K Yellow Gold
  {
    id: '18K_YELLOW_STANDARD',
    family: 'YELLOW_GOLD',
    karat: '18K',
    name: '18K Yellow Gold (Standard)',
    description: 'Classic warm yellow gold',
    components: [
      { metal: 'SILVER', percentage: 12.5 },
      { metal: 'COPPER', percentage: 12.5 },
    ],
    characteristics: {
      durability: 'MEDIUM',
      colorTone: 'Rich warm yellow',
      allergyRisk: 'LOW',
      maintenanceLevel: 'LOW',
    },
    priceMultiplier: 1.0,
    tooltip: 'Industry standard 18K yellow gold. Perfect balance of color and durability. Most popular choice.',
    nickelCompliant: true,
  },
  {
    id: '18K_YELLOW_RICH',
    family: 'YELLOW_GOLD',
    karat: '18K',
    name: '18K Yellow Gold (Deep)',
    description: 'Deeper, warmer yellow tone',
    components: [
      { metal: 'COPPER', percentage: 20 },
      { metal: 'SILVER', percentage: 5 },
    ],
    characteristics: {
      durability: 'HIGH',
      colorTone: 'Deep warm yellow',
      allergyRisk: 'LOW',
      maintenanceLevel: 'LOW',
    },
    priceMultiplier: 1.02,
    tooltip: 'Higher copper content for richer color and better durability. Slightly warmer tone.',
    nickelCompliant: true,
  },
  
  // 18K Rose Gold
  {
    id: '18K_ROSE_STANDARD',
    family: 'ROSE_GOLD',
    karat: '18K',
    name: '18K Rose Gold (Standard)',
    description: 'Classic pink-tinted gold',
    components: [
      { metal: 'COPPER', percentage: 22.5 },
      { metal: 'SILVER', percentage: 2.5 },
    ],
    characteristics: {
      durability: 'HIGH',
      colorTone: 'Soft pink blush',
      allergyRisk: 'LOW',
      maintenanceLevel: 'LOW',
    },
    priceMultiplier: 1.01,
    tooltip: 'Popular rose gold formula. Beautiful pink hue that flatters all skin tones.',
    nickelCompliant: true,
  },
  {
    id: '18K_ROSE_DEEP',
    family: 'ROSE_GOLD',
    karat: '18K',
    name: '18K Rose Gold (Deep)',
    description: 'Richer copper-pink tone',
    components: [
      { metal: 'COPPER', percentage: 25 },
    ],
    characteristics: {
      durability: 'VERY_HIGH',
      colorTone: 'Deep copper-pink',
      allergyRisk: 'LOW',
      maintenanceLevel: 'LOW',
    },
    priceMultiplier: 1.03,
    tooltip: 'Maximum copper content for deepest rose color. Extremely durable.',
    nickelCompliant: true,
  },
  
  // 18K White Gold
  {
    id: '18K_WHITE_PALLADIUM',
    family: 'WHITE_GOLD',
    karat: '18K',
    name: '18K White Gold (Palladium)',
    description: 'Premium nickel-free white gold',
    components: [
      { metal: 'PALLADIUM', percentage: 15 },
      { metal: 'SILVER', percentage: 10 },
    ],
    characteristics: {
      durability: 'MEDIUM',
      colorTone: 'Bright silvery white',
      allergyRisk: 'NONE',
      maintenanceLevel: 'MEDIUM',
    },
    priceMultiplier: 1.10, // Premium for palladium
    tooltip: 'Hypoallergenic white gold using palladium. Premium choice for sensitive skin. May need occasional rhodium plating.',
    nickelCompliant: true,
  },
  {
    id: '18K_WHITE_NICKEL',
    family: 'WHITE_GOLD',
    karat: '18K',
    name: '18K White Gold (Nickel)',
    description: 'Traditional white gold with nickel',
    components: [
      { metal: 'NICKEL', percentage: 17.5 },
      { metal: 'ZINC', percentage: 5 },
      { metal: 'COPPER', percentage: 2.5 },
    ],
    characteristics: {
      durability: 'HIGH',
      colorTone: 'Bright white',
      allergyRisk: 'HIGH',
      maintenanceLevel: 'MEDIUM',
    },
    priceMultiplier: 1.03,
    tooltip: '⚠️ Contains nickel - may cause allergic reactions. Not available in EU countries. Brighter white color than palladium.',
    nickelCompliant: false,
  },
  
  // 14K Options
  {
    id: '14K_YELLOW_STANDARD',
    family: 'YELLOW_GOLD',
    karat: '14K',
    name: '14K Yellow Gold (Standard)',
    description: 'Durable everyday gold',
    components: [
      { metal: 'SILVER', percentage: 12 },
      { metal: 'COPPER', percentage: 29.7 },
    ],
    characteristics: {
      durability: 'HIGH',
      colorTone: 'Light warm yellow',
      allergyRisk: 'LOW',
      maintenanceLevel: 'LOW',
    },
    priceMultiplier: 1.0,
    tooltip: 'Popular in USA. Great durability for everyday wear. More affordable than 18K.',
    nickelCompliant: true,
  },
  {
    id: '14K_ROSE_STANDARD',
    family: 'ROSE_GOLD',
    karat: '14K',
    name: '14K Rose Gold (Standard)',
    description: 'Durable rose gold',
    components: [
      { metal: 'COPPER', percentage: 38 },
      { metal: 'SILVER', percentage: 3.7 },
    ],
    characteristics: {
      durability: 'VERY_HIGH',
      colorTone: 'Medium pink-copper',
      allergyRisk: 'LOW',
      maintenanceLevel: 'LOW',
    },
    priceMultiplier: 1.01,
    tooltip: 'Higher copper ratio makes this very durable. Deeper rose color than 18K.',
    nickelCompliant: true,
  },
  {
    id: '14K_WHITE_PALLADIUM',
    family: 'WHITE_GOLD',
    karat: '14K',
    name: '14K White Gold (Palladium)',
    description: 'Affordable hypoallergenic white',
    components: [
      { metal: 'PALLADIUM', percentage: 12 },
      { metal: 'SILVER', percentage: 20 },
      { metal: 'ZINC', percentage: 9.7 },
    ],
    characteristics: {
      durability: 'HIGH',
      colorTone: 'Cool silvery white',
      allergyRisk: 'NONE',
      maintenanceLevel: 'MEDIUM',
    },
    priceMultiplier: 1.08,
    tooltip: 'Nickel-free white gold at 14K price point. Great balance of affordability and hypoallergenic properties.',
    nickelCompliant: true,
  },
  
  // 10K Options
  {
    id: '10K_YELLOW_STANDARD',
    family: 'YELLOW_GOLD',
    karat: '10K',
    name: '10K Yellow Gold',
    description: 'Most affordable gold alloy',
    components: [
      { metal: 'SILVER', percentage: 10 },
      { metal: 'COPPER', percentage: 48.3 },
    ],
    characteristics: {
      durability: 'VERY_HIGH',
      colorTone: 'Pale yellow',
      allergyRisk: 'LOW',
      maintenanceLevel: 'LOW',
    },
    priceMultiplier: 1.0,
    tooltip: 'Entry-level gold. Extremely durable. Lighter gold color. Budget-friendly option.',
    nickelCompliant: true,
  },
  
  // 22K Options
  {
    id: '22K_YELLOW_STANDARD',
    family: 'YELLOW_GOLD',
    karat: '22K',
    name: '22K Yellow Gold',
    description: 'Traditional high-purity gold',
    components: [
      { metal: 'SILVER', percentage: 4.15 },
      { metal: 'COPPER', percentage: 4.15 },
    ],
    characteristics: {
      durability: 'LOW',
      colorTone: 'Deep rich yellow',
      allergyRisk: 'NONE',
      maintenanceLevel: 'MEDIUM',
    },
    priceMultiplier: 1.0,
    tooltip: 'Traditional South Asian & Middle Eastern choice. Very soft - best for special occasion wear.',
    nickelCompliant: true,
  },
] as const;

// ═══════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════

/**
 * Get available alloy families for a given karat
 */
export function getAvailableFamiliesForKarat(karat: GoldKarat): typeof ALLOY_FAMILIES[number][] {
  return ALLOY_FAMILIES.filter(f => (f.availableKarats as readonly string[]).includes(karat));
}

/**
 * Get recipe presets for a given family and karat
 */
export function getRecipePresets(
  family: AlloyFamily, 
  karat: GoldKarat,
  nickelComplianceRequired: boolean = true
): AlloyRecipePreset[] {
  return ALLOY_RECIPE_PRESETS.filter(r => 
    r.family === family && 
    r.karat === karat &&
    (nickelComplianceRequired ? r.nickelCompliant : true)
  );
}

/**
 * Get a specific recipe preset by ID
 */
export function getRecipePresetById(id: string): AlloyRecipePreset | undefined {
  return ALLOY_RECIPE_PRESETS.find(r => r.id === id);
}

/**
 * Calculate alloy premium cost
 */
export function calculateAlloyPremium(
  metalCost: number,
  recipePreset: AlloyRecipePreset
): number {
  return metalCost * (recipePreset.priceMultiplier - 1);
}
