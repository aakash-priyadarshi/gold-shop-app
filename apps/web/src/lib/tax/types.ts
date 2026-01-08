/**
 * Tax Engine Types
 * 
 * Rule-based, country-aware tax calculation system
 */

export type TaxRuleCondition = {
  isJewellery?: boolean;
  isGold?: boolean;
  isSilver?: boolean;
  isPlatinum?: boolean;
  hasGemstones?: boolean;
  hasDiamonds?: boolean;
  minAmount?: number;
  maxAmount?: number;
};

export type VatMode = 
  | 'WHOLE_ITEM_IF_STUDDED'  // VAT on entire item when gemstones present
  | 'STONES_ONLY'             // VAT only on gemstone portion
  | 'DISABLED';               // No VAT

export type TaxBaseType = 
  | 'item_subtotal_excluding_tax'
  | 'metalSubtotal'
  | 'makingChargeSubtotal'
  | 'finishSubtotal'
  | 'platingSubtotal'
  | 'gemstoneSubtotal'
  | 'otherSubtotal';

export interface TaxRule {
  id: string;
  name: string;
  displayName: string;
  rate: number;
  applyWhen: TaxRuleCondition;
  base: TaxBaseType | TaxBaseType[];
  vatMode?: VatMode;
  priority?: number; // Lower number = higher priority
  includeInBase?: {
    makingCharge?: boolean;
    plating?: boolean;
    finish?: boolean;
  };
}

export interface CountryTaxConfig {
  country: string;
  effectiveFrom: string;
  effectiveTo?: string;
  rules: TaxRule[];
  metadata?: {
    description?: string;
    source?: string;
    lastUpdated?: string;
  };
}

export interface CartBreakdown {
  metalSubtotal: number;
  alloyPremiumSubtotal: number;      // Method B alloy premium
  baseMetalSubtotal: number;         // Method C base metal
  makingChargeSubtotal: number;
  finishSubtotal: number;
  platingSubtotal: number;           // Method C plating
  gemstoneSubtotal: number;
  otherSubtotal?: number;
  total: number;
  
  // Flags for tax rule matching
  hasGemstones: boolean;
  hasDiamonds?: boolean;
  isGold: boolean;
  isSilver?: boolean;
  isPlatinum?: boolean;
  isJewellery: boolean;
}

export interface TaxLineItem {
  ruleId: string;
  name: string;
  displayName: string;
  rate: number;
  base: number;
  applicableToAmount: number;    // Amount that tax is calculated on
  amount: number;                 // Final tax amount
  appliedTo?: string;             // Description of what it was applied to
}

export interface TaxResult {
  lineItems: TaxLineItem[];
  totalTax: number;
  effectiveRate: number; // Total tax / subtotal
  flags?: {
    estimatedOnly?: boolean;
    requiresAddressVerification?: boolean;
  };
  breakdown?: {
    taxableAmount: number;
    nonTaxableAmount: number;
  };
}

export interface TaxCalculationInput {
  country: string;
  cartBreakdown: CartBreakdown;
  taxConfig?: CountryTaxConfig;
  isEstimate?: boolean; // If true, add disclaimer
}
