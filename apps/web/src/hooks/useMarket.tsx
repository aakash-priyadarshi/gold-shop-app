'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { api } from '@/lib/api';
import {
  usePreferencesStore,
  type CurrencyCode as PrefCurrencyCode,
  type CountryCode as PrefCountryCode,
} from '@/store/preferences';

// Types matching backend MarketConfig
export type MarketRegion = 'NP' | 'IN' | 'US' | 'UK' | 'EU' | 'AE';
export type CurrencyCode = 'NPR' | 'INR' | 'USD' | 'GBP' | 'EUR' | 'AED';
export type WeightUnit = 'GRAM' | 'KILOGRAM' | 'TOLA' | 'LAAL' | 'OUNCE' | 'POUND';

export interface MarketConfig {
  id: string;
  countryCode: MarketRegion;
  countryName: string;
  defaultCurrency: CurrencyCode;
  supportedCurrencies: CurrencyCode[];
  defaultWeightUnit: WeightUnit;
  supportedWeightUnits: WeightUnit[];
  supportedPaymentMethods: string[];
  heroHeadline: string;
  heroSubheadline?: string;
  footerContactTitle?: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress?: string;
  contactWhatsapp?: string;
  taxPercentage: number;
  taxName?: string;
  priceMultiplier: number;
  codEnabled: boolean;
  customOrdersEnabled: boolean;
  isActive: boolean;
}

export interface MarketState {
  config: MarketConfig | null;
  detectedCountry: MarketRegion;
  selectedCountry: MarketRegion;
  selectedCurrency: CurrencyCode;
  selectedWeightUnit: WeightUnit;
  isLoading: boolean;
  error: string | null;
}

export interface MarketContextType extends MarketState {
  setCountry: (country: MarketRegion) => void;
  setCurrency: (currency: CurrencyCode) => void;
  setWeightUnit: (unit: WeightUnit) => void;
  refreshConfig: () => Promise<void>;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

// Local storage key (weight unit only — currency/country live in the
// preferences store now).
const STORAGE_KEYS = {
  WEIGHT_UNIT: 'orivraa_market_weight_unit',
};

// Currency symbols
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  NPR: 'Rs.',
  INR: '₹',
  USD: '$',
  GBP: '£',
  EUR: '€',
  AED: 'د.إ',
};

// Weight unit symbols
export const WEIGHT_UNIT_SYMBOLS: Record<WeightUnit, string> = {
  GRAM: 'g',
  KILOGRAM: 'kg',
  TOLA: 'tola',
  LAAL: 'laal',
  OUNCE: 'oz',
  POUND: 'lb',
};

// Country names
export const COUNTRY_NAMES: Record<MarketRegion, string> = {
  NP: 'Nepal',
  IN: 'India',
  US: 'United States',
  UK: 'United Kingdom',
  EU: 'Europe',
  AE: 'UAE',
};

interface MarketProviderProps {
  children: ReactNode;
  initialCountry?: MarketRegion;
}

