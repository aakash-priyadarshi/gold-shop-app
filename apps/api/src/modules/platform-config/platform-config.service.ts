import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "../../common/redis";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Platform configuration service — manages dynamic settings stored in SystemConfig table.
 * Uses Redis caching with 5-minute TTL for frequently accessed values.
 */
@Injectable()
export class PlatformConfigService {
  private readonly logger = new Logger(PlatformConfigService.name);
  private readonly CACHE_PREFIX = "platform:config:";
  private readonly CACHE_TTL = 300; // 5 minutes

  // Config key constants
  static readonly KEYS = {
    DEFAULT_MAKING_CHARGE_PERCENT: "default_making_charge_percent",
    PLATFORM_COMMISSION_RATE: "platform_commission_rate",
    MAKING_CHARGE_CAP_STANDARD: "making_charge_cap_standard",
    MAKING_CHARGE_CAP_SILVER: "making_charge_cap_silver",
    MAKING_CHARGE_CAP_GOLD: "making_charge_cap_gold",
    MAKING_CHARGE_CAP_ELITE: "making_charge_cap_elite",
    // Silver tier criteria
    SILVER_MIN_ORDERS: "silver_min_orders",
    SILVER_MAX_CANCELLATION_RATE: "silver_max_cancellation_rate",
    SILVER_MIN_RATING: "silver_min_rating",
    SILVER_MIN_TENURE_MONTHS: "silver_min_tenure_months",
    // Gold tier criteria
    GOLD_MIN_ORDERS: "gold_min_orders",
    GOLD_MAX_CANCELLATION_RATE: "gold_max_cancellation_rate",
    GOLD_MIN_RATING: "gold_min_rating",
    GOLD_MIN_TENURE_MONTHS: "gold_min_tenure_months",
    GOLD_MIN_POSITIVE_FEEDBACK: "gold_min_positive_feedback",
    GOLD_MIN_ON_TIME_DISPATCH: "gold_min_on_time_dispatch",
    GOLD_REQUIRES_VERIFIED: "gold_requires_verified",
    // Elite tier criteria
    ELITE_MIN_ORDERS: "elite_min_orders",
    ELITE_MAX_CANCELLATION_RATE: "elite_max_cancellation_rate",
    ELITE_MIN_RATING: "elite_min_rating",
    ELITE_MIN_TENURE_MONTHS: "elite_min_tenure_months",
    ELITE_MIN_POSITIVE_FEEDBACK: "elite_min_positive_feedback",
    ELITE_MIN_ON_TIME_DISPATCH: "elite_min_on_time_dispatch",
    PRICE_FLAGGING_THRESHOLD: "price_flagging_threshold", // % above avg to flag
    // Feature flags (stored as 0 = disabled, 1 = enabled)
    CUSTOMER_FLOW_ENABLED: "customer_flow_enabled",
  } as const;

