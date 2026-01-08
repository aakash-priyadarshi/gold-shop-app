/**
 * Backend Tax Engine Service
 * 
 * AUTHORITATIVE source of truth for all tax calculations.
 * Frontend MUST NOT calculate taxes - only display backend values.
 * 
 * Key principles:
 * 1. Backend is the single source of truth
 * 2. Region determines tax rules, currency is only for display
 * 3. Taxes are calculated on region-currency amounts, then converted
 * 4. All calculations are auditable and reproducible
 * 5. Shopkeepers cannot override tax rules (system-controlled)
 * 
 * Supported regions:
 * - NP (Nepal): 2% luxury tax on gold + 13% VAT on stones only
 * - IN (India): 3% GST on metal, 5% GST on making charges
 * - AE (UAE): 5% VAT on all components
 * - UK: 20% VAT (investment gold exempt)
 * - EU: 19-21% VAT (varies, default 20%)
 * - US: 0% federal (state taxes TBD)
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MarketRegion } from '../../market-rates/types';

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

export interface TaxableComponent {
  category: 'GOLD_METAL' | 'GOLD_MAKING' | 'SILVER_METAL' | 'SILVER_MAKING' | 
            'OTHER_METAL' | 'OTHER_MAKING' | 'GEMSTONE' | 'DIAMOND' | 
            'FINISH' | 'PLATING' | 'OTHER';
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
  // Gold components (for NP luxury tax)
  goldMetalValue: number;
  goldMakingCharges: number;
  
  // Silver components
  silverMetalValue: number;
  silverMakingCharges: number;
  
  // Other metal components
  otherMetalValue: number;
  otherMakingCharges: number;
  
  // Stone components (for NP VAT)
  diamondValue: number;
  gemstoneValue: number;
  totalStoneValue: number;
  
  // Other components
  finishValue: number;
  platingValue: number;
  otherValue: number;
  
  // Totals
  subtotalBeforeTax: number;
}

export interface TaxCalculationRequest {
  region: MarketRegion;
  stateCode?: string;  // For US state taxes
  components: TaxableComponent[];
  
  // Flags
  isJewellery?: boolean;      // Default true
  isInvestmentBullion?: boolean;  // For UK VAT exemption
  isOldGoldExchange?: boolean;    // For Nepal waiver
  
  // Override (admin only)
  forceWaiver?: {
    npLuxuryTax?: boolean;
  };
}

export interface TaxCalculationResult {
  region: MarketRegion;
  taxRegime: TaxRegime;
  
  // Component breakdown
  components: ComponentBreakdown;
  
  // Tax line items
  taxes: TaxLineItem[];
  
  // Totals
  taxTotal: number;
  totalPayable: number;
  
  // Metadata
  meta: {
    taxRegime: TaxRegime;
    source: 'SYSTEM_DEFAULT' | 'DB_CONFIG';
    waiverApplied: string[];
    notes?: string;
    calculatedAt: string;
  };
}

// ═══════════════════════════════════════════
// DEFAULT TAX RULES BY REGION
// ═══════════════════════════════════════════

/**
 * Nepal Tax Rules (FY 2081/82+)
 * 
 * CRITICAL: These are the CORRECT Nepal rules:
 * 
 * A) Luxury Tax (2%):
 *    - Rate: 2%
 *    - Applies to: Gold metal value + Gold making charges ONLY
 *    - Does NOT apply to: Silver, diamonds, gemstones
 * 
 * B) VAT (13%):
 *    - Rate: 13%
 *    - Applies to: Diamond and gemstone value ONLY
 *    - Does NOT apply to: Gold metal, gold making charges
 * 
 * C) Customs duty (~10%):
 *    - NOT shown as checkout line item
 *    - Embedded in market premium for NP region
 */
interface NepalTaxConfig {
  luxuryTaxRate: number;
  vatRate: number;
  luxuryTaxAppliesTo: ('GOLD_METAL' | 'GOLD_MAKING')[];
  vatAppliesTo: ('GEMSTONE' | 'DIAMOND')[];
  oldGoldExchangeWaiver: boolean;
}

const NEPAL_TAX_CONFIG: NepalTaxConfig = {
  luxuryTaxRate: 0.02,  // 2%
  vatRate: 0.13,        // 13%
  luxuryTaxAppliesTo: ['GOLD_METAL', 'GOLD_MAKING'],
  vatAppliesTo: ['GEMSTONE', 'DIAMOND'],
  oldGoldExchangeWaiver: false,
};