export function MarketProvider({ children, initialCountry }: MarketProviderProps) {
  // Currency and country are owned by the global preferences store (the single
  // source of truth, shared with checkout/cart/API headers). useMarket only
  // owns market config, weight unit, and the geo-detected country hint that
  // seeds preferences for guests. This removes the old duplicate currency state
  // that could drift out of sync with the preferences store.
  const prefsCurrency = usePreferencesStore((s) => s.currency);
  const prefsCountry = usePreferencesStore((s) => s.country);
  const prefsSetCurrency = usePreferencesStore((s) => s.setCurrency);
  const prefsSetCountry = usePreferencesStore((s) => s.setCountry);

  const [state, setState] = useState<{
    config: MarketConfig | null;
    detectedCountry: MarketRegion;
    selectedWeightUnit: WeightUnit;
    isLoading: boolean;
    error: string | null;
  }>({
    config: null,
    detectedCountry: initialCountry || 'US',
    selectedWeightUnit: 'GRAM',
    isLoading: true,
    error: null,
  });

  // Fetch market config from API
  const fetchConfig = useCallback(async (countryCode: MarketRegion) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await api.get(`/market/config?country=${countryCode}`);
      const config = response.data;

      setState(prev => ({
        ...prev,
        config,
        selectedWeightUnit: prev.selectedWeightUnit || config.defaultWeightUnit,
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Failed to fetch market config:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to load market configuration',
      }));
    }
  }, []);

  // Helper to read cookie value
  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  };

  // Detect country on mount and load the matching market config
  useEffect(() => {
    const detectAndLoadConfig = async () => {
      // Check URL params for override (useful for testing)
      const urlParams = new URLSearchParams(window.location.search);
      const countryParam = urlParams.get('country') as MarketRegion | null;

      // Weight unit still persists locally (not part of preferences store)
      const savedWeightUnit = localStorage.getItem(STORAGE_KEYS.WEIGHT_UNIT) as WeightUnit | null;

      let detectedCountry: MarketRegion = 'US';

      if (countryParam && ['NP', 'IN', 'US', 'UK', 'EU', 'AE'].includes(countryParam)) {
        detectedCountry = countryParam;
      } else if (initialCountry) {
        detectedCountry = initialCountry;
      } else {
        // Priority 1: Read from middleware-set cookie (fastest - already set by edge middleware)
        const cookieCountry = getCookie('orivraa_geo_country') as MarketRegion | null;

        if (cookieCountry && ['NP', 'IN', 'US', 'UK', 'EU', 'AE'].includes(cookieCountry)) {
          detectedCountry = cookieCountry;
        } else {
          // Priority 2: Call API endpoint (fallback)
          try {
            const geoResponse = await fetch('/api/geo');
            const geoData = await geoResponse.json();
            if (geoData?.detectedCountry) {
              detectedCountry = geoData.detectedCountry as MarketRegion;
            }
          } catch (e) {
            console.error('Failed to detect country from geo API:', e);
            detectedCountry = 'US';
          }
        }
      }

      setState(prev => ({
        ...prev,
        detectedCountry,
        selectedWeightUnit: savedWeightUnit || prev.selectedWeightUnit,
      }));

      // Load config for the user's current country preference, falling back to
      // the geo-detected country for first-time guests.
      await fetchConfig((prefsCountry as MarketRegion) || detectedCountry);
    };

    detectAndLoadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCountry, fetchConfig]);

  // Set country preference (delegates to the preferences store) and refresh config
  const setCountry = useCallback((country: MarketRegion) => {
    prefsSetCountry(country as PrefCountryCode);
    fetchConfig(country);
  }, [fetchConfig, prefsSetCountry]);

  // Set currency preference (delegates to the preferences store)
  const setCurrency = useCallback((currency: CurrencyCode) => {
    prefsSetCurrency(currency as PrefCurrencyCode);
  }, [prefsSetCurrency]);

  // Set weight unit preference (still local to useMarket)
  const setWeightUnit = useCallback((unit: WeightUnit) => {
    localStorage.setItem(STORAGE_KEYS.WEIGHT_UNIT, unit);
    setState(prev => ({ ...prev, selectedWeightUnit: unit }));
  }, []);

  // Refresh config for the current country preference
  const refreshConfig = useCallback(async () => {
    await fetchConfig(prefsCountry as MarketRegion);
  }, [fetchConfig, prefsCountry]);

  const contextValue: MarketContextType = {
    config: state.config,
    detectedCountry: state.detectedCountry,
    selectedCountry: prefsCountry as MarketRegion,
    selectedCurrency: prefsCurrency as CurrencyCode,
    selectedWeightUnit: state.selectedWeightUnit,
    isLoading: state.isLoading,
    error: state.error,
    setCountry,
    setCurrency,
    setWeightUnit,
    refreshConfig,
  };

  return (
    <MarketContext.Provider value={contextValue}>
      {children}
    </MarketContext.Provider>
  );
}

// Hook to use market context
export function useMarket() {
  const context = useContext(MarketContext);
  if (context === undefined) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
}

// Hook to get formatted currency
export function useFormatCurrency() {
  const { selectedCurrency } = useMarket();

  return useCallback(
    (amount: number, options?: { compact?: boolean }) => {
      const symbol = CURRENCY_SYMBOLS[selectedCurrency];
      const formatted = amount.toLocaleString('en', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        notation: options?.compact ? 'compact' : 'standard',
      });
      return `${symbol} ${formatted}`;
    },
    [selectedCurrency]
  );
}

// Hook to get formatted weight
export function useFormatWeight() {
  const { selectedWeightUnit } = useMarket();

  return useCallback(
    (grams: number, options?: { showEquivalent?: boolean }) => {
      const converted = fromGrams(grams, selectedWeightUnit);
      const symbol = WEIGHT_UNIT_SYMBOLS[selectedWeightUnit];
      const formatted = converted.toLocaleString('en', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });

      if (options?.showEquivalent && selectedWeightUnit !== 'GRAM') {
        return `${formatted} ${symbol} (~${grams.toFixed(2)} g)`;
      }

      return `${formatted} ${symbol}`;
    },
    [selectedWeightUnit]
  );
}

// Weight conversion utilities
const WEIGHT_CONVERSION_FACTORS: Record<WeightUnit, number> = {
  GRAM: 1,
  KILOGRAM: 1000,
  TOLA: 11.6638,
  LAAL: 0.116638,
  OUNCE: 31.1035,
  POUND: 453.59237,
};

export function toGrams(value: number, fromUnit: WeightUnit): number {
  return value * WEIGHT_CONVERSION_FACTORS[fromUnit];
}

export function fromGrams(grams: number, toUnit: WeightUnit): number {
  return grams / WEIGHT_CONVERSION_FACTORS[toUnit];
}

export function convertWeight(value: number, fromUnit: WeightUnit, toUnit: WeightUnit): number {
  const grams = toGrams(value, fromUnit);
  return fromGrams(grams, toUnit);
}

export default MarketProvider;
