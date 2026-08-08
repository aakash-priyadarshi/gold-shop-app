/**
 * Market Configuration Types and Utilities
 * 
 * Supports geo-based market localisation for:
 * - NP (Nepal)
 * - IN (India)
 * - US (United States)
 * - UK (United Kingdom)
 * - EU (Europe)
 * - AE (UAE/Dubai)
 * - LK (Sri Lanka)
 */

export type MarketRegion = 'NP' | 'IN' | 'US' | 'UK' | 'EU' | 'AE' | 'LK';
export type CurrencyCode = 'NPR' | 'INR' | 'USD' | 'GBP' | 'EUR' | 'AED' | 'LKR';
export type PaymentMethod = 
  | 'CARD' 
  | 'BANK_TRANSFER' 
  | 'CASH' 
  | 'UPI' 
  | 'ESEWA' 
  | 'KHALTI' 
  | 'CONNECTIPS' 
  | 'PAYPAL' 
  | 'STRIPE'
  | 'PAID_AT_SHOP';

export type PaymentStatus = 'UNPAID' | 'PAID' | 'PAID_ON_SHOP' | 'PARTIAL' | 'REFUNDED';

export type DetailedOrderStatus = 
  | 'PLACED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'READY'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

// Currency configuration
export const CURRENCY_CONFIG: Record<CurrencyCode, {
  symbol: string;
  name: string;
  decimals: number;
  locale: string;
}> = {
  NPR: { symbol: 'Rs.', name: 'Nepalese Rupee', decimals: 2, locale: 'ne-NP' },
  INR: { symbol: '₹', name: 'Indian Rupee', decimals: 2, locale: 'en-IN' },
  USD: { symbol: '$', name: 'US Dollar', decimals: 2, locale: 'en-US' },
  GBP: { symbol: '£', name: 'British Pound', decimals: 2, locale: 'en-GB' },
  EUR: { symbol: '€', name: 'Euro', decimals: 2, locale: 'de-DE' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham', decimals: 2, locale: 'ar-AE' },
  LKR: { symbol: 'Rs.', name: 'Sri Lankan Rupee', decimals: 2, locale: 'si-LK' },
};

// Default currency for each market region
export const MARKET_DEFAULT_CURRENCY: Record<MarketRegion, CurrencyCode> = {
  NP: 'NPR',
  IN: 'INR',
  US: 'USD',
  UK: 'GBP',
  EU: 'EUR',
  AE: 'AED',
  LK: 'LKR',
};

// Supported currencies for each market (user can view prices in these)
export const MARKET_SUPPORTED_CURRENCIES: Record<MarketRegion, CurrencyCode[]> = {
  NP: ['NPR', 'USD', 'INR'],
  IN: ['INR', 'USD'],
  US: ['USD'],
  UK: ['GBP', 'USD', 'EUR'],
  EU: ['EUR', 'USD', 'GBP'],
  AE: ['AED', 'USD'],
  LK: ['LKR', 'USD', 'INR'],
};

// Payment methods supported per market
export const MARKET_PAYMENT_METHODS: Record<MarketRegion, PaymentMethod[]> = {
  NP: ['CARD', 'BANK_TRANSFER', 'CASH', 'ESEWA', 'KHALTI', 'CONNECTIPS', 'PAID_AT_SHOP'],
  IN: ['CARD', 'BANK_TRANSFER', 'CASH', 'UPI', 'PAID_AT_SHOP'],
  US: ['CARD', 'BANK_TRANSFER', 'PAYPAL', 'STRIPE', 'PAID_AT_SHOP'],
  UK: ['CARD', 'BANK_TRANSFER', 'PAYPAL', 'STRIPE', 'PAID_AT_SHOP'],
  EU: ['CARD', 'BANK_TRANSFER', 'PAYPAL', 'STRIPE', 'PAID_AT_SHOP'],
  AE: ['CARD', 'BANK_TRANSFER', 'CASH', 'PAID_AT_SHOP'],
  // Stripe is the hosted-card default until a Sri Lanka-specific gateway is added.
  LK: ['CARD', 'BANK_TRANSFER', 'STRIPE', 'CASH', 'PAID_AT_SHOP'],
};

// Country names
export const COUNTRY_NAMES: Record<MarketRegion, string> = {
  NP: 'Nepal',
  IN: 'India',
  US: 'United States',
  UK: 'United Kingdom',
  EU: 'Europe',
  AE: 'United Arab Emirates',
  LK: 'Sri Lanka',
};

// Price multiplier per region (for regional pricing adjustments)
export const MARKET_PRICE_MULTIPLIERS: Record<MarketRegion, number> = {
  US: 1.000,   // Base price
  UK: 1.010,
  EU: 1.010,
  AE: 1.020,
  IN: 1.100,
  NP: 1.245,
  // Transactional VAT belongs in MARKET_TAX_CONFIG/the tax engine. Keeping
  // this neutral prevents VAT being charged once as markup and again as tax.
  LK: 1.000,
};

// Tax configuration per market
export const MARKET_TAX_CONFIG: Record<MarketRegion, {
  name: string;
  rate: number;
}> = {
  NP: { name: 'VAT', rate: 13 },
  IN: { name: 'GST', rate: 3 },      // 3% GST on gold jewellery in India
  US: { name: 'Sales Tax', rate: 0 }, // Varies by state, default 0
  UK: { name: 'VAT', rate: 20 },
  EU: { name: 'VAT', rate: 19 },     // Varies by country, using average
  AE: { name: 'VAT', rate: 5 },
  LK: { name: 'VAT', rate: 18 },     // Sri Lanka VAT (admin-adjustable)
};

// Payment method display names
export const PAYMENT_METHOD_DISPLAY: Record<PaymentMethod, string> = {
  CARD: 'Card Payment',
  BANK_TRANSFER: 'Bank Transfer',
  CASH: 'Cash',
  UPI: 'UPI',
  ESEWA: 'eSewa',
  KHALTI: 'Khalti',
  CONNECTIPS: 'ConnectIPS',
  PAYPAL: 'PayPal',
  STRIPE: 'Stripe',
  PAID_AT_SHOP: 'Paid at Shop',
};

// Payment status display names
export const PAYMENT_STATUS_DISPLAY: Record<PaymentStatus, {
  label: string;
  color: string;
}> = {
  UNPAID: { label: 'Unpaid', color: 'yellow' },
  PAID: { label: 'Paid', color: 'green' },
  PAID_ON_SHOP: { label: 'Paid at Shop', color: 'blue' },
  PARTIAL: { label: 'Partial Payment', color: 'orange' },
  REFUNDED: { label: 'Refunded', color: 'red' },
};

// Order status display names
export const ORDER_STATUS_DISPLAY: Record<DetailedOrderStatus, {
  label: string;
  color: string;
  icon: string;
}> = {
  PLACED: { label: 'Order Placed', color: 'blue', icon: 'clipboard' },
  CONFIRMED: { label: 'Confirmed', color: 'indigo', icon: 'check-circle' },
  IN_PROGRESS: { label: 'In Progress', color: 'amber', icon: 'clock' },
  READY: { label: 'Ready', color: 'teal', icon: 'package' },
  SHIPPED: { label: 'Shipped', color: 'cyan', icon: 'truck' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'purple', icon: 'truck' },
  DELIVERED: { label: 'Delivered', color: 'green', icon: 'check-circle' },
  CANCELLED: { label: 'Cancelled', color: 'red', icon: 'x-circle' },
  REFUNDED: { label: 'Refunded', color: 'orange', icon: 'refresh' },
};

/**
 * Format a currency value for display
 */
export function formatCurrency(
  amount: number,
  currencyCode: CurrencyCode,
  options: {
    showSymbol?: boolean;
    compact?: boolean;
  } = {}
): string {
  const { showSymbol = true, compact = false } = options;
  const config = CURRENCY_CONFIG[currencyCode];
  
  if (!config) {
    return `${amount}`;
  }
  
  const formatter = new Intl.NumberFormat(config.locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: currencyCode,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
    notation: compact ? 'compact' : 'standard',
  });
  
  return formatter.format(amount);
}

