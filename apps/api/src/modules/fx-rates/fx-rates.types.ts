/**
 * FX Rates Types
 * Type definitions for the FX rates module
 */

// All supported currencies
export type CurrencyCode = 'NPR' | 'INR' | 'AED' | 'USD' | 'GBP' | 'EUR';

// All FX pairs we track (USD is base currency)
export type FxPair = 
  | 'USD_INR' 
  | 'USD_NPR' 
  | 'USD_AED' 
  | 'USD_GBP' 
  | 'USD_EUR'
  | 'USD_USD'  // Identity pair for USD
  | 'INR_NPR';

// FX data sources (with fallback chain)
export type FxSource = 'frankfurter' | 'exchangerate_host' | 'fallback' | 'derived' | 'db_cache';

export interface FxRate {
  pair: FxPair;
  rate: number;
  source: FxSource;
  updatedAt: string; // ISO timestamp
}

// Legacy snapshot for backward compatibility
export interface FxSnapshot {
  USD_INR: FxRate;
  USD_NPR: FxRate;
  INR_NPR: FxRate;
}

// Extended snapshot with all currencies
export interface ExtendedFxSnapshot extends FxSnapshot {
  USD_AED: FxRate;
  USD_GBP: FxRate;
  USD_EUR: FxRate;
}

export interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: {
    INR?: number;
    NPR?: number;
    AED?: number;
    GBP?: number;
    EUR?: number;
    [key: string]: number | undefined;
  };
}

// ExchangeRate.host response shape (fallback provider)
export interface ExchangeRateHostResponse {
  success: boolean;
  base: string;
  date: string;
  rates: {
    INR?: number;
    AED?: number;
    GBP?: number;
    EUR?: number;
    [key: string]: number | undefined;
  };
}

// Default fallback rates (realistic Jan 2026 values)
export const DEFAULT_FX_RATES = {
  USD_INR: 90.0,   // 1 USD = 90 INR
  USD_NPR: 144.0,  // 1 USD = 144 NPR (should be ~1.6x INR)
  USD_AED: 3.67,   // 1 USD = 3.67 AED (pegged)
  USD_GBP: 0.79,   // 1 USD = 0.79 GBP
  USD_EUR: 0.92,   // 1 USD = 0.92 EUR
  INR_NPR: 1.60,   // 1 INR = 1.60 NPR
} as const;

// Currency symbols and display info
export const CURRENCY_INFO: Record<CurrencyCode, { symbol: string; name: string; locale: string }> = {
  NPR: { symbol: 'रु', name: 'Nepalese Rupee', locale: 'ne-NP' },
  INR: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
};

// Sanity check thresholds
export const FX_SANITY_THRESHOLDS = {
  // NPR/INR ratio should be between 1.45 and 1.80
  INR_NPR_RATIO_MIN: 1.45,
  INR_NPR_RATIO_MAX: 1.80,
  // Gold price ratio (NPR 24K / INR 24K) should also be in this range
  GOLD_PRICE_RATIO_MIN: 1.45,
  GOLD_PRICE_RATIO_MAX: 1.80,
} as const;

// Cache TTL (24 hours in milliseconds)
export const FX_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// FX Provider configurations
// Primary: Frankfurter (free, reliable, but NPR not supported)
// Secondary: ExchangeRate.host (free tier available)
// Fallback: Hardcoded values
export const FRANKFURTER_CONFIG = {
  baseUrl: 'https://api.frankfurter.dev/v1',
  timeout: 10000, // 10 seconds
  // Currencies supported by Frankfurter (NPR is NOT supported by Frankfurter, we calculate it from INR)
  supportedCurrencies: ['INR', 'AED', 'GBP', 'EUR'] as const,
} as const;

export const EXCHANGERATE_HOST_CONFIG = {
  baseUrl: 'https://api.exchangerate.host',
  timeout: 10000,
  supportedCurrencies: ['INR', 'AED', 'GBP', 'EUR'] as const,
} as const;

// Environment fallback rates (used when all APIs are down)
export const FALLBACK_FX_RATES = {
  USD_INR: 83.0,
  USD_NPR: 133.0,
  USD_AED: 3.67,
  USD_EUR: 0.92,
  USD_GBP: 0.79,
  INR_NPR: 1.6024, // 133 / 83
} as const;
