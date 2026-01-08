/**
 * Tax Engine Tests
 * 
 * Unit tests for Nepal tax rules and tax calculation engine
 */

import { calculateTax } from '../engine';
import { CartBreakdown, TaxCalculationInput, CountryTaxConfig } from '../types';

describe('Tax Engine - Nepal Rules', () => {
  // Test case 1: Gold jewellery, no stones - Luxury tax only
  test('NP: Gold jewellery without stones - Luxury tax 2%', () => {
    const breakdown: CartBreakdown = {
      metalSubtotal: 10000,
      alloyPremiumSubtotal: 0,
      baseMetalSubtotal: 0,
      makingChargeSubtotal: 1200,
      finishSubtotal: 0,
      platingSubtotal: 0,
      gemstoneSubtotal: 0,
      total: 11200,
      hasGemstones: false,
      isGold: true,
      isJewellery: true,
    };
    
    const input: TaxCalculationInput = {
      country: 'NP',
      cartBreakdown: breakdown,
    };
    
    const result = calculateTax(input);
    
    // Luxury tax = 2% on (10000 + 1200) = 224
    expect(result.totalTax).toBe(224);
    expect(result.lineItems).toHaveLength(1);
    expect(result.lineItems[0].name).toBe('LUXURY_TAX');
    expect(result.lineItems[0].rate).toBe(0.02);
    expect(result.lineItems[0].base).toBe(11200);
  });
  
  // Test case 2: Gold jewellery with stones - VAT mode STONES_ONLY
  test('NP: Gold jewellery with stones - VAT on stones only', () => {
    const breakdown: CartBreakdown = {
      metalSubtotal: 10000,
      alloyPremiumSubtotal: 0,
      baseMetalSubtotal: 0,
      makingChargeSubtotal: 1200,
      finishSubtotal: 0,
      platingSubtotal: 0,
      gemstoneSubtotal: 3000,
      total: 14200,
      hasGemstones: true,
      isGold: true,
      isJewellery: true,
    };
    
    // Custom config with STONES_ONLY mode
    const config: CountryTaxConfig = {
      country: 'NP',
      effectiveFrom: '2025-07-16',
      rules: [
        {
          id: 'NP_LUXURY_TAX',
          name: 'LUXURY_TAX',
          displayName: 'Luxury Tax',
          rate: 0.02,
          priority: 1,
          applyWhen: { isJewellery: true },
          base: 'item_subtotal_excluding_tax',
        },
        {
          id: 'NP_VAT_STONE',
          name: 'VAT',
          displayName: 'VAT',
          rate: 0.13,
          priority: 2,
          applyWhen: { hasGemstones: true },
          base: 'item_subtotal_excluding_tax',
          vatMode: 'STONES_ONLY',
        },
      ],
    };
    
    const input: TaxCalculationInput = {
      country: 'NP',
      cartBreakdown: breakdown,
      taxConfig: config,
    };
    
    const result = calculateTax(input);
    
    // Luxury tax = 2% on 14200 = 284
    // VAT = 13% on 3000 (stones only) = 390
    // Total = 674
    expect(result.totalTax).toBe(674);
    expect(result.lineItems).toHaveLength(2);
    expect(result.lineItems[0].name).toBe('LUXURY_TAX');
    expect(result.lineItems[0].amount).toBe(284);
    expect(result.lineItems[1].name).toBe('VAT');
    expect(result.lineItems[1].amount).toBe(390);
    expect(result.lineItems[1].base).toBe(3000);
  });
  
  // Test case 3: Gold jewellery with stones - VAT mode WHOLE_ITEM_IF_STUDDED
  test('NP: Gold jewellery with stones - VAT on whole item', () => {
    const breakdown: CartBreakdown = {
      metalSubtotal: 10000,
      alloyPremiumSubtotal: 0,
      baseMetalSubtotal: 0,
      makingChargeSubtotal: 1200,
      finishSubtotal: 0,
      platingSubtotal: 0,
      gemstoneSubtotal: 3000,
      total: 14200,
      hasGemstones: true,
      isGold: true,
      isJewellery: true,
    };
    
    // Custom config with WHOLE_ITEM_IF_STUDDED mode (default)
    const config: CountryTaxConfig = {
      country: 'NP',
      effectiveFrom: '2025-07-16',
      rules: [
        {
          id: 'NP_LUXURY_TAX',
          name: 'LUXURY_TAX',
          displayName: 'Luxury Tax',
          rate: 0.02,
          priority: 1,
          applyWhen: { isJewellery: true },
          base: 'item_subtotal_excluding_tax',
        },
        {
          id: 'NP_VAT_STONE',
          name: 'VAT',
          displayName: 'VAT',
          rate: 0.13,
          priority: 2,
          applyWhen: { hasGemstones: true },
          base: 'item_subtotal_excluding_tax',
          vatMode: 'WHOLE_ITEM_IF_STUDDED',
        },
      ],
    };
    
    const input: TaxCalculationInput = {
      country: 'NP',
      cartBreakdown: breakdown,
      taxConfig: config,
    };
    
    const result = calculateTax(input);
    
    // Luxury tax = 2% on 14200 = 284
    // VAT = 13% on 14200 (whole item) = 1846
    // Total = 2130
    expect(result.totalTax).toBe(2130);
    expect(result.lineItems).toHaveLength(2);
    expect(result.lineItems[1].name).toBe('VAT');
    expect(result.lineItems[1].amount).toBe(1846);
    expect(result.lineItems[1].base).toBe(14200);
  });
  
  // Test case 4: Non-gold jewellery with stones
  test('NP: Silver jewellery with stones - configurable luxury tax', () => {
    const breakdown: CartBreakdown = {
      metalSubtotal: 5000,
      alloyPremiumSubtotal: 0,
      baseMetalSubtotal: 0,
      makingChargeSubtotal: 600,
      finishSubtotal: 0,
      platingSubtotal: 0,
      gemstoneSubtotal: 2000,
      total: 7600,
      hasGemstones: true,
      isGold: false,
      isSilver: true,
      isJewellery: true,
    };
    
    // Config where luxury tax requires gold
    const config: CountryTaxConfig = {
      country: 'NP',
      effectiveFrom: '2025-07-16',
      rules: [
        {
          id: 'NP_LUXURY_TAX',
          name: 'LUXURY_TAX',
          displayName: 'Luxury Tax',
          rate: 0.02,
          priority: 1,
          applyWhen: { isJewellery: true, isGold: true }, // Only for gold
          base: 'item_subtotal_excluding_tax',
        },
        {
          id: 'NP_VAT_STONE',
          name: 'VAT',
          displayName: 'VAT',
          rate: 0.13,
          priority: 2,
          applyWhen: { hasGemstones: true },
          base: 'item_subtotal_excluding_tax',
          vatMode: 'WHOLE_ITEM_IF_STUDDED',
        },
      ],
    };
    
    const input: TaxCalculationInput = {
      country: 'NP',
      cartBreakdown: breakdown,
      taxConfig: config,
    };
    
    const result = calculateTax(input);
    
    // Luxury tax NOT applied (isGold: false)
    // VAT = 13% on 7600 = 988
    expect(result.totalTax).toBe(988);
    expect(result.lineItems).toHaveLength(1);
    expect(result.lineItems[0].name).toBe('VAT');
  });
  
  // Test case 5: No gemstones, no luxury tax trigger
  test('NP: Non-jewellery item - no tax', () => {
    const breakdown: CartBreakdown = {
      metalSubtotal: 1000,
      alloyPremiumSubtotal: 0,
      baseMetalSubtotal: 0,
      makingChargeSubtotal: 0,
      finishSubtotal: 0,
      platingSubtotal: 0,
      gemstoneSubtotal: 0,
      total: 1000,
      hasGemstones: false,
      isGold: false,
      isJewellery: false,
    };
    
    const input: TaxCalculationInput = {
      country: 'NP',
      cartBreakdown: breakdown,
    };
    
    const result = calculateTax(input);
    
    // No tax rules apply
    expect(result.totalTax).toBe(0);
    expect(result.lineItems).toHaveLength(0);
  });
});