/**
 * India Tax Rules (GST 2024)
 * 
 * A) GST on precious metal (3%):
 *    - Applies to: Gold, silver, platinum metal value
 * 
 * B) GST on making charges (5%):
 *    - Applies to: Making charges (service component)
 */
interface IndiaTaxConfig {
  gstOnMetal: number;
  gstOnMaking: number;
}

const INDIA_TAX_CONFIG: IndiaTaxConfig = {
  gstOnMetal: 0.03,   // 3%
  gstOnMaking: 0.05,  // 5%
};

/**
 * UAE Tax Rules (VAT 2024)
 * 
 * A) VAT (5%):
 *    - Applies to: All components (metal, making, stones)
 */
interface UaeTaxConfig {
  vatRate: number;
}

const UAE_TAX_CONFIG: UaeTaxConfig = {
  vatRate: 0.05,  // 5%
};

/**
 * UK Tax Rules (VAT 2024)
 * 
 * A) VAT (20%):
 *    - Applies to: All jewellery components
 *    - Investment-grade gold/silver: EXEMPT
 */
interface UkTaxConfig {
  vatRate: number;
  investmentGoldExempt: boolean;
}

const UK_TAX_CONFIG: UkTaxConfig = {
  vatRate: 0.20,  // 20%
  investmentGoldExempt: true,
};

/**
 * EU Tax Rules (VAT 2024)
 * 
 * A) VAT (19-21%, default 20%):
 *    - Applies to: All components
 */
interface EuTaxConfig {
  vatRate: number;
}

const EU_TAX_CONFIG: EuTaxConfig = {
  vatRate: 0.20,  // 20% default
};

/**
 * US Tax Rules
 * 
 * A) No federal VAT
 * B) State sales tax: TBD (extension point)
 */
interface UsTaxConfig {
  federalRate: number;
  stateTaxEnabled: boolean;
}

const US_TAX_CONFIG: UsTaxConfig = {
  federalRate: 0,
  stateTaxEnabled: false,
};

// US State tax rates (partial list)
const US_STATE_TAX_RATES: Record<string, number> = {
  CA: 0.0725,  // California
  NY: 0.08,    // New York
  TX: 0.0625,  // Texas
  FL: 0.06,    // Florida
  OR: 0.00,    // Oregon (no sales tax)
  MT: 0.00,    // Montana (no sales tax)
  NH: 0.00,    // New Hampshire (no sales tax)
  DE: 0.00,    // Delaware (no sales tax)
};

// ═══════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════

@Injectable()
export class BackendTaxEngineService {
  private readonly logger = new Logger(BackendTaxEngineService.name);

