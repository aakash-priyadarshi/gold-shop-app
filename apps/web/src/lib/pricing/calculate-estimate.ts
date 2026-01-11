/**
 * Client-Side Pricing Calculator
 * 
 * Unified pricing calculation for all build methods (A, B, C)
 * This provides instant estimates on the frontend before server validation
 */

import { 
  getRecipePresetById, 
  calculateAlloyPremium,
  type AlloyRecipePreset,
  type GoldKarat,
  type AlloyFamily,
} from './alloy-constants';

import {
  calculateBaseMetalCost,
  calculatePlatingCost,
  getBaseMetal,
  getPlatingOption,
  getPlatingTier,
  type BaseMetalType,
  type PlatingTypeC,
  type PlatingTierC,
} from './base-metal-constants';

import { getGemstonePreset, type GemstonePreset } from './gemstone-presets';
import { SETTING_STYLES, GEMSTONE_SHAPES } from './constants';
import { calculateTax, type CartBreakdown, type TaxResult } from '../tax/engine';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type BuildMethod = 'METHOD_A' | 'METHOD_B' | 'METHOD_C';

export type EstimateStatus = 'complete' | 'incomplete' | 'error';

export interface MethodADetails {
  metal: string; // e.g., 'GOLD_24K', 'GOLD_22K', 'SILVER_925', etc.
  weightGrams: number;
}

export interface MethodBDetails {
  baseMetal: 'GOLD' | 'SILVER';
  karat?: GoldKarat;
  silverPurity?: 'STERLING_925' | 'ARGENTIUM_935';
  alloyFamily?: AlloyFamily;
  recipePresetId?: string;
  weightGrams: number;
}

export interface MethodCDetails {
  baseMetal: BaseMetalType;
  weightGrams: number;
  platingType: PlatingTypeC;
  platingTier: PlatingTierC;
}

export interface GemstoneInput {
  presetId?: string;
  stoneType?: string;
  shape?: string;
  sizeValue?: string;
  sizeUnit?: 'MM' | 'CARAT';
  color?: string;
  clarity?: string;
  cut?: string;
  settingStyle?: string;
  count: number;
}

export interface FinishInput {
  finishType: string;
  additionalCost?: number;
}

export interface EstimateRequest {
  buildMethod: BuildMethod;
  jewelleryType: string;
  country: string;
  currency: string;
  
  // Method-specific details
  methodA?: MethodADetails;
  methodB?: MethodBDetails;
  methodC?: MethodCDetails;
  
  // Common options
  gemstones?: GemstoneInput[];
  surfaceFinish?: FinishInput;
  makingChargePercent?: number;
  
  // Market rates (passed from API)
  marketRates?: {
    metals: Record<string, number>;
    fx?: { rate: number };
  };
}

export interface LineItem {
  label: string;
  category: 'METAL' | 'ALLOY_PREMIUM' | 'BASE_METAL' | 'PLATING' | 'GEMSTONE' | 'SETTING' | 'FINISH' | 'MAKING' | 'TAX';
  amount: number;
  details?: string;
}

export interface EstimateBreakdown {
  status: EstimateStatus;
  statusMessage?: string;
  missingFields?: string[];
  
  // Cost breakdown
  metalCost: number;
  alloyPremiumCost: number; // Method B only
  baseMetalCost: number; // Method C only
  platingCost: number; // Method C only
  gemstoneCost: number;
  settingCost: number;
  finishCost: number;
  makingCharge: number;
  
  // Totals
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  
  // Tax details (new tax engine)
  taxResult?: TaxResult;
  
  // Detailed line items for display
  lineItems: LineItem[];
  
  // Currency info
  currency: string;
  currencySymbol: string;
  
  // Build method info
  buildMethod: BuildMethod;
  buildMethodLabel: string;
}

// ═══════════════════════════════════════════
// TAX RATES BY COUNTRY
// ═══════════════════════════════════════════