describe('Tax Engine - India Rules', () => {
  test('IN: Gold jewellery - GST 3% on metal, 5% on making', () => {
    const breakdown: CartBreakdown = {
      metalSubtotal: 10000,
      alloyPremiumSubtotal: 0,
      baseMetalSubtotal: 0,
      makingChargeSubtotal: 1200,
      finishSubtotal: 100,
      platingSubtotal: 0,
      gemstoneSubtotal: 0,
      total: 11300,
      hasGemstones: false,
      isGold: true,
      isJewellery: true,
    };
    
    const input: TaxCalculationInput = {
      country: 'IN',
      cartBreakdown: breakdown,
    };
    
    const result = calculateTax(input);
    
    // GST on metal = 3% on 10000 = 300
    // GST on making = 5% on (1200 + 100) = 65
    // Total = 365
    expect(result.totalTax).toBe(365);
    expect(result.lineItems).toHaveLength(2);
  });
});

describe('Tax Engine - Edge Cases', () => {
  test('Zero amounts should return zero tax', () => {
    const breakdown: CartBreakdown = {
      metalSubtotal: 0,
      alloyPremiumSubtotal: 0,
      baseMetalSubtotal: 0,
      makingChargeSubtotal: 0,
      finishSubtotal: 0,
      platingSubtotal: 0,
      gemstoneSubtotal: 0,
      total: 0,
      hasGemstones: false,
      isGold: true,
      isJewellery: true,
    };
    
    const input: TaxCalculationInput = {
      country: 'NP',
      cartBreakdown: breakdown,
    };
    
    const result = calculateTax(input);
    
    expect(result.totalTax).toBe(0);
  });
  
  test('Unknown country should return zero tax', () => {
    const breakdown: CartBreakdown = {
      metalSubtotal: 10000,
      alloyPremiumSubtotal: 0,
      baseMetalSubtotal: 0,
      makingChargeSubtotal: 1200,
      finishSubtotal: 0,
      platingSubtotal: 0,
      gemstoneSubtotal: 0,
      total: 11200,
      hasGemstones: false,
      isGold: true,
      isJewellery: true,
    };
    
    const input: TaxCalculationInput = {
      country: 'XX',
      cartBreakdown: breakdown,
    };
    
    const result = calculateTax(input);
    
    expect(result.totalTax).toBe(0);
    expect(result.lineItems).toHaveLength(0);
  });
});