  // Default values (fallback if not in DB)
  private readonly DEFAULTS: Record<string, number> = {
    [PlatformConfigService.KEYS.DEFAULT_MAKING_CHARGE_PERCENT]: 10,
    [PlatformConfigService.KEYS.PLATFORM_COMMISSION_RATE]: 5, // 5%
    [PlatformConfigService.KEYS.MAKING_CHARGE_CAP_STANDARD]: 15,
    [PlatformConfigService.KEYS.MAKING_CHARGE_CAP_SILVER]: 18,
    [PlatformConfigService.KEYS.MAKING_CHARGE_CAP_GOLD]: 22,
    [PlatformConfigService.KEYS.MAKING_CHARGE_CAP_ELITE]: 100, // effectively uncapped
    // Silver: entry-level proven seller
    [PlatformConfigService.KEYS.SILVER_MIN_ORDERS]: 30,
    [PlatformConfigService.KEYS.SILVER_MAX_CANCELLATION_RATE]: 5,
    [PlatformConfigService.KEYS.SILVER_MIN_RATING]: 4.0,
    [PlatformConfigService.KEYS.SILVER_MIN_TENURE_MONTHS]: 3,
    // Gold: high-performing seller
    [PlatformConfigService.KEYS.GOLD_MIN_ORDERS]: 75,
    [PlatformConfigService.KEYS.GOLD_MAX_CANCELLATION_RATE]: 3,
    [PlatformConfigService.KEYS.GOLD_MIN_RATING]: 4.5,
    [PlatformConfigService.KEYS.GOLD_MIN_TENURE_MONTHS]: 5,
    [PlatformConfigService.KEYS.GOLD_MIN_POSITIVE_FEEDBACK]: 80,
    [PlatformConfigService.KEYS.GOLD_MIN_ON_TIME_DISPATCH]: 90,
    [PlatformConfigService.KEYS.GOLD_REQUIRES_VERIFIED]: 1, // 1 = yes, 0 = no
    // Elite: best-in-class seller
    [PlatformConfigService.KEYS.ELITE_MIN_ORDERS]: 100,
    [PlatformConfigService.KEYS.ELITE_MAX_CANCELLATION_RATE]: 2,
    [PlatformConfigService.KEYS.ELITE_MIN_RATING]: 4.7,
    [PlatformConfigService.KEYS.ELITE_MIN_TENURE_MONTHS]: 6,
    [PlatformConfigService.KEYS.ELITE_MIN_POSITIVE_FEEDBACK]: 90,
    [PlatformConfigService.KEYS.ELITE_MIN_ON_TIME_DISPATCH]: 95,
    [PlatformConfigService.KEYS.PRICE_FLAGGING_THRESHOLD]: 50,
    // Customer registration & login flow disabled by default during seller-first phase
    [PlatformConfigService.KEYS.CUSTOMER_FLOW_ENABLED]: 0,
  };

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  /**
   * Get a numeric config value with Redis caching and DB fallback
   */
  async getValue(key: string): Promise<number> {
    // 1. Check Redis cache
    const cacheKey = `${this.CACHE_PREFIX}${key}`;
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached !== null) {
        return parseFloat(cached);
      }
    } catch {
      // Redis error, continue to DB
    }

    // 2. Check database
    try {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key },
      });

      if (config) {
        const value =
          typeof config.value === "number"
            ? config.value
            : parseFloat(String(config.value));

        // Cache in Redis
        await this.redisService.set(cacheKey, String(value), this.CACHE_TTL);
        return value;
      }
    } catch (error) {
      this.logger.error(`Error reading config key ${key}: ${error.message}`);
    }

    // 3. Return default
    return this.DEFAULTS[key] ?? 0;
  }

  /**
   * Set a config value (admin use)
   */
  async setValue(
    key: string,
    value: number,
    updatedBy?: string,
  ): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value: value as any, updatedBy },
      create: { key, value: value as any, updatedBy },
    });

    // Invalidate cache
    const cacheKey = `${this.CACHE_PREFIX}${key}`;
    await this.redisService.del(cacheKey);

    this.logger.log(
      `Config updated: ${key} = ${value} (by ${updatedBy || "system"})`,
    );
  }

  /**
   * Get all platform config values for admin panel
   */
  async getAll(): Promise<Record<string, number>> {
    const configs = await this.prisma.systemConfig.findMany();
    const result: Record<string, number> = { ...this.DEFAULTS };

    for (const config of configs) {
      if (config.key in this.DEFAULTS) {
        result[config.key] =
          typeof config.value === "number"
            ? config.value
            : parseFloat(String(config.value));
      }
    }

    return result;
  }

  /**
   * Batch update multiple config values
   */
  async setMany(
    values: Record<string, number>,
    updatedBy?: string,
  ): Promise<void> {
    const operations = Object.entries(values).map(([key, value]) =>
      this.prisma.systemConfig.upsert({
        where: { key },
        update: { value: value as any, updatedBy },
        create: { key, value: value as any, updatedBy },
      }),
    );

    await this.prisma.$transaction(operations);

    // Invalidate all caches
    for (const key of Object.keys(values)) {
      await this.redisService.del(`${this.CACHE_PREFIX}${key}`);
    }

    this.logger.log(
      `Batch config update: ${Object.keys(values).join(", ")} (by ${updatedBy || "system"})`,
    );
  }

  // ===========================
  // Convenience getters
  // ===========================

  async getDefaultMakingChargePercent(): Promise<number> {
    return this.getValue(
      PlatformConfigService.KEYS.DEFAULT_MAKING_CHARGE_PERCENT,
    );
  }

  async getPlatformCommissionRate(): Promise<number> {
    return this.getValue(PlatformConfigService.KEYS.PLATFORM_COMMISSION_RATE);
  }

  async getMakingChargeCap(tier: string): Promise<number> {
    const tierKey = `making_charge_cap_${tier.toLowerCase()}`;
    return this.getValue(tierKey);
  }

  async isCustomerFlowEnabled(): Promise<boolean> {
    const value = await this.getValue(
      PlatformConfigService.KEYS.CUSTOMER_FLOW_ENABLED,
    );
    return value === 1;
  }
}
