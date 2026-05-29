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

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
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

// What triggered an external metal-price fetch (for audit + throttle bypass).
type FetchTrigger = "cron" | "startup" | "manual" | "on-demand";

@Injectable()
export class MarketRatesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketRatesService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly cacheTtlHours: number;
  private readonly staleCacheTtlHours: number;
  /// Provider monthly call quota (free tier = 100) — surfaced in admin monitor.
  private readonly monthlyQuota: number;

  // In-memory cache for quick access
  private cache: Map<
    CacheKey,
    { data: MarketRatesResponse; expiresAt: Date; fetchedAt: Date }
  > = new Map();

  // ── Single-source-of-truth throttle state ──
  /// Cached fetch-interval config (avoids a DB read on every request).
  private intervalConfigCache: { value: number; expiresAt: number } | null =
    null;
  /// De-dupes concurrent API fetches into a single in-flight request.
  private spotFetchInFlight: Promise<{
    spotPrices: SpotPricesUsd;
    spotSource: "metalpriceapi" | "fallback";
  }> | null = null;
  /// Self-rescheduling timer that triggers a fetch when the interval elapses.
  private fetchTimer: ReturnType<typeof setTimeout> | null = null;
  /// Cap on a single setTimeout delay so long intervals still re-evaluate
  /// periodically (and pick up admin config changes / setTimeout overflow).
  private static readonly MAX_TIMER_DELAY_MS = 60 * 60 * 1000; // 1 hour

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
    this.monthlyQuota = parseInt(
      this.configService.get<string>("METALPRICEAPI_MONTHLY_QUOTA") || "100",
      10,
    );

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
    // Start the self-rescheduling fetch timer. This ONLY triggers an external
    // API call when the configured interval has elapsed since the last stored
    // spot snapshot — so a server restart/redeploy no longer burns quota.
    await this.scheduleNextFetch("startup");
  }

  onModuleDestroy(): void {
    if (this.fetchTimer) {
      clearTimeout(this.fetchTimer);
      this.fetchTimer = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SINGLE-SOURCE-OF-TRUTH THROTTLE + SCHEDULER
  // ═══════════════════════════════════════════════════════════════

  /**
   * Read the admin-configured fetch interval (seconds), cached in memory for
   * 60s to avoid a DB read on every request. Lazily creates the singleton row.
   */
  private async getFetchIntervalSeconds(): Promise<number> {
    if (
      this.intervalConfigCache &&
      this.intervalConfigCache.expiresAt > Date.now()
    ) {
      return this.intervalConfigCache.value;
    }
    const config = await this.prisma.metalPriceConfig.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
    this.intervalConfigCache = {
      value: config.fetchIntervalSeconds,
      expiresAt: Date.now() + 60_000,
    };
    return config.fetchIntervalSeconds;
  }

  /** Latest stored raw USD spot snapshot — the single source of truth. */
  private async getLatestSpotSnapshot() {
    return this.prisma.metalSpotSnapshot.findFirst({
      orderBy: { fetchedAt: "desc" },
    });
  }

  /** Has the configured interval elapsed since the last successful API fetch? */
  private async isFetchDue(): Promise<boolean> {
    const latest = await this.getLatestSpotSnapshot();
    if (!latest) return true;
    const intervalMs = (await this.getFetchIntervalSeconds()) * 1000;
    return Date.now() - latest.fetchedAt.getTime() >= intervalMs;
  }

  /**
   * Schedule the next fetch for exactly when the interval next elapses.
   * Self-reschedules after each tick and is also called whenever the admin
   * changes the interval. Capped at MAX_TIMER_DELAY_MS so long intervals still
   * re-evaluate periodically.
   */
  private async scheduleNextFetch(trigger: FetchTrigger = "cron"): Promise<void> {
    if (this.fetchTimer) {
      clearTimeout(this.fetchTimer);
      this.fetchTimer = null;
    }

    let delay = 0;
    try {
      const intervalMs = (await this.getFetchIntervalSeconds()) * 1000;
      const latest = await this.getLatestSpotSnapshot();
      const lastMs = latest ? latest.fetchedAt.getTime() : 0;
      delay = Math.max(0, lastMs + intervalMs - Date.now());
    } catch (e) {
      this.logger.warn(`scheduleNextFetch: could not compute delay: ${e}`);
      delay = MarketRatesService.MAX_TIMER_DELAY_MS;
    }

    const actualDelay = Math.min(delay, MarketRatesService.MAX_TIMER_DELAY_MS);
    this.fetchTimer = setTimeout(() => {
      void this.onFetchTimer(trigger);
    }, actualDelay);
    // Don't keep the event loop alive solely for this timer (tests/shutdown).
    if (typeof this.fetchTimer.unref === "function") this.fetchTimer.unref();
  }

  /** Timer callback: run a sync only if a fetch is actually due, then reschedule. */
  private async onFetchTimer(trigger: FetchTrigger): Promise<void> {
    try {
      if (await this.isFetchDue()) {
        await this.syncRatesToMarketRateTable(trigger);
      }
    } catch (e) {
      this.logger.warn(`Scheduled metal-price fetch failed: ${e}`);
    } finally {
      // After the first tick, subsequent ticks are normal cron-triggered.
      await this.scheduleNextFetch("cron");
    }
  }

  /** Convert a stored spot snapshot back into the in-memory spot-price shape. */
  private snapshotToSpot(snapshot: {
    goldUsdOz: number;
    silverUsdOz: number;
    platinumUsdOz: number;
    palladiumUsdOz: number;
    providerTimestamp: Date;
  }): SpotPricesUsd {
    return {
      XAU: snapshot.goldUsdOz,
      XAG: snapshot.silverUsdOz,
      XPT: snapshot.platinumUsdOz,
      XPD: snapshot.palladiumUsdOz,
      timestamp: snapshot.providerTimestamp.toISOString(),
    };
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

      // Record today's price in history table (fire-and-forget)
      this.recordDailyGoldPrice(targetRegion, currency, freshData.metals.GOLD_24K).catch(
        (e) => this.logger.warn(`Failed to record gold price history: ${e}`),
      );

      // Compute day-over-day change from history
      const changePercent = await this.computeChangePercent(targetRegion, currency, freshData.metals.GOLD_24K);
      const enriched = { ...freshData, changePercent };

      // Store in both caches
      this.setMemoryCache(cacheKey, enriched);
      await this.storeInDbCache(targetRegion, currency, enriched);

      return { ...enriched, cache: "miss" };
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

    // Force a fresh external spot fetch (bypasses the daily throttle).
    await this.fetchSpotPricesUsdPerOunce("manual");

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

  // ═══════════════════════════════════════════════════════════════
  // ADMIN: METAL-PRICE FETCH MONITORING & CONTROL
  // ═══════════════════════════════════════════════════════════════

  /**
   * Snapshot of the metal-price fetch pipeline for the admin dashboard:
   * configured interval, last/next fetch, quota usage, latest spot prices and
   * the most recent fetch attempts.
   */
  async getMetalPriceMonitor(): Promise<{
    apiConfigured: boolean;
    fetchIntervalSeconds: number;
    lastFetchAt: Date | null;
    nextFetchAt: Date | null;
    lastSource: string | null;
    latestSpot: {
      goldUsdOz: number;
      silverUsdOz: number;
      platinumUsdOz: number;
      palladiumUsdOz: number;
      providerTimestamp: Date;
    } | null;
    monthlyQuota: number;
    apiCallsToday: number;
    apiCallsThisMonth: number;
    recentFetches: Array<{
      id: string;
      success: boolean;
      source: string;
      trigger: string;
      goldUsdOz: number | null;
      errorMessage: string | null;
      fetchedAt: Date;
    }>;
  }> {
    const intervalSeconds = await this.getFetchIntervalSeconds();
    const latest = await this.getLatestSpotSnapshot();

    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    const [apiCallsToday, apiCallsThisMonth, recentFetches] = await Promise.all([
      this.prisma.metalPriceFetchLog.count({
        where: { source: "metalpriceapi", fetchedAt: { gte: startOfDay } },
      }),
      this.prisma.metalPriceFetchLog.count({
        where: { source: "metalpriceapi", fetchedAt: { gte: startOfMonth } },
      }),
      this.prisma.metalPriceFetchLog.findMany({
        orderBy: { fetchedAt: "desc" },
        take: 20,
        select: {
          id: true,
          success: true,
          source: true,
          trigger: true,
          goldUsdOz: true,
          errorMessage: true,
          fetchedAt: true,
        },
      }),
    ]);

    const lastFetchAt = latest?.fetchedAt ?? null;
    const nextFetchAt = lastFetchAt
      ? new Date(lastFetchAt.getTime() + intervalSeconds * 1000)
      : now;

    return {
      apiConfigured: !!this.apiKey,
      fetchIntervalSeconds: intervalSeconds,
      lastFetchAt,
      nextFetchAt,
      lastSource: latest?.source ?? null,
      latestSpot: latest
        ? {
            goldUsdOz: latest.goldUsdOz,
            silverUsdOz: latest.silverUsdOz,
            platinumUsdOz: latest.platinumUsdOz,
            palladiumUsdOz: latest.palladiumUsdOz,
            providerTimestamp: latest.providerTimestamp,
          }
        : null,
      monthlyQuota: this.monthlyQuota,
      apiCallsToday,
      apiCallsThisMonth,
      recentFetches,
    };
  }

  /**
   * Update the external-API fetch interval (admin). Clamped to a 1-second
   * minimum. Immediately reschedules the fetch timer.
   */
  async updateFetchInterval(
    seconds: number,
    updatedBy?: string,
  ): Promise<{ fetchIntervalSeconds: number }> {
    const clamped = Math.max(1, Math.floor(seconds));
    const config = await this.prisma.metalPriceConfig.upsert({
      where: { id: "singleton" },
      update: { fetchIntervalSeconds: clamped, updatedBy: updatedBy ?? null },
      create: {
        id: "singleton",
        fetchIntervalSeconds: clamped,
        updatedBy: updatedBy ?? null,
      },
    });
    this.intervalConfigCache = null;
    await this.scheduleNextFetch("cron");
    this.logger.log(
      `Metal-price fetch interval updated to ${clamped}s by ${updatedBy ?? "admin"}`,
    );
    return { fetchIntervalSeconds: config.fetchIntervalSeconds };
  }

  /**
   * Admin-initiated manual refresh: forces ONE external fetch (bypassing the
   * throttle) and recomputes all regional rates, then returns the monitor.
   */
  async manualRefreshMetalPrices(): Promise<
    Awaited<ReturnType<MarketRatesService["getMetalPriceMonitor"]>>
  > {
    await this.syncRatesToMarketRateTable("manual");
    await this.scheduleNextFetch("cron");
    return this.getMetalPriceMonitor();
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
   * Get USD-per-troy-ounce spot prices — the SINGLE SOURCE OF TRUTH.
   *
   * The external MetalpriceAPI is called at most once per configured interval.
   * Within the throttle window, the latest stored snapshot is returned without
   * any network call. Concurrent callers are de-duped into one in-flight fetch.
   * A `manual` trigger bypasses the throttle (admin-initiated refresh).
   */
  private async fetchSpotPricesUsdPerOunce(
    trigger: FetchTrigger = "on-demand",
  ): Promise<{
    spotPrices: SpotPricesUsd;
    spotSource: "metalpriceapi" | "fallback";
  }> {
    if (!this.apiKey) {
      this.logger.warn("No API key - using fallback spot prices");
      return { spotPrices: this.FALLBACK_SPOT_PRICES, spotSource: "fallback" };
    }

    // ── Throttle: serve the stored snapshot if the interval hasn't elapsed ──
    if (trigger !== "manual") {
      const latest = await this.getLatestSpotSnapshot();
      if (latest) {
        const intervalMs = (await this.getFetchIntervalSeconds()) * 1000;
        const age = Date.now() - latest.fetchedAt.getTime();
        if (age < intervalMs) {
          this.logger.debug(
            `Spot throttle: serving stored snapshot (age ${Math.round(age / 1000)}s < ${Math.round(intervalMs / 1000)}s) — no API call`,
          );
          return {
            spotPrices: this.snapshotToSpot(latest),
            spotSource: latest.source as "metalpriceapi" | "fallback",
          };
        }
      }
    }

    // ── A fetch is due (or forced): de-dupe concurrent callers into one call ──
    if (this.spotFetchInFlight) {
      return this.spotFetchInFlight;
    }
    this.spotFetchInFlight = this.doFetchSpotFromApi(trigger).finally(() => {
      this.spotFetchInFlight = null;
    });
    return this.spotFetchInFlight;
  }

  /**
   * Perform the actual external API call, persist the result as the new
   * single-source-of-truth snapshot, and write an audit log row. On failure,
   * falls back to the last stored snapshot (if any) or hardcoded defaults.
   */
  private async doFetchSpotFromApi(trigger: FetchTrigger): Promise<{
    spotPrices: SpotPricesUsd;
    spotSource: "metalpriceapi" | "fallback";
  }> {
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
        `Fetched spot (${trigger}): Gold=$${spotPrices.XAU.toFixed(2)}/oz, Silver=$${spotPrices.XAG.toFixed(2)}/oz`,
      );

      // Persist as the new single source of truth + audit log.
      await this.persistSpotSnapshot(spotPrices, "metalpriceapi", trigger);

      return { spotPrices, spotSource: "metalpriceapi" };
    } catch (error) {
      this.logger.error(`MetalpriceAPI error: ${error}`);
      await this.logFetchAttempt(false, "metalpriceapi", trigger, null, String(error));

      // Prefer the last stored snapshot over hardcoded fallback.
      const latest = await this.getLatestSpotSnapshot();
      if (latest) {
        this.logger.warn("Returning last stored spot snapshot after API error");
        return {
          spotPrices: this.snapshotToSpot(latest),
          spotSource: latest.source as "metalpriceapi" | "fallback",
        };
      }
      return { spotPrices: this.FALLBACK_SPOT_PRICES, spotSource: "fallback" };
    }
  }

  /** Store a new spot snapshot (single source of truth) and write an audit log. */
  private async persistSpotSnapshot(
    spot: SpotPricesUsd,
    source: "metalpriceapi" | "fallback",
    trigger: FetchTrigger,
  ): Promise<void> {
    try {
      await this.prisma.metalSpotSnapshot.create({
        data: {
          goldUsdOz: spot.XAU,
          silverUsdOz: spot.XAG,
          platinumUsdOz: spot.XPT,
          palladiumUsdOz: spot.XPD,
          providerTimestamp: new Date(spot.timestamp),
          source,
          trigger,
        },
      });
      await this.logFetchAttempt(true, source, trigger, spot, null);
    } catch (e) {
      this.logger.warn(`Failed to persist spot snapshot: ${e}`);
    }
  }

  /** Append a row to the metal-price fetch audit log (best-effort). */
  private async logFetchAttempt(
    success: boolean,
    source: "metalpriceapi" | "fallback",
    trigger: FetchTrigger,
    spot: SpotPricesUsd | null,
    errorMessage: string | null,
  ): Promise<void> {
    try {
      await this.prisma.metalPriceFetchLog.create({
        data: {
          success,
          source,
          trigger,
          goldUsdOz: spot?.XAU ?? null,
          silverUsdOz: spot?.XAG ?? null,
          errorMessage: errorMessage ? errorMessage.slice(0, 500) : null,
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to write fetch log: ${e}`);
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

  // ═══════════════════════════════════════════════════════════════
  // GOLD PRICE HISTORY — daily recording & trend computation
  // ═══════════════════════════════════════════════════════════════

  /** UTC date string like "2026-05-20" for a given timestamp. */
  private toDateString(date: Date = new Date()): string {
    return date.toISOString().slice(0, 10);
  }

  /**
   * Upsert today's gold 24K rate into GoldPriceHistory.
   * Safe to call multiple times per day — only one row per region+currency+day.
   */
  private async recordDailyGoldPrice(
    region: MarketRegion,
    currency: SupportedCurrency,
    gold24kRate: number,
  ): Promise<void> {
    const recordedDate = this.toDateString();
    await this.prisma.goldPriceHistory.upsert({
      where: { region_currency_recordedDate: { region, currency, recordedDate } },
      update: { gold24kRate },
      create: { region, currency, gold24kRate, recordedDate },
    });
  }

  /**
   * Compute day-over-day change percent for gold 24K.
   * Returns null when there is no prior day data yet.
   */
  private async computeChangePercent(
    region: MarketRegion,
    currency: SupportedCurrency,
    todayRate: number,
  ): Promise<number | null> {
    try {
      const yesterday = this.toDateString(new Date(Date.now() - 86_400_000));
      const row = await this.prisma.goldPriceHistory.findUnique({
        where: { region_currency_recordedDate: { region, currency, recordedDate: yesterday } },
      });
      if (!row || row.gold24kRate === 0) return null;
      return parseFloat((((todayRate - row.gold24kRate) / row.gold24kRate) * 100).toFixed(2));
    } catch (e) {
      this.logger.warn(`Could not compute changePercent: ${e}`);
      return null;
    }
  }

  /**
   * Remove GoldPriceHistory rows older than 7 days.
   * Runs daily at 2:00 AM UTC.
   */
  @Cron("0 0 2 * * *")
  async pruneGoldPriceHistory(): Promise<void> {
    try {
      const cutoff = this.toDateString(new Date(Date.now() - 7 * 86_400_000));
      const { count } = await this.prisma.goldPriceHistory.deleteMany({
        where: { recordedDate: { lt: cutoff } },
      });
      if (count > 0) this.logger.log(`Pruned ${count} old GoldPriceHistory rows`);
    } catch (e) {
      this.logger.warn(`GoldPriceHistory prune failed: ${e}`);
    }
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
   *
   * Driven by the self-rescheduling fetch timer (configurable interval) rather
   * than a fixed cron, so the admin can set any frequency (seconds → days).
   * Fetches spot prices + FX ONCE (1 API call, throttled), then computes all
   * regions locally. NOTE: MetalpriceAPI free limit is 100 calls/month.
   */
  async syncRatesToMarketRateTable(
    trigger: FetchTrigger = "cron",
  ): Promise<void> {
    this.logger.log("Syncing live market rates to MarketRate table...");

    // ── Fetch raw data ONCE (1 API call for spot + 1 for FX) ──
    let spotPrices: SpotPricesUsd;
    let spotSource: "metalpriceapi" | "fallback";
    let fxSnapshot: ExtendedFxSnapshot;

    try {
      const spotResult = await this.fetchSpotPricesUsdPerOunce(trigger);
      spotPrices = spotResult.spotPrices;
      spotSource = spotResult.spotSource;
    } catch (error) {
      this.logger.error(`Spot price fetch failed, using fallback: ${error}`);
      spotPrices = this.FALLBACK_SPOT_PRICES;
      spotSource = "fallback";
    }

    try {
      fxSnapshot = await this.fxRatesService.getExtendedFxSnapshot();
    } catch (error) {
      this.logger.error(`FX fetch failed, aborting sync: ${error}`);
      return; // Can't compute local prices without FX
    }

    this.logger.log(
      `Spot: Gold=$${spotPrices.XAU.toFixed(2)}/oz (${spotSource}), ` +
        `FX: USD/NPR=${fxSnapshot.USD_NPR.rate}, USD/INR=${fxSnapshot.USD_INR.rate}`,
    );

    // ── Compute and upsert rates for all regions ──
    const allRegions: Array<{
      region: MarketRegion;
      currency: SupportedCurrency;
      country: string; // MarketRate table "country" column
    }> = [
      { region: "NP", currency: "NPR", country: "NP" },
      { region: "IN", currency: "INR", country: "IN" },
      { region: "AE", currency: "AED", country: "AE" },
      { region: "UK", currency: "GBP", country: "UK" },
      { region: "EU", currency: "EUR", country: "EU" },
      { region: "US", currency: "USD", country: "US" },
    ];

    let totalSynced = 0;

    for (const { region, currency, country } of allRegions) {
      try {
        const adjustments = getRegionAdjustments(region);
        const fxRate = this.getFxRateForCurrency(currency, fxSnapshot);
        const metals = this.calculateMetalRates(
          spotPrices,
          fxRate.rate,
          adjustments.multiplier,
        );

        // Upsert each metal rate into the MarketRate table
        for (const [metalCode, ratePerGram] of Object.entries(metals)) {
          if (!ratePerGram || ratePerGram <= 0) continue;

          // Expire old rates for this metal+country
          await this.prisma.marketRate.updateMany({
            where: { metalCode, country, validUntil: null },
            data: { validUntil: new Date() },
          });

          // Create new rate
          await this.prisma.marketRate.create({
            data: {
              metalCode,
              country,
              ratePerGram,
              source: spotSource,
              validFrom: new Date(),
              validUntil: null,
            },
          });
        }

        this.logger.log(
          `Synced ${Object.keys(metals).length} rates for ${country} (${currency}). ` +
            `GOLD_24K=${metals.GOLD_24K}/g`,
        );
        totalSynced += Object.keys(metals).length;

        // Record daily gold price history for this region/currency
        await this.recordDailyGoldPrice(region, currency, metals.GOLD_24K);

        // Compute day-over-day change using yesterday's history row
        const changePercent = await this.computeChangePercent(region, currency, metals.GOLD_24K);

        // Also update the DB snapshot cache so getMarketRates() serves fresh data
        const freshResponse: MarketRatesResponse = {
          region,
          currency,
          country: getLegacyCountry(region),
          unit: "per_gram",
          updatedAt: spotPrices.timestamp,
          source: spotSource,
          cache: "miss",
          fx: fxRate,
          fxSnapshot,
          adjustments,
          metals,
          changePercent,
          debug: {
            spotSource,
            fxSource: fxRate.source as any,
            spotUsed: {
              goldUsdOz: spotPrices.XAU,
              silverUsdOz: spotPrices.XAG,
              platinumUsdOz: spotPrices.XPT,
              palladiumUsdOz: spotPrices.XPD,
            },
            fxUsed: this.buildFxUsedDebug(fxSnapshot),
            regionUsed: region,
            regionMultiplierUsed: adjustments.multiplier,
            computedAt: new Date().toISOString(),
          },
        };
        await this.storeInDbCache(region, currency, freshResponse);

        // Also refresh memory cache
        const cacheKey: CacheKey = `${region}:${currency}`;
        this.setMemoryCache(cacheKey, freshResponse);
      } catch (error) {
        this.logger.error(`Failed to sync rates for ${country}: ${error}`);
      }
    }

    this.logger.log(
      `Market rate sync complete: ${totalSynced} rates across ${allRegions.length} regions`,
    );
  }
}
