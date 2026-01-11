/**
 * Weight Conversion Utilities
 * 
 * All pricing calculations use GRAMS internally.
 * This module provides conversion to/from various regional weight units.
 * 
 * Supported Units:
 * - GRAM (g) - Base unit
 * - KILOGRAM (kg)
 * - TOLA - Traditional South Asian unit (11.6638 grams)
 * - LAAL - Nepal local unit (0.1166 grams, 1/100th of a tola)
 * - OUNCE (oz) - Troy ounce for precious metals (31.1035 grams)
 * - POUND (lb) - 453.592 grams
 */

export type WeightUnit = 'GRAM' | 'KILOGRAM' | 'TOLA' | 'LAAL' | 'OUNCE' | 'POUND';

// Conversion factors to grams (how many grams in 1 unit)
export const WEIGHT_CONVERSION_FACTORS: Record<WeightUnit, number> = {
  GRAM: 1,
  KILOGRAM: 1000,
  TOLA: 11.6638,        // Traditional tola used in Nepal/India
  LAAL: 0.116638,       // 1/100th of a tola (Nepal)
  OUNCE: 31.1035,       // Troy ounce (used for precious metals)
  POUND: 453.59237,     // Avoirdupois pound
};

// Display configuration for each unit
export const WEIGHT_UNIT_CONFIG: Record<WeightUnit, {
  symbol: string;
  displayName: string;
  displayNamePlural: string;
  decimals: number;
}> = {
  GRAM: {
    symbol: 'g',
    displayName: 'Gram',
    displayNamePlural: 'Grams',
    decimals: 2,
  },
  KILOGRAM: {
    symbol: 'kg',
    displayName: 'Kilogram',
    displayNamePlural: 'Kilograms',
    decimals: 3,
  },
  TOLA: {
    symbol: 'tola',
    displayName: 'Tola',
    displayNamePlural: 'Tola',
    decimals: 2,
  },
  LAAL: {
    symbol: 'laal',
    displayName: 'Laal',
    displayNamePlural: 'Laal',
    decimals: 1,
  },
  OUNCE: {
    symbol: 'oz',
    displayName: 'Ounce',
    displayNamePlural: 'Ounces',
    decimals: 3,
  },
  POUND: {
    symbol: 'lb',
    displayName: 'Pound',
    displayNamePlural: 'Pounds',
    decimals: 3,
  },
};

// Market-specific supported weight units
export const MARKET_WEIGHT_UNITS: Record<string, WeightUnit[]> = {
  NP: ['GRAM', 'TOLA', 'LAAL'],                    // Nepal
  IN: ['GRAM', 'KILOGRAM', 'TOLA'],                // India
  US: ['GRAM', 'OUNCE', 'POUND'],                  // United States
  UK: ['GRAM', 'KILOGRAM', 'OUNCE'],               // United Kingdom
  EU: ['GRAM', 'KILOGRAM'],                        // Europe
  AE: ['GRAM', 'TOLA', 'OUNCE'],                   // UAE
};

// Default weight unit per market
export const MARKET_DEFAULT_WEIGHT_UNIT: Record<string, WeightUnit> = {
  NP: 'TOLA',
  IN: 'GRAM',
  US: 'OUNCE',
  UK: 'GRAM',
  EU: 'GRAM',
  AE: 'GRAM',
};

/**
 * Convert a weight value to grams (base unit)
 * @param value - The weight value to convert
 * @param fromUnit - The source unit
 * @returns Weight in grams
 */
export function toGrams(value: number, fromUnit: WeightUnit): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Invalid weight value');
  }
  if (!WEIGHT_CONVERSION_FACTORS[fromUnit]) {
    throw new Error(`Unknown weight unit: ${fromUnit}`);
  }
  return value * WEIGHT_CONVERSION_FACTORS[fromUnit];
}

/**
 * Convert a weight value from grams to another unit
 * @param grams - The weight in grams
 * @param toUnit - The target unit
 * @returns Weight in the target unit
 */
