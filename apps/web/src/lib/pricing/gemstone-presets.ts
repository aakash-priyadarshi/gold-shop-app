/**
 * Gemstone Presets Configuration
 * 
 * Pre-configured gemstone options that auto-fill form fields
 * for easier customer selection
 */

import type { GemstoneType, GemstoneShape, SettingStyle, SizeUnit } from './constants';

// ═══════════════════════════════════════════
// GEMSTONE PRESET INTERFACE
// ═══════════════════════════════════════════

export interface GemstonePreset {
  id: string;
  name: string;
  stoneType: GemstoneType;
  origin?: 'NATURAL' | 'LAB';
  shape: GemstoneShape;
  sizeUnit: SizeUnit;
  sizeValue: string;
  color: string;
  clarity?: string;
  cut?: string;
  settingStyle: SettingStyle;
  description: string;
  estimatedPriceNpr: number;
  tooltip: string;
  popular?: boolean;
}

// ═══════════════════════════════════════════
// DIAMOND PRESETS
// ═══════════════════════════════════════════

export const DIAMOND_PRESETS: GemstonePreset[] = [
  // Lab-Grown Diamonds (more affordable)
  {
    id: 'DIAMOND_LAB_ROUND_05CT',
    name: 'Lab Diamond 0.5ct Round',
    stoneType: 'DIAMOND_LAB',
    origin: 'LAB',
    shape: 'ROUND',
    sizeUnit: 'CARAT',
    sizeValue: '0.50',
    color: 'G', // Near colorless
    clarity: 'VS1',
    cut: 'EXCELLENT',
    settingStyle: 'PRONG',
    description: 'Classic half-carat lab diamond',
    estimatedPriceNpr: 18000,
    tooltip: 'Popular choice for solitaire rings. Excellent sparkle at affordable price.',
    popular: true,
  },
  {
    id: 'DIAMOND_LAB_ROUND_1CT',
    name: 'Lab Diamond 1ct Round',
    stoneType: 'DIAMOND_LAB',
    origin: 'LAB',
    shape: 'ROUND',
    sizeUnit: 'CARAT',
    sizeValue: '1.00',
    color: 'F', // Colorless
    clarity: 'VVS2',
    cut: 'EXCELLENT',
    settingStyle: 'PRONG',
    description: 'Stunning one-carat lab diamond',
    estimatedPriceNpr: 45000,
    tooltip: 'The classic 1 carat milestone. Lab-grown for ethical and budget-conscious buyers.',
    popular: true,
  },
  {
    id: 'DIAMOND_LAB_PRINCESS_05CT',
    name: 'Lab Diamond 0.5ct Princess',
    stoneType: 'DIAMOND_LAB',
    origin: 'LAB',
    shape: 'PRINCESS',
    sizeUnit: 'CARAT',
    sizeValue: '0.50',
    color: 'H',
    clarity: 'VS2',
    cut: 'VERY_GOOD',
    settingStyle: 'BEZEL',
    description: 'Modern princess cut lab diamond',
    estimatedPriceNpr: 16000,
    tooltip: 'Contemporary square shape. Bezel setting protects corners.',
  },
  {
    id: 'DIAMOND_LAB_OVAL_075CT',
    name: 'Lab Diamond 0.75ct Oval',
    stoneType: 'DIAMOND_LAB',
    origin: 'LAB',
    shape: 'OVAL',
    sizeUnit: 'CARAT',
    sizeValue: '0.75',
    color: 'G',
    clarity: 'VS1',
    cut: 'EXCELLENT',
    settingStyle: 'PRONG',
    description: 'Elegant oval lab diamond',
    estimatedPriceNpr: 28000,
    tooltip: 'Oval shape elongates fingers. Very popular for engagement rings.',
    popular: true,
  },
  
  // Natural Diamonds (premium)
  {
    id: 'DIAMOND_NAT_ROUND_025CT',
    name: 'Natural Diamond 0.25ct Round',
    stoneType: 'DIAMOND_NATURAL',
    origin: 'NATURAL',
    shape: 'ROUND',
    sizeUnit: 'CARAT',
    sizeValue: '0.25',
    color: 'H',
    clarity: 'SI1',
    cut: 'VERY_GOOD',
    settingStyle: 'PRONG',
    description: 'Affordable natural diamond',
    estimatedPriceNpr: 35000,
    tooltip: 'Entry-level natural diamond. Perfect for accent stones or smaller budgets.',
  },
  {
    id: 'DIAMOND_NAT_ROUND_05CT',
    name: 'Natural Diamond 0.5ct Round',
    stoneType: 'DIAMOND_NATURAL',
    origin: 'NATURAL',
    shape: 'ROUND',
    sizeUnit: 'CARAT',
    sizeValue: '0.50',
    color: 'G',
    clarity: 'VS2',
    cut: 'EXCELLENT',
    settingStyle: 'PRONG',
    description: 'Classic natural half-carat',
    estimatedPriceNpr: 85000,
    tooltip: 'Traditional choice. Natural mined diamond with excellent specifications.',
  },
];

