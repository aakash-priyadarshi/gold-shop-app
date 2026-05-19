/**
 * Finish Pricing Service
 * Handles pricing for plating, coatings, and surface finishes
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PricingFxService } from './pricing-fx.service';
import { FinishType, FinishTier, FinishPrice, SupportedCountry, SupportedCurrency } from '../types';

// Default finish prices in NPR (base currency)
// These are flat fees per piece
const DEFAULT_FINISH_PRICES_NPR: Record<FinishType, Record<FinishTier, number>> = {
  [FinishType.GOLD_PLATING]: {
    [FinishTier.LIGHT]: 350,      // 0.5-1 micron
    [FinishTier.STANDARD]: 650,   // 1-2.5 microns
    [FinishTier.PREMIUM]: 1200,   // 2.5-5 microns
  },
  [FinishType.ROSE_GOLD_PLATING]: {
    [FinishTier.LIGHT]: 400,
    [FinishTier.STANDARD]: 750,
    [FinishTier.PREMIUM]: 1400,
  },
  [FinishType.VERMEIL]: {
    [FinishTier.LIGHT]: 800,      // 2.5μm minimum for vermeil
    [FinishTier.STANDARD]: 1200,
    [FinishTier.PREMIUM]: 2000,
  },
  [FinishType.PVD_COATING]: {
    [FinishTier.LIGHT]: 500,
    [FinishTier.STANDARD]: 900,
    [FinishTier.PREMIUM]: 1500,
  },
  [FinishType.RHODIUM_PLATING]: {
    [FinishTier.LIGHT]: 400,
    [FinishTier.STANDARD]: 700,
    [FinishTier.PREMIUM]: 1200,
  },
  [FinishType.SILVER_PLATING]: {
    [FinishTier.LIGHT]: 200,
    [FinishTier.STANDARD]: 350,
    [FinishTier.PREMIUM]: 600,
  },
  [FinishType.OXIDISED_FINISH]: {
    [FinishTier.LIGHT]: 150,
    [FinishTier.STANDARD]: 250,
    [FinishTier.PREMIUM]: 400,
  },
  [FinishType.ENAMEL_COATING]: {
    [FinishTier.LIGHT]: 300,
    [FinishTier.STANDARD]: 550,
    [FinishTier.PREMIUM]: 900,
  },
};

// INR to NPR approximate ratio for conversion
const INR_NPR_RATIO = 1.60;

// Vermeil is only valid on Sterling Silver 925
const VERMEIL_ALLOWED_CORES = ['SILVER_925', 'STERLING_SILVER', 'STERLING_SILVER_925'];

@Injectable()
export class FinishPricingService {
  private readonly logger = new Logger(FinishPricingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fxService: PricingFxService,
  ) {}

  /**
   * Get finish price for a specific finish type and tier
   * Priority: 1) Shop override, 2) DB platform rate, 3) Default constant
   */
  async getFinishPrice(
    finishType: FinishType,
    tier: FinishTier,
    country: SupportedCountry,
    shopId?: string,
  ): Promise<FinishPrice> {
    const currency: SupportedCurrency = country === 'IN' ? 'INR' : 'NPR';
    
    // 1) Check shop override if shopId provided
    if (shopId) {
      const shopPrice = await this.getShopFinishPrice(shopId, finishType, tier);
      if (shopPrice) {
        return this.convertToCurrency(shopPrice, currency);
      }
    }

    // 2) Check platform DB rate
    const dbPrice = await this.getPlatformFinishPrice(finishType, tier);
    if (dbPrice) {
      return this.convertToCurrency(dbPrice, currency);
    }

    // 3) Use default constant
    return this.getDefaultFinishPrice(finishType, tier, currency);
  }

  /**
   * Get all finish prices for a country
   */
  async getAllFinishPrices(country: SupportedCountry): Promise<FinishPrice[]> {
    const prices: FinishPrice[] = [];
    
    for (const finishType of Object.values(FinishType)) {
      for (const tier of Object.values(FinishTier)) {
        const price = await this.getFinishPrice(finishType, tier, country);
        prices.push(price);
      }
    }
    
    return prices;
  }

  /**
   * Validate vermeil selection (only allowed on Sterling Silver)
   */
  validateVermeil(finishType: FinishType, coreMaterial: string): { valid: boolean; message?: string } {
    if (finishType !== FinishType.VERMEIL) {
      return { valid: true };
    }

    const normalizedCore = coreMaterial.toUpperCase().replace(/\s+/g, '_');
    if (VERMEIL_ALLOWED_CORES.includes(normalizedCore)) {
      return { valid: true };
    }

    return {
      valid: false,
      message: 'Vermeil finish is only allowed on Sterling Silver 925 core material',
    };
  }

  /**
   * Get finish description with thickness info
   */
  getFinishDescription(finishType: FinishType, tier: FinishTier): string {
    const thicknessMap: Record<FinishTier, string> = {
      [FinishTier.LIGHT]: '0.5-1 micron',
      [FinishTier.STANDARD]: '1-2.5 microns',
      [FinishTier.PREMIUM]: '2.5-5 microns',
    };

    const typeNames: Record<FinishType, string> = {
      [FinishType.GOLD_PLATING]: 'Gold Plating',
      [FinishType.ROSE_GOLD_PLATING]: 'Rose Gold Plating',
      [FinishType.VERMEIL]: 'Vermeil (Gold on Silver)',
      [FinishType.PVD_COATING]: 'PVD Coating',
      [FinishType.RHODIUM_PLATING]: 'Rhodium Plating',
      [FinishType.SILVER_PLATING]: 'Silver Plating',
      [FinishType.OXIDISED_FINISH]: 'Oxidised Finish',
      [FinishType.ENAMEL_COATING]: 'Enamel Coating',
    };

    return `${typeNames[finishType]} (${tier}, ${thicknessMap[tier]})`;
  }

  /**
   * Convert price to target currency
   */
  private convertToCurrency(price: FinishPrice, targetCurrency: SupportedCurrency): FinishPrice {
    if (price.currency === targetCurrency) {
      return price;
    }

    // Convert between INR and NPR
    let convertedFee: number;
    if (price.currency === 'NPR' && targetCurrency === 'INR') {
      convertedFee = price.flatFeeLocal / INR_NPR_RATIO;
    } else {
      convertedFee = price.flatFeeLocal * INR_NPR_RATIO;
    }

    return {
      ...price,
      flatFeeLocal: parseFloat(convertedFee.toFixed(2)),
      currency: targetCurrency,
    };
  }

  /**
   * Get shop-specific finish price
   */
  private async getShopFinishPrice(
    shopId: string,
    finishType: FinishType,
    tier: FinishTier,
  ): Promise<FinishPrice | null> {
    try {
      const shopPrice = await this.prisma.shopFinishPricing.findUnique({
        where: {
          shopId_finishType_tier: {
            shopId,
            finishType: finishType,
            tier: tier,
          },
        },
      });

      if (shopPrice) {
        return {
          finishType,
          tier,
          flatFeeLocal: shopPrice.priceNpr,
          currency: 'NPR',
          source: 'manual',
          updatedAt: new Date().toISOString(),
        };
      }
    } catch (error) {
      this.logger.debug(`Shop finish price not found: ${error}`);
    }
    
    return null;
  }

  /**
   * Get platform-wide finish price from DB
   */
  private async getPlatformFinishPrice(
    finishType: FinishType,
    tier: FinishTier,
  ): Promise<FinishPrice | null> {
    try {
      const dbPrice = await this.prisma.finishPrice.findFirst({
        where: {
          finishType: finishType,
          tier: tier,
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (dbPrice) {
        return {
          finishType: dbPrice.finishType as FinishType,
          tier: dbPrice.tier as FinishTier,
          flatFeeLocal: dbPrice.flatFee,
          currency: dbPrice.currency as SupportedCurrency,
          source: dbPrice.source as 'seed' | 'manual',
          updatedAt: dbPrice.updatedAt.toISOString(),
        };
      }
    } catch (error) {
      // Table might not exist yet
      this.logger.debug(`FinishPrice table not available: ${error}`);
    }
    
    return null;
  }

  /**
   * Get default finish price (hard-coded fallback)
   */
  private getDefaultFinishPrice(
    finishType: FinishType,
    tier: FinishTier,
    currency: SupportedCurrency,
  ): FinishPrice {
    const priceNPR = DEFAULT_FINISH_PRICES_NPR[finishType]?.[tier] || 500;
    
    // Convert to INR if needed
    const flatFeeLocal = currency === 'INR' 
      ? parseFloat((priceNPR / INR_NPR_RATIO).toFixed(2))
      : priceNPR;

    return {
      finishType,
      tier,
      flatFeeLocal,
      currency,
      source: 'seed',
      updatedAt: new Date().toISOString(),
    };
  }
}
