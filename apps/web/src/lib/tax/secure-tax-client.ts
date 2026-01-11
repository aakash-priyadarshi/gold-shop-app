/**
 * Secure Tax Client (Backend-Authoritative)
 * 
 * CRITICAL SECURITY NOTE:
 * Frontend MUST NOT calculate taxes locally.
 * All tax calculations MUST be performed by the backend.
 * This client provides the interface to the backend tax API.
 * 
 * The backend is the SINGLE SOURCE OF TRUTH for:
 * - Tax rules by region
 * - Tax rates
 * - Tax exemptions/waivers
 * - Component breakdown (what gets taxed)
 * 
 * Why backend-only:
 * 1. Prevents API spoofing
 * 2. Ensures compliance with regional tax laws
 * 3. Centralizes business logic
 * 4. Enables audit trail
 */

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type TaxRegime = 
  | 'NP_2081_82_PLUS'  // Nepal FY 2081/82+
  | 'IN_GST_2024'      // India GST 2024
  | 'AE_VAT_2024'      // UAE VAT
  | 'UK_VAT_2024'      // UK VAT
  | 'EU_VAT_2024'      // EU VAT
  | 'US_SALES_TAX';    // US (state-based)

export type TaxableComponentCategory = 
  | 'GOLD_METAL' 
  | 'GOLD_MAKING' 
  | 'SILVER_METAL' 
  | 'SILVER_MAKING' 
  | 'OTHER_METAL' 
  | 'OTHER_MAKING' 
  | 'GEMSTONE' 
  | 'DIAMOND' 
  | 'FINISH' 
  | 'PLATING' 
  | 'OTHER';

export interface TaxableComponent {
  category: TaxableComponentCategory;
  amount: number;
  description: string;
}

export interface TaxLineItem {
  type: string;           // LUXURY_TAX, VAT, GST, SALES_TAX
  name: string;           // Display name
  rate: number;           // 0.02 for 2%
  baseAmount: number;     // Amount tax was calculated on
  taxAmount: number;      // Calculated tax
  category: string;       // Which component(s) it applies to
  description: string;    // Human-readable explanation
}

export interface ComponentBreakdown {
  goldMetalValue: number;
  goldMakingCharges: number;
  silverMetalValue: number;
  silverMakingCharges: number;
  otherMetalValue: number;
  otherMakingCharges: number;
  diamondValue: number;
  gemstoneValue: number;
  totalStoneValue: number;
  finishValue: number;
  platingValue: number;
  otherValue: number;
  subtotalBeforeTax: number;
}

export interface TaxCalculationResult {
  region: string;
  taxRegime: TaxRegime;
  components: ComponentBreakdown;
  taxes: TaxLineItem[];
  taxTotal: number;
  totalPayable: number;
  meta: {
    taxRegime: TaxRegime;
    source: 'SYSTEM_DEFAULT' | 'DB_CONFIG';
    waiverApplied: string[];
    notes?: string;
    calculatedAt: string;
  };
}

export interface TaxCalculationRequest {
  region: string;
  stateCode?: string;
  components: TaxableComponent[];
  isJewellery?: boolean;
  isInvestmentBullion?: boolean;
  isOldGoldExchange?: boolean;
}

export interface TaxSummary {
  regime: TaxRegime;
  taxes: {
    type: string;
    name: string;
    rate: number;
    appliesTo: string;
  }[];
  notes?: string;
}

// ═══════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════

import { getApiUrl } from '@/lib/api';
const API_BASE_URL = getApiUrl();

/**
 * Calculate taxes via backend API
 * 
 * This is the ONLY way taxes should be calculated.
 * Frontend must NOT perform local tax calculations.
 */
