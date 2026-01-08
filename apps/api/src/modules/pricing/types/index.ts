/**
 * Pricing Types
 * All type definitions for the pricing engine
 */

// Extended to support all market regions and display currencies
export type SupportedCountry = 'IN' | 'NP' | 'AE' | 'UK' | 'EU' | 'US';
export type SupportedCurrency = 'INR' | 'NPR' | 'AED' | 'USD' | 'GBP' | 'EUR';

// Mapping from country to default currency (for market pricing)
export const COUNTRY_DEFAULT_CURRENCY: Record<SupportedCountry, SupportedCurrency> = {
  NP: 'NPR',
  IN: 'INR',
  AE: 'AED',
  UK: 'GBP',
  EU: 'EUR',
  US: 'USD',
};

// ═══════════════════════════════════════════
// FX TYPES
// ═══════════════════════════════════════════

export interface FxRates {
  usdToINR: number;
  usdToNPR: number;
  inrToNPR: number;
  source: 'api' | 'fallback';
  updatedAt: string;
}

export interface FxSanityCheck {
  isValid: boolean;
  expectedRatio: { min: number; max: number };
  actualRatio: number;
  message?: string;
}

// ═══════════════════════════════════════════
// MATERIAL TYPES
// ═══════════════════════════════════════════

export enum MaterialCode {
  // Base metals
  COPPER = 'COPPER',
  ZINC = 'ZINC',
  NICKEL = 'NICKEL',
  
  // Alloys
  BRASS = 'BRASS',
  BRONZE = 'BRONZE',
  BRASS_ALLOY = 'BRASS_ALLOY',
  BRONZE_ALLOY = 'BRONZE_ALLOY',
  PALLADIUM_ALLOY = 'PALLADIUM_ALLOY',
  SILVER_ALLOY = 'SILVER_ALLOY',
  
  // Special metals
  STAINLESS_STEEL_316L = 'STAINLESS_STEEL_316L',
  TITANIUM = 'TITANIUM',
  TUNGSTEN_CARBIDE = 'TUNGSTEN_CARBIDE',
  COBALT_CHROME = 'COBALT_CHROME',
}

export interface MaterialRate {
  materialCode: MaterialCode;
  ratePerGramUsd: number;
  ratePerGramLocal: number; // Converted to local currency
  currency: SupportedCurrency;
  source: 'seed' | 'manual' | 'calculated';
  isRestricted: boolean; // For Nickel
  updatedAt: string;
}

// ═══════════════════════════════════════════
// FINISH TYPES
// ═══════════════════════════════════════════

export enum FinishType {
  GOLD_PLATING = 'GOLD_PLATING',
  ROSE_GOLD_PLATING = 'ROSE_GOLD_PLATING',
  VERMEIL = 'VERMEIL',
  PVD_COATING = 'PVD_COATING',
  RHODIUM_PLATING = 'RHODIUM_PLATING',
  SILVER_PLATING = 'SILVER_PLATING',
  OXIDISED_FINISH = 'OXIDISED_FINISH',
  ENAMEL_COATING = 'ENAMEL_COATING',
}

export enum FinishTier {
  LIGHT = 'LIGHT',
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
}

export interface FinishPrice {
  finishType: FinishType;
  tier: FinishTier;
  flatFeeLocal: number;
  currency: SupportedCurrency;
  source: 'seed' | 'manual';
  updatedAt: string;
}

// ═══════════════════════════════════════════
// GEMSTONE TYPES
// ═══════════════════════════════════════════

export enum StoneType {
  DIAMOND = 'DIAMOND',
  MOISSANITE = 'MOISSANITE',
  CZ = 'CZ',
  RUBY = 'RUBY',
  SAPPHIRE = 'SAPPHIRE',
  EMERALD = 'EMERALD',
  PEARL = 'PEARL',
  SEMI_PRECIOUS = 'SEMI_PRECIOUS',
}

export enum DiamondOrigin {
  NATURAL = 'NATURAL',
  LAB = 'LAB',
}

export enum QualityTier {
  BUDGET = 'BUDGET',
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
}

export enum SettingType {
  PRONG = 'PRONG',
  BEZEL = 'BEZEL',
  PAVE = 'PAVE',
  CHANNEL = 'CHANNEL',
  HALO = 'HALO',
  FLUSH = 'FLUSH',
  TENSION = 'TENSION',
}

export interface GemstonePrice {
  stoneType: StoneType;
  origin?: DiamondOrigin; // Only for diamonds
  sizeUnit: 'MM' | 'CARAT';
  sizeMin: number;
  sizeMax: number;
  qualityTier: QualityTier;
  pricePerStone: number;
  currency: SupportedCurrency;
  source: 'seed' | 'manual';
  updatedAt: string;
}

export interface SettingPrice {
  settingType: SettingType;
  flatFeePerStone: number;
  currency: SupportedCurrency;
  source: 'seed' | 'manual';
  updatedAt: string;
}