export function fromGrams(grams: number, toUnit: WeightUnit): number {
  if (typeof grams !== 'number' || isNaN(grams)) {
    throw new Error('Invalid weight value');
  }
  if (!WEIGHT_CONVERSION_FACTORS[toUnit]) {
    throw new Error(`Unknown weight unit: ${toUnit}`);
  }
  return grams / WEIGHT_CONVERSION_FACTORS[toUnit];
}

/**
 * Convert weight between any two units
 * @param value - The weight value to convert
 * @param fromUnit - The source unit
 * @param toUnit - The target unit
 * @returns Weight in the target unit
 */
export function convertWeight(value: number, fromUnit: WeightUnit, toUnit: WeightUnit): number {
  const grams = toGrams(value, fromUnit);
  return fromGrams(grams, toUnit);
}

/**
 * Format a weight value with the appropriate decimals and symbol
 * @param value - The weight value
 * @param unit - The weight unit
 * @param options - Formatting options
 * @returns Formatted string like "10.5 g" or "1 tola"
 */
export function formatWeight(
  value: number,
  unit: WeightUnit,
  options: {
    showSymbol?: boolean;
    locale?: string;
  } = {}
): string {
  const { showSymbol = true, locale = 'en' } = options;
  const config = WEIGHT_UNIT_CONFIG[unit];
  
  if (!config) {
    throw new Error(`Unknown weight unit: ${unit}`);
  }
  
  const formattedValue = value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: config.decimals,
  });
  
  if (showSymbol) {
    return `${formattedValue} ${config.symbol}`;
  }
  
  return formattedValue;
}

/**
 * Format a weight value from grams to a display unit with symbol
 * @param grams - Weight in grams
 * @param displayUnit - Unit to display in
 * @param options - Formatting options
 * @returns Formatted string
 */
export function formatWeightFromGrams(
  grams: number,
  displayUnit: WeightUnit,
  options: {
    showSymbol?: boolean;
    showGramsEquivalent?: boolean;
    locale?: string;
  } = {}
): string {
  const { showSymbol = true, showGramsEquivalent = false, locale = 'en' } = options;
  
  const convertedValue = fromGrams(grams, displayUnit);
  const formatted = formatWeight(convertedValue, displayUnit, { showSymbol, locale });
  
  if (showGramsEquivalent && displayUnit !== 'GRAM') {
    const gramsFormatted = formatWeight(grams, 'GRAM', { showSymbol: true, locale });
    return `${formatted} (~${gramsFormatted})`;
  }
  
  return formatted;
}

/**
 * Round a weight value to the appropriate precision for its unit
 * @param value - The weight value
 * @param unit - The weight unit
 * @returns Rounded value
 */
export function roundWeight(value: number, unit: WeightUnit): number {
  const config = WEIGHT_UNIT_CONFIG[unit];
  if (!config) {
    throw new Error(`Unknown weight unit: ${unit}`);
  }
  const factor = Math.pow(10, config.decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Get supported weight units for a market/country
 * @param countryCode - The market country code (NP, IN, US, UK, EU, AE)
 * @returns Array of supported weight units
 */
export function getSupportedWeightUnits(countryCode: string): WeightUnit[] {
  return MARKET_WEIGHT_UNITS[countryCode] || MARKET_WEIGHT_UNITS['US'];
}

/**
 * Get the default weight unit for a market/country
 * @param countryCode - The market country code
 * @returns Default weight unit for the market
 */
export function getDefaultWeightUnit(countryCode: string): WeightUnit {
  return MARKET_DEFAULT_WEIGHT_UNIT[countryCode] || 'GRAM';
}

/**
 * Validate if a weight unit is supported in a market
 * @param unit - The weight unit to check
 * @param countryCode - The market country code
 * @returns Boolean indicating if the unit is supported
 */
export function isWeightUnitSupported(unit: WeightUnit, countryCode: string): boolean {
  const supportedUnits = getSupportedWeightUnits(countryCode);
  return supportedUnits.includes(unit);
}
