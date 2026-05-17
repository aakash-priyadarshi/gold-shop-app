import { CURRENCIES, type CurrencyCode } from "@/store/preferences";

export type SupportedCurrencyCode = CurrencyCode | "AUD";

export const CURRENCY_SYMBOLS: Record<SupportedCurrencyCode, string> = {
  NPR: "रु",
  INR: "₹",
  AED: "د.إ",
  USD: "$",
  GBP: "£",
  EUR: "€",
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
  AUD: 1.51,
};

let fxCache: { rates: Record<SupportedCurrencyCode, number>; expiresAt: number } | null = null;

export function getCurrencyForCountry(
  country?: string | null,
  fallback: SupportedCurrencyCode = "NPR",
): SupportedCurrencyCode {
  if (!country) return fallback;
  return COUNTRY_TO_CURRENCY[country.toUpperCase()] ?? fallback;
}

export async function fetchFreeFxRates(): Promise<Record<SupportedCurrencyCode, number>> {
  if (fxCache && fxCache.expiresAt > Date.now()) {
    return fxCache.rates;
  }

  const response = await fetch("https://api.frankfurter.dev/v1/latest?base=USD");
  if (!response.ok) throw new Error("Failed to load exchange rates");

  const data = await response.json();
  const rates: Record<SupportedCurrencyCode, number> = {
    ...DEFAULT_USD_FX_RATES,
    ...(data.rates ?? {}),
    USD: 1,
  };

  if (rates.INR && !data.rates?.NPR) {
    rates.NPR = rates.INR * 1.6;
  }

  fxCache = {
    rates,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };

  return rates;
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