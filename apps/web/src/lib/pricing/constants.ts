/**
 * Pricing Constants & Metadata
 * 
 * Contains all the dropdown options, tooltips, and pricing metadata
 * for the custom jewellery form.
 */

// ═══════════════════════════════════════════
// GEMSTONE CONSTANTS
// ═══════════════════════════════════════════

export type GemstoneType = 
  | 'DIAMOND_NATURAL' | 'DIAMOND_LAB' | 'MOISSANITE' | 'CUBIC_ZIRCONIA'
  | 'RUBY' | 'SAPPHIRE' | 'EMERALD' | 'PEARL' | 'AMETHYST' | 'TOPAZ'
  | 'GARNET' | 'OPAL' | 'TURQUOISE' | 'AQUAMARINE' | 'PERIDOT' | 'CITRINE' | 'OTHER';

export type GemstoneOrigin = 'NATURAL' | 'LAB';

export type GemstoneShape = 
  | 'ROUND' | 'OVAL' | 'PRINCESS' | 'CUSHION' | 'EMERALD_CUT'
  | 'MARQUISE' | 'PEAR' | 'HEART' | 'RADIANT' | 'ASSCHER' | 'BAGUETTE' | 'TRILLION' | 'CABOCHON';

export type SettingStyle = 
  | 'PRONG' | 'BEZEL' | 'CHANNEL' | 'PAVE' | 'FLUSH' | 'TENSION' | 'HALO' | 'CLUSTER' | 'BAR' | 'INVISIBLE';

export type SizeUnit = 'MM' | 'CARAT';

// Gemstone dropdown options with labels
export const GEMSTONE_TYPES = [
  { value: 'DIAMOND_NATURAL', label: 'Diamond (Natural)', origin: 'NATURAL', hasOriginOption: false },
  { value: 'DIAMOND_LAB', label: 'Diamond (Lab-grown)', origin: 'LAB', hasOriginOption: false },
  { value: 'MOISSANITE', label: 'Moissanite', origin: 'LAB', hasOriginOption: false },
  { value: 'CUBIC_ZIRCONIA', label: 'Cubic Zirconia (CZ)', origin: 'LAB', hasOriginOption: false },
  { value: 'RUBY', label: 'Ruby', origin: 'NATURAL', hasOriginOption: true },
  { value: 'SAPPHIRE', label: 'Sapphire', origin: 'NATURAL', hasOriginOption: true },
  { value: 'EMERALD', label: 'Emerald', origin: 'NATURAL', hasOriginOption: true },
  { value: 'PEARL', label: 'Pearl', origin: 'NATURAL', hasOriginOption: true },
  { value: 'AMETHYST', label: 'Amethyst', origin: 'NATURAL', hasOriginOption: false },
  { value: 'TOPAZ', label: 'Topaz', origin: 'NATURAL', hasOriginOption: false },
  { value: 'GARNET', label: 'Garnet', origin: 'NATURAL', hasOriginOption: false },
  { value: 'OPAL', label: 'Opal', origin: 'NATURAL', hasOriginOption: false },
  { value: 'TURQUOISE', label: 'Turquoise', origin: 'NATURAL', hasOriginOption: false },
  { value: 'AQUAMARINE', label: 'Aquamarine', origin: 'NATURAL', hasOriginOption: false },
  { value: 'PERIDOT', label: 'Peridot', origin: 'NATURAL', hasOriginOption: false },
  { value: 'CITRINE', label: 'Citrine', origin: 'NATURAL', hasOriginOption: false },
  { value: 'OTHER', label: 'Other', origin: 'NATURAL', hasOriginOption: false },
] as const;

