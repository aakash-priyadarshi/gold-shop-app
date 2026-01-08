/**
 * Tax Calculation Engine (DEPRECATED)
 * 
 * ⚠️  DEPRECATION WARNING ⚠️
 * This frontend tax engine is DEPRECATED and will be removed.
 * 
 * SECURITY CONCERN:
 * Tax calculations MUST be performed by the backend only.
 * Frontend tax calculations can be spoofed via API manipulation.
 * 
 * MIGRATION PATH:
 * Use the secure backend API instead:
 * - POST /api/pricing/tax/calculate
 * - GET /api/pricing/tax/summary?region=XX
 * 
 * See: apps/web/src/lib/tax/secure-tax-client.ts
 * 
 * The backend is the SINGLE SOURCE OF TRUTH for:
 * - Tax rules by region
 * - Tax rates (Nepal: 2% luxury on gold, 13% VAT on stones)
 * - Tax exemptions/waivers
 * - Component breakdown
 * 
 * @deprecated Use secure-tax-client.ts instead
 */

import {
  TaxCalculationInput,
  TaxResult,
  TaxRule,
  CartBreakdown,
  TaxLineItem,
  TaxBaseType,
  CountryTaxConfig,
} from './types';

/**
 * @deprecated Use calculateTaxSecure() from secure-tax-client.ts
 * 
 * Main tax calculation function
 */
export function calculateTax(input: TaxCalculationInput): TaxResult {
  const { country, cartBreakdown, taxConfig, isEstimate = true } = input;
  
  // DEPRECATION WARNING
  console.warn('[Tax Engine] ⚠️ DEPRECATED: Frontend tax calculation should be replaced with backend API call. Use /api/pricing/tax/calculate');
  
  console.log('[Tax Engine] calculateTax called with:', { country, cartBreakdown, isEstimate });
  
  // Get tax configuration for country
  const config = taxConfig || getDefaultTaxConfig(country);
  
  console.log('[Tax Engine] Tax config:', config);
  
  if (!config) {
    // No tax rules for this country
    console.warn('[Tax Engine] No tax config found for country:', country);
    return {
      lineItems: [],
      totalTax: 0,
      effectiveRate: 0,
      flags: {
        estimatedOnly: isEstimate,
      },
    };
  }
  
  // Check if config is currently effective
  if (!isConfigEffective(config)) {
    // Use fallback or previous rules
    return {
      lineItems: [],
      totalTax: 0,
      effectiveRate: 0,
      flags: {
        estimatedOnly: true,
        requiresAddressVerification: true,
      },
    };
  }
  
  const lineItems: TaxLineItem[] = [];
  const subtotal = calculateSubtotal(cartBreakdown);
  
  console.log('[Tax Engine] Subtotal:', subtotal);
  console.log('[Tax Engine] Number of rules:', config.rules.length);
  
  // Sort rules by priority (lower number = higher priority)
  const sortedRules = [...config.rules].sort((a, b) => 
    (a.priority || 999) - (b.priority || 999)
  );
  
  // Apply each rule
  for (const rule of sortedRules) {
    console.log('[Tax Engine] Checking rule:', rule.id, 'applyWhen:', rule.applyWhen);
    const shouldApply = shouldApplyRule(rule, cartBreakdown);
    console.log('[Tax Engine] Rule', rule.id, 'shouldApply:', shouldApply);
    if (shouldApply) {
      const lineItem = applyRule(rule, cartBreakdown);
      console.log('[Tax Engine] Rule', rule.id, 'generated line item:', lineItem);
      if (lineItem && lineItem.amount > 0) {
        lineItems.push(lineItem);
      }
    }
  }
  
  const totalTax = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const effectiveRate = subtotal > 0 ? totalTax / subtotal : 0;
  
  const result = {
    lineItems,
    totalTax,
    effectiveRate,
    flags: {
      estimatedOnly: isEstimate,
      requiresAddressVerification: country === 'NP' || country === 'IN',
    },
    breakdown: {
      taxableAmount: subtotal,
      nonTaxableAmount: 0,
    },
  };
  
  console.log('[Tax Engine] Final result:', result);
  
  return result;
}