// ═══════════════════════════════════════════
// MOISSANITE PRESETS
// ═══════════════════════════════════════════

export const MOISSANITE_PRESETS: GemstonePreset[] = [
  {
    id: 'MOISSANITE_ROUND_1CT',
    name: 'Moissanite 1ct Round',
    stoneType: 'MOISSANITE',
    origin: 'LAB',
    shape: 'ROUND',
    sizeUnit: 'CARAT',
    sizeValue: '1.00',
    color: 'WHITE', // Colorless moissanite
    settingStyle: 'PRONG',
    description: 'Brilliant moissanite, more fire than diamond',
    estimatedPriceNpr: 8000,
    tooltip: 'More sparkle than diamond at fraction of cost. Nearly as hard as diamond.',
    popular: true,
  },
  {
    id: 'MOISSANITE_CUSHION_15CT',
    name: 'Moissanite 1.5ct Cushion',
    stoneType: 'MOISSANITE',
    origin: 'LAB',
    shape: 'CUSHION',
    sizeUnit: 'CARAT',
    sizeValue: '1.50',
    color: 'WHITE',
    settingStyle: 'HALO',
    description: 'Romantic cushion cut moissanite',
    estimatedPriceNpr: 12000,
    tooltip: 'Pillow-shaped with excellent fire. Halo setting adds drama.',
    popular: true,
  },
  {
    id: 'MOISSANITE_OVAL_125CT',
    name: 'Moissanite 1.25ct Oval',
    stoneType: 'MOISSANITE',
    origin: 'LAB',
    shape: 'OVAL',
    sizeUnit: 'CARAT',
    sizeValue: '1.25',
    color: 'WHITE',
    settingStyle: 'PRONG',
    description: 'Elongated oval moissanite',
    estimatedPriceNpr: 10000,
    tooltip: 'Elegant shape that flatters the hand. Great diamond alternative.',
  },
];

// ═══════════════════════════════════════════
// COLORED GEMSTONE PRESETS
// ═══════════════════════════════════════════