export const GEMSTONE_SHAPES = [
  { value: 'ROUND', label: 'Round Brilliant', priceMultiplier: 1.0, tooltip: 'Most popular shape with maximum sparkle. 58 facets for optimal light reflection.' },
  { value: 'OVAL', label: 'Oval', priceMultiplier: 1.08, tooltip: 'Elongated shape that makes fingers appear longer. Great brilliance.' },
  { value: 'PRINCESS', label: 'Princess', priceMultiplier: 1.05, tooltip: 'Square shape with pointed corners. Modern and geometric look.' },
  { value: 'CUSHION', label: 'Cushion', priceMultiplier: 1.10, tooltip: 'Pillow-shaped with rounded corners. Vintage romantic feel.' },
  { value: 'EMERALD_CUT', label: 'Emerald Cut', priceMultiplier: 1.10, tooltip: 'Rectangular with step cuts. Shows clarity exceptionally well.' },
  { value: 'MARQUISE', label: 'Marquise', priceMultiplier: 1.12, tooltip: 'Boat-shaped with pointed ends. Maximizes carat weight appearance.' },
  { value: 'PEAR', label: 'Pear/Teardrop', priceMultiplier: 1.08, tooltip: 'Combination of round and marquise. Elegant elongated look.' },
  { value: 'HEART', label: 'Heart', priceMultiplier: 1.15, tooltip: 'Romantic symbol shape. Requires skilled cutting.' },
  { value: 'RADIANT', label: 'Radiant', priceMultiplier: 1.08, tooltip: 'Rectangular/square with brilliant faceting. Hides inclusions well.' },
  { value: 'ASSCHER', label: 'Asscher', priceMultiplier: 1.12, tooltip: 'Square emerald cut. Art Deco elegance with step-cut facets.' },
  { value: 'BAGUETTE', label: 'Baguette', priceMultiplier: 0.95, tooltip: 'Thin rectangle shape. Often used as accent stones.' },
  { value: 'TRILLION', label: 'Trillion', priceMultiplier: 1.05, tooltip: 'Triangular shape with brilliant cut. Modern and unique.' },
  { value: 'CABOCHON', label: 'Cabochon', priceMultiplier: 0.90, tooltip: 'Smooth domed top with flat base. Best for opaque stones like opal.' },
] as const;

export const SETTING_STYLES = [
  { value: 'PRONG', label: 'Prong', pricePerStone: 150, tooltip: 'Metal claws hold the stone. Maximum light exposure. Most popular for solitaires.' },
  { value: 'BEZEL', label: 'Bezel', pricePerStone: 250, tooltip: 'Metal rim surrounds the stone edge. Very secure, modern look. Protects stone.' },
  { value: 'CHANNEL', label: 'Channel', pricePerStone: 180, tooltip: 'Stones set between two metal walls. Sleek and secure for rows of stones.' },
  { value: 'PAVE', label: 'Pavé', pricePerStone: 100, tooltip: 'Many small stones set close together. Creates a "paved" sparkly surface.' },
  { value: 'FLUSH', label: 'Flush/Gypsy', pricePerStone: 200, tooltip: 'Stone sits flush with metal surface. Very secure, minimalist look.' },
  { value: 'TENSION', label: 'Tension', pricePerStone: 400, tooltip: 'Stone appears suspended by pressure. Modern, dramatic effect.' },
  { value: 'HALO', label: 'Halo', pricePerStone: 350, tooltip: 'Ring of smaller stones around center stone. Amplifies apparent size.' },
  { value: 'CLUSTER', label: 'Cluster', pricePerStone: 120, tooltip: 'Multiple stones grouped together. Creates a larger visual impact.' },
  { value: 'BAR', label: 'Bar', pricePerStone: 150, tooltip: 'Metal bars separate stones. Clean, contemporary look.' },
  { value: 'INVISIBLE', label: 'Invisible', pricePerStone: 500, tooltip: 'No visible metal holding stones. Creates seamless surface of gems.' },
] as const;

// Size presets by unit
export const SIZE_PRESETS_MM = [
  { value: '1', label: '1mm', tooltip: 'Tiny accent stone' },
  { value: '2', label: '2mm', tooltip: 'Small accent stone' },
  { value: '3', label: '3mm', tooltip: 'Standard accent size' },
  { value: '4', label: '4mm', tooltip: 'Medium stone' },
  { value: '5', label: '5mm', tooltip: 'Large accent / small center' },
  { value: '6', label: '6mm', tooltip: 'Standard center stone' },
  { value: '7', label: '7mm', tooltip: 'Large center stone' },
  { value: '8', label: '8mm', tooltip: 'Statement size' },
  { value: '9', label: '9mm', tooltip: 'Very large' },
  { value: '10', label: '10mm', tooltip: 'Extra large statement' },
] as const;