// Legacy tax rates kept for fallback
const LEGACY_TAX_RATES: Record<string, { rate: number; name: string }> = {
  NP: { rate: 0.13, name: 'VAT 13%' },
  IN: { rate: 0.03, name: 'GST 3%' },
  AE: { rate: 0.05, name: 'VAT 5%' },
  US: { rate: 0.0, name: 'No Federal Tax' },
  GB: { rate: 0.20, name: 'VAT 20%' },
  EU: { rate: 0.19, name: 'VAT 19%' },
  AU: { rate: 0.10, name: 'GST 10%' },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  NPR: '₨',
  INR: '₹',
  AED: 'د.إ',
  USD: '$',
  GBP: '£',
  EUR: '€',
  AUD: 'A$',
};

const BUILD_METHOD_LABELS: Record<BuildMethod, string> = {
  METHOD_A: 'Solid Precious Metal',
  METHOD_B: 'Precious Metal Alloy',
  METHOD_C: 'Base Metal + Plating',
};

// ═══════════════════════════════════════════
// MAIN CALCULATION FUNCTION
// ═══════════════════════════════════════════

export function calculateEstimate(request: EstimateRequest): EstimateBreakdown {
  const lineItems: LineItem[] = [];
  const missingFields: string[] = [];
  
  let metalCost = 0;
  let alloyPremiumCost = 0;
  let baseMetalCost = 0;
  let platingCost = 0;
  let gemstoneCost = 0;
  let settingCost = 0;
  let finishCost = 0;
  
  const currencySymbol = CURRENCY_SYMBOLS[request.currency] || '₹';
  const makingChargePercent = request.makingChargePercent ?? 12;
  
  // ─────────────────────────────────────────
  // METHOD A: Solid Precious Metal
  // ─────────────────────────────────────────
  if (request.buildMethod === 'METHOD_A') {
    if (!request.methodA?.metal) {
      missingFields.push('Precious metal type');
    }
    if (!request.methodA?.weightGrams || request.methodA.weightGrams <= 0) {
      missingFields.push('Weight in grams');
    }
    
    if (request.methodA?.metal && request.methodA?.weightGrams && request.marketRates?.metals) {
      const rate = request.marketRates.metals[request.methodA.metal] || 0;
      metalCost = request.methodA.weightGrams * rate;
      
      if (metalCost > 0) {
        lineItems.push({
          label: `${formatMetalName(request.methodA.metal)} (${request.methodA.weightGrams}g × ${currencySymbol}${rate.toLocaleString()}/g)`,
          category: 'METAL',
          amount: metalCost,
        });
      }
    }
  }
  
  // ─────────────────────────────────────────
  // METHOD B: Precious Metal Alloy
  // ─────────────────────────────────────────
  else if (request.buildMethod === 'METHOD_B') {
    if (!request.methodB?.baseMetal) {
      missingFields.push('Base precious metal (Gold/Silver)');
    }
    if (request.methodB?.baseMetal === 'GOLD' && !request.methodB?.karat) {
      missingFields.push('Gold karat');
    }
    if (request.methodB?.baseMetal === 'GOLD' && !request.methodB?.alloyFamily) {
      missingFields.push('Alloy family (Yellow/White/Rose)');
    }
    if (request.methodB?.baseMetal === 'GOLD' && !request.methodB?.recipePresetId) {
      missingFields.push('Alloy recipe preset');
    }
    if (!request.methodB?.weightGrams || request.methodB.weightGrams <= 0) {
      missingFields.push('Weight in grams');
    }
    
    if (request.methodB && request.marketRates?.metals) {
      const { baseMetal, karat, weightGrams, recipePresetId } = request.methodB;
      
      // Calculate base metal cost
      let metalKey = '';
      if (baseMetal === 'GOLD' && karat) {
        metalKey = `GOLD_${karat}`;
      } else if (baseMetal === 'SILVER') {
        metalKey = 'SILVER_925';
      }
      
      const rate = request.marketRates.metals[metalKey] || 0;
      metalCost = weightGrams * rate;
      
      if (metalCost > 0) {
        lineItems.push({
          label: `${formatMetalName(metalKey)} base (${weightGrams}g × ${currencySymbol}${rate.toLocaleString()}/g)`,
          category: 'METAL',
          amount: metalCost,
        });
      }
      
      // Calculate alloy premium
      if (recipePresetId) {
        const recipe = getRecipePresetById(recipePresetId);
        if (recipe) {
          alloyPremiumCost = calculateAlloyPremium(metalCost, recipe);
          
          if (alloyPremiumCost > 0) {
            lineItems.push({
              label: `${recipe.name} alloy premium (+${((recipe.priceMultiplier - 1) * 100).toFixed(0)}%)`,
              category: 'ALLOY_PREMIUM',
              amount: alloyPremiumCost,
              details: recipe.tooltip,
            });
          }
        }
      }
    }
  }
  
  // ─────────────────────────────────────────
  // METHOD C: Base Metal + Plating
  // ─────────────────────────────────────────
  else if (request.buildMethod === 'METHOD_C') {
    if (!request.methodC?.baseMetal) {
      missingFields.push('Base metal type');
    }
    if (!request.methodC?.platingType) {
      missingFields.push('Plating type (required for Method C)');
    }
    if (!request.methodC?.platingTier) {
      missingFields.push('Plating tier');
    }
    if (!request.methodC?.weightGrams || request.methodC.weightGrams <= 0) {
      missingFields.push('Weight in grams');
    }
    
    if (request.methodC) {
      const { baseMetal, weightGrams, platingType, platingTier } = request.methodC;
      
      // Calculate base metal cost
      if (baseMetal && weightGrams > 0) {
        baseMetalCost = calculateBaseMetalCost(baseMetal, weightGrams);
        const metalInfo = getBaseMetal(baseMetal);
        const actualRatePerGram = weightGrams > 0 ? baseMetalCost / weightGrams : 0;
        
        if (baseMetalCost > 0) {
          lineItems.push({
            label: `${metalInfo?.label || baseMetal} (${weightGrams}g × ${currencySymbol}${actualRatePerGram.toFixed(2)}/g)`,
            category: 'BASE_METAL',
            amount: baseMetalCost,
          });
        }
      }
      
      // Calculate plating cost (REQUIRED for Method C)
      if (platingType && platingTier && weightGrams > 0) {
        platingCost = calculatePlatingCost(
          platingType, 
          platingTier, 
          request.jewelleryType,
          weightGrams
        );
        
        const platingInfo = getPlatingOption(platingType);
        const tierInfo = getPlatingTier(platingTier);
        
        if (platingCost > 0) {
          lineItems.push({
            label: `${platingInfo?.label || platingType} (${tierInfo?.label || platingTier})`,
            category: 'PLATING',
            amount: platingCost,
            details: platingInfo?.tooltip.durability,
          });
        }
      }
    }
  }
  
  // ─────────────────────────────────────────
  // GEMSTONES (all methods)
  // ─────────────────────────────────────────
  if (request.gemstones && request.gemstones.length > 0) {
    for (const gem of request.gemstones) {
      let stoneCost = 0;
      let stoneLabel = '';
      
      // Use preset if available
      if (gem.presetId) {
        const preset = getGemstonePreset(gem.presetId);
        if (preset) {
          stoneCost = preset.estimatedPriceNpr * gem.count;
          stoneLabel = `${preset.name} × ${gem.count}`;
        }
      } 
      // Otherwise estimate based on type and size
      else if (gem.stoneType) {
        // Basic estimation logic (can be enhanced with more data)
        const basePrice = estimateGemstonePrice(gem);
        stoneCost = basePrice * gem.count;
        stoneLabel = `${gem.stoneType} ${gem.sizeValue || ''}${gem.sizeUnit || 'mm'} × ${gem.count}`;
      }
      
      if (stoneCost > 0) {
        gemstoneCost += stoneCost;
        lineItems.push({
          label: stoneLabel,
          category: 'GEMSTONE',
          amount: stoneCost,
        });
      }
      
      // Setting cost
      if (gem.settingStyle) {
        const setting = SETTING_STYLES.find(s => s.value === gem.settingStyle);
        if (setting) {
          const settingItemCost = setting.pricePerStone * gem.count;
          settingCost += settingItemCost;
          lineItems.push({
            label: `${setting.label} setting × ${gem.count}`,
            category: 'SETTING',
            amount: settingItemCost,
          });
        }
      }
    }
  }
  
  // ─────────────────────────────────────────
  // SURFACE FINISH (all methods)
  // ─────────────────────────────────────────
  if (request.surfaceFinish?.additionalCost) {
    finishCost = request.surfaceFinish.additionalCost;
    lineItems.push({
      label: `${request.surfaceFinish.finishType} finish`,
      category: 'FINISH',
      amount: finishCost,
    });
  }
  
  // ─────────────────────────────────────────
  // CALCULATE TOTALS
  // ─────────────────────────────────────────
  
  // Subtotal before making charge
  const materialsTotal = metalCost + alloyPremiumCost + baseMetalCost + platingCost + 
                         gemstoneCost + settingCost + finishCost;
  
  // Making charge (percentage of metal/base materials cost)
  const makingChargeBase = metalCost + alloyPremiumCost + baseMetalCost + platingCost;
  const makingCharge = makingChargeBase * (makingChargePercent / 100);
  
  if (makingCharge > 0) {
    lineItems.push({
      label: `Making charge (${makingChargePercent}%)`,
      category: 'MAKING',
      amount: makingCharge,
    });
  }
  
  const subtotal = materialsTotal + makingCharge;
  
  // ─────────────────────────────────────────
  // CALCULATE TAX USING NEW TAX ENGINE
  // ─────────────────────────────────────────
  
  let taxAmount = 0;
  let taxRate = 0;
  let taxResult: TaxResult | undefined;
  
  try {
    // Determine if this is studded jewellery
    const hasGemstones = gemstoneCost > 0;
    // Consider everything as jewellery unless explicitly bullion/bar/coin
    // This ensures tax rules apply correctly
    const isJewellery = request.jewelleryType ? 
                       !request.jewelleryType.toLowerCase().match(/bullion|bar|coin/) : true;
    const isGold = request.buildMethod === 'METHOD_A' && 
                   request.methodA?.metal ?
                   request.methodA.metal.toUpperCase().includes('GOLD') : false;
    
    // Build cart breakdown for tax engine
    const cartBreakdown: CartBreakdown = {
      metalSubtotal: metalCost,
      alloyPremiumSubtotal: alloyPremiumCost,
      baseMetalSubtotal: baseMetalCost,
      platingSubtotal: platingCost,
      makingChargeSubtotal: makingCharge,
      gemstoneSubtotal: gemstoneCost,
      finishSubtotal: finishCost,
      total: subtotal,
      isJewellery,
      isGold,
      hasGemstones,
    };
    
    // Calculate tax using new engine
    taxResult = calculateTax({
      country: request.country,
      cartBreakdown,
    });
    
    // Sum all tax amounts
    taxAmount = taxResult.lineItems.reduce((sum, item) => sum + item.amount, 0);
    
    // Calculate effective tax rate for legacy compatibility
    taxRate = subtotal > 0 ? taxAmount / subtotal : 0;
    
    // Add tax line items to display
    taxResult.lineItems.forEach(item => {
      const taxLineItem: LineItem = {
        label: item.displayName || item.name,
        category: 'TAX',
        amount: item.amount,
        details: `${(item.rate * 100).toFixed(1)}% of ${currencySymbol}${item.applicableToAmount.toLocaleString()}`,
      };
      lineItems.push(taxLineItem);
    });
  } catch (error) {
    // Fallback to legacy tax calculation if engine fails
    console.error('[Tax Engine] Error occurred, falling back to legacy rates:', error);
    console.error('[Tax Engine] Stack trace:', error instanceof Error ? error.stack : 'No stack');
    const legacyInfo = LEGACY_TAX_RATES[request.country] || { rate: 0.13, name: 'Tax' };
    taxRate = legacyInfo.rate;
    taxAmount = subtotal * taxRate;
    // Add legacy tax as line item
    if (taxAmount > 0) {
      const legacyTaxItem: LineItem = {
        label: legacyInfo.name,
        category: 'TAX',
        amount: taxAmount,
        details: `${(taxRate * 100).toFixed(1)}% (fallback)`,
      };
      lineItems.push(legacyTaxItem);
    }
  }
  
  const total = subtotal + taxAmount;
  
  // ─────────────────────────────────────────
  // DETERMINE STATUS
  // ─────────────────────────────────────────
  let status: EstimateStatus = 'complete';
  let statusMessage: string | undefined;
  
  if (missingFields.length > 0) {
    status = 'incomplete';
    statusMessage = `Please select: ${missingFields.join(', ')}`;
  } else if (total <= 0) {
    status = 'incomplete';
    statusMessage = 'Unable to calculate estimate. Please check your selections.';
  }
  
  return {
    status,
    statusMessage,
    missingFields: missingFields.length > 0 ? missingFields : undefined,
    
    metalCost,
    alloyPremiumCost,
    baseMetalCost,
    platingCost,
    gemstoneCost,
    settingCost,
    finishCost,
    makingCharge,
    
    subtotal,
    taxRate,
    taxAmount,
    total,
    taxResult,
    
    lineItems,
    
    currency: request.currency,
    currencySymbol,
    
    buildMethod: request.buildMethod,
    buildMethodLabel: BUILD_METHOD_LABELS[request.buildMethod],
  };
}