export const COLORED_GEM_PRESETS: GemstonePreset[] = [
  // Ruby
  {
    id: 'RUBY_NATURAL_5MM',
    name: 'Natural Ruby 5mm Oval',
    stoneType: 'RUBY',
    origin: 'NATURAL',
    shape: 'OVAL',
    sizeUnit: 'MM',
    sizeValue: '5',
    color: 'VIVID', // Pigeon blood ideal
    clarity: 'EYE_CLEAN',
    settingStyle: 'PRONG',
    description: 'Classic red ruby, symbol of passion',
    estimatedPriceNpr: 25000,
    tooltip: 'The king of gemstones. Vivid red color. Great for statement pieces.',
    popular: true,
  },
  {
    id: 'RUBY_LAB_6MM',
    name: 'Lab Ruby 6mm Round',
    stoneType: 'RUBY',
    origin: 'LAB',
    shape: 'ROUND',
    sizeUnit: 'MM',
    sizeValue: '6',
    color: 'VIVID',
    clarity: 'EYE_CLEAN',
    settingStyle: 'BEZEL',
    description: 'Lab-created ruby with perfect color',
    estimatedPriceNpr: 5000,
    tooltip: 'Same properties as natural. Perfect color without inclusions.',
  },
  
  // Sapphire
  {
    id: 'SAPPHIRE_NATURAL_BLUE_5MM',
    name: 'Natural Blue Sapphire 5mm',
    stoneType: 'SAPPHIRE',
    origin: 'NATURAL',
    shape: 'CUSHION',
    sizeUnit: 'MM',
    sizeValue: '5',
    color: 'DEEP', // Royal blue
    clarity: 'EYE_CLEAN',
    settingStyle: 'PRONG',
    description: 'Classic blue sapphire',
    estimatedPriceNpr: 20000,
    tooltip: 'Traditional choice for royalty. September birthstone.',
    popular: true,
  },
  {
    id: 'SAPPHIRE_LAB_BLUE_6MM',
    name: 'Lab Blue Sapphire 6mm',
    stoneType: 'SAPPHIRE',
    origin: 'LAB',
    shape: 'OVAL',
    sizeUnit: 'MM',
    sizeValue: '6',
    color: 'VIVID',
    clarity: 'EYE_CLEAN',
    settingStyle: 'HALO',
    description: 'Lab-created blue sapphire',
    estimatedPriceNpr: 4000,
    tooltip: 'Affordable sapphire option with ideal color.',
  },
  
  // Emerald
  {
    id: 'EMERALD_NATURAL_5MM',
    name: 'Natural Emerald 5mm',
    stoneType: 'EMERALD',
    origin: 'NATURAL',
    shape: 'EMERALD_CUT',
    sizeUnit: 'MM',
    sizeValue: '5',
    color: 'VIVID', // Muzo green
    clarity: 'SLIGHTLY_INCLUDED', // Inclusions are normal in emeralds
    settingStyle: 'BEZEL', // Protects fragile stone
    description: 'Lush green natural emerald',
    estimatedPriceNpr: 30000,
    tooltip: 'May birthstone. Natural inclusions (jardin) are normal and add character.',
    popular: true,
  },
  {
    id: 'EMERALD_LAB_6MM',
    name: 'Lab Emerald 6mm',
    stoneType: 'EMERALD',
    origin: 'LAB',
    shape: 'OVAL',
    sizeUnit: 'MM',
    sizeValue: '6',
    color: 'VIVID',
    clarity: 'EYE_CLEAN',
    settingStyle: 'BEZEL',
    description: 'Lab-created emerald, flawless green',
    estimatedPriceNpr: 6000,
    tooltip: 'Perfect clarity lab emerald. More affordable than natural.',
  },
];

// ═══════════════════════════════════════════
// BUDGET-FRIENDLY PRESETS
// ═══════════════════════════════════════════

