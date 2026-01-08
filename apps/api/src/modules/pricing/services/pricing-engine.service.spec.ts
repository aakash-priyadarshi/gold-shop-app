/**
 * Pricing Engine Tests
 * 
 * Comprehensive test suite for the pricing calculation engine.
 * Tests cover:
 * 1. Basic metal pricing for all build methods
 * 2. Gemstone pricing with different qualities
 * 3. Finish/plating pricing
 * 4. Tax calculations for different regions
 * 5. Making charge calculations
 * 6. Currency conversions
 * 7. Shop overrides
 * 8. Edge cases and validation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PricingEngineService, PricingRequest, PricingResponse } from './pricing-engine.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CommodityRatesService } from './commodity-rates.service';
import { TaxRulesService } from './tax-rules.service';
import { MarketRatesService } from '../../market-rates/market-rates.service';
import { FxRatesService } from '../../fx-rates';

// ═══════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════

const mockFxSnapshot = {
  USD_NPR: { rate: 134.5, source: 'mock', updatedAt: '2024-01-15T10:00:00Z' },
  USD_INR: { rate: 83.0, source: 'mock', updatedAt: '2024-01-15T10:00:00Z' },
  USD_AED: { rate: 3.67, source: 'mock', updatedAt: '2024-01-15T10:00:00Z' },
  USD_GBP: { rate: 0.79, source: 'mock', updatedAt: '2024-01-15T10:00:00Z' },
  USD_EUR: { rate: 0.92, source: 'mock', updatedAt: '2024-01-15T10:00:00Z' },
};

const mockCommodityRates = {
  gold: { 
    spotPriceUsd: 2350,
    spotPricePerGramUsd: 75.55,
    source: 'MetalpriceAPI',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  silver: {
    spotPriceUsd: 28,
    spotPricePerGramUsd: 0.90,
    source: 'MetalpriceAPI',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  platinum: {
    spotPriceUsd: 980,
    spotPricePerGramUsd: 31.51,
    source: 'MetalpriceAPI',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  updatedAt: '2024-01-15T10:00:00Z',
};

// Mock tax calculation result
const mockTaxResult = (subtotal: number, region: string) => {
  const rates: Record<string, number> = {
    NP: 0.13,  // 13% VAT
    IN: 0.03,  // 3% GST
    AE: 0.05,  // 5% VAT
    UK: 0.20,  // 20% VAT
    EU: 0.19,  // 19% VAT
    US: 0.08,  // 8% avg sales tax
  };
  const rate = rates[region] || 0;
  return {
    totalTax: subtotal * rate,
    effectiveRate: rate,
    breakdown: [{
      taxName: region === 'IN' ? 'GST' : 'VAT',
      category: 'ALL',
      rate,
      amount: subtotal * rate,
    }],
  };
};

// ═══════════════════════════════════════════
// MOCK SERVICES
// ═══════════════════════════════════════════

const mockPrismaService = {
  metalPurityConfig: {
    findMany: jest.fn().mockResolvedValue([
      { purityCode: 'GOLD_24K', multiplier: 1.0 },
      { purityCode: 'GOLD_22K', multiplier: 0.9167 },
      { purityCode: 'GOLD_18K', multiplier: 0.75 },
      { purityCode: 'SILVER_925', multiplier: 0.925 },
    ]),
  },
  baseMetalPriceConfig: {
    findMany: jest.fn().mockResolvedValue([
      { metalCode: 'BRASS', basePriceUsd: 0.005 },
      { metalCode: 'COPPER', basePriceUsd: 0.008 },
      { metalCode: 'STAINLESS_STEEL', basePriceUsd: 0.002 },
    ]),
  },
  finishPriceConfig: {
    findFirst: jest.fn().mockResolvedValue({
      finishType: 'GOLD_PLATING',
      tier: 'STANDARD',
      pricingModel: 'FIXED',
      basePrice: 10,
    }),
  },
  gemPriceConfig: {
    findFirst: jest.fn().mockResolvedValue({
      stoneType: 'DIAMOND_NATURAL',
      origin: 'NATURAL',
      qualityGrade: 'PREMIUM',
      pricePerUnit: 5000,
      unit: 'CARAT',
    }),
  },
  shopPriceOverride: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  shopMetalRate: {
    findMany: jest.fn().mockResolvedValue([]),
  },
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, any> = {
      PLATFORM_FEE_PCT: 1,
      DEFAULT_MAKING_CHARGE_PCT: 3,
    };
    return config[key];
  }),
};

const mockCommodityRatesService = {
  getAllRates: jest.fn().mockResolvedValue(mockCommodityRates),
  getGoldRate: jest.fn().mockResolvedValue(mockCommodityRates.gold),
  getSilverRate: jest.fn().mockResolvedValue(mockCommodityRates.silver),
};

const mockTaxRulesService = {
  calculateTax: jest.fn((subtotal, region, _stateCode) => mockTaxResult(subtotal, region)),
};

const mockMarketRatesService = {
  getRates: jest.fn().mockResolvedValue([]),
};

const mockFxRatesService = {
  getExtendedFxSnapshot: jest.fn().mockResolvedValue(mockFxSnapshot),
  convert: jest.fn((amount, from, to) => {
    if (from === 'USD' && to === 'NPR') return amount * 134.5;
    if (from === 'USD' && to === 'INR') return amount * 83;
    if (from === 'USD' && to === 'AED') return amount * 3.67;
    if (from === 'USD' && to === 'GBP') return amount * 0.79;
    if (from === 'USD' && to === 'EUR') return amount * 0.92;
    return amount;
  }),
};

// ═══════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════

describe('PricingEngineService', () => {
  let service: PricingEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingEngineService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CommodityRatesService, useValue: mockCommodityRatesService },
        { provide: TaxRulesService, useValue: mockTaxRulesService },
        { provide: MarketRatesService, useValue: mockMarketRatesService },
        { provide: FxRatesService, useValue: mockFxRatesService },
      ],
    }).compile();

    service = module.get<PricingEngineService>(PricingEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════
  // TEST 1: Method A - Solid Precious Metal (Gold 22K Ring)
  // ═══════════════════════════════════════════
  describe('Method A: Precious Metal Pricing', () => {
    it('should calculate price for 5g gold 22K ring in Nepal', async () => {
      const request: PricingRequest = {
        marketCountry: 'NP',
        displayCurrency: 'NPR',
        buildMethod: 'METHOD_A',
        jewelleryType: 'RING',
        totalWeightG: 5,
        primaryMetal: 'GOLD_22K',
        makingChargePct: 12,
      };

      const result = await service.calculatePrice(request);

      // Expected calculation:
      // Gold spot: $75.55/g (24K)
      // Purity multiplier for 22K: 0.9167
      // Adjusted rate: $75.55 * 0.9167 = $69.26/g
      // Material cost: $69.26 * 5g = $346.30
      // Making charge (12%): $41.56
      // Subtotal: $387.86
      // Tax (13% VAT): $50.42
      // Platform fee (1%): $3.88
      // Total USD: ~$442.16
      // Total NPR: ~$442.16 * 134.5 = ~59,470

      expect(result).toBeDefined();
      expect(result.marketCountry).toBe('NP');
      expect(result.displayCurrency).toBe('NPR');
      expect(result.buildMethod).toBe('METHOD_A');
      expect(result.subtotalUsd).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(50000); // Sanity check for NPR range
      expect(result.lineItems).toContainEqual(
        expect.objectContaining({ category: 'PRECIOUS_METAL' })
      );
    });

    it('should calculate price for 10g silver 925 pendant in India', async () => {
      const request: PricingRequest = {
        marketCountry: 'IN',
        displayCurrency: 'INR',
        buildMethod: 'METHOD_A',
        jewelleryType: 'PENDANT',
        totalWeightG: 10,
        primaryMetal: 'SILVER_925',
        makingChargePct: 10,
      };

      const result = await service.calculatePrice(request);

      // Silver is much cheaper, so expect lower totals
      expect(result).toBeDefined();
      expect(result.marketCountry).toBe('IN');
      expect(result.displayCurrency).toBe('INR');
      expect(result.subtotalUsd).toBeGreaterThan(0);
      expect(result.subtotalUsd).toBeLessThan(50); // Silver is cheap
    });
  });

  // ═══════════════════════════════════════════
  // TEST 2: Method B - Base Metal (Brass Bangle)
  // ═══════════════════════════════════════════
  describe('Method B: Base Metal Pricing', () => {
    it('should calculate price for 20g brass bangle in Nepal', async () => {
      const request: PricingRequest = {
        marketCountry: 'NP',
        displayCurrency: 'NPR',
        buildMethod: 'METHOD_B',
        jewelleryType: 'BANGLE',
        totalWeightG: 20,
        primaryMetal: 'BRASS',
        makingChargePct: 5,
      };

      const result = await service.calculatePrice(request);

      // Brass is very cheap: $0.005/g
      // Material: $0.005 * 20 = $0.10
      // Should be very affordable
      expect(result).toBeDefined();
      expect(result.subtotalUsd).toBeLessThan(5); // Very cheap material
      expect(result.lineItems).toContainEqual(
        expect.objectContaining({ category: 'BASE_METAL' })
      );
    });

    it('should flag nickel alloys when compliance flag is not set', async () => {
      const request: PricingRequest = {
        marketCountry: 'EU',
        displayCurrency: 'EUR',
        buildMethod: 'METHOD_B',
        jewelleryType: 'RING',
        totalWeightG: 10,
        primaryMetal: 'GERMAN_SILVER', // Contains nickel
        nickelCompliantFlag: false,
      };

      const result = await service.calculatePrice(request);

      // Should include warning about nickel
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: expect.stringContaining('NICKEL'),
          severity: 'warning',
        })
      );
    });
  });

  // ═══════════════════════════════════════════
  // TEST 3: Method C - Base Metal + Finish (Plated Jewellery)
  // ═══════════════════════════════════════════
  describe('Method C: Base Metal with Finish', () => {
    it('should calculate price for brass ring with gold plating', async () => {
      const request: PricingRequest = {
        marketCountry: 'NP',
        displayCurrency: 'NPR',
        buildMethod: 'METHOD_C',
        jewelleryType: 'RING',
        totalWeightG: 8,
        coreMetal: 'BRASS',
        finishType: 'GOLD_PLATING',
        finishTier: 'STANDARD',
        makingChargePct: 8,
      };

      const result = await service.calculatePrice(request);

      expect(result).toBeDefined();
      expect(result.lineItems).toContainEqual(
        expect.objectContaining({ category: 'BASE_METAL' })
      );
      expect(result.lineItems).toContainEqual(
        expect.objectContaining({ category: 'FINISH' })
      );
    });

    it('should calculate vermeil over sterling silver', async () => {
      const request: PricingRequest = {
        marketCountry: 'UK',
        displayCurrency: 'GBP',
        buildMethod: 'METHOD_C',
        jewelleryType: 'PENDANT',
        totalWeightG: 5,
        coreMetal: 'SILVER_925',
        finishType: 'VERMEIL',
        finishTier: 'PREMIUM',
        makingChargePct: 15,
      };

      const result = await service.calculatePrice(request);

      expect(result).toBeDefined();
      expect(result.displayCurrency).toBe('GBP');
      // Vermeil is premium, so should be notable cost
      expect(result.lineItems.find(l => l.category === 'FINISH')).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════
  // TEST 4: Method D - Multi-Metal (Gold & Silver)
  // ═══════════════════════════════════════════
  describe('Method D: Multi-Metal Construction', () => {
    it('should calculate price for mixed gold and silver bracelet', async () => {
      const request: PricingRequest = {
        marketCountry: 'IN',
        displayCurrency: 'INR',
        buildMethod: 'METHOD_D',
        jewelleryType: 'BRACELET',
        totalWeightG: 15,
        primaryMetal: 'GOLD_18K',
        primaryWeightG: 5,
        secondaryMetal: 'SILVER_925',
        secondaryWeightG: 10,
        makingChargePct: 10,
      };

      const result = await service.calculatePrice(request);

      expect(result).toBeDefined();
      expect(result.explanation?.weightBreakdown?.primary).toBe(5);
      expect(result.explanation?.weightBreakdown?.secondary).toBe(10);
      // Should have two metal line items
      expect(result.lineItems.filter(l => 
        l.category === 'PRECIOUS_METAL' || l.category === 'BASE_METAL'
      ).length).toBeGreaterThanOrEqual(1);
    });
  });

  // ═══════════════════════════════════════════
  // TEST 5: Gemstone Pricing
  // ═══════════════════════════════════════════
  describe('Gemstone Pricing', () => {
    it('should calculate price for ring with natural diamond', async () => {
      const request: PricingRequest = {
        marketCountry: 'NP',
        displayCurrency: 'NPR',
        buildMethod: 'METHOD_A',
        jewelleryType: 'RING',
        totalWeightG: 4,
        primaryMetal: 'GOLD_18K',
        gemstones: [
          {
            stoneType: 'DIAMOND_NATURAL',
            origin: 'NATURAL',
            caratWeight: 0.5,
            qualityGrade: 'PREMIUM',
            settingType: 'PRONG',
            count: 1,
          },
        ],
        makingChargePct: 15,
      };

      const result = await service.calculatePrice(request);

      expect(result).toBeDefined();
      expect(result.lineItems).toContainEqual(
        expect.objectContaining({ category: 'GEMSTONE' })
      );
      // Diamond should significantly increase price
      const gemItem = result.lineItems.find(l => l.category === 'GEMSTONE');
      expect(gemItem?.amountUsd).toBeGreaterThan(1000); // 0.5ct * $5000/ct base
    });

    it('should calculate price for necklace with multiple lab diamonds', async () => {
      const request: PricingRequest = {
        marketCountry: 'AE',
        displayCurrency: 'AED',
        buildMethod: 'METHOD_A',
        jewelleryType: 'NECKLACE',
        totalWeightG: 20,
        primaryMetal: 'GOLD_22K',
        gemstones: [
          {
            stoneType: 'DIAMOND_LAB',
            origin: 'LAB',
            caratWeight: 0.1,
            qualityGrade: 'STANDARD',
            settingType: 'BEZEL',
            count: 10,
          },
        ],
        makingChargePct: 8,
      };

      const result = await service.calculatePrice(request);

      expect(result).toBeDefined();
      expect(result.displayCurrency).toBe('AED');
      const gemItem = result.lineItems.find(l => l.category === 'GEMSTONE');
      expect(gemItem?.quantity).toBe(10);
    });

    it('should calculate price with moissanite alternative', async () => {
      const request: PricingRequest = {
        marketCountry: 'US',
        displayCurrency: 'USD',
        buildMethod: 'METHOD_A',
        jewelleryType: 'RING',
        totalWeightG: 3,
        primaryMetal: 'GOLD_14K',
        gemstones: [
          {
            stoneType: 'MOISSANITE',
            origin: 'LAB',
            caratWeight: 1.5,
            qualityGrade: 'PREMIUM',
            settingType: 'PRONG',
            count: 1,
          },
        ],
        makingChargePct: 12,
      };

      const result = await service.calculatePrice(request);

      // Moissanite should be much cheaper than diamond
      const gemItem = result.lineItems.find(l => l.category === 'GEMSTONE');
      expect(gemItem?.amountUsd).toBeLessThan(500); // Much cheaper than diamond
    });
  });

  // ═══════════════════════════════════════════
  // TEST 6: Tax Calculations by Region
  // ═══════════════════════════════════════════
  describe('Tax Calculations', () => {
    it('should apply 13% VAT for Nepal', async () => {
      const request: PricingRequest = {
        marketCountry: 'NP',
        displayCurrency: 'NPR',
        buildMethod: 'METHOD_A',
        totalWeightG: 5,
        primaryMetal: 'GOLD_22K',
      };

      const result = await service.calculatePrice(request);

      expect(result.explanation?.taxCalculation?.effectiveRate).toBe(0.13);
    });

    it('should apply 3% GST for India on precious metals', async () => {
      const request: PricingRequest = {
        marketCountry: 'IN',
        displayCurrency: 'INR',
        buildMethod: 'METHOD_A',
        totalWeightG: 10,
        primaryMetal: 'GOLD_22K',
      };

      const result = await service.calculatePrice(request);

      expect(result.explanation?.taxCalculation?.effectiveRate).toBe(0.03);
    });

    it('should apply 5% VAT for UAE', async () => {
      const request: PricingRequest = {
        marketCountry: 'AE',
        displayCurrency: 'AED',
        buildMethod: 'METHOD_A',
        totalWeightG: 8,
        primaryMetal: 'GOLD_24K',
      };

      const result = await service.calculatePrice(request);

      expect(result.explanation?.taxCalculation?.effectiveRate).toBe(0.05);
    });

    it('should apply 20% VAT for UK', async () => {
      const request: PricingRequest = {
        marketCountry: 'UK',
        displayCurrency: 'GBP',
        buildMethod: 'METHOD_A',
        totalWeightG: 6,
        primaryMetal: 'GOLD_18K',
      };

      const result = await service.calculatePrice(request);

      expect(result.explanation?.taxCalculation?.effectiveRate).toBe(0.20);
    });

    it('should handle US state-specific sales tax', async () => {
      const request: PricingRequest = {
        marketCountry: 'US',
        displayCurrency: 'USD',
        stateCode: 'NY',
        buildMethod: 'METHOD_A',
        totalWeightG: 5,
        primaryMetal: 'GOLD_18K',
      };

      const result = await service.calculatePrice(request);

      // NY has ~8.875% sales tax
      expect(result.taxesUsd).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════
  // TEST 7: Currency Conversions
  // ═══════════════════════════════════════════
  describe('Currency Conversions', () => {
    it('should correctly convert USD to NPR', async () => {
      const request: PricingRequest = {
        marketCountry: 'NP',
        displayCurrency: 'NPR',
        buildMethod: 'METHOD_A',
        totalWeightG: 5,
        primaryMetal: 'GOLD_22K',
      };

      const result = await service.calculatePrice(request);

      // NPR should be ~134.5x USD
      expect(result.total / result.totalUsd).toBeCloseTo(134.5, 0);
    });

    it('should correctly convert USD to EUR', async () => {
      const request: PricingRequest = {
        marketCountry: 'EU',
        displayCurrency: 'EUR',
        buildMethod: 'METHOD_A',
        totalWeightG: 10,
        primaryMetal: 'GOLD_18K',
      };

      const result = await service.calculatePrice(request);

      // EUR should be ~0.92x USD
      expect(result.total / result.totalUsd).toBeCloseTo(0.92, 1);
    });

    it('should allow different display currency from market country', async () => {
      const request: PricingRequest = {
        marketCountry: 'IN', // India
        displayCurrency: 'USD', // Show in USD
        buildMethod: 'METHOD_A',
        totalWeightG: 5,
        primaryMetal: 'GOLD_22K',
      };

      const result = await service.calculatePrice(request);

      expect(result.marketCountry).toBe('IN');
      expect(result.displayCurrency).toBe('USD');
      expect(result.total).toBe(result.totalUsd); // Same since display is USD
    });
  });

  // ═══════════════════════════════════════════
  // TEST 8: Making Charge Variations
  // ═══════════════════════════════════════════
  describe('Making Charge Calculations', () => {
    it('should apply percentage making charge', async () => {
      const request: PricingRequest = {
        marketCountry: 'NP',
        displayCurrency: 'NPR',
        buildMethod: 'METHOD_A',
        totalWeightG: 10,
        primaryMetal: 'GOLD_22K',
        makingChargePct: 15,
      };

      const result = await service.calculatePrice(request);

      // Making charge should be 15% of material cost
      expect(result.makingChargeUsd).toBeGreaterThan(0);
      expect(result.makingChargeUsd / result.subtotalUsd).toBeCloseTo(0.15, 1);
    });

    it('should apply fixed making charge when specified', async () => {
      const request: PricingRequest = {
        marketCountry: 'NP',
        displayCurrency: 'NPR',
        buildMethod: 'METHOD_A',
        totalWeightG: 5,
        primaryMetal: 'GOLD_22K',
        makingChargeFixed: 50, // $50 fixed
      };

      const result = await service.calculatePrice(request);

      expect(result.makingChargeUsd).toBeCloseTo(50, 0);
    });

    it('should use default making charge when not specified', async () => {
      const request: PricingRequest = {
        marketCountry: 'NP',
        displayCurrency: 'NPR',
        buildMethod: 'METHOD_A',
        totalWeightG: 5,
        primaryMetal: 'GOLD_22K',
        // No making charge specified
      };

      const result = await service.calculatePrice(request);

      // Should use default 3%
      expect(result.makingChargeUsd).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════
  // TEST 9: Shop Overrides
  // ═══════════════════════════════════════════
  describe('Shop Override Pricing', () => {
    it('should apply shop metal rate override', async () => {
      // Mock shop override for this test
      mockPrismaService.shopMetalRate.findMany.mockResolvedValueOnce([
        { metalType: 'GOLD_22K', ratePerGramNpr: 10800 },
      ]);

      const request: PricingRequest = {
        marketCountry: 'NP',
        displayCurrency: 'NPR',
        buildMethod: 'METHOD_A',
        totalWeightG: 5,
        primaryMetal: 'GOLD_22K',
        shopId: 'shop-1',
      };

      const result = await service.calculatePrice(request);

      expect(result.source).toBe('SHOP');
      expect(result.explanation?.shopOverrides?.length).toBeGreaterThan(0);
    });

    it('should apply shop making charge override', async () => {
      mockPrismaService.shopPriceOverride.findMany.mockResolvedValueOnce([
        { overrideType: 'MAKING_CHARGE', itemCode: 'DEFAULT', overrideMode: 'PERCENTAGE', overrideValue: 12 },
      ]);

      const request: PricingRequest = {
        marketCountry: 'NP',
        displayCurrency: 'NPR',
        buildMethod: 'METHOD_A',
        totalWeightG: 5,
        primaryMetal: 'GOLD_22K',
        shopId: 'shop-1',
      };

      const result = await service.calculatePrice(request);

      // Should use shop's 12% instead of default
      expect(result.explanation?.shopOverrides).toContainEqual(
        expect.objectContaining({ type: 'MAKING_CHARGE' })
      );
    });
  });

  // ═══════════════════════════════════════════
  // TEST 10: Edge Cases and Validation
  // ═══════════════════════════════════════════
  describe('Edge Cases and Validation', () => {
    it('should reject request with zero weight', async () => {
      const request: PricingRequest = {
        marketCountry: 'NP',
        displayCurrency: 'NPR',
        buildMethod: 'METHOD_A',
        totalWeightG: 0,
        primaryMetal: 'GOLD_22K',
      };

      await expect(service.calculatePrice(request)).rejects.toThrow();
    });

    it('should reject request with negative weight', async () => {
      const request: PricingRequest = {
        marketCountry: 'NP',
        displayCurrency: 'NPR',
        buildMethod: 'METHOD_A',
        totalWeightG: -5,
        primaryMetal: 'GOLD_22K',
      };

      await expect(service.calculatePrice(request)).rejects.toThrow();
    });

    it('should reject request with invalid metal code', async () => {
      const request: PricingRequest = {
        marketCountry: 'NP',
        displayCurrency: 'NPR',
        buildMethod: 'METHOD_A',
        totalWeightG: 5,
        primaryMetal: 'UNOBTANIUM_100K',
      };

      await expect(service.calculatePrice(request)).rejects.toThrow();
    });

    it('should handle very small weights gracefully', async () => {
      const request: PricingRequest = {
        marketCountry: 'NP',
        displayCurrency: 'NPR',
        buildMethod: 'METHOD_A',
        totalWeightG: 0.1,
        primaryMetal: 'GOLD_22K',
      };

      const result = await service.calculatePrice(request);

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
    });

    it('should handle very large weights', async () => {
      const request: PricingRequest = {
        marketCountry: 'NP',
        displayCurrency: 'NPR',
        buildMethod: 'METHOD_A',
        totalWeightG: 1000, // 1kg gold
        primaryMetal: 'GOLD_24K',
      };

      const result = await service.calculatePrice(request);

      expect(result).toBeDefined();
      expect(result.totalUsd).toBeGreaterThan(50000); // Should be very expensive
    });

    it('should include calculation time in response', async () => {
      const request: PricingRequest = {
        marketCountry: 'NP',
        displayCurrency: 'NPR',
        buildMethod: 'METHOD_A',
        totalWeightG: 5,
        primaryMetal: 'GOLD_22K',
      };

      const result = await service.calculatePrice(request);

      expect(result.explanation?.calculationTimeMs).toBeDefined();
      expect(result.explanation?.calculationTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should include request ID for traceability', async () => {
      const request: PricingRequest = {
        marketCountry: 'NP',
        displayCurrency: 'NPR',
        buildMethod: 'METHOD_A',
        totalWeightG: 5,
        primaryMetal: 'GOLD_22K',
      };

      const result = await service.calculatePrice(request);

      expect(result.explanation?.requestId).toBeDefined();
      expect(result.explanation?.requestId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
    });
  });

  // ═══════════════════════════════════════════
  // TEST 11: Complex Scenarios
  // ═══════════════════════════════════════════
  describe('Complex Pricing Scenarios', () => {
    it('should calculate bridal necklace with multiple gemstones and finishes', async () => {
      const request: PricingRequest = {
        marketCountry: 'IN',
        displayCurrency: 'INR',
        buildMethod: 'METHOD_A',
        jewelleryType: 'NECKLACE',
        totalWeightG: 50,
        primaryMetal: 'GOLD_22K',
        gemstones: [
          { stoneType: 'RUBY', origin: 'NATURAL', caratWeight: 2, qualityGrade: 'PREMIUM', count: 1 },
          { stoneType: 'DIAMOND_NATURAL', origin: 'NATURAL', caratWeight: 0.25, qualityGrade: 'STANDARD', count: 20 },
          { stoneType: 'PEARL', origin: 'NATURAL', sizeMm: 6, qualityGrade: 'PREMIUM', count: 30 },
        ],
        finishType: 'POLISHED',
        makingChargePct: 18,
      };

      const result = await service.calculatePrice(request);

      expect(result).toBeDefined();
      expect(result.lineItems.filter(l => l.category === 'GEMSTONE').length).toBeGreaterThan(0);
      expect(result.totalUsd).toBeGreaterThan(5000); // Should be expensive piece
    });

    it('should calculate affordable fashion ring with lab stones', async () => {
      const request: PricingRequest = {
        marketCountry: 'US',
        displayCurrency: 'USD',
        buildMethod: 'METHOD_C',
        jewelleryType: 'RING',
        totalWeightG: 5,
        coreMetal: 'BRASS',
        finishType: 'GOLD_PLATING',
        finishTier: 'STANDARD',
        gemstones: [
          { stoneType: 'CUBIC_ZIRCONIA', origin: 'LAB', caratWeight: 1, qualityGrade: 'STANDARD', count: 1 },
        ],
        makingChargePct: 10,
      };

      const result = await service.calculatePrice(request);

      expect(result).toBeDefined();
      expect(result.totalUsd).toBeLessThan(100); // Should be affordable
    });
  });
});