export const SIZE_PRESETS_CARAT = [
  { value: '0.10', label: '0.10 ct (1/10)', tooltip: 'Melee / tiny accent stone' },
  { value: '0.25', label: '0.25 ct (1/4)', tooltip: 'Small accent stone' },
  { value: '0.50', label: '0.50 ct (1/2)', tooltip: 'Half carat - popular choice' },
  { value: '0.75', label: '0.75 ct (3/4)', tooltip: 'Three quarter carat' },
  { value: '1.00', label: '1.00 ct', tooltip: 'One carat - classic size' },
  { value: '1.50', label: '1.50 ct', tooltip: 'One and a half carat' },
  { value: '2.00', label: '2.00 ct', tooltip: 'Two carat - statement' },
  { value: '3.00', label: '3.00 ct', tooltip: 'Three carat - luxury' },
] as const;

// Diamond-specific grading options
export const DIAMOND_COLORS = [
  { value: 'D', label: 'D (Colorless)', priceMultiplier: 1.5, tooltip: 'Absolutely colorless. Highest color grade.' },
  { value: 'E', label: 'E (Colorless)', priceMultiplier: 1.4, tooltip: 'Virtually colorless. Only tiny traces of color.' },
  { value: 'F', label: 'F (Colorless)', priceMultiplier: 1.3, tooltip: 'Colorless. Very slight traces visible only to expert.' },
  { value: 'G', label: 'G (Near Colorless)', priceMultiplier: 1.15, tooltip: 'Near colorless. Appears white in mounting.' },
  { value: 'H', label: 'H (Near Colorless)', priceMultiplier: 1.1, tooltip: 'Near colorless. Excellent value choice.' },
  { value: 'I', label: 'I (Near Colorless)', priceMultiplier: 1.0, tooltip: 'Slight warmth. Great value.' },
  { value: 'J', label: 'J (Near Colorless)', priceMultiplier: 0.9, tooltip: 'Noticeable warmth. Budget-friendly.' },
  { value: 'K', label: 'K (Faint)', priceMultiplier: 0.8, tooltip: 'Faint yellow. Warm vintage look.' },
  { value: 'L', label: 'L (Faint)', priceMultiplier: 0.7, tooltip: 'Light yellow tint visible.' },
  { value: 'M', label: 'M (Faint)', priceMultiplier: 0.6, tooltip: 'Noticeable yellow. Most affordable.' },
] as const;

export const DIAMOND_CLARITY = [
  { value: 'IF', label: 'IF (Internally Flawless)', priceMultiplier: 1.6, tooltip: 'No internal inclusions under 10x magnification.' },
  { value: 'VVS1', label: 'VVS1 (Very Very Slight)', priceMultiplier: 1.4, tooltip: 'Minute inclusions. Extremely difficult to see at 10x.' },
  { value: 'VVS2', label: 'VVS2', priceMultiplier: 1.3, tooltip: 'Minute inclusions. Very difficult to see at 10x.' },
  { value: 'VS1', label: 'VS1 (Very Slight)', priceMultiplier: 1.15, tooltip: 'Minor inclusions. Difficult to see at 10x.' },
  { value: 'VS2', label: 'VS2', priceMultiplier: 1.1, tooltip: 'Minor inclusions. Somewhat easy to see at 10x.' },
  { value: 'SI1', label: 'SI1 (Slight Inclusions)', priceMultiplier: 1.0, tooltip: 'Inclusions visible at 10x. Popular value choice.' },
  { value: 'SI2', label: 'SI2', priceMultiplier: 0.9, tooltip: 'Inclusions easily visible at 10x. May be visible to naked eye.' },
  { value: 'I1', label: 'I1 (Included)', priceMultiplier: 0.7, tooltip: 'Inclusions visible to naked eye. Budget option.' },
  { value: 'I2', label: 'I2', priceMultiplier: 0.5, tooltip: 'Obvious inclusions visible to naked eye.' },
  { value: 'I3', label: 'I3', priceMultiplier: 0.3, tooltip: 'Very obvious inclusions. May affect durability.' },
] as const;

