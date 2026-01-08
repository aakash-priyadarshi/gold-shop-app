/**
 * Backend Tax Engine Tests
 * 
 * Tests for the authoritative backend tax calculation service.
 * These tests verify:
 * 1. Nepal tax rules (2% luxury on gold, 13% VAT on stones)
 * 2. India GST rules (3% on metal, 5% on making)
 * 3. UAE VAT rules (5% on all)
 * 4. UK VAT rules (20% with investment gold exemption)
 * 5. Currency conversion consistency
 */

import { Test, TestingModule } from '@nestjs/testing';
import { 
  BackendTaxEngineService, 
  TaxCalculationRequest,
  TaxableComponent,
} from './backend-tax-engine.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('BackendTaxEngineService', () => {
  let service: BackendTaxEngineService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackendTaxEngineService,
        {
          provide: PrismaService,
          useValue: {
            // Mock as needed
          },
        },
      ],
    }).compile();

    service = module.get<BackendTaxEngineService>(BackendTaxEngineService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Nepal Tax Rules', () => {
    describe('Gold-only (no stones)', () => {
      it('should apply 2% luxury tax on gold metal + making charges', async () => {
        const request: TaxCalculationRequest = {
          region: 'NP',
          components: [
            { category: 'GOLD_METAL', amount: 100000, description: '22K Gold 10g' },
            { category: 'GOLD_MAKING', amount: 5000, description: 'Making charges' },
          ],
        };

        const result = await service.calculateTax(request);

        expect(result.region).toBe('NP');
        expect(result.taxRegime).toBe('NP_2081_82_PLUS');
        
        // Should have exactly 1 tax: Luxury Tax
        expect(result.taxes).toHaveLength(1);
        
        const luxuryTax = result.taxes.find(t => t.type === 'LUXURY_TAX');
        expect(luxuryTax).toBeDefined();
        expect(luxuryTax!.rate).toBe(0.02);
        expect(luxuryTax!.baseAmount).toBe(105000); // gold + making
        expect(luxuryTax!.taxAmount).toBe(2100); // 2% of 105000
        
        // No VAT since no stones
        const vat = result.taxes.find(t => t.type === 'VAT');
        expect(vat).toBeUndefined();
        
        expect(result.taxTotal).toBe(2100);
        expect(result.totalPayable).toBe(107100); // 105000 + 2100
      });

      it('should NOT apply VAT on gold-only items', async () => {
        const request: TaxCalculationRequest = {
          region: 'NP',
          components: [
            { category: 'GOLD_METAL', amount: 50000, description: 'Gold' },
          ],
        };

        const result = await service.calculateTax(request);
        
        const vat = result.taxes.find(t => t.type === 'VAT');
        expect(vat).toBeUndefined();
      });
    });

    describe('Stones-only (no gold)', () => {
      it('should apply 13% VAT on gemstones only', async () => {
        const request: TaxCalculationRequest = {
          region: 'NP',
          components: [
            { category: 'GEMSTONE', amount: 20000, description: 'Ruby' },
          ],
        };

        const result = await service.calculateTax(request);

        // Should have exactly 1 tax: VAT
        expect(result.taxes).toHaveLength(1);
        
        const vat = result.taxes.find(t => t.type === 'VAT');
        expect(vat).toBeDefined();
        expect(vat!.rate).toBe(0.13);
        expect(vat!.baseAmount).toBe(20000);
        expect(vat!.taxAmount).toBe(2600); // 13% of 20000
        
        // No luxury tax since no gold
        const luxuryTax = result.taxes.find(t => t.type === 'LUXURY_TAX');
        expect(luxuryTax).toBeUndefined();
      });

      it('should apply 13% VAT on diamonds', async () => {
        const request: TaxCalculationRequest = {
          region: 'NP',
          components: [
            { category: 'DIAMOND', amount: 50000, description: 'Diamond' },
          ],
        };

        const result = await service.calculateTax(request);

        const vat = result.taxes.find(t => t.type === 'VAT');
        expect(vat).toBeDefined();
        expect(vat!.rate).toBe(0.13);
        expect(vat!.baseAmount).toBe(50000);
        expect(vat!.taxAmount).toBe(6500); // 13% of 50000
      });
    });

    describe('Gold + Stones (studded jewellery)', () => {
      it('should apply both luxury tax (on gold) and VAT (on stones)', async () => {
        const request: TaxCalculationRequest = {
          region: 'NP',
          components: [
            { category: 'GOLD_METAL', amount: 100000, description: 'Gold 22K' },
            { category: 'GOLD_MAKING', amount: 10000, description: 'Making charges' },
            { category: 'DIAMOND', amount: 30000, description: 'Diamond' },
            { category: 'GEMSTONE', amount: 20000, description: 'Ruby' },
          ],
        };

        const result = await service.calculateTax(request);

        // Should have 2 taxes: Luxury Tax + VAT
        expect(result.taxes).toHaveLength(2);
        
        // Luxury tax on gold + making (110000 * 2% = 2200)
        const luxuryTax = result.taxes.find(t => t.type === 'LUXURY_TAX');
        expect(luxuryTax).toBeDefined();
        expect(luxuryTax!.baseAmount).toBe(110000); // gold + making
        expect(luxuryTax!.taxAmount).toBe(2200);
        
        // VAT on stones only (50000 * 13% = 6500)
        const vat = result.taxes.find(t => t.type === 'VAT');
        expect(vat).toBeDefined();
        expect(vat!.baseAmount).toBe(50000); // diamond + gemstone
        expect(vat!.taxAmount).toBe(6500);
        
        // Total tax = 2200 + 6500 = 8700
        expect(result.taxTotal).toBe(8700);
        
        // Total payable = 160000 + 8700 = 168700
        expect(result.totalPayable).toBe(168700);
      });
    });

    describe('Silver (no special luxury tax)', () => {
      it('should NOT apply luxury tax on silver', async () => {
        const request: TaxCalculationRequest = {
          region: 'NP',
          components: [
            { category: 'SILVER_METAL', amount: 50000, description: 'Silver' },
            { category: 'SILVER_MAKING', amount: 3000, description: 'Making' },
          ],
        };

        const result = await service.calculateTax(request);

        // No luxury tax on silver
        const luxuryTax = result.taxes.find(t => t.type === 'LUXURY_TAX');
        expect(luxuryTax).toBeUndefined();
        
        // No VAT either since no stones
        expect(result.taxes).toHaveLength(0);
      });
    });

    describe('Old gold exchange waiver', () => {
      it('should waive luxury tax for old gold exchange when configured', async () => {
        const request: TaxCalculationRequest = {
          region: 'NP',
          components: [
            { category: 'GOLD_METAL', amount: 100000, description: 'Gold' },
          ],
          isOldGoldExchange: true,
          forceWaiver: { npLuxuryTax: true },
        };

        const result = await service.calculateTax(request);

        // Luxury tax should be present but waived
        const luxuryTax = result.taxes.find(t => t.type === 'LUXURY_TAX');
        expect(luxuryTax).toBeDefined();
        expect(luxuryTax!.taxAmount).toBe(0);
        expect(luxuryTax!.name).toContain('Waived');
        
        expect(result.meta.waiverApplied).toContain('NP_LUXURY_TAX');
      });
    });
  });

  describe('India GST Rules', () => {
    it('should apply 3% GST on precious metal and 5% GST on making charges', async () => {
      const request: TaxCalculationRequest = {
        region: 'IN',
        components: [
          { category: 'GOLD_METAL', amount: 100000, description: 'Gold' },
          { category: 'GOLD_MAKING', amount: 10000, description: 'Making' },
        ],
      };

      const result = await service.calculateTax(request);

      expect(result.taxRegime).toBe('IN_GST_2024');
      
      // GST on metal: 100000 * 3% = 3000
      const metalGst = result.taxes.find(t => t.name === 'GST on Metal');
      expect(metalGst).toBeDefined();
      expect(metalGst!.rate).toBe(0.03);
      expect(metalGst!.taxAmount).toBe(3000);
      
      // GST on making: 10000 * 5% = 500
      const makingGst = result.taxes.find(t => t.name === 'GST on Making');
      expect(makingGst).toBeDefined();
      expect(makingGst!.rate).toBe(0.05);
      expect(makingGst!.taxAmount).toBe(500);
      
      expect(result.taxTotal).toBe(3500);
    });

    it('should apply 3% GST on silver as well', async () => {
      const request: TaxCalculationRequest = {
        region: 'IN',
        components: [
          { category: 'SILVER_METAL', amount: 50000, description: 'Silver' },
        ],
      };

      const result = await service.calculateTax(request);

      const metalGst = result.taxes.find(t => t.name === 'GST on Metal');
      expect(metalGst).toBeDefined();
      expect(metalGst!.taxAmount).toBe(1500); // 50000 * 3%
    });
  });

  describe('UAE VAT Rules', () => {
    it('should apply 5% VAT on all components', async () => {
      const request: TaxCalculationRequest = {
        region: 'AE',
        components: [
          { category: 'GOLD_METAL', amount: 100000, description: 'Gold' },
          { category: 'GOLD_MAKING', amount: 10000, description: 'Making' },
          { category: 'DIAMOND', amount: 50000, description: 'Diamond' },
        ],
      };

      const result = await service.calculateTax(request);

      expect(result.taxRegime).toBe('AE_VAT_2024');
      expect(result.taxes).toHaveLength(1);
      
      const vat = result.taxes[0];
      expect(vat.type).toBe('VAT');
      expect(vat.rate).toBe(0.05);
      expect(vat.baseAmount).toBe(160000);
      expect(vat.taxAmount).toBe(8000); // 5% of 160000
    });
  });

  describe('UK VAT Rules', () => {
    it('should apply 20% VAT on jewellery', async () => {
      const request: TaxCalculationRequest = {
        region: 'UK',
        components: [
          { category: 'GOLD_METAL', amount: 10000, description: 'Gold ring' },
          { category: 'GOLD_MAKING', amount: 1000, description: 'Making' },
        ],
      };

      const result = await service.calculateTax(request);

      expect(result.taxRegime).toBe('UK_VAT_2024');
      expect(result.taxes).toHaveLength(1);
      
      const vat = result.taxes[0];
      expect(vat.rate).toBe(0.20);
      expect(vat.taxAmount).toBe(2200); // 20% of 11000
    });

    it('should exempt investment-grade gold from VAT', async () => {
      const request: TaxCalculationRequest = {
        region: 'UK',
        components: [
          { category: 'GOLD_METAL', amount: 100000, description: 'Gold bullion' },
        ],
        isInvestmentBullion: true,
      };

      const result = await service.calculateTax(request);

      expect(result.taxes).toHaveLength(1);
      const vat = result.taxes[0];
      expect(vat.name).toContain('Exempt');
      expect(vat.taxAmount).toBe(0);
    });
  });

  describe('US Tax Rules', () => {
    it('should apply no federal tax by default', async () => {
      const request: TaxCalculationRequest = {
        region: 'US',
        components: [
          { category: 'GOLD_METAL', amount: 10000, description: 'Gold' },
        ],
      };

      const result = await service.calculateTax(request);

      expect(result.taxRegime).toBe('US_SALES_TAX');
      expect(result.taxes).toHaveLength(0);
      expect(result.taxTotal).toBe(0);
    });
  });

  describe('Component Breakdown', () => {
    it('should correctly categorize all components', async () => {
      const request: TaxCalculationRequest = {
        region: 'NP',
        components: [
          { category: 'GOLD_METAL', amount: 100000, description: 'Gold' },
          { category: 'GOLD_MAKING', amount: 10000, description: 'Gold making' },
          { category: 'SILVER_METAL', amount: 20000, description: 'Silver' },
          { category: 'DIAMOND', amount: 30000, description: 'Diamond' },
          { category: 'GEMSTONE', amount: 15000, description: 'Gemstone' },
          { category: 'FINISH', amount: 2000, description: 'Finish' },
        ],
      };

      const result = await service.calculateTax(request);

      expect(result.components.goldMetalValue).toBe(100000);
      expect(result.components.goldMakingCharges).toBe(10000);
      expect(result.components.silverMetalValue).toBe(20000);
      expect(result.components.diamondValue).toBe(30000);
      expect(result.components.gemstoneValue).toBe(15000);
      expect(result.components.totalStoneValue).toBe(45000);
      expect(result.components.finishValue).toBe(2000);
      expect(result.components.subtotalBeforeTax).toBe(177000);
    });
  });

  describe('Tax Summary', () => {
    it('should return correct Nepal tax summary', async () => {
      const summary = await service.getTaxSummary('NP');

      expect(summary.regime).toBe('NP_2081_82_PLUS');
      expect(summary.taxes).toHaveLength(2);
      
      const luxuryTax = summary.taxes.find(t => t.type === 'LUXURY_TAX');
      expect(luxuryTax?.rate).toBe(0.02);
      expect(luxuryTax?.appliesTo).toContain('Gold');
      
      const vat = summary.taxes.find(t => t.type === 'VAT');
      expect(vat?.rate).toBe(0.13);
      expect(vat?.appliesTo).toContain('gemstones');
    });

    it('should return correct India tax summary', async () => {
      const summary = await service.getTaxSummary('IN');

      expect(summary.regime).toBe('IN_GST_2024');
      expect(summary.taxes).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amounts', async () => {
      const request: TaxCalculationRequest = {
        region: 'NP',
        components: [
          { category: 'GOLD_METAL', amount: 0, description: 'No gold' },
        ],
      };

      const result = await service.calculateTax(request);

      expect(result.taxes).toHaveLength(0);
      expect(result.taxTotal).toBe(0);
      expect(result.totalPayable).toBe(0);
    });

    it('should handle empty components array', async () => {
      const request: TaxCalculationRequest = {
        region: 'NP',
        components: [],
      };

      const result = await service.calculateTax(request);

      expect(result.taxes).toHaveLength(0);
      expect(result.taxTotal).toBe(0);
    });

    it('should handle unknown region with default (no tax)', async () => {
      const request: TaxCalculationRequest = {
        region: 'XX' as any,
        components: [
          { category: 'GOLD_METAL', amount: 10000, description: 'Gold' },
        ],
      };

      const result = await service.calculateTax(request);

      expect(result.taxes).toHaveLength(0);
    });
  });
});