// ═══════════════════════════════════════════
// ESTIMATE REQUEST/RESPONSE TYPES
// ═══════════════════════════════════════════

export enum BuildMethod {
  METHOD_A = 'METHOD_A', // Solid precious metal
  METHOD_B = 'METHOD_B', // Standard alloy
  METHOD_C = 'METHOD_C', // Core metal + finish
  METHOD_D = 'METHOD_D', // Multi-metal construction
}

export interface EstimateGemstone {
  stoneType: StoneType;
  origin?: DiamondOrigin;
  sizeMm?: number;
  caratWeight?: number;
  qualityTier: QualityTier;
  settingType: SettingType;
  count: number;
}

export interface EstimateFinish {
  finishType: FinishType;
  tier: FinishTier;
}

export interface MethodADetails {
  metal: string; // GOLD_24K, GOLD_22K, etc.
  totalWeightG: number;
}

export interface MethodBDetails {
  alloy: string; // BRASS, BRONZE, etc.
  totalWeightG: number;
}

export interface MethodCDetails {
  coreMetal: MaterialCode;
  totalWeightG: number;
  finish?: EstimateFinish;
}

export interface MethodDDetails {
  primaryMetal: string; // Precious metal
  secondaryMetal: MaterialCode; // Base/alloy
  primaryWeightG?: number;
  primaryPercentage?: number;
  secondaryWeightG?: number;
  totalWeightG: number;
  pattern: 'TOP_PLATE' | 'INLAY' | 'OUTER_SLEEVE' | 'TWO_TONE_SPLIT';
}

export interface EstimateRequest {
  country: SupportedCountry;
  currency: SupportedCurrency;
  jewelleryType?: string;
  buildMethod: BuildMethod;
  totalWeightG?: number;
  
  // Method-specific details
  methodA?: MethodADetails;
  methodB?: MethodBDetails;
  methodC?: MethodCDetails;
  methodD?: MethodDDetails;
  
  // Finish (for method A/B/D if plating desired)
  finish?: EstimateFinish;
  
  // Gemstones
  gemstones?: EstimateGemstone[];
  
  // Making charge (default 3%)
  makingChargePct?: number;
  
  // Shop override (optional)
  shopId?: string;
}

export interface EstimateLineItem {
  category: 'METAL' | 'FINISH' | 'GEMSTONE' | 'SETTING' | 'MAKING_CHARGE' | 'TAX';
  description: string;
  quantity?: number;
  unit?: string;
  ratePerUnit?: number;
  amount: number;
  currency: SupportedCurrency;
}

export interface EstimateWarning {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface EstimateResponse {
  country: SupportedCountry;
  currency: SupportedCurrency;
  buildMethod: BuildMethod;
  
  // Breakdown
  lineItems: EstimateLineItem[];
  
  // Totals
  subtotal: number;
  makingCharge: number;
  taxes: number;
  total: number;
  
  // Metadata
  warnings: EstimateWarning[];
  disclaimer: string;
  source: 'platform' | 'shop';
  ratesUpdatedAt: string;
}

// ═══════════════════════════════════════════
// COUNTRY PREMIUM CONFIG
// ═══════════════════════════════════════════

export interface CountryPremiumConfig {
  countryPremiumPct: Record<SupportedCountry, number>;
}

// Default: 0% premium (can be admin-adjusted)
export const DEFAULT_COUNTRY_PREMIUM: CountryPremiumConfig = {
  countryPremiumPct: {
    NP: 0.00,
    IN: 0.00,
    AE: 0.00,
    UK: 0.00,
    EU: 0.00,
    US: 0.00,
  },
};

/**
 * @deprecated Use BackendTaxEngineService for accurate tax calculations.
 * 
 * Legacy tax rates - DO NOT USE for new implementations.
 * Nepal actually has:
 * - 2% Luxury Tax on gold + making charges
 * - 13% VAT on gemstones/diamonds ONLY
 * 
 * Use /api/pricing/tax/calculate for correct calculations.
 */
export const TAX_RATES: Record<SupportedCountry, number> = {
  IN: 0.03,   // 3% GST on making charges
  NP: 0.13,   // DEPRECATED: Nepal has split taxes, see BackendTaxEngineService
  AE: 0.05,   // 5% VAT in UAE
  UK: 0.20,   // 20% VAT in UK
  EU: 0.19,   // ~19% average VAT in EU (varies by country)
  US: 0.00,   // No federal VAT in US (state sales tax handled separately)
};

/**
 * @deprecated Use BackendTaxEngineService for accurate tax display.
 */
export const TAX_NAMES: Record<SupportedCountry, string> = {
  IN: 'GST (3%)',
  NP: 'See breakdown', // UPDATED: Nepal has split taxes
  AE: 'VAT (5%)',
  UK: 'VAT (20%)',
  EU: 'VAT (19%)',
  US: 'Tax (0%)',
};
