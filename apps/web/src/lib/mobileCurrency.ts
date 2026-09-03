/**
 * Resolves the country + currency used for shopkeeper market-rate fetches.
 *
 * Seller tools must wait for the shop record. Visitor geo (`orivraa_geo_country`)
 * is never used here — a US VPN or Cloudflare header used to pin Pulse to USD
 * while invoices correctly used the shop's INR.
 */

import { resolveShopCurrency } from "@gold-shop/shared";

export interface MarketRatesParams {
  country: string;
  currency: string;
}

export type ShopMarketSource = {
  country?: string | null;
  currency?: string | null;
} | null | undefined;

/**
 * Shop country/currency only. Returns null until `shop.country` is known so
 * callers can skip the request instead of guessing a market.
 */
export function getShopMarketParams(
  shop?: ShopMarketSource,
): MarketRatesParams | null {
  const shopCountry = shop?.country?.trim().toUpperCase();
  if (!shopCountry) return null;
  return {
    country: shopCountry,
    currency: resolveShopCurrency(shop),
  };
}

/**
 * Alias for shopkeeper surfaces. Does not fall back to geo or NPR.
 */
export function getMobileMarketParams(
  shop?: ShopMarketSource,
): MarketRatesParams | null {
  return getShopMarketParams(shop);
}
