/**
 * Market Rates Service
 *
 * Fetches and calculates precious metal prices using:
 * - MetalpriceAPI for USD spot prices (gold, silver, platinum, palladium)
 * - FxRatesService for USD→currency exchange rates
 *
 * Features:
 * - Region-based pricing with multipliers (NP, IN, AE, UK, EU, US)
 * - Multi-currency support (NPR, INR, AED, GBP, EUR, USD)
 * - Robust fallback chain: fresh cache → stale cache → fallback values
 * - Debug fields for troubleshooting price discrepancies
 * - Never hard-fails - always returns something
 */

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { HttpClientService } from "../../common/http-client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  ExtendedFxSnapshot,
  FX_SANITY_THRESHOLDS,
  FxRate,
  FxRatesService,
} from "../fx-rates";
import {
  COUNTRY_CURRENCIES,
  PURITY_MULTIPLIERS,
  TROY_OUNCE_TO_GRAMS,
  getLegacyCountry,
  getRegionAdjustments,
  getRegionFromCurrency,
} from "./country-adjustments";
import {
  MarketRatesDebug,
  MarketRatesResponse,
  MarketRegion,
  MetalRates,
  MetalpriceApiResponse,
  SpotPricesUsd,
  SupportedCountry,
  SupportedCurrency,
} from "./types";

// Cache key type
type CacheKey = `${MarketRegion}:${SupportedCurrency}`;

@Injectable()
export class MarketRatesService implements OnModuleInit {
  private readonly logger = new Logger(MarketRatesService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly cacheTtlHours: number;
  private readonly staleCacheTtlHours: number;

  // In-memory cache for quick access
  private cache: Map<
    CacheKey,
    { data: MarketRatesResponse; expiresAt: Date; fetchedAt: Date }
  > = new Map();

  // Fallback spot prices (USD per troy ounce) - realistic Jan 2026 levels
  private readonly FALLBACK_SPOT_PRICES: SpotPricesUsd;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly fxRatesService: FxRatesService,
    private readonly httpClient: HttpClientService,
  ) {
    this.apiKey = this.configService.get<string>("METALPRICEAPI_KEY") || "";
    this.baseUrl =
      this.configService.get<string>("METALPRICEAPI_BASE_URL") ||
      "https://api.metalpriceapi.com/v1";
    this.cacheTtlHours = parseInt(
      this.configService.get<string>("MARKET_RATES_CACHE_TTL_HOURS") || "24",
      10,
    );
    this.staleCacheTtlHours = parseInt(
      this.configService.get<string>("MARKET_RATES_STALE_CACHE_TTL_HOURS") ||
        "168",
      10,
    ); // 7 days

    // Load fallback values from env or use defaults
    this.FALLBACK_SPOT_PRICES = {
      XAU: parseFloat(
        this.configService.get<string>("FALLBACK_GOLD_USD_OZ") || "2650.0",
      ),
      XAG: parseFloat(
        this.configService.get<string>("FALLBACK_SILVER_USD_OZ") || "30.0",
      ),
      XPT: parseFloat(
        this.configService.get<string>("FALLBACK_PLATINUM_USD_OZ") || "980.0",
      ),
      XPD: parseFloat(
        this.configService.get<string>("FALLBACK_PALLADIUM_USD_OZ") || "950.0",
      ),
      timestamp: new Date().toISOString(),
    };

    if (!this.apiKey) {
      this.logger.warn(
        "METALPRICEAPI_KEY not configured - will use fallback rates",
      );
    }
  }

  /**
   * On module initialization, clear any cached fallback data if API key is now available
   * This ensures users get live data when the API key is added to an existing deployment
   */
  async onModuleInit(): Promise<void> {
    if (this.apiKey) {
      await this.clearFallbackCacheEntries();
    }
    // Sync live rates to MarketRate table on startup
    await this.syncRatesToMarketRateTable();
  }