// ═══════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════

function formatMetalName(metalKey: string): string {
  const names: Record<string, string> = {
    'GOLD_24K': '24K Gold',
    'GOLD_22K': '22K Gold',
    'GOLD_18K': '18K Gold',
    'GOLD_14K': '14K Gold',
    'GOLD_10K': '10K Gold',
    'SILVER_999': 'Fine Silver 999',
    'SILVER_925': 'Sterling Silver 925',
    'PLATINUM_PT950': 'Platinum PT950',
    'PLATINUM_PT900': 'Platinum PT900',
    'PALLADIUM_PD950': 'Palladium PD950',
  };
  return names[metalKey] || metalKey;
}

function estimateGemstonePrice(gem: GemstoneInput): number {
  // Basic price estimation based on stone type
  // This is a simplified version - real prices come from catalog
  const basePrices: Record<string, number> = {
    'DIAMOND_NATURAL': 50000,
    'DIAMOND_LAB': 15000,
    'DIAMOND': 15000,
    'MOISSANITE': 5000,
    'CUBIC_ZIRCONIA': 200,
    'RUBY': 15000,
    'SAPPHIRE': 12000,
    'EMERALD': 18000,
    'PEARL': 2000,
    'AMETHYST': 500,
    'TOPAZ': 400,
    'GARNET': 600,
    'OPAL': 1500,
    'TURQUOISE': 800,
    'AQUAMARINE': 1200,
    'PERIDOT': 500,
    'CITRINE': 400,
  };
  
  let price = basePrices[gem.stoneType || ''] || 500;
  
  // Adjust by size
  if (gem.sizeValue) {
    const size = parseFloat(gem.sizeValue);
    if (gem.sizeUnit === 'CARAT') {
      // Exponential pricing for carats
      price *= Math.pow(size, 1.5);
    } else {
      // Linear for mm
      price *= (size / 5); // 5mm is baseline
    }
  }
  
  return Math.round(price);
}

// ═══════════════════════════════════════════
// EXPORTS FOR COMPONENTS
// ═══════════════════════════════════════════

export { LEGACY_TAX_RATES, CURRENCY_SYMBOLS, BUILD_METHOD_LABELS };
