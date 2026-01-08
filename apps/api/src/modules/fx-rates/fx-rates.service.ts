/**
 * FX Rates Service
 * Fetches and caches foreign exchange rates with provider fallback:
 * 1. Frankfurter API (primary)
 * 2. ExchangeRate.host (secondary) 
 * 3. Hardcoded fallback values (last resort)
 * 
 * Uses HttpClientService for robust retries and timeout handling.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { HttpClientService } from '../../common/http-client';
import {
  FxRate,
  FxSnapshot,
  FxPair,
  FxSource,
  FrankfurterResponse,
  ExchangeRateHostResponse,
  DEFAULT_FX_RATES,
  FX_SANITY_THRESHOLDS,
  FX_CACHE_TTL_MS,
  FRANKFURTER_CONFIG,
  EXCHANGERATE_HOST_CONFIG,
  CurrencyCode,
  ExtendedFxSnapshot,
  CURRENCY_INFO,
} from './fx-rates.types';

@Injectable()
export class FxRatesService implements OnModuleInit {
  private readonly logger = new Logger(FxRatesService.name);

  // In-memory cache
  private cache: {
    snapshot: FxSnapshot | null;
    expiresAt: Date | null;
  } = { snapshot: null, expiresAt: null };

  // Extended cache for all currencies
  private extendedCache: {
    snapshot: ExtendedFxSnapshot | null;
    expiresAt: Date | null;
  } = { snapshot: null, expiresAt: null };

  // Fallback values from env or defaults
  private readonly fallbackUsdInr: number;
  private readonly fallbackUsdNpr: number;

  // Additional fallback rates from env
  private readonly fallbackUsdAed: number;
  private readonly fallbackUsdGbp: number;
  private readonly fallbackUsdEur: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly httpClient: HttpClientService,
  ) {
    this.fallbackUsdInr = parseFloat(
      this.configService.get<string>('DEFAULT_USD_INR') || String(DEFAULT_FX_RATES.USD_INR),
    );
    this.fallbackUsdNpr = parseFloat(
      this.configService.get<string>('DEFAULT_USD_NPR') || String(DEFAULT_FX_RATES.USD_NPR),
    );
    this.fallbackUsdAed = parseFloat(
      this.configService.get<string>('DEFAULT_USD_AED') || String(DEFAULT_FX_RATES.USD_AED),
    );
    this.fallbackUsdGbp = parseFloat(
      this.configService.get<string>('DEFAULT_USD_GBP') || String(DEFAULT_FX_RATES.USD_GBP),
    );
    this.fallbackUsdEur = parseFloat(
      this.configService.get<string>('DEFAULT_USD_EUR') || String(DEFAULT_FX_RATES.USD_EUR),
    );

    this.logger.log(`FX fallback rates: USD_INR=${this.fallbackUsdInr}, USD_NPR=${this.fallbackUsdNpr}`);
  }

  async onModuleInit() {
    // Pre-fetch FX rates on startup
    try {
      await this.getFxSnapshot();
      this.logger.log('FX rates initialized successfully');
    } catch (error) {
      this.logger.warn(`Failed to initialize FX rates: ${error}`);
    }
  }

  /**
   * Get USD to INR rate
   */
  async getUsdToInr(): Promise<FxRate> {
    const snapshot = await this.getFxSnapshot();
    return snapshot.USD_INR;
  }

  /**
   * Get USD to NPR rate
   */
  async getUsdToNpr(): Promise<FxRate> {
    const snapshot = await this.getFxSnapshot();
    return snapshot.USD_NPR;
  }

  /**
   * Get full FX snapshot with all rates
   */
  async getFxSnapshot(): Promise<FxSnapshot> {
    // Check in-memory cache first
    if (this.cache.snapshot && this.cache.expiresAt && this.cache.expiresAt > new Date()) {
      this.logger.debug('Returning FX rates from memory cache');
      return this.cache.snapshot;
    }

    // Check database cache
    const dbCached = await this.getFromDbCache();
    if (dbCached) {
      this.logger.debug('Returning FX rates from database cache');
      this.setMemoryCache(dbCached);
      return dbCached;
    }

    // Fetch fresh rates from Frankfurter
    try {
      const freshSnapshot = await this.fetchFromFrankfurter();
      
      // Store in both caches
      this.setMemoryCache(freshSnapshot);
      await this.storeInDbCache(freshSnapshot);
      
      return freshSnapshot;
    } catch (error) {
      this.logger.error(`Failed to fetch FX rates: ${error}`);
      
      // Return fallback rates
      return this.buildFallbackSnapshot();
    }
  }

  /**
   * Get extended FX snapshot with all currencies (AED, GBP, EUR in addition to INR, NPR)
   */
  async getExtendedFxSnapshot(): Promise<ExtendedFxSnapshot> {
    // Check extended cache first
    if (this.extendedCache.snapshot && this.extendedCache.expiresAt && this.extendedCache.expiresAt > new Date()) {
      this.logger.debug('Returning extended FX rates from memory cache');
      return this.extendedCache.snapshot;
    }

    try {
      const extSnapshot = await this.fetchExtendedFromFrankfurter();
      this.extendedCache = {
        snapshot: extSnapshot,
        expiresAt: new Date(Date.now() + FX_CACHE_TTL_MS),
      };
      return extSnapshot;
    } catch (error) {
      this.logger.error(`Failed to fetch extended FX rates: ${error}`);
      return this.buildExtendedFallbackSnapshot();
    }
  }

  /**
   * Get USD rates for specific currencies
   */
  async getUsdRates(currencies: CurrencyCode[]): Promise<Record<CurrencyCode, FxRate>> {
    const extSnapshot = await this.getExtendedFxSnapshot();
    const result: Record<string, FxRate> = {};
    const now = new Date().toISOString();

    for (const currency of currencies) {
      switch (currency) {
        case 'USD':
          result.USD = { pair: 'USD_USD' as FxPair, rate: 1, source: 'derived', updatedAt: now };
          break;
        case 'INR':
          result.INR = extSnapshot.USD_INR;
          break;
        case 'NPR':
          result.NPR = extSnapshot.USD_NPR;
          break;
        case 'AED':
          result.AED = extSnapshot.USD_AED;
          break;
        case 'GBP':
          result.GBP = extSnapshot.USD_GBP;
          break;
        case 'EUR':
          result.EUR = extSnapshot.USD_EUR;
          break;
      }
    }

    return result as Record<CurrencyCode, FxRate>;
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(
    amount: number,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
  ): Promise<{ amount: number; rate: number; source: string }> {
    if (fromCurrency === toCurrency) {
      return { amount, rate: 1, source: 'identity' };
    }

    const rates = await this.getUsdRates([fromCurrency, toCurrency]);
    
    // Convert: amount in fromCurrency -> USD -> toCurrency
    // If fromCurrency is USD: rate is 1
    // amount_usd = amount / from_rate
    // amount_to = amount_usd * to_rate
    const fromRate = fromCurrency === 'USD' ? 1 : rates[fromCurrency]?.rate || 1;
    const toRate = toCurrency === 'USD' ? 1 : rates[toCurrency]?.rate || 1;
    
    const amountInUsd = amount / fromRate;
    const convertedAmount = amountInUsd * toRate;
    const effectiveRate = toRate / fromRate;

    return {
      amount: parseFloat(convertedAmount.toFixed(2)),
      rate: parseFloat(effectiveRate.toFixed(6)),
      source: rates[toCurrency]?.source || 'derived',
    };
  }

  /**
   * Get currency info (symbol, name, etc.)
   */
  getCurrencyInfo(currency: CurrencyCode) {
    return CURRENCY_INFO[currency];
  }

  /**
   * Force refresh FX rates (bypasses cache)
   */
  async forceRefresh(): Promise<FxSnapshot> {
    this.logger.log('Force refreshing FX rates');
    
    // Clear caches
    this.cache = { snapshot: null, expiresAt: null };
    await this.clearDbCache();

    try {
      const freshSnapshot = await this.fetchFromFrankfurter();
      this.setMemoryCache(freshSnapshot);
      await this.storeInDbCache(freshSnapshot);
      return freshSnapshot;
    } catch (error) {
      this.logger.error(`Force refresh failed: ${error}`);
      return this.buildFallbackSnapshot();
    }
  }

  /**
   * Validate FX rates sanity
   */
  validateRates(snapshot: FxSnapshot): {
    isValid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let isValid = true;

    const inrNprRatio = snapshot.INR_NPR.rate;

    if (inrNprRatio < FX_SANITY_THRESHOLDS.INR_NPR_RATIO_MIN) {
      warnings.push(
        `INR_NPR ratio ${inrNprRatio.toFixed(3)} is below minimum ${FX_SANITY_THRESHOLDS.INR_NPR_RATIO_MIN}`,
      );
      isValid = false;
    }

    if (inrNprRatio > FX_SANITY_THRESHOLDS.INR_NPR_RATIO_MAX) {
      warnings.push(
        `INR_NPR ratio ${inrNprRatio.toFixed(3)} is above maximum ${FX_SANITY_THRESHOLDS.INR_NPR_RATIO_MAX}`,
      );
      isValid = false;
    }

    // Additional sanity check: NPR should always be greater than INR
    if (snapshot.USD_NPR.rate <= snapshot.USD_INR.rate) {
      warnings.push(
        `USD_NPR (${snapshot.USD_NPR.rate}) should be greater than USD_INR (${snapshot.USD_INR.rate})`,
      );
      isValid = false;
    }

    return { isValid, warnings };
  }

  /**
   * Get a corrected FX snapshot if validation fails
   */
  async getCorrectedFxSnapshot(): Promise<{
    snapshot: FxSnapshot;
    warnings: string[];
    corrected: boolean;
  }> {
    const snapshot = await this.getFxSnapshot();
    const validation = this.validateRates(snapshot);

    if (validation.isValid) {
      return { snapshot, warnings: [], corrected: false };
    }

    this.logger.warn(`FX sanity check failed: ${validation.warnings.join(', ')}`);

    // Attempt to correct by using trusted INR rate and deriving NPR
    const correctedSnapshot = this.correctSnapshot(snapshot);
    const revalidation = this.validateRates(correctedSnapshot);

    if (revalidation.isValid) {
      this.logger.log('FX rates corrected successfully');
      return {
        snapshot: correctedSnapshot,
        warnings: ['FX sanity check failed; using corrected rates based on INR_NPR ratio.'],
        corrected: true,
      };
    }

    // If still invalid, use full fallback
    this.logger.error('Could not correct FX rates - using full fallback');
    return {
      snapshot: this.buildFallbackSnapshot(),
      warnings: ['FX sanity check failed; using fallback FX rates.'],
      corrected: true,
    };
  }

  /**
   * Fetch rates from Frankfurter API with fallback to ExchangeRate.host
   * NOTE: Frankfurter does NOT support NPR, so we derive it from INR using known ratio
   */
  private async fetchFromFrankfurter(): Promise<FxSnapshot> {
    // Try Frankfurter first
    try {
      return await this.fetchFromFrankfurterProvider();
    } catch (error) {
      this.logger.warn(`Frankfurter failed: ${error}. Trying ExchangeRate.host...`);
    }

    // Try ExchangeRate.host as fallback
    try {
      return await this.fetchFromExchangeRateHost();
    } catch (error) {
      this.logger.warn(`ExchangeRate.host failed: ${error}. Using fallback values.`);
    }

    // All providers failed, use fallback
    return this.buildFallbackSnapshot();
  }

  /**
   * Fetch from Frankfurter API
   */
  private async fetchFromFrankfurterProvider(): Promise<FxSnapshot> {
    this.logger.log('Fetching FX rates from Frankfurter API');

    const url = `${FRANKFURTER_CONFIG.baseUrl}/latest?base=USD&symbols=INR`;
    const response = await this.httpClient.get<FrankfurterResponse>(url, {
      timeout: FRANKFURTER_CONFIG.timeout,
      maxRetries: 3,
    });

    const { rates, date } = response.data;
    const updatedAt = new Date(date).toISOString();

    if (!rates.INR) {
      throw new Error(`Missing INR rate in Frankfurter response`);
    }

    const usdInr = rates.INR;
    // Derive NPR from INR using known INR_NPR ratio (~1.60)
    const inrNpr = DEFAULT_FX_RATES.INR_NPR;
    const usdNpr = usdInr * inrNpr;

    this.logger.log(
      `Frankfurter rates: USD_INR=${usdInr.toFixed(2)}, derived USD_NPR=${usdNpr.toFixed(2)}, INR_NPR=${inrNpr.toFixed(3)} (fixed ratio)`,
    );

    const snapshot: FxSnapshot = {
      USD_INR: {
        pair: 'USD_INR',
        rate: usdInr,
        source: 'frankfurter',
        updatedAt,
      },
      USD_NPR: {
        pair: 'USD_NPR',
        rate: usdNpr,
        source: 'derived', // NPR derived from INR × ratio
        updatedAt,
      },
      INR_NPR: {
        pair: 'INR_NPR',
        rate: inrNpr,
        source: 'derived', // Fixed ratio (1.60)
        updatedAt,
      },
    };

    // Validate before returning
    const validation = this.validateRates(snapshot);
    if (!validation.isValid) {
      this.logger.warn(`Frankfurter rates failed sanity check: ${validation.warnings.join(', ')}`);
      // Return corrected snapshot
      return this.correctSnapshot(snapshot);
    }

    return snapshot;
  }

  /**
   * Fetch from ExchangeRate.host API (fallback provider)
   */
  private async fetchFromExchangeRateHost(): Promise<FxSnapshot> {
    this.logger.log('Fetching FX rates from ExchangeRate.host');

    const url = `${EXCHANGERATE_HOST_CONFIG.baseUrl}/latest?base=USD&symbols=INR`;
    const response = await this.httpClient.get<ExchangeRateHostResponse>(url, {
      timeout: EXCHANGERATE_HOST_CONFIG.timeout,
      maxRetries: 2, // Fewer retries for fallback
    });

    const { rates, date } = response.data;
    const updatedAt = new Date(date).toISOString();

    if (!rates.INR) {
      throw new Error(`Missing INR rate in ExchangeRate.host response`);
    }

    const usdInr = rates.INR;
    const inrNpr = DEFAULT_FX_RATES.INR_NPR;
    const usdNpr = usdInr * inrNpr;

    this.logger.log(
      `ExchangeRate.host rates: USD_INR=${usdInr.toFixed(2)}, derived USD_NPR=${usdNpr.toFixed(2)}`,
    );

    const snapshot: FxSnapshot = {
      USD_INR: {
        pair: 'USD_INR',
        rate: usdInr,
        source: 'exchangerate_host',
        updatedAt,
      },
      USD_NPR: {
        pair: 'USD_NPR',
        rate: usdNpr,
        source: 'derived',
        updatedAt,
      },
      INR_NPR: {
        pair: 'INR_NPR',
        rate: inrNpr,
        source: 'derived',
        updatedAt,
      },
    };

    const validation = this.validateRates(snapshot);
    if (!validation.isValid) {
      return this.correctSnapshot(snapshot);
    }

    return snapshot;
  }

  /**
   * Correct a snapshot with invalid INR_NPR ratio
   */
  private correctSnapshot(snapshot: FxSnapshot): FxSnapshot {
    // Trust the INR rate, derive NPR using expected ratio
    const expectedRatio = DEFAULT_FX_RATES.INR_NPR;
    const usdInr = snapshot.USD_INR.rate;
    const correctedUsdNpr = usdInr * expectedRatio;

    this.logger.log(
      `Correcting FX: Using USD_INR=${usdInr.toFixed(2)} × ${expectedRatio} = USD_NPR=${correctedUsdNpr.toFixed(2)}`,
    );

    return {
      USD_INR: snapshot.USD_INR,
      USD_NPR: {
        ...snapshot.USD_NPR,
        rate: correctedUsdNpr,
        source: 'fallback', // Mark as corrected
      },
      INR_NPR: {
        ...snapshot.INR_NPR,
        rate: expectedRatio,
        source: 'fallback',
      },
    };
  }

  /**
   * Build a fallback snapshot using default/env rates
   */
  private buildFallbackSnapshot(): FxSnapshot {
    const updatedAt = new Date().toISOString();
    const inrNpr = this.fallbackUsdNpr / this.fallbackUsdInr;

    this.logger.log(
      `Using fallback FX: USD_INR=${this.fallbackUsdInr}, USD_NPR=${this.fallbackUsdNpr}, INR_NPR=${inrNpr.toFixed(3)}`,
    );

    return {
      USD_INR: {
        pair: 'USD_INR',
        rate: this.fallbackUsdInr,
        source: 'fallback',
        updatedAt,
      },
      USD_NPR: {
        pair: 'USD_NPR',
        rate: this.fallbackUsdNpr,
        source: 'fallback',
        updatedAt,
      },
      INR_NPR: {
        pair: 'INR_NPR',
        rate: inrNpr,
        source: 'fallback',
        updatedAt,
      },
    };
  }

  /**
   * Fetch extended rates from Frankfurter (includes AED, GBP, EUR)
   * Falls back to ExchangeRate.host then hardcoded values
   */
  private async fetchExtendedFromFrankfurter(): Promise<ExtendedFxSnapshot> {
    this.logger.log('Fetching extended FX rates');

    // Build base snapshot first (this already has INR, NPR)
    const baseSnapshot = await this.getFxSnapshot();

    // Try Frankfurter first
    try {
      const url = `${FRANKFURTER_CONFIG.baseUrl}/latest?base=USD&symbols=INR,AED,GBP,EUR`;
      const response = await this.httpClient.get<FrankfurterResponse>(url, {
        timeout: FRANKFURTER_CONFIG.timeout,
        maxRetries: 3,
      });

      const { rates, date } = response.data;
      const updatedAt = new Date(date).toISOString();

      const usdAed = rates.AED || this.fallbackUsdAed;
      const usdGbp = rates.GBP || this.fallbackUsdGbp;
      const usdEur = rates.EUR || this.fallbackUsdEur;

      this.logger.log(
        `Extended Frankfurter: USD_AED=${usdAed.toFixed(2)}, USD_GBP=${usdGbp.toFixed(4)}, USD_EUR=${usdEur.toFixed(4)}`,
      );

      return {
        ...baseSnapshot,
        USD_AED: {
          pair: 'USD_AED',
          rate: usdAed,
          source: rates.AED ? 'frankfurter' : 'fallback',
          updatedAt,
        },
        USD_GBP: {
          pair: 'USD_GBP',
          rate: usdGbp,
          source: rates.GBP ? 'frankfurter' : 'fallback',
          updatedAt,
        },
        USD_EUR: {
          pair: 'USD_EUR',
          rate: usdEur,
          source: rates.EUR ? 'frankfurter' : 'fallback',
          updatedAt,
        },
      };
    } catch (error) {
      this.logger.warn(`Extended Frankfurter fetch failed: ${error}`);
    }

    // Try ExchangeRate.host as fallback
    try {
      const url = `${EXCHANGERATE_HOST_CONFIG.baseUrl}/latest?base=USD&symbols=INR,AED,GBP,EUR`;
      const response = await this.httpClient.get<ExchangeRateHostResponse>(url, {
        timeout: EXCHANGERATE_HOST_CONFIG.timeout,
        maxRetries: 2,
      });

      const { rates, date } = response.data;
      const updatedAt = new Date(date).toISOString();

      return {
        ...baseSnapshot,
        USD_AED: {
          pair: 'USD_AED',
          rate: rates.AED || this.fallbackUsdAed,
          source: rates.AED ? 'exchangerate_host' : 'fallback',
          updatedAt,
        },
        USD_GBP: {
          pair: 'USD_GBP',
          rate: rates.GBP || this.fallbackUsdGbp,
          source: rates.GBP ? 'exchangerate_host' : 'fallback',
          updatedAt,
        },
        USD_EUR: {
          pair: 'USD_EUR',
          rate: rates.EUR || this.fallbackUsdEur,
          source: rates.EUR ? 'exchangerate_host' : 'fallback',
          updatedAt,
        },
      };
    } catch (error) {
      this.logger.warn(`Extended ExchangeRate.host fetch failed: ${error}`);
    }

    // All providers failed
    return this.buildExtendedFallbackSnapshot();
  }

  /**
   * Build extended fallback snapshot
   */
  private buildExtendedFallbackSnapshot(): ExtendedFxSnapshot {
    const baseSnapshot = this.buildFallbackSnapshot();
    const updatedAt = new Date().toISOString();

    return {
      ...baseSnapshot,
      USD_AED: {
        pair: 'USD_AED',
        rate: this.fallbackUsdAed,
        source: 'fallback',
        updatedAt,
      },
      USD_GBP: {
        pair: 'USD_GBP',
        rate: this.fallbackUsdGbp,
        source: 'fallback',
        updatedAt,
      },
      USD_EUR: {
        pair: 'USD_EUR',
        rate: this.fallbackUsdEur,
        source: 'fallback',
        updatedAt,
      },
    };
  }

  /**
   * Set memory cache
   */
  private setMemoryCache(snapshot: FxSnapshot): void {
    this.cache = {
      snapshot,
      expiresAt: new Date(Date.now() + FX_CACHE_TTL_MS),
    };
  }

  /**
   * Get cached rates from database
   */
  private async getFromDbCache(): Promise<FxSnapshot | null> {
    try {
      // Cast to any to handle Prisma client regeneration issues
      const prismaAny = this.prisma as any;
      const snapshots: Array<{ pair: string; rate: number; source: string; updatedAt: Date }> = 
        await prismaAny.fxRateSnapshot.findMany({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - FX_CACHE_TTL_MS),
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 3, // We need USD_INR, USD_NPR, INR_NPR
        });

      if (snapshots.length < 3) {
        return null;
      }

      const usdInr = snapshots.find((s) => s.pair === 'USD_INR');
      const usdNpr = snapshots.find((s) => s.pair === 'USD_NPR');
      const inrNpr = snapshots.find((s) => s.pair === 'INR_NPR');

      if (!usdInr || !usdNpr || !inrNpr) {
        return null;
      }

      return {
        USD_INR: {
          pair: 'USD_INR',
          rate: usdInr.rate,
          source: usdInr.source as 'frankfurter' | 'fallback',
          updatedAt: usdInr.updatedAt.toISOString(),
        },
        USD_NPR: {
          pair: 'USD_NPR',
          rate: usdNpr.rate,
          source: usdNpr.source as 'frankfurter' | 'fallback',
          updatedAt: usdNpr.updatedAt.toISOString(),
        },
        INR_NPR: {
          pair: 'INR_NPR',
          rate: inrNpr.rate,
          source: inrNpr.source as 'frankfurter' | 'fallback',
          updatedAt: inrNpr.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      this.logger.debug(`DB cache miss or error: ${error}`);
      return null;
    }
  }

  /**
   * Store rates in database cache
   */
  private async storeInDbCache(snapshot: FxSnapshot): Promise<void> {
    try {
      // Cast to any to handle Prisma client regeneration issues
      const prismaAny = this.prisma as any;
      await this.prisma.$transaction([
        prismaAny.fxRateSnapshot.upsert({
          where: { pair: 'USD_INR' },
          update: {
            rate: snapshot.USD_INR.rate,
            source: snapshot.USD_INR.source,
            updatedAt: new Date(snapshot.USD_INR.updatedAt),
          },
          create: {
            pair: 'USD_INR',
            rate: snapshot.USD_INR.rate,
            source: snapshot.USD_INR.source,
          },
        }),
        prismaAny.fxRateSnapshot.upsert({
          where: { pair: 'USD_NPR' },
          update: {
            rate: snapshot.USD_NPR.rate,
            source: snapshot.USD_NPR.source,
            updatedAt: new Date(snapshot.USD_NPR.updatedAt),
          },
          create: {
            pair: 'USD_NPR',
            rate: snapshot.USD_NPR.rate,
            source: snapshot.USD_NPR.source,
          },
        }),
        prismaAny.fxRateSnapshot.upsert({
          where: { pair: 'INR_NPR' },
          update: {
            rate: snapshot.INR_NPR.rate,
            source: snapshot.INR_NPR.source,
            updatedAt: new Date(snapshot.INR_NPR.updatedAt),
          },
          create: {
            pair: 'INR_NPR',
            rate: snapshot.INR_NPR.rate,
            source: snapshot.INR_NPR.source,
          },
        }),
      ]);
      this.logger.log('Cached FX rates in database');
    } catch (error) {
      this.logger.warn(`Failed to cache FX rates in DB: ${error}`);
    }
  }

  /**
   * Clear database cache
   */
  private async clearDbCache(): Promise<void> {
    try {
      // Cast to any to handle Prisma client regeneration issues
      const prismaAny = this.prisma as any;
      await prismaAny.fxRateSnapshot.deleteMany({});
      this.logger.log('Cleared FX rates from database cache');
    } catch (error) {
      this.logger.warn(`Failed to clear FX DB cache: ${error}`);
    }
  }
}