/**
 * Check if rule conditions are met
 */
function shouldApplyRule(rule: TaxRule, breakdown: CartBreakdown): boolean {
  const { applyWhen } = rule;
  
  // Check each condition
  if (applyWhen.isJewellery !== undefined && breakdown.isJewellery !== applyWhen.isJewellery) {
    return false;
  }
  
  if (applyWhen.isGold !== undefined && breakdown.isGold !== applyWhen.isGold) {
    return false;
  }
  
  if (applyWhen.isSilver !== undefined && breakdown.isSilver !== applyWhen.isSilver) {
    return false;
  }
  
  if (applyWhen.isPlatinum !== undefined && breakdown.isPlatinum !== applyWhen.isPlatinum) {
    return false;
  }
  
  if (applyWhen.hasGemstones !== undefined && breakdown.hasGemstones !== applyWhen.hasGemstones) {
    return false;
  }
  
  if (applyWhen.hasDiamonds !== undefined && breakdown.hasDiamonds !== applyWhen.hasDiamonds) {
    return false;
  }
  
  const subtotal = calculateSubtotal(breakdown);
  if (applyWhen.minAmount !== undefined && subtotal < applyWhen.minAmount) {
    return false;
  }
  
  if (applyWhen.maxAmount !== undefined && subtotal > applyWhen.maxAmount) {
    return false;
  }
  
  return true;
}

/**
 * Apply a tax rule and calculate the tax line item
 */
function applyRule(rule: TaxRule, breakdown: CartBreakdown): TaxLineItem | null {
  const base = calculateTaxBase(rule, breakdown);
  
  if (base <= 0) {
    return null;
  }
  
  const amount = base * rule.rate;
  
  return {
    ruleId: rule.id,
    name: rule.name,
    displayName: rule.displayName,
    rate: rule.rate,
    base,
    applicableToAmount: base,
    amount,
    appliedTo: describeTaxBase(rule, breakdown),
  };
}

/**
 * Calculate the tax base for a rule
 */
function calculateTaxBase(rule: TaxRule, breakdown: CartBreakdown): number {
  const { base, vatMode, includeInBase } = rule;
  
  // Handle VAT mode for stone-studded jewellery
  if (vatMode && breakdown.hasGemstones) {
    if (vatMode === 'WHOLE_ITEM_IF_STUDDED') {
      // VAT on entire item
      return calculateSubtotalWithOptions(breakdown, includeInBase);
    } else if (vatMode === 'STONES_ONLY') {
      // VAT only on gemstone portion
      return breakdown.gemstoneSubtotal;
    } else if (vatMode === 'DISABLED') {
      return 0;
    }
  }
  
  // Handle array of base types
  if (Array.isArray(base)) {
    return base.reduce((sum, baseType) => {
      return sum + getBaseAmount(baseType, breakdown);
    }, 0);
  }
  
  // Handle single base type
  if (base === 'item_subtotal_excluding_tax') {
    return calculateSubtotalWithOptions(breakdown, includeInBase);
  }
  
  return getBaseAmount(base, breakdown);
}

/**
 * Get amount for a specific base type
 */
function getBaseAmount(baseType: TaxBaseType, breakdown: CartBreakdown): number {
  switch (baseType) {
    case 'metalSubtotal':
      return breakdown.metalSubtotal;
    case 'makingChargeSubtotal':
      return breakdown.makingChargeSubtotal;
    case 'finishSubtotal':
      return breakdown.finishSubtotal;
    case 'platingSubtotal':
      return breakdown.platingSubtotal;
    case 'gemstoneSubtotal':
      return breakdown.gemstoneSubtotal;
    case 'otherSubtotal':
      return breakdown.otherSubtotal || 0;
    default:
      return 0;
  }
}

/**
 * Calculate subtotal with inclusion options
 */
