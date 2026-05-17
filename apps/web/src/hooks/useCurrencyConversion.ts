'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CURRENCY_SYMBOLS,
  DEFAULT_USD_FX_RATES,
  convertCurrencyAmount,
  fetchFreeFxRates,
  type SupportedCurrencyCode,
} from '@/lib/currency';
import { useMarket, type CurrencyCode } from './useMarket';

// Cache for FX rates
let fxRatesCache: { rates: Record<SupportedCurrencyCode, number>; expiresAt: Date } | null = null;

export function useCurrencyConversion() {
  const { selectedCurrency } = useMarket();
  const [fxRates, setFxRates] = useState<Record<SupportedCurrencyCode, number>>(DEFAULT_USD_FX_RATES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch FX rates from API
  useEffect(() => {
    const fetchFxRates = async () => {
      // Check cache first (5 minute TTL)
      if (fxRatesCache && fxRatesCache.expiresAt > new Date()) {
        setFxRates(fxRatesCache.rates);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const rates = await fetchFreeFxRates();

        // Cache the rates for 5 minutes
        fxRatesCache = {
          rates,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        };

        setFxRates(rates);
      } catch (err) {
        console.error('Failed to fetch FX rates:', err);
        setError('Failed to load exchange rates');
        // Keep using default rates
      } finally {
        setIsLoading(false);
      }
    };

    fetchFxRates();
  }, []);

  /**
   * Convert amount from one currency to another
   * @param amount Amount to convert
   * @param fromCurrency Source currency (defaults to NPR as orders are stored in NPR)
   * @param toCurrency Target currency (defaults to user's selected currency)
   */
  const convertCurrency = useCallback(
    (
      amount: number,
      fromCurrency: SupportedCurrencyCode = 'NPR',
      toCurrency?: SupportedCurrencyCode,
    ): number => {
      const targetCurrency = toCurrency || selectedCurrency;
      return convertCurrencyAmount(amount, fromCurrency, targetCurrency, fxRates);
    },
    [fxRates, selectedCurrency]
  );

  /**
   * Format amount with currency conversion and symbol
   * @param amount Amount in NPR (base currency)
   * @param options Formatting options
   */
  const formatWithConversion = useCallback(
    (
      amount: number,
      options?: {
        fromCurrency?: SupportedCurrencyCode;
        toCurrency?: SupportedCurrencyCode;
        showOriginal?: boolean;
        decimals?: number;
      }
    ): string => {
      const {
        fromCurrency = 'NPR',
        toCurrency = selectedCurrency,
        showOriginal = false,
        decimals = 2,
      } = options || {};

      const convertedAmount = convertCurrency(amount, fromCurrency, toCurrency);
      const symbol = CURRENCY_SYMBOLS[toCurrency];
      
      const formattedAmount = convertedAmount.toLocaleString('en', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

      if (showOriginal && fromCurrency !== toCurrency) {
        const originalSymbol = CURRENCY_SYMBOLS[fromCurrency];
        return `${symbol}${formattedAmount} (${originalSymbol}${amount.toLocaleString()})`;
      }

      return `${symbol}${formattedAmount}`;
    },
    [convertCurrency, selectedCurrency]
  );

  /**
   * Get the FX rate between two currencies
   */
  const getRate = useCallback(
    (fromCurrency: SupportedCurrencyCode, toCurrency: SupportedCurrencyCode): number => {
      const fromRate = fxRates[fromCurrency];
      const toRate = fxRates[toCurrency];
      return toRate / fromRate;
    },
    [fxRates]
  );

  /**
   * Get the current selected currency symbol
   */
  const currencySymbol = useMemo(
    () => CURRENCY_SYMBOLS[selectedCurrency],
    [selectedCurrency]
  );

  return {
    selectedCurrency,
    currencySymbol,
    fxRates,
    isLoading,
    error,
    convertCurrency,
    formatWithConversion,
    getRate,
  };
}

export default useCurrencyConversion;