export const DIAMOND_CUT = [
  { value: 'EXCELLENT', label: 'Excellent', priceMultiplier: 1.2, tooltip: 'Maximum fire and brilliance. Top 3% of diamonds.' },
  { value: 'VERY_GOOD', label: 'Very Good', priceMultiplier: 1.1, tooltip: 'Exceptional brilliance. Top 15% of diamonds.' },
  { value: 'GOOD', label: 'Good', priceMultiplier: 1.0, tooltip: 'Good brilliance. Great value.' },
  { value: 'FAIR', label: 'Fair', priceMultiplier: 0.85, tooltip: 'Some light leakage. Budget option.' },
] as const;

// Colored gemstone grading (Ruby, Sapphire, Emerald)
export const COLORED_GEM_COLORS = [
  { value: 'VIVID', label: 'Vivid/Intense', priceMultiplier: 1.5, tooltip: 'Most saturated, vibrant color. Highest grade.' },
  { value: 'DEEP', label: 'Deep', priceMultiplier: 1.3, tooltip: 'Rich, deep color saturation.' },
  { value: 'MEDIUM', label: 'Medium', priceMultiplier: 1.0, tooltip: 'Good color saturation. Standard quality.' },
  { value: 'LIGHT', label: 'Light', priceMultiplier: 0.7, tooltip: 'Lighter color. More pastel appearance.' },
] as const;

export const COLORED_GEM_CLARITY = [
  { value: 'EYE_CLEAN', label: 'Eye-clean', priceMultiplier: 1.3, tooltip: 'No inclusions visible to naked eye.' },
  { value: 'SLIGHTLY_INCLUDED', label: 'Slightly Included', priceMultiplier: 1.0, tooltip: 'Minor inclusions. Standard quality.' },
  { value: 'MODERATELY_INCLUDED', label: 'Moderately Included', priceMultiplier: 0.7, tooltip: 'Visible inclusions but still attractive.' },
  { value: 'HEAVILY_INCLUDED', label: 'Heavily Included', priceMultiplier: 0.4, tooltip: 'Significant inclusions. Budget option.' },
] as const;

// Default colors for other gemstones
export const DEFAULT_GEM_COLORS = [
  { value: 'WHITE', label: 'White/Clear' },
  { value: 'BLUE', label: 'Blue' },
  { value: 'RED', label: 'Red' },
  { value: 'GREEN', label: 'Green' },
  { value: 'YELLOW', label: 'Yellow' },
  { value: 'PINK', label: 'Pink' },
  { value: 'PURPLE', label: 'Purple' },
  { value: 'BLACK', label: 'Black' },
  { value: 'MULTI', label: 'Multi-color' },
  { value: 'CUSTOM', label: 'Custom/Other' },
] as const;

// ═══════════════════════════════════════════
// PLATING CONSTANTS
// ═══════════════════════════════════════════

export type PlatingType = 'GOLD_PLATING' | 'ROSE_GOLD_PLATING' | 'RHODIUM_PLATING' | 'SILVER_PLATING' | 'VERMEIL' | 'PVD_COATING';
export type PlatingTier = 'LIGHT' | 'STANDARD' | 'PREMIUM';