function calculateSubtotalWithOptions(
  breakdown: CartBreakdown,
  includeInBase?: { makingCharge?: boolean; plating?: boolean; finish?: boolean }
): number {
  let total = breakdown.metalSubtotal;
  
  // Always include gemstones and other
  total += breakdown.gemstoneSubtotal;
  total += breakdown.otherSubtotal || 0;
  
  // Conditional inclusions
  if (includeInBase?.makingCharge !== false) {
    total += breakdown.makingChargeSubtotal;
  }
  
  if (includeInBase?.plating !== false) {
    total += breakdown.platingSubtotal;
  }
  
  if (includeInBase?.finish !== false) {
    total += breakdown.finishSubtotal;
  }
  
  return total;
}

/**
 * Calculate total subtotal
 */
function calculateSubtotal(breakdown: CartBreakdown): number {
  return (
    breakdown.metalSubtotal +
    breakdown.makingChargeSubtotal +
    breakdown.finishSubtotal +
    breakdown.platingSubtotal +
    breakdown.gemstoneSubtotal +
    (breakdown.otherSubtotal || 0)
  );
}

/**
 * Describe what the tax was applied to
 */
function describeTaxBase(rule: TaxRule, breakdown: CartBreakdown): string {
  if (rule.vatMode === 'WHOLE_ITEM_IF_STUDDED' && breakdown.hasGemstones) {
    return 'Full item (stone-studded jewellery)';
  }
  
  if (rule.vatMode === 'STONES_ONLY' && breakdown.hasGemstones) {
    return 'Gemstone portion only';
  }
  
  if (rule.base === 'item_subtotal_excluding_tax') {
    return 'Item subtotal';
  }
  
  if (Array.isArray(rule.base)) {
    return rule.base.join(' + ');
  }
  
  return rule.base;
}

/**
 * Check if config is currently effective
 */