export const BUDGET_PRESETS: GemstonePreset[] = [
  {
    id: 'CZ_ROUND_1CT',
    name: 'Cubic Zirconia 1ct Round',
    stoneType: 'CUBIC_ZIRCONIA',
    origin: 'LAB',
    shape: 'ROUND',
    sizeUnit: 'CARAT',
    sizeValue: '1.00',
    color: 'WHITE',
    settingStyle: 'PRONG',
    description: 'Budget diamond simulant',
    estimatedPriceNpr: 200,
    tooltip: 'Most affordable diamond look. Great for fashion jewellery.',
    popular: true,
  },
  {
    id: 'AMETHYST_6MM',
    name: 'Amethyst 6mm Round',
    stoneType: 'AMETHYST',
    shape: 'ROUND',
    sizeUnit: 'MM',
    sizeValue: '6',
    color: 'PURPLE',
    settingStyle: 'PRONG',
    description: 'Purple quartz gemstone',
    estimatedPriceNpr: 800,
    tooltip: 'February birthstone. Beautiful purple color at affordable price.',
  },
  {
    id: 'TOPAZ_BLUE_6MM',
    name: 'Blue Topaz 6mm Oval',
    stoneType: 'TOPAZ',
    shape: 'OVAL',
    sizeUnit: 'MM',
    sizeValue: '6',
    color: 'BLUE',
    settingStyle: 'PRONG',
    description: 'Sky blue topaz',
    estimatedPriceNpr: 600,
    tooltip: 'November birthstone. Affordable blue gemstone alternative to sapphire.',
  },
  {
    id: 'GARNET_5MM',
    name: 'Garnet 5mm Round',
    stoneType: 'GARNET',
    shape: 'ROUND',
    sizeUnit: 'MM',
    sizeValue: '5',
    color: 'RED',
    settingStyle: 'BEZEL',
    description: 'Deep red garnet',
    estimatedPriceNpr: 700,
    tooltip: 'January birthstone. Deep red color similar to ruby at lower cost.',
  },
  {
    id: 'CITRINE_6MM',
    name: 'Citrine 6mm Cushion',
    stoneType: 'CITRINE',
    shape: 'CUSHION',
    sizeUnit: 'MM',
    sizeValue: '6',
    color: 'YELLOW',
    settingStyle: 'PRONG',
    description: 'Golden yellow citrine',
    estimatedPriceNpr: 500,
    tooltip: 'November birthstone. Warm golden color. Very affordable.',
  },
  {
    id: 'PEARL_FRESHWATER_7MM',
    name: 'Freshwater Pearl 7mm',
    stoneType: 'PEARL',
    origin: 'NATURAL',
    shape: 'CABOCHON', // Pearls are round/cabochon
    sizeUnit: 'MM',
    sizeValue: '7',
    color: 'WHITE',
    settingStyle: 'BEZEL',
    description: 'Classic freshwater pearl',
    estimatedPriceNpr: 1500,
    tooltip: 'June birthstone. Timeless elegance. Freshwater is more affordable than saltwater.',
    popular: true,
  },
];

// ═══════════════════════════════════════════
// COMBINED PRESETS BY CATEGORY
// ═══════════════════════════════════════════

export const ALL_GEMSTONE_PRESETS: GemstonePreset[] = [
  ...DIAMOND_PRESETS,
  ...MOISSANITE_PRESETS,
  ...COLORED_GEM_PRESETS,
  ...BUDGET_PRESETS,
];

export const POPULAR_PRESETS = ALL_GEMSTONE_PRESETS.filter(p => p.popular);

// ═══════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════

/**
 * Get preset by ID
 */
export function getGemstonePreset(id: string): GemstonePreset | undefined {
  return ALL_GEMSTONE_PRESETS.find(p => p.id === id);
}

/**
 * Get presets by stone type
 */
export function getPresetsByStoneType(stoneType: GemstoneType): GemstonePreset[] {
  return ALL_GEMSTONE_PRESETS.filter(p => p.stoneType === stoneType);
}

/**
 * Get presets filtered by price range
 */
export function getPresetsByPriceRange(
  minNpr: number, 
  maxNpr: number
): GemstonePreset[] {
  return ALL_GEMSTONE_PRESETS.filter(
    p => p.estimatedPriceNpr >= minNpr && p.estimatedPriceNpr <= maxNpr
  );
}

/**
 * Format preset display name with price
 */
export function formatPresetOption(
  preset: GemstonePreset, 
  currencySymbol: string = '₹',
  exchangeRate: number = 1
): string {
  const price = Math.round(preset.estimatedPriceNpr * exchangeRate);
  return `${preset.name} - ${currencySymbol} ${price.toLocaleString()}`;
}
