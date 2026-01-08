/**
 * Gemstones Pricing Service
 * Handles pricing for gemstones and their settings
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PricingFxService } from './pricing-fx.service';
import {
  StoneType,
  DiamondOrigin,
  QualityTier,
  SettingType,
  GemstonePrice,
  SettingPrice,
  SupportedCountry,
  SupportedCurrency,
} from '../types';

// Default gemstone prices in NPR per stone
// Organized by type, then size ranges, then quality
const DEFAULT_GEMSTONE_PRICES_NPR: Record<StoneType, Record<string, Record<QualityTier, number>>> = {
  [StoneType.CZ]: {
    '1-2mm': { [QualityTier.BUDGET]: 15, [QualityTier.STANDARD]: 25, [QualityTier.PREMIUM]: 50 },
    '2-4mm': { [QualityTier.BUDGET]: 30, [QualityTier.STANDARD]: 50, [QualityTier.PREMIUM]: 100 },
    '4-6mm': { [QualityTier.BUDGET]: 60, [QualityTier.STANDARD]: 100, [QualityTier.PREMIUM]: 180 },
    '6-8mm': { [QualityTier.BUDGET]: 120, [QualityTier.STANDARD]: 200, [QualityTier.PREMIUM]: 350 },
  },
  [StoneType.MOISSANITE]: {
    '1-2mm': { [QualityTier.BUDGET]: 800, [QualityTier.STANDARD]: 1200, [QualityTier.PREMIUM]: 2000 },
    '2-4mm': { [QualityTier.BUDGET]: 2500, [QualityTier.STANDARD]: 4000, [QualityTier.PREMIUM]: 6500 },
    '4-6mm': { [QualityTier.BUDGET]: 6000, [QualityTier.STANDARD]: 10000, [QualityTier.PREMIUM]: 16000 },
    '6-8mm': { [QualityTier.BUDGET]: 15000, [QualityTier.STANDARD]: 25000, [QualityTier.PREMIUM]: 40000 },
  },
  [StoneType.DIAMOND]: {
    // For natural diamonds - priced by carat ranges
    '0.1-0.25ct': { [QualityTier.BUDGET]: 8000, [QualityTier.STANDARD]: 15000, [QualityTier.PREMIUM]: 30000 },
    '0.25-0.5ct': { [QualityTier.BUDGET]: 25000, [QualityTier.STANDARD]: 50000, [QualityTier.PREMIUM]: 100000 },
    '0.5-1ct': { [QualityTier.BUDGET]: 80000, [QualityTier.STANDARD]: 150000, [QualityTier.PREMIUM]: 350000 },
    '1-2ct': { [QualityTier.BUDGET]: 200000, [QualityTier.STANDARD]: 450000, [QualityTier.PREMIUM]: 1000000 },
  },
  [StoneType.RUBY]: {
    '1-3mm': { [QualityTier.BUDGET]: 500, [QualityTier.STANDARD]: 1500, [QualityTier.PREMIUM]: 4000 },
    '3-5mm': { [QualityTier.BUDGET]: 2000, [QualityTier.STANDARD]: 6000, [QualityTier.PREMIUM]: 15000 },
    '5-7mm': { [QualityTier.BUDGET]: 8000, [QualityTier.STANDARD]: 25000, [QualityTier.PREMIUM]: 60000 },
  },
  [StoneType.SAPPHIRE]: {
    '1-3mm': { [QualityTier.BUDGET]: 400, [QualityTier.STANDARD]: 1200, [QualityTier.PREMIUM]: 3500 },
    '3-5mm': { [QualityTier.BUDGET]: 1500, [QualityTier.STANDARD]: 5000, [QualityTier.PREMIUM]: 12000 },
    '5-7mm': { [QualityTier.BUDGET]: 6000, [QualityTier.STANDARD]: 20000, [QualityTier.PREMIUM]: 50000 },
  },
  [StoneType.EMERALD]: {
    '1-3mm': { [QualityTier.BUDGET]: 600, [QualityTier.STANDARD]: 2000, [QualityTier.PREMIUM]: 5000 },
    '3-5mm': { [QualityTier.BUDGET]: 3000, [QualityTier.STANDARD]: 8000, [QualityTier.PREMIUM]: 20000 },
    '5-7mm': { [QualityTier.BUDGET]: 12000, [QualityTier.STANDARD]: 35000, [QualityTier.PREMIUM]: 80000 },
  },
  [StoneType.PEARL]: {
    '3-5mm': { [QualityTier.BUDGET]: 200, [QualityTier.STANDARD]: 500, [QualityTier.PREMIUM]: 1200 },
    '5-7mm': { [QualityTier.BUDGET]: 500, [QualityTier.STANDARD]: 1200, [QualityTier.PREMIUM]: 3000 },
    '7-10mm': { [QualityTier.BUDGET]: 1200, [QualityTier.STANDARD]: 3000, [QualityTier.PREMIUM]: 8000 },
  },
  [StoneType.SEMI_PRECIOUS]: {
    '1-3mm': { [QualityTier.BUDGET]: 50, [QualityTier.STANDARD]: 100, [QualityTier.PREMIUM]: 250 },
    '3-5mm': { [QualityTier.BUDGET]: 100, [QualityTier.STANDARD]: 250, [QualityTier.PREMIUM]: 600 },
    '5-8mm': { [QualityTier.BUDGET]: 250, [QualityTier.STANDARD]: 600, [QualityTier.PREMIUM]: 1500 },
  },
};

// Lab diamond discount (typically 50-70% cheaper than natural)
const LAB_DIAMOND_DISCOUNT = 0.35; // Lab diamonds at 35% of natural price

// Setting prices in NPR per stone
const DEFAULT_SETTING_PRICES_NPR: Record<SettingType, number> = {
  [SettingType.PRONG]: 150,
  [SettingType.BEZEL]: 250,
  [SettingType.PAVE]: 100, // Per stone in pave
  [SettingType.CHANNEL]: 180,
  [SettingType.HALO]: 350,
  [SettingType.FLUSH]: 200,
  [SettingType.TENSION]: 400,
};

// INR to NPR ratio
const INR_NPR_RATIO = 1.60;

@Injectable()
export class GemstonesPricingService {
  private readonly logger = new Logger(GemstonesPricingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fxService: PricingFxService,
  ) {}

  /**
   * Get gemstone price based on type, size, quality, and origin
   */
  async getGemstonePrice(
    stoneType: StoneType,
    sizeMm: number | undefined,
    caratWeight: number | undefined,
    qualityTier: QualityTier,
    country: SupportedCountry,
    origin?: DiamondOrigin,
    shopId?: string,
  ): Promise<GemstonePrice> {
    const currency: SupportedCurrency = country === 'IN' ? 'INR' : 'NPR';
    
    // Determine size range key
    const sizeRange = this.getSizeRange(stoneType, sizeMm, caratWeight);
    
    // 1) Check shop override
    if (shopId) {
      const shopPrice = await this.getShopGemstonePrice(shopId, stoneType, sizeRange, qualityTier);
      if (shopPrice) {
        return this.convertToCurrency(shopPrice, currency);
      }
    }

    // 2) Check platform DB rate
    const dbPrice = await this.getPlatformGemstonePrice(stoneType, sizeRange, qualityTier, origin);
    if (dbPrice) {
      return this.convertToCurrency(dbPrice, currency);
    }

    // 3) Use default constant
    return this.getDefaultGemstonePrice(stoneType, sizeRange, qualityTier, currency, origin, sizeMm, caratWeight);
  }

  /**
   * Get setting price for a stone setting type
   */
  async getSettingPrice(
    settingType: SettingType,
    country: SupportedCountry,
    shopId?: string,
  ): Promise<SettingPrice> {
    const currency: SupportedCurrency = country === 'IN' ? 'INR' : 'NPR';
    
    // 1) Check shop override
    if (shopId) {
      const shopPrice = await this.getShopSettingPrice(shopId, settingType);
      if (shopPrice) {
        return this.convertSettingToCurrency(shopPrice, currency);
      }
    }

    // 2) Check platform DB rate
    const dbPrice = await this.getPlatformSettingPrice(settingType);
    if (dbPrice) {
      return this.convertSettingToCurrency(dbPrice, currency);
    }

    // 3) Use default constant
    return this.getDefaultSettingPrice(settingType, currency);
  }

  /**
   * Calculate total gemstone cost for multiple stones
   */
  async calculateTotalGemstoneCost(
    stones: Array<{
      stoneType: StoneType;
      sizeMm?: number;
      caratWeight?: number;
      qualityTier: QualityTier;
      settingType: SettingType;
      count: number;
      origin?: DiamondOrigin;
    }>,
    country: SupportedCountry,
    shopId?: string,
  ): Promise<{
    stonesCost: number;
    settingsCost: number;
    total: number;
    currency: SupportedCurrency;
    breakdown: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  }> {
    const currency: SupportedCurrency = country === 'IN' ? 'INR' : 'NPR';
    let stonesCost = 0;
    let settingsCost = 0;
    const breakdown: Array<{ description: string; quantity: number; unitPrice: number; total: number }> = [];

    for (const stone of stones) {
      // Get stone price
      const stonePrice = await this.getGemstonePrice(
        stone.stoneType,
        stone.sizeMm,
        stone.caratWeight,
        stone.qualityTier,
        country,
        stone.origin,
        shopId,
      );

      const stoneTotalCost = stonePrice.pricePerStone * stone.count;
      stonesCost += stoneTotalCost;

      breakdown.push({
        description: `${this.getStoneTypeName(stone.stoneType)} (${stone.qualityTier})`,
        quantity: stone.count,
        unitPrice: stonePrice.pricePerStone,
        total: stoneTotalCost,
      });

      // Get setting price
      const settingPrice = await this.getSettingPrice(stone.settingType, country, shopId);
      const settingTotalCost = settingPrice.flatFeePerStone * stone.count;
      settingsCost += settingTotalCost;

      breakdown.push({
        description: `${stone.settingType} setting`,
        quantity: stone.count,
        unitPrice: settingPrice.flatFeePerStone,
        total: settingTotalCost,
      });
    }

    return {
      stonesCost: parseFloat(stonesCost.toFixed(2)),
      settingsCost: parseFloat(settingsCost.toFixed(2)),
      total: parseFloat((stonesCost + settingsCost).toFixed(2)),
      currency,
      breakdown,
    };
  }

  /**
   * Get human-readable stone type name
   */
  private getStoneTypeName(stoneType: StoneType): string {
    const names: Record<StoneType, string> = {
      [StoneType.DIAMOND]: 'Diamond',
      [StoneType.MOISSANITE]: 'Moissanite',
      [StoneType.CZ]: 'Cubic Zirconia',
      [StoneType.RUBY]: 'Ruby',
      [StoneType.SAPPHIRE]: 'Sapphire',
      [StoneType.EMERALD]: 'Emerald',
      [StoneType.PEARL]: 'Pearl',
      [StoneType.SEMI_PRECIOUS]: 'Semi-Precious Stone',
    };
    return names[stoneType] || stoneType;
  }

  /**
   * Determine size range key based on stone type and size
   */
  private getSizeRange(
    stoneType: StoneType,
    sizeMm?: number,
    caratWeight?: number,
  ): string {
    // For diamonds, use carat weight ranges
    if (stoneType === StoneType.DIAMOND && caratWeight) {
      if (caratWeight < 0.25) return '0.1-0.25ct';
      if (caratWeight < 0.5) return '0.25-0.5ct';
      if (caratWeight < 1) return '0.5-1ct';
      return '1-2ct';
    }

    // For other stones, use mm ranges
    const mm = sizeMm || 3; // Default to 3mm if not specified
    
    if (stoneType === StoneType.PEARL) {
      if (mm < 5) return '3-5mm';
      if (mm < 7) return '5-7mm';
      return '7-10mm';
    }

    if ([StoneType.CZ, StoneType.MOISSANITE].includes(stoneType)) {
      if (mm < 2) return '1-2mm';
      if (mm < 4) return '2-4mm';
      if (mm < 6) return '4-6mm';
      return '6-8mm';
    }

    // Colored gems
    if (mm < 3) return '1-3mm';
    if (mm < 5) return '3-5mm';
    return '5-7mm';
  }

  /**
   * Convert gemstone price to target currency
   */
  private convertToCurrency(price: GemstonePrice, targetCurrency: SupportedCurrency): GemstonePrice {
    if (price.currency === targetCurrency) {
      return price;
    }

    let convertedPrice: number;
    if (price.currency === 'NPR' && targetCurrency === 'INR') {
      convertedPrice = price.pricePerStone / INR_NPR_RATIO;
    } else {
      convertedPrice = price.pricePerStone * INR_NPR_RATIO;
    }

    return {
      ...price,
      pricePerStone: parseFloat(convertedPrice.toFixed(2)),
      currency: targetCurrency,
    };
  }

  /**
   * Convert setting price to target currency
   */
  private convertSettingToCurrency(price: SettingPrice, targetCurrency: SupportedCurrency): SettingPrice {
    if (price.currency === targetCurrency) {
      return price;
    }

    let convertedPrice: number;
    if (price.currency === 'NPR' && targetCurrency === 'INR') {
      convertedPrice = price.flatFeePerStone / INR_NPR_RATIO;
    } else {
      convertedPrice = price.flatFeePerStone * INR_NPR_RATIO;
    }

    return {
      ...price,
      flatFeePerStone: parseFloat(convertedPrice.toFixed(2)),
      currency: targetCurrency,
    };
  }

  /**
   * Get shop-specific gemstone price
   */
  private async getShopGemstonePrice(
    shopId: string,
    stoneType: StoneType,
    sizeRange: string,
    qualityTier: QualityTier,
  ): Promise<GemstonePrice | null> {
    // TODO: Query ShopGemstonePrice table when implemented
    return null;
  }

  /**
   * Get platform gemstone price from DB
   */
  private async getPlatformGemstonePrice(
    stoneType: StoneType,
    sizeRange: string,
    qualityTier: QualityTier,
    origin?: DiamondOrigin,
  ): Promise<GemstonePrice | null> {
    try {
      const [sizeMin, sizeMax] = this.parseSizeRange(sizeRange);
      
      const dbPrice = await this.prisma.gemstoneCatalog.findFirst({
        where: {
          stoneType: stoneType,
          qualityTier: qualityTier,
          sizeMin: { lte: sizeMin + 0.5 },
          sizeMax: { gte: sizeMax - 0.5 },
          ...(origin && stoneType === StoneType.DIAMOND ? { origin } : {}),
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (dbPrice) {
        return {
          stoneType: dbPrice.stoneType as StoneType,
          origin: dbPrice.origin as DiamondOrigin | undefined,
          sizeUnit: dbPrice.sizeUnit as 'MM' | 'CARAT',
          sizeMin: dbPrice.sizeMin,
          sizeMax: dbPrice.sizeMax,
          qualityTier: dbPrice.qualityTier as QualityTier,
          pricePerStone: dbPrice.pricePerStone,
          currency: dbPrice.currency as SupportedCurrency,
          source: dbPrice.source as 'seed' | 'manual',
          updatedAt: dbPrice.updatedAt.toISOString(),
        };
      }
    } catch (error) {
      this.logger.debug(`GemstoneCatalog table not available: ${error}`);
    }
    
    return null;
  }

  /**
   * Parse size range string to min/max values
   */
  private parseSizeRange(sizeRange: string): [number, number] {
    // Handle mm ranges like "1-2mm", "3-5mm"
    const mmMatch = sizeRange.match(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)mm/);
    if (mmMatch) {
      return [parseFloat(mmMatch[1]), parseFloat(mmMatch[2])];
    }

    // Handle carat ranges like "0.1-0.25ct", "0.5-1ct"
    const ctMatch = sizeRange.match(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)ct/);
    if (ctMatch) {
      return [parseFloat(ctMatch[1]), parseFloat(ctMatch[2])];
    }

    return [1, 3]; // Default
  }

  /**
   * Get shop-specific setting price
   */
  private async getShopSettingPrice(
    shopId: string,
    settingType: SettingType,
  ): Promise<SettingPrice | null> {
    // TODO: Query ShopSettingPrice table when implemented
    return null;
  }

  /**
   * Get platform setting price from DB
   */
  private async getPlatformSettingPrice(settingType: SettingType): Promise<SettingPrice | null> {
    try {
      const dbPrice = await this.prisma.settingPrice.findFirst({
        where: { settingType: settingType },
        orderBy: { updatedAt: 'desc' },
      });

      if (dbPrice) {
        return {
          settingType: dbPrice.settingType as SettingType,
          flatFeePerStone: dbPrice.flatFeePerStone,
          currency: dbPrice.currency as SupportedCurrency,
          source: dbPrice.source as 'seed' | 'manual',
          updatedAt: dbPrice.updatedAt.toISOString(),
        };
      }
    } catch (error) {
      this.logger.debug(`SettingPrice table not available: ${error}`);
    }
    
    return null;
  }

  /**
   * Get default gemstone price (hard-coded fallback)
   */
  private getDefaultGemstonePrice(
    stoneType: StoneType,
    sizeRange: string,
    qualityTier: QualityTier,
    currency: SupportedCurrency,
    origin?: DiamondOrigin,
    sizeMm?: number,
    caratWeight?: number,
  ): GemstonePrice {
    let priceNPR = DEFAULT_GEMSTONE_PRICES_NPR[stoneType]?.[sizeRange]?.[qualityTier] || 500;
    
    // Apply lab diamond discount
    if (stoneType === StoneType.DIAMOND && origin === DiamondOrigin.LAB) {
      priceNPR = priceNPR * LAB_DIAMOND_DISCOUNT;
    }

    // Convert to INR if needed
    const priceLocal = currency === 'INR' 
      ? parseFloat((priceNPR / INR_NPR_RATIO).toFixed(2))
      : priceNPR;

    const [sizeMin, sizeMax] = this.parseSizeRange(sizeRange);
    const isCaratBased = sizeRange.includes('ct');

    return {
      stoneType,
      origin: stoneType === StoneType.DIAMOND ? (origin || DiamondOrigin.NATURAL) : undefined,
      sizeUnit: isCaratBased ? 'CARAT' : 'MM',
      sizeMin,
      sizeMax,
      qualityTier,
      pricePerStone: priceLocal,
      currency,
      source: 'seed',
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get default setting price (hard-coded fallback)
   */
  private getDefaultSettingPrice(
    settingType: SettingType,
    currency: SupportedCurrency,
  ): SettingPrice {
    const priceNPR = DEFAULT_SETTING_PRICES_NPR[settingType] || 150;
    
    // Convert to INR if needed
    const priceLocal = currency === 'INR' 
      ? parseFloat((priceNPR / INR_NPR_RATIO).toFixed(2))
      : priceNPR;

    return {
      settingType,
      flatFeePerStone: priceLocal,
      currency,
      source: 'seed',
      updatedAt: new Date().toISOString(),
    };
  }
}
