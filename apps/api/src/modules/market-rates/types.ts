/**
 * Market Rates Types
 * Types for metal spot prices, FX rates, region/currency pricing
 */

import { FxSnapshot, CurrencyCode as FxCurrencyCode, FxRate, ExtendedFxSnapshot } from '../fx-rates';

// Re-export types for convenience
export { FxRate, ExtendedFxSnapshot };

// Supported currencies (re-export from fx-rates)
export type SupportedCurrency = FxCurrencyCode; // 'NPR' | 'INR' | 'AED' | 'USD' | 'GBP' | 'EUR'

// Market regions for pricing adjustments
export type MarketRegion = 'NP' | 'IN' | 'AE' | 'UK' | 'EU' | 'US';

// Legacy country type (backward compatibility)
export type SupportedCountry = 'IN' | 'NP';

// Metal spot prices from MetalpriceAPI (USD per troy ounce)
export interface SpotPricesUsd {
  XAU: number; // Gold
  XAG: number; // Silver
  XPT: number; // Platinum
  XPD: number; // Palladium
  timestamp: string;
}

// Region adjustment configuration
export interface RegionAdjustments {
  // Tax/Duty breakdown (for transparency)
  importDutyPct?: number;
  customsDutyPct?: number;
  gstPct?: number;
  vatPct?: number;
  localPremiumPct?: number;
  // Final computed multiplier
  multiplier: number;
}

// Legacy - keeping for backward compat
export type CountryAdjustments = RegionAdjustments;

// Metal rates per gram in local currency
export interface MetalRates {
  GOLD_24K: number;
  GOLD_22K: number;
  GOLD_18K: number;
  GOLD_14K: number;
  GOLD_10K: number;
  SILVER_999: number;
  SILVER_925: number;
  PLATINUM_PT950: number;
  PLATINUM_PT900: number;
  PALLADIUM_PD950: number;
}

// Debug info for troubleshooting price jumps
export interface MarketRatesDebug {
  // Source information
  spotSource: 'metalpriceapi' | 'fallback';
  fxSource: 'frankfurter' | 'exchangerate_host' | 'fallback' | 'db_cache';
  
  // Raw values used in calculation
  spotUsed: {
    goldUsdOz: number;
    silverUsdOz: number;
    platinumUsdOz: number;
    palladiumUsdOz: number;
  };
  
  fxUsed: {
    USD_NPR?: number;
    USD_INR?: number;
    USD_AED?: number;
    USD_GBP?: number;
    USD_EUR?: number;
  };
  
  // Region calculation details
  regionUsed: MarketRegion;
  regionMultiplierUsed: number;
  
  // Timestamp
  computedAt: string;
}

// Full market rates response
export interface MarketRatesResponse {
  // Region/Currency
  region: MarketRegion;
  currency: SupportedCurrency;
  
  // Legacy field for backward compatibility
  country: SupportedCountry;
  
  // Pricing
  unit: 'per_gram';
  metals: MetalRates;
  
  // Timestamps & caching
  updatedAt: string;
  source: 'metalpriceapi' | 'fallback' | 'cached';
  cache: 'hit' | 'miss' | 'stale';
  
  // FX info
  fx: FxRate;
  fxSnapshot?: ExtendedFxSnapshot; // Full FX snapshot for transparency
  
  // Adjustments
  adjustments: RegionAdjustments;
  
  // Debug info (included in response for transparency)
  debug?: MarketRatesDebug;
  
  // Warnings (e.g., "Using fallback rates")
  warnings?: string[];
}

// Purity multipliers
export interface PurityMultipliers {
  gold: {
    K24: number;
    K22: number;
    K18: number;
    K14: number;
    K10: number;
  };
  silver: {
    S999: number;
    S925: number;
  };
  platinum: {
    PT950: number;
    PT900: number;
  };
  palladium: {
    PD950: number;
  };
}

// MetalpriceAPI response shape
export interface MetalpriceApiResponse {
  success: boolean;
  timestamp: number;
  base: string;
  date: string;
  rates: {
    XAU?: number;
    XAG?: number;
    XPT?: number;
    XPD?: number;
    [key: string]: number | undefined;
  };
}

// Cache entry shape
export interface CachedMarketRates {
  data: MarketRatesResponse;
  cachedAt: string;
  expiresAt: string;
}
