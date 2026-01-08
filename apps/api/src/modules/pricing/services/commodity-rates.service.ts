/**
 * Commodity Rates Service
 * 
 * Handles pricing for:
 * - Precious metals (via MetalpriceAPI - already in market-rates)
 * - Base metals (via config tables with optional LME integration)
 * 
 * Features:
 * - Per-gram pricing derived from spot prices
 * - Purity multipliers for precious metals
 * - Caching with fallback values
 * - Audit trail for price sources
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { MarketRatesService } from '../../market-rates/market-rates.service';
import { FxRatesService, CurrencyCode } from '../../fx-rates';
import { MarketRegion } from '../../market-rates/types';

// Troy ounce to grams conversion
export const TROY_OUNCE_TO_GRAMS = 31.1034768;

// Metal purity multipliers (canonical values)
export const PURITY_MULTIPLIERS = {
  // Gold
  GOLD_24K: 1.0,      // 99.9% pure
  GOLD_22K: 0.9167,   // 91.67% pure
  GOLD_18K: 0.75,     // 75% pure
  GOLD_14K: 0.585,    // 58.5% pure
  GOLD_10K: 0.417,    // 41.7% pure
  // Silver
  SILVER_999: 1.0,    // 99.9% pure (Fine silver)
  SILVER_925: 0.925,  // 92.5% pure (Sterling silver)
  // Platinum
  PLATINUM_PT950: 0.95, // 95% pure
  PLATINUM_PT900: 0.90, // 90% pure
  // Palladium
  PALLADIUM_PD950: 0.95, // 95% pure
} as const;

// Default base metal prices (USD per gram) - used as fallback
export const DEFAULT_BASE_METAL_PRICES_USD: Record<string, number> = {
  COPPER: 0.0085,      // ~$8.5/kg
  ZINC: 0.0025,        // ~$2.5/kg
  NICKEL: 0.018,       // ~$18/kg (restricted)
  TIN: 0.025,          // ~$25/kg
  BRASS: 0.006,        // Copper + Zinc alloy
  BRONZE: 0.008,       // Copper + Tin alloy
  STAINLESS_STEEL_316L: 0.004, // ~$4/kg
  TITANIUM: 0.015,     // ~$15/kg
  TUNGSTEN_CARBIDE: 0.035, // ~$35/kg
  COBALT_CHROME: 0.045, // ~$45/kg
  PALLADIUM_ALLOY: 0.025, // Lower grade palladium alloy
  SILVER_ALLOY: 0.015, // Silver-based alloy
};

// Spot price symbols
export const SPOT_SYMBOLS = {
  GOLD: 'XAU',
  SILVER: 'XAG',
  PLATINUM: 'XPT',
  PALLADIUM: 'XPD',
} as const;

export interface SpotPriceResult {
  metalCode: string;
  spotPriceUsdOz: number;
  pricePerGramUsd: number;
  source: 'API' | 'CACHE' | 'FALLBACK' | 'DB';
  updatedAt: string;
}

export interface PreciousMetalRate {
  metalCode: string;
  purityCode: string;
  purityMultiplier: number;
  spotPriceUsdOz: number;
  pricePerGramUsd: number;
  pricePerGramLocal: number;
  currency: CurrencyCode;
  region: MarketRegion;
  source: 'API' | 'CACHE' | 'FALLBACK' | 'DB';
  updatedAt: string;
}

export interface BaseMetalRate {
  metalCode: string;
  pricePerGramUsd: number;
  pricePerGramLocal: number;
  currency: CurrencyCode;
  source: 'SYSTEM' | 'LME' | 'MANUAL' | 'DB';
  isRestricted: boolean;
  updatedAt: string;
}

export interface CommodityRatesResult {
  preciousMetals: PreciousMetalRate[];
  baseMetals: BaseMetalRate[];
  fxRate: number;
  fxPair: string;
  region: MarketRegion;
  currency: CurrencyCode;
  updatedAt: string;
}

@Injectable()
export class CommodityRatesService {
  private readonly logger = new Logger(CommodityRatesService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly marketRatesService: MarketRatesService,
    private readonly fxRatesService: FxRatesService,
  ) {}

  /**
   * Get all commodity rates for a region and currency
   */
  async getAllRates(
    region: MarketRegion,
    currency: CurrencyCode,
  ): Promise<CommodityRatesResult> {
    const startTime = Date.now();

    // Get FX rate for conversion
    const fxSnapshot = await this.fxRatesService.getExtendedFxSnapshot();
    const fxPair = `USD_${currency}`;
    const fxRate = this.getFxRate(fxSnapshot, currency);

    // Get precious metal rates
    const preciousMetals = await this.getPreciousMetalRates(region, currency, fxRate);

    // Get base metal rates
    const baseMetals = await this.getBaseMetalRates(currency, fxRate);

    this.logger.debug(
      `Fetched all commodity rates in ${Date.now() - startTime}ms: ` +
      `${preciousMetals.length} precious, ${baseMetals.length} base metals`,
    );

    return {
      preciousMetals,
      baseMetals,
      fxRate,
      fxPair,
      region,
      currency,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get precious metal rates with purity multipliers
   */
  async getPreciousMetalRates(
    region: MarketRegion,
    currency: CurrencyCode,
    fxRate?: number,
  ): Promise<PreciousMetalRate[]> {
    // Get market rates (includes spot prices and regional adjustments)
    const marketRates = await this.marketRatesService.getMarketRates(currency, region);
    
    // Calculate FX rate if not provided
    if (!fxRate) {
      const fxSnapshot = await this.fxRatesService.getExtendedFxSnapshot();
      fxRate = this.getFxRate(fxSnapshot, currency);
    }

    const results: PreciousMetalRate[] = [];
    const source = marketRates.source === 'metalpriceapi' ? 'API' : 
                   marketRates.cache === 'hit' ? 'CACHE' : 'FALLBACK';

    // Gold rates
    for (const [purityCode, multiplier] of Object.entries(PURITY_MULTIPLIERS)) {
      if (purityCode.startsWith('GOLD_')) {
        const metalKey = purityCode as keyof typeof marketRates.metals;
        const pricePerGramLocal = marketRates.metals[metalKey] || 0;
        const pricePerGramUsd = fxRate > 0 ? pricePerGramLocal / fxRate : 0;
        
        results.push({
          metalCode: 'GOLD',
          purityCode,
          purityMultiplier: multiplier,
          spotPriceUsdOz: marketRates.debug?.spotUsed?.goldUsdOz || 0,
          pricePerGramUsd,
          pricePerGramLocal,
          currency,
          region,
          source,
          updatedAt: marketRates.updatedAt,
        });
      }
    }

    // Silver rates
    for (const [purityCode, multiplier] of Object.entries(PURITY_MULTIPLIERS)) {
      if (purityCode.startsWith('SILVER_')) {
        const metalKey = purityCode as keyof typeof marketRates.metals;
        const pricePerGramLocal = marketRates.metals[metalKey] || 0;
        const pricePerGramUsd = fxRate > 0 ? pricePerGramLocal / fxRate : 0;
        
        results.push({
          metalCode: 'SILVER',
          purityCode,
          purityMultiplier: multiplier,
          spotPriceUsdOz: marketRates.debug?.spotUsed?.silverUsdOz || 0,
          pricePerGramUsd,
          pricePerGramLocal,
          currency,
          region,
          source,
          updatedAt: marketRates.updatedAt,
        });
      }
    }

    // Platinum rates
    for (const [purityCode, multiplier] of Object.entries(PURITY_MULTIPLIERS)) {
      if (purityCode.startsWith('PLATINUM_')) {
        const metalKey = purityCode as keyof typeof marketRates.metals;
        const pricePerGramLocal = marketRates.metals[metalKey] || 0;
        const pricePerGramUsd = fxRate > 0 ? pricePerGramLocal / fxRate : 0;
        
        results.push({
          metalCode: 'PLATINUM',
          purityCode,
          purityMultiplier: multiplier,
          spotPriceUsdOz: marketRates.debug?.spotUsed?.platinumUsdOz || 0,
          pricePerGramUsd,
          pricePerGramLocal,
          currency,
          region,
          source,
          updatedAt: marketRates.updatedAt,
        });
      }
    }

    // Palladium rates
    for (const [purityCode, multiplier] of Object.entries(PURITY_MULTIPLIERS)) {
      if (purityCode.startsWith('PALLADIUM_')) {
        const metalKey = purityCode as keyof typeof marketRates.metals;
        const pricePerGramLocal = marketRates.metals[metalKey] || 0;
        const pricePerGramUsd = fxRate > 0 ? pricePerGramLocal / fxRate : 0;
        
        results.push({
          metalCode: 'PALLADIUM',
          purityCode,
          purityMultiplier: multiplier,
          spotPriceUsdOz: marketRates.debug?.spotUsed?.palladiumUsdOz || 0,
          pricePerGramUsd,
          pricePerGramLocal,
          currency,
          region,
          source,
          updatedAt: marketRates.updatedAt,
        });
      }
    }

    return results;
  }

  /**
   * Get specific precious metal rate
   */
  async getPreciousMetalRate(
    purityCode: string,
    region: MarketRegion,
    currency: CurrencyCode,
  ): Promise<PreciousMetalRate | null> {
    const rates = await this.getPreciousMetalRates(region, currency);
    return rates.find(r => r.purityCode === purityCode) || null;
  }

  /**
   * Get base metal rates from DB or defaults
   */
  async getBaseMetalRates(
    currency: CurrencyCode,
    fxRate?: number,
  ): Promise<BaseMetalRate[]> {
    // Calculate FX rate if not provided
    if (!fxRate) {
      const fxSnapshot = await this.fxRatesService.getExtendedFxSnapshot();
      fxRate = this.getFxRate(fxSnapshot, currency);
    }

    const results: BaseMetalRate[] = [];

    // Try to get from DB first
    const dbRates = await (this.prisma as any).baseMetalPriceConfig?.findMany({
      where: { isActive: true },
    }) || [];

    // Build map of DB rates
    const dbRateMap = new Map(dbRates.map((r: any) => [r.metalCode, r]));

    // Get all base metal codes
    const allMetalCodes = Object.keys(DEFAULT_BASE_METAL_PRICES_USD);

    for (const metalCode of allMetalCodes) {
      const dbRate = dbRateMap.get(metalCode) as any;
      
      if (dbRate) {
        results.push({
          metalCode,
          pricePerGramUsd: dbRate.basePriceUsd || dbRate.pricePerGramUsd,
          pricePerGramLocal: (dbRate.basePriceUsd || dbRate.pricePerGramUsd) * fxRate,
          currency,
          source: dbRate.source as 'SYSTEM' | 'LME' | 'MANUAL' | 'DB',
          isRestricted: dbRate.isRestricted,
          updatedAt: dbRate.updatedAt?.toISOString() || new Date().toISOString(),
        });
      } else {
        // Use default values
        const defaultPrice = DEFAULT_BASE_METAL_PRICES_USD[metalCode] || 0;
        results.push({
          metalCode,
          pricePerGramUsd: defaultPrice,
          pricePerGramLocal: defaultPrice * fxRate,
          currency,
          source: 'SYSTEM',
          isRestricted: metalCode === 'NICKEL',
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return results;
  }

  /**
   * Get specific base metal rate
   */
  async getBaseMetalRate(
    metalCode: string,
    currency: CurrencyCode,
  ): Promise<BaseMetalRate | null> {
    const rates = await this.getBaseMetalRates(currency);
    return rates.find(r => r.metalCode === metalCode) || null;
  }

  /**
   * Check if a metal is restricted (e.g., Nickel)
   */
  async isMetalRestricted(metalCode: string): Promise<boolean> {
    // Check DB first
    const dbRate = await (this.prisma as any).baseMetalPriceConfig?.findFirst({
      where: { metalCode, isActive: true },
    });

    if (dbRate) {
      return dbRate.isRestricted;
    }

    // Default restriction for Nickel
    return metalCode === 'NICKEL';
  }

  /**
   * Get purity multiplier for a metal code
   */
  getPurityMultiplier(purityCode: string): number {
    return PURITY_MULTIPLIERS[purityCode as keyof typeof PURITY_MULTIPLIERS] || 1.0;
  }

  /**
   * Calculate price per gram from spot price
   */
  calculatePricePerGram(spotPriceUsdOz: number, purityMultiplier: number = 1.0): number {
    return (spotPriceUsdOz / TROY_OUNCE_TO_GRAMS) * purityMultiplier;
  }

  /**
   * Get FX rate for a currency from snapshot
   */
  private getFxRate(fxSnapshot: any, currency: CurrencyCode): number {
    const rateKey = `USD_${currency}` as keyof typeof fxSnapshot;
    const rate = fxSnapshot[rateKey];
    
    if (rate && typeof rate === 'object' && 'rate' in rate) {
      return rate.rate;
    }
    
    // Fallback rates
    const fallbacks: Record<CurrencyCode, number> = {
      USD: 1.0,
      NPR: 134.5,
      INR: 83.5,
      AED: 3.67,
      GBP: 0.79,
      EUR: 0.92,
    };
    
    return fallbacks[currency] || 1.0;
  }

  /**
   * Update base metal price in DB
   */
  async updateBaseMetalPrice(
    metalCode: string,
    pricePerGramUsd: number,
    source: string,
    isRestricted: boolean = false,
    notes?: string,
    createdBy?: string,
  ): Promise<void> {
    await (this.prisma as any).baseMetalPriceConfig?.upsert({
      where: { metalCode },
      create: {
        metalCode,
        pricePerGramUsd,
        source,
        isRestricted,
        notes,
        createdBy,
        isActive: true,
      },
      update: {
        pricePerGramUsd,
        source,
        isRestricted,
        notes,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Updated base metal price: ${metalCode} = $${pricePerGramUsd}/g`);
  }

  /**
   * Get metal purity configurations from DB or defaults
   */
  async getMetalPurityConfigs(): Promise<Array<{
    metalType: string;
    purityCode: string;
    purityMultiplier: number;
    displayName: string;
  }>> {
    // Try DB first
    const dbConfigs = await (this.prisma as any).metalPurityConfig?.findMany({
      where: { isActive: true },
      orderBy: [{ metalType: 'asc' }, { purityMultiplier: 'desc' }],
    });

    if (dbConfigs.length > 0) {
      return dbConfigs;
    }

    // Return defaults
    return Object.entries(PURITY_MULTIPLIERS).map(([purityCode, multiplier]) => {
      const metalType = purityCode.split('_')[0];
      return {
        metalType,
        purityCode,
        purityMultiplier: multiplier,
        displayName: purityCode.replace('_', ' '),
      };
    });
  }
}