export const PLATING_TYPES = [
  { 
    value: 'GOLD_PLATING', 
    label: 'Gold Plated',
    tooltip: {
      what: 'A thin layer of gold (0.5-2.5 microns) electroplated onto base metal.',
      durability: 'Lasts 6 months to 2 years with care.',
      care: 'Avoid water, perfumes, and lotions. Store separately.',
      who: 'Fashion jewellery lovers who want gold look on a budget.',
      allergy: 'May cause reactions if nickel is in base metal.'
    }
  },
  { 
    value: 'ROSE_GOLD_PLATING', 
    label: 'Rose Gold Plated',
    tooltip: {
      what: 'Copper-alloyed gold plating giving a warm pink hue.',
      durability: 'Lasts 6 months to 2 years. Color may fade faster than yellow gold.',
      care: 'Same as gold plating. Avoid chlorine.',
      who: 'Those who love the romantic rose gold look.',
      allergy: 'Check for nickel in base metal.'
    }
  },
  { 
    value: 'RHODIUM_PLATING', 
    label: 'Rhodium Plated',
    tooltip: {
      what: 'Platinum-group metal plating. Extremely hard and reflective.',
      durability: 'Lasts 1-3 years. Very scratch resistant.',
      care: 'Polish gently. Avoid harsh chemicals.',
      who: 'Those wanting bright white finish on silver or white gold.',
      allergy: 'Hypoallergenic. Excellent for sensitive skin.'
    }
  },
  { 
    value: 'VERMEIL', 
    label: 'Vermeil (Gold over Sterling)',
    tooltip: {
      what: 'Thick gold layer (2.5+ microns) over .925 sterling silver only.',
      durability: 'Lasts 2-5 years with care. Can be re-plated.',
      care: 'Gentle cleaning. Store in anti-tarnish pouch.',
      who: 'Those wanting real gold look with better durability than plating.',
      allergy: 'Hypoallergenic - no nickel in base.'
    }
  },
  { 
    value: 'PVD_COATING', 
    label: 'PVD Coated',
    tooltip: {
      what: 'Physical Vapor Deposition - ultra-hard molecular bond coating.',
      durability: 'Lasts 3-10 years. Most durable plating option.',
      care: 'Very low maintenance. Resists scratches and tarnish.',
      who: 'Those wanting long-lasting finish for daily wear.',
      allergy: 'Hypoallergenic. Biocompatible.'
    }
  },
  { 
    value: 'SILVER_PLATING', 
    label: 'Silver Plated',
    tooltip: {
      what: 'Thin layer of silver electroplated onto base metal.',
      durability: 'Lasts 6 months to 1 year. Will tarnish.',
      care: 'Polish regularly. Store in anti-tarnish bag.',
      who: 'Budget-conscious buyers wanting silver look.',
      allergy: 'May cause reactions if nickel is in base.'
    }
  },
] as const;

export const PLATING_TIERS = [
  { 
    value: 'LIGHT', 
    label: 'Economy (0.5-1μm)',
    priceMultiplier: 0.6,
    tooltip: 'Thinnest layer. Fashion jewellery. 3-6 month lifespan.'
  },
  { 
    value: 'STANDARD', 
    label: 'Standard (1-2.5μm)',
    priceMultiplier: 1.0,
    tooltip: 'Recommended. Good balance of price and durability. 1-2 year lifespan.'
  },
  { 
    value: 'PREMIUM', 
    label: 'Premium (2.5-5μm)',
    priceMultiplier: 1.8,
    tooltip: 'Thickest layer. Best durability. 2-5 year lifespan. Worth it for daily wear.'
  },
] as const;

// ═══════════════════════════════════════════
// SURFACE FINISH CONSTANTS
// ═══════════════════════════════════════════

export type SurfaceFinish = 
  | 'HIGH_POLISH' | 'MATTE' | 'BRUSHED' | 'SATIN' | 'HAMMERED'
  | 'SANDBLASTED' | 'FLORENTINE' | 'BARK_TEXTURE' | 'DIAMOND_CUT' | 'ENGRAVED';

