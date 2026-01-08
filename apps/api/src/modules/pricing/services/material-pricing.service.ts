/**
 * Material Pricing Service
 * Handles pricing for alloys, base metals, and special metals
 * Uses seeded dummy data with fabrication markups
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PricingFxService } from './pricing-fx.service';
import { MaterialCode, MaterialRate, SupportedCountry, SupportedCurrency } from '../types';

// Fabrication markups (raw commodity → jewellery-ready)
const ALLOY_MARKUP = 8;
const BASE_METAL_MARKUP = 10;
const SPECIAL_METAL_MARKUP = 12;

// Raw commodity spot prices in USD per gram (approximate Jan 2026)
// These are base prices before fabrication markup
const RAW_SPOT_PRICES_USD_PER_GRAM: Record<MaterialCode, number> = {
  // Base metals (from commodity exchanges)
  [MaterialCode.COPPER]: 0.013,       // ~$12-13k/ton
  [MaterialCode.ZINC]: 0.0032,        // ~$3.2k/ton
  [MaterialCode.NICKEL]: 0.0175,      // ~$17.5k/ton
  
  // Alloys (derived from component prices)
  [MaterialCode.BRASS]: 0.009,        // Copper+Zinc weighted
  [MaterialCode.BRONZE]: 0.011,       // Copper+Tin weighted
  [MaterialCode.BRASS_ALLOY]: 0.010,
  [MaterialCode.BRONZE_ALLOY]: 0.012,
  [MaterialCode.PALLADIUM_ALLOY]: 0.08, // Much lower than pure
  [MaterialCode.SILVER_ALLOY]: 0.025,
  
  // Special metals
  [MaterialCode.STAINLESS_STEEL_316L]: 0.005, // ~$5k/ton
  [MaterialCode.TITANIUM]: 0.015,     // ~$15/kg
  [MaterialCode.TUNGSTEN_CARBIDE]: 0.020, // Industrial
  [MaterialCode.COBALT_CHROME]: 0.018,
};

// Markup categories
const MARKUP_BY_MATERIAL: Record<MaterialCode, number> = {
  [MaterialCode.COPPER]: BASE_METAL_MARKUP,
  [MaterialCode.ZINC]: BASE_METAL_MARKUP,
  [MaterialCode.NICKEL]: BASE_METAL_MARKUP,
  [MaterialCode.BRASS]: ALLOY_MARKUP,
  [MaterialCode.BRONZE]: ALLOY_MARKUP,
  [MaterialCode.BRASS_ALLOY]: ALLOY_MARKUP,
  [MaterialCode.BRONZE_ALLOY]: ALLOY_MARKUP,
  [MaterialCode.PALLADIUM_ALLOY]: ALLOY_MARKUP,
  [MaterialCode.SILVER_ALLOY]: ALLOY_MARKUP,
  [MaterialCode.STAINLESS_STEEL_316L]: SPECIAL_METAL_MARKUP,
  [MaterialCode.TITANIUM]: SPECIAL_METAL_MARKUP,
  [MaterialCode.TUNGSTEN_CARBIDE]: SPECIAL_METAL_MARKUP,
  [MaterialCode.COBALT_CHROME]: SPECIAL_METAL_MARKUP,
};

// Restricted materials (require compliance check)
const RESTRICTED_MATERIALS: MaterialCode[] = [MaterialCode.NICKEL];

@Injectable()
export class MaterialPricingService {
  private readonly logger = new Logger(MaterialPricingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fxService: PricingFxService,
  ) {}

  /**
   * Get material rate for a specific material and country
   * Priority: 1) Shop override, 2) DB platform rate, 3) Calculated from spot
   */
  async getMaterialRate(
    materialCode: MaterialCode,
    country: SupportedCountry,
    shopId?: string,
  ): Promise<MaterialRate> {
    const { rate: fxRate, currency } = await this.fxService.getFxRateForCountry(country);
    
    // 1) Check shop override if shopId provided
    if (shopId) {
      const shopRate = await this.getShopMaterialRate(shopId, materialCode, currency);
      if (shopRate) {
        return shopRate;
      }
    }

    // 2) Check platform DB rate
    const dbRate = await this.getPlatformMaterialRate(materialCode, currency);
    if (dbRate) {
      return dbRate;
    }

    // 3) Calculate from spot price + markup + FX
    return this.calculateMaterialRate(materialCode, fxRate, currency);
  }

  /**
   * Get all material rates for a country
   */
  async getAllMaterialRates(country: SupportedCountry): Promise<MaterialRate[]> {
    const rates: MaterialRate[] = [];
    
    for (const code of Object.values(MaterialCode)) {
      const rate = await this.getMaterialRate(code, country);
      rates.push(rate);
    }
    
    return rates;
  }

  /**
   * Calculate material rate from spot price
   */
  private calculateMaterialRate(
    materialCode: MaterialCode,
    fxRate: number,
    currency: SupportedCurrency,
  ): MaterialRate {
    const spotPriceUsd = RAW_SPOT_PRICES_USD_PER_GRAM[materialCode] || 0.01;
    const markup = MARKUP_BY_MATERIAL[materialCode] || ALLOY_MARKUP;
    
    // Apply fabrication markup
    const ratePerGramUsd = spotPriceUsd * markup;
    
    // Convert to local currency
    const ratePerGramLocal = ratePerGramUsd * fxRate;

    return {
      materialCode,
      ratePerGramUsd: parseFloat(ratePerGramUsd.toFixed(4)),
      ratePerGramLocal: parseFloat(ratePerGramLocal.toFixed(2)),
      currency,
      source: 'calculated',
      isRestricted: RESTRICTED_MATERIALS.includes(materialCode),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get shop-specific material rate
   */
  private async getShopMaterialRate(
    shopId: string,
    materialCode: MaterialCode,
    currency: SupportedCurrency,
  ): Promise<MaterialRate | null> {
    // TODO: Query ShopMaterialRate table when implemented
    // For now, return null to use platform rates
    return null;
  }

  /**
   * Get platform-wide material rate from DB
   */
  private async getPlatformMaterialRate(
    materialCode: MaterialCode,
    currency: SupportedCurrency,
  ): Promise<MaterialRate | null> {
    try {
      const dbRate = await this.prisma.materialRate.findFirst({
        where: {
          materialCode: materialCode,
          currency: currency,
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (dbRate) {
        return {
          materialCode: dbRate.materialCode as MaterialCode,
          ratePerGramUsd: dbRate.ratePerGramUsd,
          ratePerGramLocal: dbRate.ratePerGramLocal,
          currency: dbRate.currency as SupportedCurrency,
          source: dbRate.source as 'seed' | 'manual',
          isRestricted: dbRate.isRestricted,
          updatedAt: dbRate.updatedAt.toISOString(),
        };
      }
    } catch (error) {
      // Table might not exist yet
      this.logger.debug(`MaterialRate table not available: ${error}`);
    }
    
    return null;
  }

  /**
   * Check if material is restricted (e.g., Nickel)
   */
  isRestricted(materialCode: MaterialCode): boolean {
    return RESTRICTED_MATERIALS.includes(materialCode);
  }

  /**
   * Check if shop allows restricted material
   */
  async isShopAllowedMaterial(shopId: string, materialCode: MaterialCode): Promise<boolean> {
    if (!this.isRestricted(materialCode)) {
      return true;
    }

    try {
      const shop = await this.prisma.shop.findUnique({
        where: { id: shopId },
        select: { supportedMaterials: true },
      });

      // Check if shop explicitly allows nickel
      return shop?.supportedMaterials?.includes('NICKEL_ALLOWED') ?? false;
    } catch (error) {
      this.logger.warn(`Failed to check shop compliance: ${error}`);
      return false;
    }
  }

  /**
   * Get fallback prices (hard-coded defaults)
   * Used only if DB is empty
   */
  getFallbackPrices(): Record<MaterialCode, number> {
    const fallback: Record<string, number> = {};
    
    for (const code of Object.values(MaterialCode)) {
      const spotPriceUsd = RAW_SPOT_PRICES_USD_PER_GRAM[code] || 0.01;
      const markup = MARKUP_BY_MATERIAL[code] || ALLOY_MARKUP;
      fallback[code] = parseFloat((spotPriceUsd * markup).toFixed(4));
    }
    
    return fallback as Record<MaterialCode, number>;
  }
}
