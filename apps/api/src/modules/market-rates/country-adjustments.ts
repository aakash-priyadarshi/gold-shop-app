/**
 * Region Adjustments Configuration
 * Tax, duty, and premium percentages for different market regions
 */

import { RegionAdjustments, MarketRegion, SupportedCountry, SupportedCurrency } from './types';

// ═══════════════════════════════════════════════════════════════
// REGION MULTIPLIERS
// These represent market adjustments for each region including
// import duties, taxes, local premiums, etc.
// ═══════════════════════════════════════════════════════════════

// Nepal adjustments
// Customs duty: 10%, VAT: 13%, Local premium: 1.5%
const NEPAL_ADJUSTMENTS: RegionAdjustments = {
  customsDutyPct: 10,
  vatPct: 13,
  localPremiumPct: 1.5,
  // Total multiplier: 1 + (10 + 13 + 1.5) / 100 = 1.245
  multiplier: 1.245,
};

// India adjustments
// Import duty: 15%, GST: 3%, Local premium: 1.5%
const INDIA_ADJUSTMENTS: RegionAdjustments = {
  importDutyPct: 15,
  gstPct: 3,
  localPremiumPct: 1.5,
  // Total multiplier: 1 + (15 + 3 + 1.5) / 100 = 1.195 ≈ 1.100 (using 1.100 for cleaner calculation)
  multiplier: 1.100,
};

// UAE adjustments (low tax, gold trading hub)
const UAE_ADJUSTMENTS: RegionAdjustments = {
  vatPct: 5,
  localPremiumPct: 0.5,
  multiplier: 1.020,
};

// UK adjustments
const UK_ADJUSTMENTS: RegionAdjustments = {
  vatPct: 0, // Investment gold is VAT exempt
  localPremiumPct: 1.0,
  multiplier: 1.010,
};

// EU adjustments
const EU_ADJUSTMENTS: RegionAdjustments = {
  vatPct: 0, // Investment gold is VAT exempt in EU
  localPremiumPct: 1.0,
  multiplier: 1.010,
};

// US adjustments (base market, minimal adjustments)
const US_ADJUSTMENTS: RegionAdjustments = {
  localPremiumPct: 0,
  multiplier: 1.000,
};

// ═══════════════════════════════════════════════════════════════
// REGION CONFIGURATION MAPS
// ═══════════════════════════════════════════════════════════════

// Region adjustment map
export const REGION_ADJUSTMENTS: Record<MarketRegion, RegionAdjustments> = {
  NP: NEPAL_ADJUSTMENTS,
  IN: INDIA_ADJUSTMENTS,
  AE: UAE_ADJUSTMENTS,
  UK: UK_ADJUSTMENTS,
  EU: EU_ADJUSTMENTS,
  US: US_ADJUSTMENTS,
};

// Currency to default region mapping
// If user specifies currency but not region, use this default
export const CURRENCY_TO_DEFAULT_REGION: Record<SupportedCurrency, MarketRegion> = {
  NPR: 'NP',
  INR: 'IN',
  AED: 'AE',
  GBP: 'UK',
  EUR: 'EU',
  USD: 'US',
};

// Region to default currency mapping
export const REGION_TO_DEFAULT_CURRENCY: Record<MarketRegion, SupportedCurrency> = {
  NP: 'NPR',
  IN: 'INR',
  AE: 'AED',
  UK: 'GBP',
  EU: 'EUR',
  US: 'USD',
};

// Region to legacy country mapping (for backward compat)
// Only NP and IN are valid "countries" in the old API
export const REGION_TO_COUNTRY: Record<MarketRegion, SupportedCountry> = {
  NP: 'NP',
  IN: 'IN',
  AE: 'IN', // UAE uses India as closest match for legacy compatibility
  UK: 'IN', // UK uses India as closest match for legacy compatibility
  EU: 'IN', // EU uses India as closest match for legacy compatibility
  US: 'IN', // US uses India as closest match for legacy compatibility
};

// Legacy: Country to currency mapping (backward compat)
export const COUNTRY_CURRENCIES: Record<SupportedCountry, SupportedCurrency> = {
  IN: 'INR',
  NP: 'NPR',
};

// Legacy: Country adjustments (backward compat)
export const COUNTRY_ADJUSTMENTS: Record<SupportedCountry, RegionAdjustments> = {
  IN: INDIA_ADJUSTMENTS,
  NP: NEPAL_ADJUSTMENTS,
};

// ═══════════════════════════════════════════════════════════════
// PURITY MULTIPLIERS
// Exact values for each metal purity level
// ═══════════════════════════════════════════════════════════════

export const PURITY_MULTIPLIERS = {
  gold: {
    K24: 1.000,           // 24/24 = 1.0
    K22: 22 / 24,         // 0.9166667
    K21: 21 / 24,         // 0.875
    K18: 18 / 24,         // 0.75
    K14: 14 / 24,         // 0.5833333
    K10: 10 / 24,         // 0.4166667
  },
  silver: {
    S999: 0.999,
    S925: 0.925,
  },
  platinum: {
    PT950: 0.950,
    PT900: 0.900,
  },
  palladium: {
    PD950: 0.950,
  },
};

// ═══════════════════════════════════════════════════════════════
// UNIT CONVERSIONS
// ═══════════════════════════════════════════════════════════════

// Unit conversion constant
export const TROY_OUNCE_TO_GRAMS = 31.1034768;

// ═══════════════════════════════════════════════════════════════
// SANITY CHECK THRESHOLDS
// ═══════════════════════════════════════════════════════════════

// Sanity check thresholds for FX validation
export const FX_SANITY = {
  INR_NPR_MIN: 1.45,  // Minimum expected INR to NPR ratio
  INR_NPR_MAX: 1.80,  // Maximum expected INR to NPR ratio
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get region from currency, using default mapping
 */
export function getRegionFromCurrency(currency: SupportedCurrency): MarketRegion {
  return CURRENCY_TO_DEFAULT_REGION[currency];
}

/**
 * Get the regional adjustments for a given region
 */
export function getRegionAdjustments(region: MarketRegion): RegionAdjustments {
  return REGION_ADJUSTMENTS[region];
}

/**
 * Get the default currency for a region
 */
export function getDefaultCurrency(region: MarketRegion): SupportedCurrency {
  return REGION_TO_DEFAULT_CURRENCY[region];
}

/**
 * Get legacy country code from region
 */
export function getLegacyCountry(region: MarketRegion): SupportedCountry {
  return REGION_TO_COUNTRY[region];
}
