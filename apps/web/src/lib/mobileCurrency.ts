/**
 * Resolves the country + currency to use for fetching market rates / billing
 * on the mobile interface. Priority:
 *   1. The shopkeeper's configured shop country/currency (most specific).
 *   2. The `orivraa_geo_country` cookie set by middleware from Cloudflare /
 *      Vercel geo headers (city-level accuracy).
 *   3. A safe default (NP / NPR).
 *
 * Currency is derived from country using the same mapping the desktop site uses
 * so that the mobile UI shows the same numbers as the desktop dashboard.
 */

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  NP: "NPR",
  IN: "INR",
  US: "USD",
  UK: "GBP",
  GB: "GBP",
  AE: "AED",
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

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

export interface MarketRatesParams {
  country: string;
  currency: string;
}

/**
 * @param shop  Optional shop object (from useAuth) — its country/currency wins
 *              if present.
 */
export function getMobileMarketParams(shop?: {
  country?: string | null;
  currency?: string | null;
} | null): MarketRatesParams {
  const shopCountry = shop?.country?.toUpperCase();
  const shopCurrency = shop?.currency?.toUpperCase();
  if (shopCountry) {
    return {
      country: shopCountry,
      currency: shopCurrency || COUNTRY_TO_CURRENCY[shopCountry] || "USD",
    };
  }
  const geoCountry = (readCookie("orivraa_geo_country") || "").toUpperCase();
  if (geoCountry) {
    return {
      country: geoCountry,
      currency: COUNTRY_TO_CURRENCY[geoCountry] || "USD",
    };
  }
  return { country: "NP", currency: "NPR" };
}
