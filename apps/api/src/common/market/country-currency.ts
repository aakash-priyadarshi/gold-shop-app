import { CurrencyCode, MarketRegion } from "@prisma/client";

export const SUPPORTED_MARKET_COUNTRIES = [
  "NP",
  "IN",
  "AE",
  "UK",
  "EU",
  "US",
  "LK",
] as const;

export type SupportedMarketCountry = (typeof SUPPORTED_MARKET_COUNTRIES)[number];

export const DEFAULT_CURRENCY_BY_MARKET: Record<
  SupportedMarketCountry,
  CurrencyCode
> = {
  NP: CurrencyCode.NPR,
  IN: CurrencyCode.INR,
  AE: CurrencyCode.AED,
  UK: CurrencyCode.GBP,
  EU: CurrencyCode.EUR,
  US: CurrencyCode.USD,
  LK: CurrencyCode.LKR,
};

export const SUPPORTED_CURRENCIES_BY_MARKET: Record<
  SupportedMarketCountry,
  readonly CurrencyCode[]
> = {
  NP: [CurrencyCode.NPR, CurrencyCode.USD, CurrencyCode.INR],
  IN: [CurrencyCode.INR, CurrencyCode.USD],
  AE: [CurrencyCode.AED, CurrencyCode.USD],
  UK: [CurrencyCode.GBP, CurrencyCode.USD, CurrencyCode.EUR],
  EU: [CurrencyCode.EUR, CurrencyCode.USD, CurrencyCode.GBP],
  US: [CurrencyCode.USD],
  LK: [CurrencyCode.LKR, CurrencyCode.USD, CurrencyCode.INR],
};

const EUROPEAN_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE",
  "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT",
  "RO", "SK", "SI", "ES", "SE", "CH", "NO",
]);

const MIDDLE_EAST_COUNTRIES = new Set(["BH", "KW", "OM", "QA", "SA"]);

export function isSupportedMarketCountry(
  country: string,
): country is SupportedMarketCountry {
  return SUPPORTED_MARKET_COUNTRIES.includes(
    country.toUpperCase() as SupportedMarketCountry,
  );
}

export function normalizeMarketRegion(
  country?: string | null,
  fallback: MarketRegion = MarketRegion.US,
): MarketRegion {
  return resolveMarketRegion(country) || fallback;
}

export function resolveMarketRegion(
  country?: string | null,
): MarketRegion | null {
  const normalized = country?.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === "GB") return MarketRegion.UK;
  if (isSupportedMarketCountry(normalized)) return normalized as MarketRegion;
  if (EUROPEAN_COUNTRIES.has(normalized)) return MarketRegion.EU;
  if (MIDDLE_EAST_COUNTRIES.has(normalized)) return MarketRegion.AE;
  return null;
}

export function getDefaultCurrencyForMarket(
  country: string | MarketRegion,
): CurrencyCode {
  const market = normalizeMarketRegion(country);
  return DEFAULT_CURRENCY_BY_MARKET[market as SupportedMarketCountry];
}

export function isCurrencySupportedForMarket(
  country: string | MarketRegion,
  currency: CurrencyCode,
): boolean {
  const market = normalizeMarketRegion(country);
  return SUPPORTED_CURRENCIES_BY_MARKET[
    market as SupportedMarketCountry
  ].includes(currency);
}
