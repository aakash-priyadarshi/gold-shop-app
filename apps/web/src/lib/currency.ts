import { CURRENCIES, type CurrencyCode } from "@/store/preferences";
import { mapCountryToMarket, resolveShopCurrency } from "@gold-shop/shared";

export type SupportedCurrencyCode = CurrencyCode | "AUD";

export const CURRENCY_SYMBOLS: Record<SupportedCurrencyCode, string> = {
  NPR: "रु",
  INR: "₹",
  AED: "د.إ",
  USD: "$",
  GBP: "£",
  EUR: "€",
  LKR: "Rs.",
  AUD: "A$",
};

const COUNTRY_TO_CURRENCY: Record<string, SupportedCurrencyCode> = {
  NP: "NPR",
  IN: "INR",
  AE: "AED",
  US: "USD",
  UK: "GBP",
  GB: "GBP",
  AU: "AUD",
  EU: "EUR",
  LK: "LKR",
  AT: "EUR",
  BE: "EUR",
  DE: "EUR",
  ES: "EUR",
  FR: "EUR",
  IT: "EUR",
  NL: "EUR",
  PT: "EUR",
};

export const DEFAULT_USD_FX_RATES: Record<SupportedCurrencyCode, number> = {
  USD: 1,
  NPR: 133.5,
  INR: 83.5,
  GBP: 0.79,
  EUR: 0.92,
  AED: 3.67,
  LKR: 300,
  AUD: 1.51,
};

let fxCache: {
  rates: Record<SupportedCurrencyCode, number>;
  expiresAt: number;
  isFallback: boolean;
} | null = null;

export function getCurrencyForCountry(
  country?: string | null,
  fallback: SupportedCurrencyCode = "NPR",
): SupportedCurrencyCode {
  if (!country) return fallback;
  return resolveShopCurrency({ country }) as SupportedCurrencyCode;
}

/** Resolve billing currency from shop settings (country + optional stored currency). */
export function getCurrencyForShop(
  shop?: { country?: string | null; currency?: string | null } | null,
  fallback: SupportedCurrencyCode = "NPR",
): SupportedCurrencyCode {
  const base = fallback === "AUD" ? "USD" : fallback;
  return resolveShopCurrency(shop, base as CurrencyCode) as SupportedCurrencyCode;
}

export type FxRatesResult = {
  rates: Record<SupportedCurrencyCode, number>;
  /** True when live API failed and defaults were used */
  isFallback: boolean;
};

export async function fetchFreeFxRates(): Promise<Record<SupportedCurrencyCode, number>> {
  const result = await fetchFreeFxRatesDetailed();
  return result.rates;
}

export async function fetchFreeFxRatesDetailed(): Promise<FxRatesResult> {
  if (fxCache && fxCache.expiresAt > Date.now()) {
    return { rates: fxCache.rates, isFallback: fxCache.isFallback };
  }

  const endpoints = [
    "https://api.frankfurter.app/latest?from=USD",
    "https://api.frankfurter.dev/v1/latest?base=USD",
  ];

  let lastError: unknown;
  for (const url of endpoints) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        lastError = new Error(`FX ${response.status}`);
        continue;
      }
      const data = await response.json();
      const rates: Record<SupportedCurrencyCode, number> = {
        ...DEFAULT_USD_FX_RATES,
        ...(data.rates ?? {}),
        USD: 1,
      };

      if (rates.INR && !data.rates?.NPR) {
        rates.NPR = rates.INR * 1.6;
      }
      if (!data.rates?.LKR) {
        rates.LKR = rates.INR ? rates.INR * 3.6 : DEFAULT_USD_FX_RATES.LKR;
      }

      fxCache = {
        rates,
        expiresAt: Date.now() + 5 * 60 * 1000,
        isFallback: false,
      };
      return { rates, isFallback: false };
    } catch (err) {
      lastError = err;
    }
  }

  console.warn("FX fetch failed, using fallback rates", lastError);
  const rates = { ...DEFAULT_USD_FX_RATES };
  fxCache = {
    rates,
    expiresAt: Date.now() + 60 * 1000,
    isFallback: true,
  };
  return { rates, isFallback: true };
}

export function convertCurrencyAmount(
  amount: number,
  fromCurrency: SupportedCurrencyCode,
  toCurrency: SupportedCurrencyCode,
  rates: Record<SupportedCurrencyCode, number>,
): number {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];
  if (!fromRate || !toRate) return amount;
  return (amount / fromRate) * toRate;
}

export function formatCurrencyAmount(
  amount: number,
  currency: SupportedCurrencyCode,
  options: { decimals?: number; compact?: boolean } = {},
): string {
  const decimals = options.decimals ?? 0;
  const locale = currency === "AUD" ? "en-AU" : CURRENCIES[currency]?.locale ?? "en-US";

  if (options.compact && Math.abs(amount) >= 1000) {
    return `${CURRENCY_SYMBOLS[currency]} ${Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount)}`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    return `${CURRENCY_SYMBOLS[currency]} ${amount.toLocaleString()}`;
  }
}