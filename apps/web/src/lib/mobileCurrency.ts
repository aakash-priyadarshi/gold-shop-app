/**
 * Resolves the country + currency to use for fetching market rates / billing
 * on the mobile interface. Priority:
 *   1. Shop settings (`resolveShopCurrency` on country + currency).
 *   2. The `orivraa_geo_country` cookie from middleware geo headers.
 *   3. Safe default (NP / NPR).
 */

import { mapCountryToMarket, resolveShopCurrency } from "@gold-shop/shared";

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
  const shopCountry = shop?.country?.trim().toUpperCase();
  if (shopCountry) {
    return {
      country: shopCountry,
      currency: resolveShopCurrency(shop),
    };
  }
  const geoCountry = (readCookie("orivraa_geo_country") || "").toUpperCase();
  if (geoCountry) {
    const market = mapCountryToMarket(geoCountry);
    return {
      country: geoCountry,
      currency: resolveShopCurrency({ country: market }),
    };
  }
  return { country: "NP", currency: "NPR" };
}
