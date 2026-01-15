'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMarket, CurrencyCode, CURRENCY_SYMBOLS } from './useMarket';

interface FxRates {
  NPR: number;
  INR: number;
  USD: number;
  GBP: number;
  EUR: number;
  AED: number;
}

interface MarketRatesResponse {
  fx: {
    pair: string;
    rate: number;
    source: string;
    updatedAt: string;
  };
  currency: string;
}

// Default FX rates (USD as base)
const DEFAULT_FX_RATES: FxRates = {
  USD: 1,
  NPR: 133.5,
  INR: 83.5,
  GBP: 0.79,
  EUR: 0.92,
  AED: 3.67,
};

// Cache for FX rates
let fxRatesCache: { rates: FxRates; expiresAt: Date } | null = null;

export function useCurrencyConversion() {
  const { selectedCurrency } = useMarket();
  const [fxRates, setFxRates] = useState<FxRates>(DEFAULT_FX_RATES);
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
        // Fetch rates for each currency to build conversion table
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.orivraa.com';
        const currencies: CurrencyCode[] = ['NPR', 'INR', 'USD', 'GBP', 'EUR', 'AED'];
        
        const rates: FxRates = { ...DEFAULT_FX_RATES };
        
        // Fetch USD to NPR rate as base
        const nprResponse = await fetch(`${API_URL}/market-rates?currency=NPR`);
        if (nprResponse.ok) {
          const nprData: MarketRatesResponse = await nprResponse.json();
          rates.NPR = nprData.fx?.rate || DEFAULT_FX_RATES.NPR;
        }

        // Fetch USD to INR rate
        const inrResponse = await fetch(`${API_URL}/market-rates?currency=INR`);
        if (inrResponse.ok) {
          const inrData: MarketRatesResponse = await inrResponse.json();
          rates.INR = inrData.fx?.rate || DEFAULT_FX_RATES.INR;
        }

        // Fetch USD to GBP rate
        const gbpResponse = await fetch(`${API_URL}/market-rates?currency=GBP`);
        if (gbpResponse.ok) {
          const gbpData: MarketRatesResponse = await gbpResponse.json();
          rates.GBP = gbpData.fx?.rate || DEFAULT_FX_RATES.GBP;
        }

        // Fetch USD to EUR rate
        const eurResponse = await fetch(`${API_URL}/market-rates?currency=EUR`);
        if (eurResponse.ok) {
          const eurData: MarketRatesResponse = await eurResponse.json();
          rates.EUR = eurData.fx?.rate || DEFAULT_FX_RATES.EUR;
        }

        // Fetch USD to AED rate
        const aedResponse = await fetch(`${API_URL}/market-rates?currency=AED`);
        if (aedResponse.ok) {
          const aedData: MarketRatesResponse = await aedResponse.json();
          rates.AED = aedData.fx?.rate || DEFAULT_FX_RATES.AED;
        }

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
    (amount: number, fromCurrency: CurrencyCode = 'NPR', toCurrency?: CurrencyCode): number => {
      const targetCurrency = toCurrency || selectedCurrency;
      
      if (fromCurrency === targetCurrency) {
        return amount;
      }

      // Convert from source to USD, then from USD to target
      const fromRate = fxRates[fromCurrency];
      const toRate = fxRates[targetCurrency];

      // amount in source currency -> USD -> target currency
      // amount / fromRate = USD amount
      // USD amount * toRate = target currency amount
      const amountInUsd = amount / fromRate;
      const convertedAmount = amountInUsd * toRate;

      return convertedAmount;
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
        fromCurrency?: CurrencyCode;
        toCurrency?: CurrencyCode;
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
    (fromCurrency: CurrencyCode, toCurrency: CurrencyCode): number => {
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