export const SURFACE_FINISHES = [
  { 
    value: 'HIGH_POLISH', 
    label: 'High Polish / Mirror',
    priceType: 'FLAT',
    priceNpr: 0,
    tooltip: {
      visual: 'Highly reflective mirror-like surface. Classic jewellery look.',
      maintenance: 'Shows fingerprints and scratches easily.',
      bestFor: 'Formal occasions, engagement rings, classic styles.'
    }
  },
  { 
    value: 'MATTE', 
    label: 'Matte',
    priceType: 'FLAT',
    priceNpr: 300,
    tooltip: {
      visual: 'Non-reflective, soft appearance. Modern and understated.',
      maintenance: 'Hides fingerprints well. May need occasional refresh.',
      bestFor: 'Contemporary designs, men\'s rings, minimalist styles.'
    }
  },
  { 
    value: 'BRUSHED', 
    label: 'Brushed',
    priceType: 'FLAT',
    priceNpr: 400,
    tooltip: {
      visual: 'Fine linear scratches creating subtle texture. Sophisticated look.',
      maintenance: 'Hides wear well. Can be refreshed by jeweller.',
      bestFor: 'Men\'s bands, modern designs, industrial aesthetics.'
    }
  },
  { 
    value: 'SATIN', 
    label: 'Satin',
    priceType: 'FLAT',
    priceNpr: 350,
    tooltip: {
      visual: 'Smooth with subtle sheen. Between matte and polish.',
      maintenance: 'Good at hiding light scratches.',
      bestFor: 'Wedding bands, everyday wear, elegant looks.'
    }
  },
  { 
    value: 'HAMMERED', 
    label: 'Hammered Texture',
    priceType: 'PERCENTAGE',
    pricePercent: 5,
    tooltip: {
      visual: 'Dimpled texture resembling hand-hammered metal. Artisanal feel.',
      maintenance: 'Very forgiving of wear. Unique character.',
      bestFor: 'Bohemian styles, artisan jewellery, nature-inspired pieces.'
    }
  },
  { 
    value: 'SANDBLASTED', 
    label: 'Sandblasted',
    priceType: 'FLAT',
    priceNpr: 500,
    tooltip: {
      visual: 'Grainy matte texture. Industrial yet refined.',
      maintenance: 'May need re-blasting over time.',
      bestFor: 'Contemporary designs, textural contrast pieces.'
    }
  },
  { 
    value: 'FLORENTINE', 
    label: 'Florentine',
    priceType: 'PERCENTAGE',
    pricePercent: 8,
    tooltip: {
      visual: 'Cross-hatched engraved pattern. Historic Italian technique.',
      maintenance: 'Durable finish. Shows character over time.',
      bestFor: 'Vintage-inspired pieces, detailed ornate designs.'
    }
  },
  { 
    value: 'BARK_TEXTURE', 
    label: 'Bark Texture',
    priceType: 'PERCENTAGE',
    pricePercent: 6,
    tooltip: {
      visual: 'Organic pattern resembling tree bark. Natural look.',
      maintenance: 'Hides wear very well. Low maintenance.',
      bestFor: 'Nature lovers, organic designs, men\'s bands.'
    }
  },
  { 
    value: 'DIAMOND_CUT', 
    label: 'Diamond Cut',
    priceType: 'PERCENTAGE',
    pricePercent: 10,
    tooltip: {
      visual: 'Faceted cuts catching light like diamonds. Maximum sparkle.',
      maintenance: 'May dull over time. Can be re-cut.',
      bestFor: 'Chains, bangles, pieces meant to sparkle.'
    }
  },
  { 
    value: 'ENGRAVED', 
    label: 'Engraved Finish',
    priceType: 'PERCENTAGE',
    pricePercent: 15,
    tooltip: {
      visual: 'Custom patterns or text carved into metal. Personalized.',
      maintenance: 'Permanent. Be careful with delicate designs.',
      bestFor: 'Personalized gifts, memorial pieces, family crests.'
    }
  },
] as const;

// ═══════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════

/**
 * Get color options based on stone type
 */
export function getColorOptionsForStone(stoneType: string) {
  if (stoneType.includes('DIAMOND')) {
    return DIAMOND_COLORS;
  }
  if (['RUBY', 'SAPPHIRE', 'EMERALD'].includes(stoneType)) {
    return COLORED_GEM_COLORS;
  }
  return DEFAULT_GEM_COLORS;
}

/**
 * Check if stone type needs clarity grading
 */
export function needsClarityGrading(stoneType: string): boolean {
  return stoneType.includes('DIAMOND') || ['RUBY', 'SAPPHIRE', 'EMERALD'].includes(stoneType);
}

/**
 * Get clarity options based on stone type
 */
export function getClarityOptionsForStone(stoneType: string) {
  if (stoneType.includes('DIAMOND')) {
    return DIAMOND_CLARITY;
  }
  if (['RUBY', 'SAPPHIRE', 'EMERALD'].includes(stoneType)) {
    return COLORED_GEM_CLARITY;
  }
  return null;
}

/**
 * Check if stone type needs cut grading (diamonds only)
 */
export function needsCutGrading(stoneType: string): boolean {
  return stoneType.includes('DIAMOND');
}

/**
 * Get appropriate size unit for stone type
 */
export function getDefaultSizeUnit(stoneType: string): SizeUnit {
  if (stoneType.includes('DIAMOND') || stoneType === 'MOISSANITE') {
    return 'CARAT';
  }
  return 'MM';
}

/**
 * Check if stone has origin option (natural vs lab)
 */
export function hasOriginOption(stoneType: string): boolean {
  return ['RUBY', 'SAPPHIRE', 'EMERALD', 'PEARL'].includes(stoneType);
}
