import {
  COUNTRIES,
  usePreferencesStore,
  type CountryCode,
  type CurrencyCode,
} from "@/store/preferences";
import { resolveShopCurrency } from "@gold-shop/shared";

const SHOP_TO_PREF_COUNTRY: Record<string, CountryCode> = {
  NP: "NP",
  IN: "IN",
  AE: "AE",
  GB: "UK",
  UK: "UK",
  US: "US",
  EU: "EU",
  LK: "LK",
  DE: "EU",
  FR: "EU",
  IT: "EU",
  ES: "EU",
};

/**
 * `/shops/my-shop/settings` returns `{ shop, user }`. Axios wraps that again
 * as `response.data`. Callers that read `payload.country` get undefined and
 * fall back to Nepal.
 */
export function unwrapShopSettings(payload: unknown): Record<string, any> {
  let current: any = payload;
  if (
    current &&
    typeof current === "object" &&
    "data" in current &&
    current.data &&
    typeof current.data === "object"
  ) {
    current = current.data;
  }
  if (
    current &&
    typeof current === "object" &&
    current.shop &&
    typeof current.shop === "object" &&
    !Array.isArray(current.shop) &&
    (current.shop.id || current.shop.country != null)
  ) {
    return current.shop;
  }
  if (current && typeof current === "object") return current;
  return {};
}

/** Keep the client preference store aligned with the shop's saved market. */
export function syncShopCountryToPreferences(shop: {
  country?: string | null;
  currency?: string | null;
}) {
  const code = shop.country?.trim().toUpperCase();
  if (!code) return;
  const prefCountry =
    SHOP_TO_PREF_COUNTRY[code] ??
    (COUNTRIES[code as CountryCode] ? (code as CountryCode) : undefined);
  if (!prefCountry || !COUNTRIES[prefCountry]) return;

  const resolvedCurrency = resolveShopCurrency({
    country: code,
    currency: shop.currency,
  }) as CurrencyCode;
  usePreferencesStore.setState({
    country: prefCountry,
    currency: resolvedCurrency,
  });

  if (typeof window !== "undefined") {
    localStorage.setItem("orivraa_user_country_choice", "shop");
    localStorage.setItem("orivraa_user_currency_choice", "shop");
  }
}

export type ShopPriceConversion = {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
};

/** Settings PATCH may return conversion metadata at the top level or nested. */
export function extractPriceConversion(
  payload: unknown,
): ShopPriceConversion | null {
  let current: any = payload;
  if (
    current &&
    typeof current === "object" &&
    "data" in current &&
    current.data &&
    typeof current.data === "object"
  ) {
    current = current.data;
  }
  const conv = current?.priceConversion;
  if (
    conv &&
    typeof conv.fromCurrency === "string" &&
    typeof conv.toCurrency === "string" &&
    typeof conv.rate === "number"
  ) {
    return {
      fromCurrency: conv.fromCurrency,
      toCurrency: conv.toCurrency,
      rate: conv.rate,
    };
  }
  return null;
}