  // Cache for DB-configured rules
  private rulesCache: Map<string, any> = new Map();
  private cacheExpiresAt: Date | null = null;
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Main tax calculation method
   * 
   * IMPORTANT: This is the ONLY place taxes should be calculated.
   * Frontend must NOT perform any tax calculations.
   */
  async calculateTax(request: TaxCalculationRequest): Promise<TaxCalculationResult> {
    const { region, stateCode, components, isJewellery = true, isInvestmentBullion = false } = request;
    
    this.logger.debug(`Calculating tax for region=${region}, components=${components.length}`);

    // Build component breakdown
    const breakdown = this.buildComponentBreakdown(components);
    
    // Calculate taxes based on region
    let taxes: TaxLineItem[] = [];
    let taxRegime: TaxRegime;
    const waiverApplied: string[] = [];

    switch (region) {
      case 'NP':
        taxRegime = 'NP_2081_82_PLUS';
        taxes = this.calculateNepalTax(breakdown, request, waiverApplied);
        break;
      
      case 'IN':
        taxRegime = 'IN_GST_2024';
        taxes = this.calculateIndiaTax(breakdown);
        break;
      
      case 'AE':
        taxRegime = 'AE_VAT_2024';
        taxes = this.calculateUaeTax(breakdown);
        break;
      
      case 'UK':
        taxRegime = 'UK_VAT_2024';
        taxes = this.calculateUkTax(breakdown, isInvestmentBullion);
        break;
      
      case 'EU':
        taxRegime = 'EU_VAT_2024';
        taxes = this.calculateEuTax(breakdown);
        break;
      
      case 'US':
        taxRegime = 'US_SALES_TAX';
        taxes = this.calculateUsTax(breakdown, stateCode);
        break;
      
      default:
        taxRegime = 'US_SALES_TAX';
        taxes = [];
    }

    const taxTotal = taxes.reduce((sum, t) => sum + t.taxAmount, 0);
    const totalPayable = breakdown.subtotalBeforeTax + taxTotal;

    return {
      region,
      taxRegime,
      components: breakdown,
      taxes,
      taxTotal,
      totalPayable,
      meta: {
        taxRegime,
        source: 'SYSTEM_DEFAULT',
        waiverApplied,
        calculatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Build component breakdown from input components
   */
  private buildComponentBreakdown(components: TaxableComponent[]): ComponentBreakdown {
    const breakdown: ComponentBreakdown = {
      goldMetalValue: 0,
      goldMakingCharges: 0,
      silverMetalValue: 0,
      silverMakingCharges: 0,
      otherMetalValue: 0,
      otherMakingCharges: 0,
      diamondValue: 0,
      gemstoneValue: 0,
      totalStoneValue: 0,
      finishValue: 0,
      platingValue: 0,
      otherValue: 0,
      subtotalBeforeTax: 0,
    };

    for (const component of components) {
      switch (component.category) {
        case 'GOLD_METAL':
          breakdown.goldMetalValue += component.amount;
          break;
        case 'GOLD_MAKING':
          breakdown.goldMakingCharges += component.amount;
          break;
        case 'SILVER_METAL':
          breakdown.silverMetalValue += component.amount;
          break;
        case 'SILVER_MAKING':
          breakdown.silverMakingCharges += component.amount;
          break;
        case 'OTHER_METAL':
          breakdown.otherMetalValue += component.amount;
          break;
        case 'OTHER_MAKING':
          breakdown.otherMakingCharges += component.amount;
          break;
        case 'DIAMOND':
          breakdown.diamondValue += component.amount;
          break;
        case 'GEMSTONE':
          breakdown.gemstoneValue += component.amount;
          break;
        case 'FINISH':
          breakdown.finishValue += component.amount;
          break;
        case 'PLATING':
          breakdown.platingValue += component.amount;
          break;
        case 'OTHER':
          breakdown.otherValue += component.amount;
          break;
      }
    }

    // Calculate total stone value
    breakdown.totalStoneValue = breakdown.diamondValue + breakdown.gemstoneValue;

    // Calculate subtotal
    breakdown.subtotalBeforeTax = 
      breakdown.goldMetalValue +
      breakdown.goldMakingCharges +
      breakdown.silverMetalValue +
      breakdown.silverMakingCharges +
      breakdown.otherMetalValue +
      breakdown.otherMakingCharges +
      breakdown.totalStoneValue +
      breakdown.finishValue +
      breakdown.platingValue +
      breakdown.otherValue;

    return breakdown;
  }

  /**
   * Calculate Nepal taxes (UPDATED RULES)
   * 
   * A) Luxury Tax (2%): Gold metal + Gold making ONLY
   * B) VAT (13%): Diamonds + Gemstones ONLY
   */
  private calculateNepalTax(
    breakdown: ComponentBreakdown,
    request: TaxCalculationRequest,
    waiverApplied: string[],
  ): TaxLineItem[] {
    const taxes: TaxLineItem[] = [];

    // Check for old gold exchange waiver
    const applyLuxuryTaxWaiver = request.forceWaiver?.npLuxuryTax || 
                                  (request.isOldGoldExchange && NEPAL_TAX_CONFIG.oldGoldExchangeWaiver);

    // A) Luxury Tax on Gold (2%)
    const goldBase = breakdown.goldMetalValue + breakdown.goldMakingCharges;
    if (goldBase > 0) {
      if (applyLuxuryTaxWaiver) {
        waiverApplied.push('NP_LUXURY_TAX');
        taxes.push({
          type: 'LUXURY_TAX',
          name: 'Luxury Tax (Waived)',
          rate: 0,
          baseAmount: goldBase,
          taxAmount: 0,
          category: 'GOLD',
          description: 'Luxury tax waived (old gold exchange)',
        });
      } else {
        const luxuryTax = goldBase * NEPAL_TAX_CONFIG.luxuryTaxRate;
        taxes.push({
          type: 'LUXURY_TAX',
          name: 'Luxury Tax',
          rate: NEPAL_TAX_CONFIG.luxuryTaxRate,
          baseAmount: goldBase,
          taxAmount: luxuryTax,
          category: 'GOLD',
          description: `${(NEPAL_TAX_CONFIG.luxuryTaxRate * 100).toFixed(0)}% on gold value + making`,
        });
      }
    }

    // B) VAT on Stones only (13%)
    const stoneBase = breakdown.totalStoneValue;
    if (stoneBase > 0) {
      const vat = stoneBase * NEPAL_TAX_CONFIG.vatRate;
      taxes.push({
        type: 'VAT',
        name: 'VAT',
        rate: NEPAL_TAX_CONFIG.vatRate,
        baseAmount: stoneBase,
        taxAmount: vat,
        category: 'GEMSTONE',
        description: `${(NEPAL_TAX_CONFIG.vatRate * 100).toFixed(0)}% on diamonds & gemstones`,
      });
    }

    return taxes;
  }

  /**
   * Calculate India taxes (GST)
   * 
   * A) GST on Metal (3%)
   * B) GST on Making (5%)
   */
  private calculateIndiaTax(breakdown: ComponentBreakdown): TaxLineItem[] {
    const taxes: TaxLineItem[] = [];

    // GST on metal (3%)
    const metalBase = breakdown.goldMetalValue + breakdown.silverMetalValue + breakdown.otherMetalValue;
    if (metalBase > 0) {
      const gst = metalBase * INDIA_TAX_CONFIG.gstOnMetal;
      taxes.push({
        type: 'GST',
        name: 'GST on Metal',
        rate: INDIA_TAX_CONFIG.gstOnMetal,
        baseAmount: metalBase,
        taxAmount: gst,
        category: 'PRECIOUS_METAL',
        description: `${(INDIA_TAX_CONFIG.gstOnMetal * 100).toFixed(0)}% GST on precious metal`,
      });
    }

    // GST on making charges (5%)
    const makingBase = breakdown.goldMakingCharges + breakdown.silverMakingCharges + breakdown.otherMakingCharges;
    if (makingBase > 0) {
      const gst = makingBase * INDIA_TAX_CONFIG.gstOnMaking;
      taxes.push({
        type: 'GST',
        name: 'GST on Making',
        rate: INDIA_TAX_CONFIG.gstOnMaking,
        baseAmount: makingBase,
        taxAmount: gst,
        category: 'MAKING_CHARGE',
        description: `${(INDIA_TAX_CONFIG.gstOnMaking * 100).toFixed(0)}% GST on making charges`,
      });
    }

    // GST on stones (3%)
    if (breakdown.totalStoneValue > 0) {
      const gst = breakdown.totalStoneValue * INDIA_TAX_CONFIG.gstOnMetal;
      taxes.push({
        type: 'GST',
        name: 'GST on Stones',
        rate: INDIA_TAX_CONFIG.gstOnMetal,
        baseAmount: breakdown.totalStoneValue,
        taxAmount: gst,
        category: 'GEMSTONE',
        description: `${(INDIA_TAX_CONFIG.gstOnMetal * 100).toFixed(0)}% GST on gemstones`,
      });
    }

    return taxes;
  }

  /**
   * Calculate UAE taxes (VAT 5%)
   */
  private calculateUaeTax(breakdown: ComponentBreakdown): TaxLineItem[] {
    const taxes: TaxLineItem[] = [];

    const totalBase = breakdown.subtotalBeforeTax;
    if (totalBase > 0) {
      const vat = totalBase * UAE_TAX_CONFIG.vatRate;
      taxes.push({
        type: 'VAT',
        name: 'VAT',
        rate: UAE_TAX_CONFIG.vatRate,
        baseAmount: totalBase,
        taxAmount: vat,
        category: 'ALL',
        description: `${(UAE_TAX_CONFIG.vatRate * 100).toFixed(0)}% VAT`,
      });
    }

    return taxes;
  }

  /**
   * Calculate UK taxes (VAT 20%, investment gold exempt)
   */
  private calculateUkTax(breakdown: ComponentBreakdown, isInvestmentBullion: boolean): TaxLineItem[] {
    const taxes: TaxLineItem[] = [];

    // Investment gold is VAT exempt
    if (isInvestmentBullion) {
      return [{
        type: 'VAT',
        name: 'VAT (Exempt)',
        rate: 0,
        baseAmount: breakdown.subtotalBeforeTax,
        taxAmount: 0,
        category: 'ALL',
        description: 'Investment gold - VAT exempt',
      }];
    }

    const totalBase = breakdown.subtotalBeforeTax;
    if (totalBase > 0) {
      const vat = totalBase * UK_TAX_CONFIG.vatRate;
      taxes.push({
        type: 'VAT',
        name: 'VAT',
        rate: UK_TAX_CONFIG.vatRate,
        baseAmount: totalBase,
        taxAmount: vat,
        category: 'ALL',
        description: `${(UK_TAX_CONFIG.vatRate * 100).toFixed(0)}% VAT`,
      });
    }

    return taxes;
  }

  /**
   * Calculate EU taxes (VAT ~20%)
   */
  private calculateEuTax(breakdown: ComponentBreakdown): TaxLineItem[] {
    const taxes: TaxLineItem[] = [];

    const totalBase = breakdown.subtotalBeforeTax;
    if (totalBase > 0) {
      const vat = totalBase * EU_TAX_CONFIG.vatRate;
      taxes.push({
        type: 'VAT',
        name: 'VAT',
        rate: EU_TAX_CONFIG.vatRate,
        baseAmount: totalBase,
        taxAmount: vat,
        category: 'ALL',
        description: `${(EU_TAX_CONFIG.vatRate * 100).toFixed(0)}% VAT`,
      });
    }

    return taxes;
  }

  /**
   * Calculate US taxes (state-based, default 0%)
   */
  private calculateUsTax(breakdown: ComponentBreakdown, stateCode?: string): TaxLineItem[] {
    const taxes: TaxLineItem[] = [];

    // No federal tax
    if (!stateCode || !US_TAX_CONFIG.stateTaxEnabled) {
      return taxes;
    }

    // State tax (if enabled and configured)
    const stateRate = US_STATE_TAX_RATES[stateCode] ?? 0;
    if (stateRate > 0) {
      const totalBase = breakdown.subtotalBeforeTax;
      const stateTax = totalBase * stateRate;
      taxes.push({
        type: 'SALES_TAX',
        name: `${stateCode} Sales Tax`,
        rate: stateRate,
        baseAmount: totalBase,
        taxAmount: stateTax,
        category: 'ALL',
        description: `${(stateRate * 100).toFixed(2)}% state sales tax`,
      });
    }

    return taxes;
  }

  /**
   * Get tax summary for display (without calculation)
   */
  async getTaxSummary(region: MarketRegion): Promise<{
    regime: TaxRegime;
    taxes: { type: string; name: string; rate: number; appliesTo: string }[];
    notes?: string;
  }> {
    switch (region) {
      case 'NP':
        return {
          regime: 'NP_2081_82_PLUS',
          taxes: [
            { type: 'LUXURY_TAX', name: 'Luxury Tax', rate: 0.02, appliesTo: 'Gold metal + making' },
            { type: 'VAT', name: 'VAT', rate: 0.13, appliesTo: 'Diamonds & gemstones only' },
          ],
          notes: 'Nepal FY 2081/82+ rules. Customs duty embedded in market premium.',
        };
      
      case 'IN':
        return {
          regime: 'IN_GST_2024',
          taxes: [
            { type: 'GST', name: 'GST on Metal', rate: 0.03, appliesTo: 'Precious metal value' },
            { type: 'GST', name: 'GST on Making', rate: 0.05, appliesTo: 'Making charges' },
          ],
        };
      
      case 'AE':
        return {
          regime: 'AE_VAT_2024',
          taxes: [
            { type: 'VAT', name: 'VAT', rate: 0.05, appliesTo: 'All components' },
          ],
        };
      
      case 'UK':
        return {
          regime: 'UK_VAT_2024',
          taxes: [
            { type: 'VAT', name: 'VAT', rate: 0.20, appliesTo: 'All components (investment gold exempt)' },
          ],
        };
      
      case 'EU':
        return {
          regime: 'EU_VAT_2024',
          taxes: [
            { type: 'VAT', name: 'VAT', rate: 0.20, appliesTo: 'All components' },
          ],
          notes: 'Rate varies 19-21% by country. Default 20%.',
        };
      
      case 'US':
        return {
          regime: 'US_SALES_TAX',
          taxes: [
            { type: 'SALES_TAX', name: 'Sales Tax', rate: 0, appliesTo: 'State-dependent' },
          ],
          notes: 'No federal sales tax. State taxes vary.',
        };
      
      default:
        return {
          regime: 'US_SALES_TAX',
          taxes: [],
        };
    }
  }

  /**
   * Clear tax rules cache (after admin updates)
   */
  clearCache(): void {
    this.rulesCache.clear();
    this.cacheExpiresAt = null;
    this.logger.debug('Tax engine cache cleared');
  }
}
