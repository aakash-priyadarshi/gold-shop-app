"use client";

import { useAuth } from "@/hooks/useAuth";
import { CURRENCIES, type CurrencyCode } from "@/store/preferences";
import { useMemo } from "react";

/**
 * Country → Currency mapping for seller shops.
 * Used on the seller dashboard to display prices in the shop's local currency.
 */
const COUNTRY_CURRENCY_MAP: Record<string, CurrencyCode> = {
  NP: "NPR",
  IN: "INR",
  AE: "AED",
  US: "USD",
  GB: "GBP",
  UK: "GBP",
  AU: "USD", // fallback
  CA: "USD", // fallback
  SG: "USD", // fallback
  EU: "EUR",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
};

/**
 * Country-specific placeholder config for seller dashboard forms.
 */
export const COUNTRY_PLACEHOLDERS: Record<
  string,
  {
    phone: string;
    city: string;
    state: string;
    pincode: string;
    pincodeLabel: string;
    addressExample: string;
    bankName: string;
    bankBranch: string;
    swiftLabel: string;
    minOrderExample: string;
    maxCodExample: string;
  }
> = {
  NP: {
    phone: "+977 98XXXXXXXX",
    city: "Kathmandu",
    state: "Bagmati",
    pincode: "44600",
    pincodeLabel: "Postal Code",
    addressExample: "New Road, Kathmandu",
    bankName: "Nepal Bank Limited",
    bankBranch: "New Road Branch",
    swiftLabel: "SWIFT/BIC Code",
    minOrderExample: "e.g., 10000",
    maxCodExample: "e.g., 100000",
  },
  IN: {
    phone: "+91 98XXXXXXXX",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    pincodeLabel: "PIN Code",
    addressExample: "Zaveri Bazaar, Mumbai",
    bankName: "State Bank of India",
    bankBranch: "Main Branch",
    swiftLabel: "IFSC Code",
    minOrderExample: "e.g., 5000",
    maxCodExample: "e.g., 200000",
  },
  AE: {
    phone: "+971 5X XXX XXXX",
    city: "Dubai",
    state: "Dubai",
    pincode: "",
    pincodeLabel: "P.O. Box",
    addressExample: "Gold Souk, Deira, Dubai",
    bankName: "Emirates NBD",
    bankBranch: "Main Branch",
    swiftLabel: "SWIFT Code",
    minOrderExample: "e.g., 500",
    maxCodExample: "e.g., 50000",
  },
  US: {
    phone: "+1 (XXX) XXX-XXXX",
    city: "New York",
    state: "New York",
    pincode: "10001",
    pincodeLabel: "ZIP Code",
    addressExample: "47th Street Diamond District, New York",
    bankName: "Chase Bank",
    bankBranch: "Main Branch",
    swiftLabel: "Routing Number",
    minOrderExample: "e.g., 100",
    maxCodExample: "e.g., 5000",
  },
  GB: {
    phone: "+44 7XXX XXXXXX",
    city: "London",
    state: "England",
    pincode: "EC1A 1BB",
    pincodeLabel: "Postcode",
    addressExample: "Hatton Garden, London",
    bankName: "Barclays",
    bankBranch: "City Branch",
    swiftLabel: "Sort Code",
    minOrderExample: "e.g., 100",
    maxCodExample: "e.g., 5000",
  },
};

// Fallback for unknown countries
const DEFAULT_PLACEHOLDERS = COUNTRY_PLACEHOLDERS.NP;

/**
 * Hook: Derives currency/symbol from active shop's country.
 * Updates automatically when seller switches shop via ShopSwitcher.
 */
export function useShopCurrency() {
  const { user } = useAuth();

  return useMemo(() => {
    const shopCountry = user?.shop?.country || "NP";
    const currencyCode =
      COUNTRY_CURRENCY_MAP[shopCountry] || ("NPR" as CurrencyCode);
    const currencyMeta = CURRENCIES[currencyCode] || CURRENCIES.NPR;
    const placeholders =
      COUNTRY_PLACEHOLDERS[shopCountry] || DEFAULT_PLACEHOLDERS;

    return {
      country: shopCountry,
      currencyCode,
      symbol: currencyMeta.symbol,
      locale: currencyMeta.locale,
      name: currencyMeta.name,
      placeholders,

      /**
       * Format a number as currency for the shop's locale
       */
      format: (amount: number, compact = false): string => {
        if (compact && amount >= 100000) {
          return `${currencyMeta.symbol} ${(amount / 100000).toFixed(1)}L`;
        }
        if (compact && amount >= 1000) {
          return `${currencyMeta.symbol} ${(amount / 1000).toFixed(1)}K`;
        }
        try {
          return new Intl.NumberFormat(currencyMeta.locale, {
            style: "currency",
            currency: currencyCode,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(amount);
        } catch {
          return `${currencyMeta.symbol} ${amount.toLocaleString()}`;
        }
      },
    };
  }, [user?.shop?.country]);
}