function isConfigEffective(config: CountryTaxConfig): boolean {
  const now = new Date();
  const effectiveFrom = new Date(config.effectiveFrom);
  
  if (now < effectiveFrom) {
    return false;
  }
  
  if (config.effectiveTo) {
    const effectiveTo = new Date(config.effectiveTo);
    if (now > effectiveTo) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get default tax configuration for a country
 */
function getDefaultTaxConfig(country: string): CountryTaxConfig | null {
  // This will be replaced by database lookup
  // For now, return hardcoded configs
  
  if (country === 'NP') {
    return getNepalTaxConfig();
  }
  
  if (country === 'IN') {
    return getIndiaTaxConfig();
  }
  
  // Fallback configs for other countries
  if (country === 'AE') {
    return getUaeTaxConfig();
  }
  
  if (country === 'UK') {
    return getUkTaxConfig();
  }
  
  if (country === 'EU') {
    return getEuTaxConfig();
  }
  
  if (country === 'US') {
    return getUsTaxConfig();
  }
  
  return null;
}

/**
 * Nepal Tax Configuration (FY 2025/26)
 */
export function getNepalTaxConfig(): CountryTaxConfig {
  return {
    country: 'NP',
    effectiveFrom: '2025-07-16',
    rules: [
      {
        id: 'NP_LUXURY_TAX',
        name: 'LUXURY_TAX',
        displayName: 'Luxury Tax',
        rate: 0.02,
        priority: 1,
        applyWhen: {
          isJewellery: true,
          // Note: Can be configured to require isGold: true if luxury tax only applies to gold
        },
        base: 'item_subtotal_excluding_tax',
        includeInBase: {
          makingCharge: true,
          plating: true,
          finish: true,
        },
      },
      {
        id: 'NP_VAT_STONE',
        name: 'VAT',
        displayName: 'VAT',
        rate: 0.13,
        priority: 2,
        applyWhen: {
          hasGemstones: true,
        },
        base: 'item_subtotal_excluding_tax', // Will be overridden by vatMode
        vatMode: 'WHOLE_ITEM_IF_STUDDED', // Default to conservative interpretation
        includeInBase: {
          makingCharge: true,
          plating: true,
          finish: true,
        },
      },
    ],
    metadata: {
      description: 'Nepal FY 2025/26 jewellery tax rules',
      source: 'Nepal Budget FY 2025/26',
      lastUpdated: '2025-07-16',
    },
  };
}

/**
 * India Tax Configuration
 */
export function getIndiaTaxConfig(): CountryTaxConfig {
  return {
    country: 'IN',
    effectiveFrom: '2024-01-01',
    rules: [
      {
        id: 'IN_GST_PRECIOUS_METAL',
        name: 'GST',
        displayName: 'GST',
        rate: 0.03,
        priority: 1,
        applyWhen: {
          isJewellery: true,
        },
        base: ['metalSubtotal', 'gemstoneSubtotal'],
      },
      {
        id: 'IN_GST_MAKING',
        name: 'GST',
        displayName: 'GST on Making',
        rate: 0.05,
        priority: 2,
        applyWhen: {
          isJewellery: true,
        },
        base: ['makingChargeSubtotal', 'finishSubtotal', 'platingSubtotal'],
      },
    ],
    metadata: {
      description: 'India GST for jewellery',
      source: 'GST Act',
      lastUpdated: '2024-01-01',
    },
  };
}

/**
 * UAE Tax Configuration
 */
export function getUaeTaxConfig(): CountryTaxConfig {
  return {
    country: 'AE',
    effectiveFrom: '2024-01-01',
    rules: [
      {
        id: 'AE_VAT',
        name: 'VAT',
        displayName: 'VAT 5%',
        rate: 0.05,
        priority: 1,
        applyWhen: {},
        base: 'item_subtotal_excluding_tax',
        includeInBase: {
          makingCharge: true,
          plating: true,
          finish: true,
        },
      },
    ],
    metadata: {
      description: 'UAE tax rates',
      source: 'UAE VAT Law',
      lastUpdated: '2024-01-01',
    },
  };
}

/**
 * UK Tax Configuration
 */
export function getUkTaxConfig(): CountryTaxConfig {
  return {
    country: 'UK',
    effectiveFrom: '2024-01-01',
    rules: [
      {
        id: 'UK_VAT',
        name: 'VAT',
        displayName: 'VAT (Investment gold exempt)',
        rate: 0.0,
        priority: 1,
        applyWhen: {},
        base: 'item_subtotal_excluding_tax',
        includeInBase: {
          makingCharge: false,
        },
      },
    ],
    metadata: {
      description: 'UK tax rates (investment gold VAT exempt)',
      source: 'UK VAT Legislation',
      lastUpdated: '2024-01-01',
    },
  };
}

/**
 * EU Tax Configuration
 */
export function getEuTaxConfig(): CountryTaxConfig {
  return {
    country: 'EU',
    effectiveFrom: '2024-01-01',
    rules: [
      {
        id: 'EU_VAT',
        name: 'VAT',
        displayName: 'VAT (Investment gold exempt)',
        rate: 0.0,
        priority: 1,
        applyWhen: {},
        base: 'item_subtotal_excluding_tax',
        includeInBase: {
          makingCharge: false,
        },
      },
    ],
    metadata: {
      description: 'EU tax rates (investment gold VAT exempt)',
      source: 'EU VAT Directive',
      lastUpdated: '2024-01-01',
    },
  };
}

/**
 * US Tax Configuration
 */
export function getUsTaxConfig(): CountryTaxConfig {
  return {
    country: 'US',
    effectiveFrom: '2024-01-01',
    rules: [],
    metadata: {
      description: 'US federal tax (state-specific taxes not implemented)',
      source: 'US Federal Tax Code',
      lastUpdated: '2024-01-01',
    },
  };
}

/**
 * Export all types and functions for use in other modules
 */
export type {
  TaxCalculationInput,
  TaxResult,
  TaxRule,
  CartBreakdown,
  TaxLineItem,
  TaxBaseType,
  CountryTaxConfig,
};