export async function calculateTaxSecure(
  request: TaxCalculationRequest
): Promise<TaxCalculationResult> {
  const response = await fetch(`${API_BASE_URL}/pricing/tax/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Tax calculation failed: ${error.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Get tax summary for a region (for display/info only)
 */
export async function getTaxSummary(region: string): Promise<TaxSummary> {
  const response = await fetch(
    `${API_BASE_URL}/pricing/tax/summary?region=${encodeURIComponent(region)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Failed to get tax summary: ${error.message || response.statusText}`);
  }

  return response.json();
}

// ═══════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════

/**
 * Build tax components from estimate breakdown
 * 
 * This helper converts frontend estimate data into the format
 * required by the backend tax API.
 */
export function buildTaxComponents(options: {
  metalCost: number;
  metalType?: 'gold' | 'silver' | 'other';
  makingCharge: number;
  gemstoneCost: number;
  diamondCost?: number;
  platingCost: number;
  finishCost: number;
}): TaxableComponent[] {
  const components: TaxableComponent[] = [];

  // Metal cost (determine category based on type)
  if (options.metalCost > 0) {
    let metalCategory: TaxableComponentCategory = 'OTHER_METAL';
    let metalDesc = 'Other metal';
    
    if (options.metalType === 'gold') {
      metalCategory = 'GOLD_METAL';
      metalDesc = 'Gold metal value';
    } else if (options.metalType === 'silver') {
      metalCategory = 'SILVER_METAL';
      metalDesc = 'Silver metal value';
    }

    components.push({
      category: metalCategory,
      amount: options.metalCost,
      description: metalDesc,
    });
  }

  // Making charge (same metal type)
  if (options.makingCharge > 0) {
    let makingCategory: TaxableComponentCategory = 'OTHER_MAKING';
    let makingDesc = 'Making charges';
    
    if (options.metalType === 'gold') {
      makingCategory = 'GOLD_MAKING';
      makingDesc = 'Gold making charges';
    } else if (options.metalType === 'silver') {
      makingCategory = 'SILVER_MAKING';
      makingDesc = 'Silver making charges';
    }

    components.push({
      category: makingCategory,
      amount: options.makingCharge,
      description: makingDesc,
    });
  }

  // Diamonds (separate from other gemstones for tax purposes)
  if (options.diamondCost && options.diamondCost > 0) {
    components.push({
      category: 'DIAMOND',
      amount: options.diamondCost,
      description: 'Diamond value',
    });
  }

  // Gemstones (excluding diamonds)
  if (options.gemstoneCost > 0) {
    const nonDiamondGemstones = options.gemstoneCost - (options.diamondCost || 0);
    if (nonDiamondGemstones > 0) {
      components.push({
        category: 'GEMSTONE',
        amount: nonDiamondGemstones,
        description: 'Gemstone value',
      });
    }
  }

  // Plating
  if (options.platingCost > 0) {
    components.push({
      category: 'PLATING',
      amount: options.platingCost,
      description: 'Plating cost',
    });
  }

  // Finish
  if (options.finishCost > 0) {
    components.push({
      category: 'FINISH',
      amount: options.finishCost,
      description: 'Finish cost',
    });
  }

  return components;
}

/**
 * Determine metal type from metal code
 */
export function getMetalTypeFromCode(metalCode?: string): 'gold' | 'silver' | 'other' {
  if (!metalCode) return 'other';
  const upper = metalCode.toUpperCase();
  if (upper.includes('GOLD')) return 'gold';
  if (upper.includes('SILVER')) return 'silver';
  return 'other';
}

// ═══════════════════════════════════════════
// DISPLAY FORMATTERS
// ═══════════════════════════════════════════

/**
 * Format tax line item for display
 */
export function formatTaxLineItem(
  item: TaxLineItem,
  currencySymbol: string = '₨'
): { label: string; amount: string; details: string } {
  return {
    label: item.name,
    amount: `${currencySymbol}${item.taxAmount.toLocaleString()}`,
    details: `${(item.rate * 100).toFixed(0)}% on ${currencySymbol}${item.baseAmount.toLocaleString()} (${item.description})`,
  };
}

/**
 * Format tax regime for display
 */
export function formatTaxRegime(regime: TaxRegime): string {
  const regimeNames: Record<TaxRegime, string> = {
    'NP_2081_82_PLUS': 'Nepal FY 2081/82+',
    'IN_GST_2024': 'India GST 2024',
    'AE_VAT_2024': 'UAE VAT 2024',
    'UK_VAT_2024': 'UK VAT 2024',
    'EU_VAT_2024': 'EU VAT 2024',
    'US_SALES_TAX': 'US Sales Tax',
  };
  return regimeNames[regime] || regime;
}