/**
 * Get the default currency for a market
 */
export function getDefaultCurrency(marketRegion: MarketRegion): CurrencyCode {
  return MARKET_DEFAULT_CURRENCY[marketRegion] || 'USD';
}

/**
 * Whether a currency is valid for billing/display in a shop's market country.
 */
export function isCurrencySupportedForMarketCountry(
  country: string,
  currency: CurrencyCode,
): boolean {
  const market = mapCountryToMarket(country);
  return getSupportedCurrencies(market).includes(currency);
}

/**
 * Resolve the shop's base billing/display currency.
 * Prefers an explicit `shop.currency` when it is valid for `shop.country`;
 * otherwise falls back to the market default (e.g. IN → INR, LK → LKR).
 */
export function resolveShopCurrency(
  shop?: { country?: string | null; currency?: string | null } | null,
  fallback: CurrencyCode = 'NPR',
): CurrencyCode {
  const country = shop?.country?.trim();
  const explicit = shop?.currency?.trim().toUpperCase() as
    | CurrencyCode
    | undefined;

  if (country) {
    const market = mapCountryToMarket(country);
    const defaultCurrency = getDefaultCurrency(market);
    if (
      explicit &&
      explicit in CURRENCY_CONFIG &&
      isCurrencySupportedForMarketCountry(country, explicit)
    ) {
      return explicit;
    }
    return defaultCurrency;
  }

  if (explicit && explicit in CURRENCY_CONFIG) {
    return explicit;
  }

  return fallback;
}

/**
 * Get supported currencies for a market
 */
export function getSupportedCurrencies(marketRegion: MarketRegion): CurrencyCode[] {
  return MARKET_SUPPORTED_CURRENCIES[marketRegion] || ['USD'];
}

/**
 * Get payment methods available for a market
 */
export function getPaymentMethods(marketRegion: MarketRegion): PaymentMethod[] {
  return MARKET_PAYMENT_METHODS[marketRegion] || ['CARD', 'BANK_TRANSFER'];
}

/**
 * Check if a country code is a supported market
 */
export function isSupportedMarket(countryCode: string): countryCode is MarketRegion {
  return ['NP', 'IN', 'US', 'UK', 'EU', 'AE', 'LK'].includes(countryCode);
}

/**
 * Get the fallback market for unsupported countries
 */
export function getFallbackMarket(): MarketRegion {
  return 'US';
}

/**
 * Map a country code to a market region
 * Some countries map to broader regions (e.g., European countries → EU)
 */
export function mapCountryToMarket(countryCode: string): MarketRegion {
  const normalizedCountryCode = countryCode.trim().toUpperCase();

  if (normalizedCountryCode === 'GB') {
    return 'UK';
  }

  // Direct mappings
  if (isSupportedMarket(normalizedCountryCode)) {
    return normalizedCountryCode;
  }
  
  // European countries → EU
  const europeanCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH', 'NO'
  ];
  if (europeanCountries.includes(normalizedCountryCode)) {
    return 'EU';
  }
  
  // Middle East countries → AE
  const middleEastCountries = ['BH', 'KW', 'OM', 'QA', 'SA'];
  if (middleEastCountries.includes(normalizedCountryCode)) {
    return 'AE';
  }
  
  // Default fallback
  return getFallbackMarket();
}