  /**
   * Clear all cached entries that were sourced from fallback
   * This is called on startup when API key is available to ensure fresh live data
   */
  private async clearFallbackCacheEntries(): Promise<void> {
    try {
      // Get all cached entries
      const allSnapshots = await this.prisma.marketRateSnapshot.findMany();

      let clearedCount = 0;
      for (const snapshot of allSnapshots) {
        const payload = snapshot.payloadJson as unknown as MarketRatesResponse;

        // Check if this entry was sourced from fallback
        if (
          payload?.source === "fallback" ||
          payload?.debug?.spotSource === "fallback"
        ) {
          await this.prisma.marketRateSnapshot.delete({
            where: { id: snapshot.id },
          });
          clearedCount++;
          this.logger.debug(
            `Cleared fallback cache for ${snapshot.region}/${snapshot.currency}`,
          );
        }
      }

      // Also clear in-memory cache
      this.cache.clear();

      if (clearedCount > 0) {
        this.logger.log(
          `Cleared ${clearedCount} fallback cache entries - API key is now configured`,
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to clear fallback cache entries: ${error}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get market rates for a currency and optional region
   *
   * @param currency - Currency code for pricing (required)
   * @param region - Optional region override (defaults based on currency)
   * @returns MarketRatesResponse - always succeeds, never throws
   */
  async getMarketRates(
    currency: SupportedCurrency = "NPR",
    region?: MarketRegion,
  ): Promise<MarketRatesResponse> {
    // Determine region from currency if not specified
    const targetRegion = region || getRegionFromCurrency(currency);
    const cacheKey: CacheKey = `${targetRegion}:${currency}`;

    this.logger.debug(`Getting market rates for ${cacheKey}`);

    // 1. Check fresh in-memory cache
    const memCached = this.getFromMemoryCache(cacheKey);
    if (memCached && memCached.isFresh) {
      return { ...memCached.data, cache: "hit" };
    }

    // 2. Check fresh DB cache
    const dbCached = await this.getFromDbCache(targetRegion, currency);
    if (dbCached && this.isFresh(dbCached.updatedAt)) {
      this.setMemoryCache(cacheKey, dbCached);
      return { ...dbCached, cache: "hit" };
    }

    // 3. Try to fetch fresh data
    try {
      const freshData = await this.fetchFreshRates(targetRegion, currency);

      // Store in both caches
      this.setMemoryCache(cacheKey, freshData);
      await this.storeInDbCache(targetRegion, currency, freshData);

      return { ...freshData, cache: "miss" };
    } catch (error) {
      this.logger.error(`Failed to fetch fresh market rates: ${error}`);

      // 4. Return stale cache with warning if available
      if (memCached) {
        this.logger.warn(`Returning stale memory cache for ${cacheKey}`);
        return {
          ...memCached.data,
          cache: "stale",
          warnings: [
            ...(memCached.data.warnings || []),
            "Using stale cached rates (API unavailable)",
          ],
        };
      }

      if (dbCached) {
        this.logger.warn(`Returning stale DB cache for ${cacheKey}`);
        return {
          ...dbCached,
          cache: "stale",
          warnings: [
            ...(dbCached.warnings || []),
            "Using stale cached rates (API unavailable)",
          ],
        };
      }

      // 5. Ultimate fallback - computed from hardcoded values
      this.logger.warn(`Using fallback rates for ${cacheKey}`);
      return this.buildFallbackResponse(targetRegion, currency);
    }
  }

  /**
   * Legacy method - get rates by country (backward compat)
   */
  async getMarketRatesByCountry(
    country: SupportedCountry = "NP",
    currency?: SupportedCurrency,
  ): Promise<MarketRatesResponse> {
    const targetCurrency = currency || COUNTRY_CURRENCIES[country];
    const region = country === "NP" ? "NP" : "IN";
    return this.getMarketRates(targetCurrency, region);
  }

  /**
   * Force refresh market rates (admin use)
   */
  async forceRefresh(
    currency: SupportedCurrency = "NPR",
    region?: MarketRegion,
  ): Promise<MarketRatesResponse> {
    const targetRegion = region || getRegionFromCurrency(currency);
    const cacheKey: CacheKey = `${targetRegion}:${currency}`;

    this.logger.log(`Force refreshing market rates for ${cacheKey}`);

    // Clear memory cache for this key
    this.cache.delete(cacheKey);

    // Force refresh FX rates too
    await this.fxRatesService.forceRefresh();

    // Delete DB cache for this region/currency
    try {
      await this.prisma.marketRateSnapshot.deleteMany({
        where: {
          region: targetRegion,
          currency: currency,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to clear DB cache: ${error}`);
    }

    // Fetch fresh
    return this.getMarketRates(currency, targetRegion);
  }

  /**
   * Get current API configuration status
   */
  getStatus(): {
    apiConfigured: boolean;
    cacheTtlHours: number;
    fallbackSpotPrices: SpotPricesUsd;
  } {
    return {
      apiConfigured: !!this.apiKey,
      cacheTtlHours: this.cacheTtlHours,
      fallbackSpotPrices: this.FALLBACK_SPOT_PRICES,
    };
  }

  /**
   * Validate cross-region price sanity
   * NPR prices should be ~1.6x INR prices (due to FX)
   */
  async validateCrossCurrencyPrices(): Promise<{
    isValid: boolean;
    inrGold24K: number;
    nprGold24K: number;
    actualRatio: number;
    expectedRatioMin: number;
    expectedRatioMax: number;
    message?: string;
  }> {
    const [inRates, npRates] = await Promise.all([
      this.getMarketRates("INR", "IN"),
      this.getMarketRates("NPR", "NP"),
    ]);

    const inrGold24K = inRates.metals.GOLD_24K;
    const nprGold24K = npRates.metals.GOLD_24K;
    const actualRatio = nprGold24K / inrGold24K;

    const { GOLD_PRICE_RATIO_MIN, GOLD_PRICE_RATIO_MAX } = FX_SANITY_THRESHOLDS;
    const isValid =
      actualRatio >= GOLD_PRICE_RATIO_MIN &&
      actualRatio <= GOLD_PRICE_RATIO_MAX;

    return {
      isValid,
      inrGold24K,
      nprGold24K,
      actualRatio: parseFloat(actualRatio.toFixed(3)),
      expectedRatioMin: GOLD_PRICE_RATIO_MIN,
      expectedRatioMax: GOLD_PRICE_RATIO_MAX,
      message: isValid
        ? "Cross-currency prices are within expected range"
        : `NPR/INR ratio ${actualRatio.toFixed(3)} is outside expected range [${GOLD_PRICE_RATIO_MIN}, ${GOLD_PRICE_RATIO_MAX}].`,
    };
  }

  /**
   * Get comparative rates for multiple regions
   */
  async getComparativeRates(): Promise<{
    india: MarketRatesResponse;
    nepal: MarketRatesResponse;
    uae: MarketRatesResponse;
    usa: MarketRatesResponse;
    fxSnapshot: ExtendedFxSnapshot;
    validation: {
      isValid: boolean;
      actualRatio: number;
      message?: string;
    };
  }> {
    const fxSnapshot = await this.fxRatesService.getExtendedFxSnapshot();

    const [india, nepal, uae, usa] = await Promise.all([
      this.getMarketRates("INR", "IN"),
      this.getMarketRates("NPR", "NP"),
      this.getMarketRates("AED", "AE"),
      this.getMarketRates("USD", "US"),
    ]);

    const validation = await this.validateCrossCurrencyPrices();

    return {
      india,
      nepal,
      uae,
      usa,
      fxSnapshot,
      validation: {
        isValid: validation.isValid,
        actualRatio: validation.actualRatio,
        message: validation.message,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE: DATA FETCHING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Fetch fresh rates from external APIs
   */
  private async fetchFreshRates(
    region: MarketRegion,
    currency: SupportedCurrency,
  ): Promise<MarketRatesResponse> {
    // Fetch spot prices and FX in parallel
    const [spotResult, fxResult] = await Promise.all([
      this.fetchSpotPricesUsdPerOunce(),
      this.fxRatesService.getExtendedFxSnapshot(),
    ]);

    const { spotPrices, spotSource } = spotResult;
    const adjustments = getRegionAdjustments(region);
    const fxRateData = this.getFxRateForCurrency(currency, fxResult);

    const metals = this.calculateMetalRates(
      spotPrices,
      fxRateData.rate,
      adjustments.multiplier,
    );

    // Build debug info
    const debug: MarketRatesDebug = {
      spotSource,
      fxSource: fxRateData.source as
        | "frankfurter"
        | "exchangerate_host"
        | "fallback"
        | "db_cache",
      spotUsed: {
        goldUsdOz: spotPrices.XAU,
        silverUsdOz: spotPrices.XAG,
        platinumUsdOz: spotPrices.XPT,
        palladiumUsdOz: spotPrices.XPD,
      },
      fxUsed: this.buildFxUsedDebug(fxResult),
      regionUsed: region,
      regionMultiplierUsed: adjustments.multiplier,
      computedAt: new Date().toISOString(),
    };

    this.logger.log(
      `${region}/${currency}: Gold=$${spotPrices.XAU.toFixed(2)}/oz × FX ${fxRateData.rate.toFixed(4)} × adj ${adjustments.multiplier} = ${currency} ${metals.GOLD_24K}/g (24K)`,
    );

    return {
      region,
      currency,
      country: getLegacyCountry(region),
      unit: "per_gram",
      updatedAt: spotPrices.timestamp,
      source: spotSource === "metalpriceapi" ? "metalpriceapi" : "fallback",
      cache: "miss",
      fx: fxRateData,
      fxSnapshot: fxResult,
      adjustments,
      metals,
      debug,
      warnings:
        spotSource === "fallback" ? ["Using fallback metal prices"] : undefined,
    };
  }

  /**
   * Fetch spot prices from MetalpriceAPI
   */
  private async fetchSpotPricesUsdPerOunce(): Promise<{
    spotPrices: SpotPricesUsd;
    spotSource: "metalpriceapi" | "fallback";
  }> {
    if (!this.apiKey) {
      this.logger.warn("No API key - using fallback spot prices");
      return { spotPrices: this.FALLBACK_SPOT_PRICES, spotSource: "fallback" };
    }

    try {
      const response = await this.httpClient.get<MetalpriceApiResponse>(
        `${this.baseUrl}/latest?api_key=${this.apiKey}&base=USD&currencies=XAU,XAG,XPT,XPD`,
        { timeout: 10000, maxRetries: 3 },
      );

      if (!response.data.success) {
        throw new Error("MetalpriceAPI returned unsuccessful response");
      }

      const { rates, timestamp } = response.data;

      // MetalpriceAPI returns rates as USD per unit for metals
      // XAU rate of 0.000377 means 1 USD = 0.000377 XAU, so 1 XAU = 1/0.000377 USD
      const spotPrices: SpotPricesUsd = {
        XAU: rates.XAU ? 1 / rates.XAU : this.FALLBACK_SPOT_PRICES.XAU,
        XAG: rates.XAG ? 1 / rates.XAG : this.FALLBACK_SPOT_PRICES.XAG,
        XPT: rates.XPT ? 1 / rates.XPT : this.FALLBACK_SPOT_PRICES.XPT,
        XPD: rates.XPD ? 1 / rates.XPD : this.FALLBACK_SPOT_PRICES.XPD,
        timestamp: new Date(timestamp * 1000).toISOString(),
      };

      this.logger.log(
        `Fetched spot: Gold=$${spotPrices.XAU.toFixed(2)}/oz, Silver=$${spotPrices.XAG.toFixed(2)}/oz`,
      );
      return { spotPrices, spotSource: "metalpriceapi" };
    } catch (error) {
      this.logger.error(`MetalpriceAPI error: ${error}`);
      return { spotPrices: this.FALLBACK_SPOT_PRICES, spotSource: "fallback" };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE: CALCULATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Convert USD per troy ounce to local currency per gram
   */
  private convertToLocalPerGram(
    usdPerOunce: number,
    fxRate: number,
    regionMultiplier: number,
  ): number {
    // USD/oz → USD/gram
    const usdPerGram = usdPerOunce / TROY_OUNCE_TO_GRAMS;
    // USD/gram × region multiplier → region-adjusted USD/gram
    const adjustedUsdPerGram = usdPerGram * regionMultiplier;
    // USD/gram × FX rate → local currency/gram
    return adjustedUsdPerGram * fxRate;
  }

  /**
   * Calculate all metal rates
   */
  private calculateMetalRates(
    spotPrices: SpotPricesUsd,
    fxRate: number,
    regionMultiplier: number,
  ): MetalRates {
    const goldPure = this.convertToLocalPerGram(
      spotPrices.XAU,
      fxRate,
      regionMultiplier,
    );
    const silverPure = this.convertToLocalPerGram(
      spotPrices.XAG,
      fxRate,
      regionMultiplier,
    );
    const platinumPure = this.convertToLocalPerGram(
      spotPrices.XPT,
      fxRate,
      regionMultiplier,
    );
    const palladiumPure = this.convertToLocalPerGram(
      spotPrices.XPD,
      fxRate,
      regionMultiplier,
    );

    return {
      GOLD_24K: parseFloat((goldPure * PURITY_MULTIPLIERS.gold.K24).toFixed(2)),
      GOLD_22K: parseFloat((goldPure * PURITY_MULTIPLIERS.gold.K22).toFixed(2)),
      GOLD_18K: parseFloat((goldPure * PURITY_MULTIPLIERS.gold.K18).toFixed(2)),
      GOLD_14K: parseFloat((goldPure * PURITY_MULTIPLIERS.gold.K14).toFixed(2)),
      GOLD_10K: parseFloat((goldPure * PURITY_MULTIPLIERS.gold.K10).toFixed(2)),
      SILVER_999: parseFloat(
        (silverPure * PURITY_MULTIPLIERS.silver.S999).toFixed(2),
      ),
      SILVER_925: parseFloat(
        (silverPure * PURITY_MULTIPLIERS.silver.S925).toFixed(2),
      ),
      PLATINUM_PT950: parseFloat(
        (platinumPure * PURITY_MULTIPLIERS.platinum.PT950).toFixed(2),
      ),
      PLATINUM_PT900: parseFloat(
        (platinumPure * PURITY_MULTIPLIERS.platinum.PT900).toFixed(2),
      ),
      PALLADIUM_PD950: parseFloat(
        (palladiumPure * PURITY_MULTIPLIERS.palladium.PD950).toFixed(2),
      ),
    };
  }

  /**
   * Get FX rate for a specific currency from extended snapshot
   */
  private getFxRateForCurrency(
    currency: SupportedCurrency,
    extSnapshot: ExtendedFxSnapshot,
  ): FxRate {
    const now = new Date().toISOString();

    switch (currency) {
      case "USD":
        return { pair: "USD_USD", rate: 1, source: "derived", updatedAt: now };
      case "INR":
        return extSnapshot.USD_INR;
      case "NPR":
        return extSnapshot.USD_NPR;
      case "AED":
        return extSnapshot.USD_AED;
      case "GBP":
        return extSnapshot.USD_GBP;
      case "EUR":
        return extSnapshot.USD_EUR;
      default:
        return extSnapshot.USD_NPR;
    }
  }

  /**
   * Build FX used debug object
   */
  private buildFxUsedDebug(
    fxSnapshot: ExtendedFxSnapshot,
  ): MarketRatesDebug["fxUsed"] {
    return {
      USD_NPR: fxSnapshot.USD_NPR.rate,
      USD_INR: fxSnapshot.USD_INR.rate,
      USD_AED: fxSnapshot.USD_AED.rate,
      USD_GBP: fxSnapshot.USD_GBP.rate,
      USD_EUR: fxSnapshot.USD_EUR.rate,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE: FALLBACK RESPONSES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Build fallback response when everything fails
   */
  private async buildFallbackResponse(
    region: MarketRegion,
    currency: SupportedCurrency,
  ): Promise<MarketRatesResponse> {
    const adjustments = getRegionAdjustments(region);

    // Try to get FX snapshot, fall back to hardcoded if that fails too
    let fxSnapshot: ExtendedFxSnapshot;
    try {
      fxSnapshot = await this.fxRatesService.getExtendedFxSnapshot();
    } catch {
      const now = new Date().toISOString();
      fxSnapshot = {
        USD_INR: {
          pair: "USD_INR",
          rate: 90,
          source: "fallback",
          updatedAt: now,
        },
        USD_NPR: {
          pair: "USD_NPR",
          rate: 144,
          source: "fallback",
          updatedAt: now,
        },
        INR_NPR: {
          pair: "INR_NPR",
          rate: 1.6,
          source: "fallback",
          updatedAt: now,
        },
        USD_AED: {
          pair: "USD_AED",
          rate: 3.67,
          source: "fallback",
          updatedAt: now,
        },
        USD_GBP: {
          pair: "USD_GBP",
          rate: 0.79,
          source: "fallback",
          updatedAt: now,
        },
        USD_EUR: {
          pair: "USD_EUR",
          rate: 0.92,
          source: "fallback",
          updatedAt: now,
        },
      };
    }

    const fxRateData = this.getFxRateForCurrency(currency, fxSnapshot);
    const metals = this.calculateMetalRates(
      this.FALLBACK_SPOT_PRICES,
      fxRateData.rate,
      adjustments.multiplier,
    );

    const debug: MarketRatesDebug = {
      spotSource: "fallback",
      fxSource: "fallback",
      spotUsed: {
        goldUsdOz: this.FALLBACK_SPOT_PRICES.XAU,
        silverUsdOz: this.FALLBACK_SPOT_PRICES.XAG,
        platinumUsdOz: this.FALLBACK_SPOT_PRICES.XPT,
        palladiumUsdOz: this.FALLBACK_SPOT_PRICES.XPD,
      },
      fxUsed: this.buildFxUsedDebug(fxSnapshot),
      regionUsed: region,
      regionMultiplierUsed: adjustments.multiplier,
      computedAt: new Date().toISOString(),
    };

    return {
      region,
      currency,
      country: getLegacyCountry(region),
      unit: "per_gram",
      updatedAt: new Date().toISOString(),
      source: "fallback",
      cache: "miss",
      fx: fxRateData,
      fxSnapshot,
      adjustments,
      metals,
      debug,
      warnings: ["Using fallback metal prices", "External APIs unavailable"],
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE: CACHING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check if a timestamp is within the fresh cache period
   */
  private isFresh(timestamp: string | Date): boolean {
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    const age = Date.now() - date.getTime();
    return age < this.cacheTtlHours * 60 * 60 * 1000;
  }

  /**
   * Get from memory cache
   * Skips fallback-sourced entries when API key is available
   */
  private getFromMemoryCache(
    key: CacheKey,
  ): { data: MarketRatesResponse; isFresh: boolean } | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // If API key is configured but cached data is from fallback, skip it
    if (
      this.apiKey &&
      (cached.data?.source === "fallback" ||
        cached.data?.debug?.spotSource === "fallback")
    ) {
      this.logger.debug(
        `Skipping fallback-sourced memory cache for ${key} - API key available`,
      );
      return null;
    }

    return {
      data: cached.data,
      isFresh: cached.expiresAt > new Date(),
    };
  }

  /**
   * Set memory cache
   */
  private setMemoryCache(key: CacheKey, data: MarketRatesResponse): void {
    this.cache.set(key, {
      data,
      expiresAt: new Date(Date.now() + this.cacheTtlHours * 60 * 60 * 1000),
      fetchedAt: new Date(),
    });
  }

  /**
   * Get from database cache
   * Skips fallback-sourced entries when API key is available to ensure fresh data
   */
  private async getFromDbCache(
    region: MarketRegion,
    currency: SupportedCurrency,
  ): Promise<MarketRatesResponse | null> {
    try {
      // Use Prisma client for type-safe queries
      const snapshot = await this.prisma.marketRateSnapshot.findFirst({
        where: {
          region: region,
          currency: currency,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      if (snapshot) {
        const payload = snapshot.payloadJson as unknown as MarketRatesResponse;

        // If API key is configured but cached data is from fallback, skip it
        // This forces a fresh fetch with live API data
        if (
          this.apiKey &&
          (payload?.source === "fallback" ||
            payload?.debug?.spotSource === "fallback")
        ) {
          this.logger.debug(
            `Skipping fallback-sourced cache for ${region}/${currency} - API key available`,
          );
          return null;
        }

        return payload;
      }
    } catch (error) {
      this.logger.debug(`DB cache miss or error: ${error}`);
    }
    return null;
  }

  /**
   * Store in database cache
   */
  private async storeInDbCache(
    region: MarketRegion,
    currency: SupportedCurrency,
    data: MarketRatesResponse,
  ): Promise<void> {
    try {
      // Use Prisma upsert for proper cache management
      await this.prisma.marketRateSnapshot.upsert({
        where: {
          region_currency: {
            region: region,
            currency: currency,
          },
        },
        update: {
          payloadJson: data as unknown as Prisma.JsonObject,
          updatedAt: new Date(),
        },
        create: {
          region: region,
          currency: currency,
          payloadJson: data as unknown as Prisma.JsonObject,
        },
      });
      this.logger.log(`Cached market rates for ${region}/${currency}`);
    } catch (error) {
      this.logger.warn(`Failed to cache rates in DB: ${error}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MARKET RATE TABLE SYNC (for backend services like seller matching)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Sync live rates to the MarketRate table so backend services
   * (findMatchingSellers, getEligibleShops, etc.) use up-to-date prices.
   * Runs daily at 6 AM and on startup.
   */
  @Cron("0 6 * * *") // Every day at 6:00 AM
  async syncRatesToMarketRateTable(): Promise<void> {
    this.logger.log("Syncing live market rates to MarketRate table...");

    // Sync for all supported regions
    const regionsToSync: Array<{
      country: SupportedCountry;
      currency: SupportedCurrency;
      region: MarketRegion;
    }> = [
      { country: "IN", currency: "INR", region: "IN" },
      { country: "NP", currency: "NPR", region: "NP" },
    ];

    // Also sync non-legacy regions (AE, UK, EU, US) using "IN" as legacy country fallback
    const extraRegions: Array<{ region: MarketRegion; currency: SupportedCurrency }> = [
      { region: "AE", currency: "AED" },
      { region: "UK", currency: "GBP" },
      { region: "EU", currency: "EUR" },
      { region: "US", currency: "USD" },
    ];

    for (const { country, currency, region } of regionsToSync) {
      try {
        const liveRates = await this.getMarketRates(currency, region);
        const metals = liveRates.metals;

        // Upsert each metal rate into the MarketRate table
        for (const [metalCode, ratePerGram] of Object.entries(metals)) {
          if (!ratePerGram || ratePerGram <= 0) continue;

          // Expire old rates for this metal+country
          await this.prisma.marketRate.updateMany({
            where: {
              metalCode,
              country,
              validUntil: null,
            },
            data: { validUntil: new Date() },
          });

          // Create new rate
          await this.prisma.marketRate.create({
            data: {
              metalCode,
              country,
              ratePerGram,
              source: liveRates.source || "metalpriceapi",
              validFrom: new Date(),
              validUntil: null,
            },
          });
        }

        this.logger.log(
          `Synced ${Object.keys(metals).length} metal rates for ${country} (${currency}). ` +
            `GOLD_24K=${metals.GOLD_24K}/g`,
        );
      } catch (error) {
        this.logger.error(`Failed to sync rates for ${country}: ${error}`);
      }
    }

    // Sync extra regions into MarketRate table using region code as "country"
    for (const { region, currency } of extraRegions) {
      try {
        const liveRates = await this.getMarketRates(currency, region);
        const metals = liveRates.metals;

        for (const [metalCode, ratePerGram] of Object.entries(metals)) {
          if (!ratePerGram || ratePerGram <= 0) continue;

          await this.prisma.marketRate.updateMany({
            where: {
              metalCode,
              country: region,
              validUntil: null,
            },
            data: { validUntil: new Date() },
          });

          await this.prisma.marketRate.create({
            data: {
              metalCode,
              country: region,
              ratePerGram,
              source: liveRates.source || "metalpriceapi",
              validFrom: new Date(),
              validUntil: null,
            },
          });
        }

        this.logger.log(
          `Synced ${Object.keys(metals).length} metal rates for ${region} (${currency}). ` +
            `GOLD_24K=${metals.GOLD_24K}/g`,
        );
      } catch (error) {
        this.logger.error(`Failed to sync rates for ${region}: ${error}`);
      }
    }
  }
}
