import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SellerTier } from "@prisma/client";
import { RedisService } from "../../common/redis";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PlatformConfigService } from "../platform-config/platform-config.service";

@Injectable()
export class SellerPerformanceService {
  private readonly logger = new Logger(SellerPerformanceService.name);
  private readonly CACHE_PREFIX = "seller:perf:";
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private configService: PlatformConfigService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Recalculate performance metrics for all active shops — runs every 6 hours
   */
  @Cron("0 0 */6 * * *") // Every 6 hours
  async recalculateAll(): Promise<void> {
    this.logger.log("Starting seller performance recalculation...");

    const shops = await this.prisma.shop.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    let updated = 0;
    for (const shop of shops) {
      try {
        await this.recalculateForShop(shop.id);
        updated++;
      } catch (error) {
        this.logger.error(
          `Failed to recalculate for shop ${shop.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Performance recalculated for ${updated}/${shops.length} shops`,
    );

    // After recalculating all, evaluate tier eligibility
    await this.evaluateAllTiers();
  }

  /**
   * Recalculate performance metrics for a single shop
   */
  async recalculateForShop(shopId: string): Promise<any> {
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get order stats
    const [orderStats, recentRatings, allRatings, firstOrder, lastOrder] =
      await Promise.all([
        this.prisma.order.groupBy({
          by: ["status"],
          where: { shopId },
          _count: { id: true },
          _sum: { totalNpr: true },
        }),
        // Ratings from last 60 days
        this.prisma.shopRating.findMany({
          where: {
            shopId,
            createdAt: { gte: sixtyDaysAgo },
          },
          select: { overall: true },
        }),
        // All-time ratings
        this.prisma.shopRating.aggregate({
          where: { shopId },
          _avg: { overall: true },
          _count: { id: true },
        }),
        // First order date
        this.prisma.order.findFirst({
          where: { shopId, status: { in: ["COMPLETED", "DELIVERED"] } },
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        }),
        // Last order date
        this.prisma.order.findFirst({
          where: { shopId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
      ]);

    // Calculate order counts
    let totalOrders = 0;
    let successfulOrders = 0;
    let cancelledOrders = 0;
    let refundedOrders = 0;
    let totalRevenue = 0;

    const successStatuses = ["COMPLETED", "DELIVERED"];
    const cancelStatuses = ["CANCELLED"];
    const refundStatuses = ["REFUNDED"];

    for (const stat of orderStats) {
      const count = stat._count.id;
      totalOrders += count;
      totalRevenue += stat._sum.totalNpr || 0;

      if (successStatuses.includes(stat.status)) {
        successfulOrders += count;
      }
      if (cancelStatuses.includes(stat.status)) {
        cancelledOrders += count;
      }
      if (refundStatuses.includes(stat.status)) {
        refundedOrders += count;
      }
    }

    const cancellationRate =
      totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

    const refundRate =
      totalOrders > 0 ? (refundedOrders / totalOrders) * 100 : 0;

    // Calculate 60-day rolling average rating
    const avgRating60Days =
      recentRatings.length > 0
        ? recentRatings.reduce((sum, r) => sum + r.overall, 0) /
          recentRatings.length
        : 0;

    // Calculate positive feedback rate (>= 4 stars out of total ratings in 60 days)
    const positiveCount = recentRatings.filter((r) => r.overall >= 4).length;
    const positiveFeedbackRate =
      recentRatings.length > 0
        ? (positiveCount / recentRatings.length) * 100
        : 0;

    // On-time dispatch rate — estimated from order transit times
    // For now, base it on orders that reached SHIPPED within estimated days
    const onTimeDispatchRate = successfulOrders > 10 ? 92 : 100; // Placeholder until dispatch tracking is added

    // All-time average rating
    const avgRating = allRatings._avg.overall || 0;

    // Upsert performance record
    const performance = await this.prisma.sellerPerformance.upsert({
      where: { shopId },
      update: {
        totalOrders,
        successfulOrders,
        cancelledOrders,
        refundedOrders,
        cancellationRate: Math.round(cancellationRate * 100) / 100,
        refundRate: Math.round(refundRate * 100) / 100,
        avgRating: Math.round(avgRating * 100) / 100,
        avgRating60Days: Math.round(avgRating60Days * 100) / 100,
        positiveFeedbackRate: Math.round(positiveFeedbackRate * 100) / 100,
        onTimeDispatchRate: Math.round(onTimeDispatchRate * 100) / 100,
        totalRevenue,
        firstSaleAt: firstOrder?.createdAt || null,
        lastOrderAt: lastOrder?.createdAt || null,
        lastCalculatedAt: now,
      },
      create: {
        shopId,
        totalOrders,
        successfulOrders,
        cancelledOrders,
        refundedOrders,
        cancellationRate: Math.round(cancellationRate * 100) / 100,
        refundRate: Math.round(refundRate * 100) / 100,
        avgRating: Math.round(avgRating * 100) / 100,
        avgRating60Days: Math.round(avgRating60Days * 100) / 100,
        positiveFeedbackRate: Math.round(positiveFeedbackRate * 100) / 100,
        onTimeDispatchRate: Math.round(onTimeDispatchRate * 100) / 100,
        totalRevenue,
        firstSaleAt: firstOrder?.createdAt || null,
        lastOrderAt: lastOrder?.createdAt || null,
        lastCalculatedAt: now,
      },
    });

    // Update shop's firstSaleAt if not set
    if (firstOrder?.createdAt) {
      await this.prisma.shop.update({
        where: { id: shopId },
        data: { firstSaleAt: firstOrder.createdAt },
      });
    }

    // Cache performance
    await this.cachePerformance(shopId, performance);

    return performance;
  }

  /**
   * Evaluate and update seller tier for all shops
   */
  async evaluateAllTiers(): Promise<void> {
    const performances = await this.prisma.sellerPerformance.findMany({
      include: {
        shop: {
          select: {
            id: true,
            sellerTier: true,
            isVerified: true,
            createdAt: true,
            firstSaleAt: true,
            suspensionCount: true,
            disputeCount: true,
            eliteFastTracked: true,
            badges: { where: { isActive: true } },
          },
        },
      },
    });

    for (const perf of performances) {
      try {
        const newTier = await this.calculateTier(perf, perf.shop);
        if (newTier !== perf.shop.sellerTier) {
          await this.updateTier(perf.shop.id, newTier);
        }
      } catch (error) {
        this.logger.error(
          `Failed to evaluate tier for shop ${perf.shopId}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Calculate what tier a seller should be based on performance + criteria
   */
  private async calculateTier(perf: any, shop: any): Promise<SellerTier> {
    // Load ALL tier criteria in one batch
    const [
      // Silver criteria
      silverMinOrders,
      silverMaxCancellation,
      silverMinRating,
      silverMinTenureMonths,
      // Gold criteria
      goldMinOrders,
      goldMaxCancellation,
      goldMinRating,
      goldMinTenureMonths,
      goldMinPositiveFeedback,
      goldMinOnTimeDispatch,
      goldRequiresVerified,
      // Elite criteria
      eliteMinOrders,
      eliteMaxCancellation,
      eliteMinRating,
      eliteMinTenureMonths,
      eliteMinPositiveFeedback,
      eliteMinOnTimeDispatch,
    ] = await Promise.all([
      // Silver
      this.configService.getValue(PlatformConfigService.KEYS.SILVER_MIN_ORDERS),
      this.configService.getValue(
        PlatformConfigService.KEYS.SILVER_MAX_CANCELLATION_RATE,
      ),
      this.configService.getValue(PlatformConfigService.KEYS.SILVER_MIN_RATING),
      this.configService.getValue(
        PlatformConfigService.KEYS.SILVER_MIN_TENURE_MONTHS,
      ),
      // Gold
      this.configService.getValue(PlatformConfigService.KEYS.GOLD_MIN_ORDERS),
      this.configService.getValue(
        PlatformConfigService.KEYS.GOLD_MAX_CANCELLATION_RATE,
      ),
      this.configService.getValue(PlatformConfigService.KEYS.GOLD_MIN_RATING),
      this.configService.getValue(
        PlatformConfigService.KEYS.GOLD_MIN_TENURE_MONTHS,
      ),
      this.configService.getValue(
        PlatformConfigService.KEYS.GOLD_MIN_POSITIVE_FEEDBACK,
      ),
      this.configService.getValue(
        PlatformConfigService.KEYS.GOLD_MIN_ON_TIME_DISPATCH,
      ),
      this.configService.getValue(
        PlatformConfigService.KEYS.GOLD_REQUIRES_VERIFIED,
      ),
      // Elite
      this.configService.getValue(PlatformConfigService.KEYS.ELITE_MIN_ORDERS),
      this.configService.getValue(
        PlatformConfigService.KEYS.ELITE_MAX_CANCELLATION_RATE,
      ),
      this.configService.getValue(PlatformConfigService.KEYS.ELITE_MIN_RATING),
      this.configService.getValue(
        PlatformConfigService.KEYS.ELITE_MIN_TENURE_MONTHS,
      ),
      this.configService.getValue(
        PlatformConfigService.KEYS.ELITE_MIN_POSITIVE_FEEDBACK,
      ),
      this.configService.getValue(
        PlatformConfigService.KEYS.ELITE_MIN_ON_TIME_DISPATCH,
      ),
    ]);

    // Tenure in months
    const tenureMs = Date.now() - new Date(shop.createdAt).getTime();
    const tenureMonths = tenureMs / (30 * 24 * 60 * 60 * 1000);

    // Disqualifications — any suspension or excessive disputes = forced STANDARD
    if (shop.suspensionCount > 0 || shop.disputeCount > 3) {
      return SellerTier.STANDARD;
    }

    // ── ELITE ────────────────────────────────────────────
    // Strictest tier: all metrics must be excellent + must be verified
    const isEliteEligible =
      perf.successfulOrders >= eliteMinOrders &&
      perf.cancellationRate <= eliteMaxCancellation &&
      perf.avgRating60Days >= eliteMinRating &&
      tenureMonths >= eliteMinTenureMonths &&
      perf.positiveFeedbackRate >= eliteMinPositiveFeedback &&
      perf.onTimeDispatchRate >= eliteMinOnTimeDispatch &&
      shop.isVerified;

    if (isEliteEligible) {
      return SellerTier.ELITE;
    }

    // ── GOLD ─────────────────────────────────────────────
    // High performer: strong metrics + feedback/dispatch checks + optionally verified
    // Fast-track: campaign/escrow/express badge holders get relaxed criteria
    const isFastTrackEligible =
      shop.eliteFastTracked ||
      shop.badges?.some((b: any) =>
        ["CAMPAIGN_PARTICIPANT", "ESCROW_PARTNER", "EXPRESS_SHIPPING"].includes(
          b.badgeType,
        ),
      );

    const isGoldEligible =
      perf.successfulOrders >= goldMinOrders &&
      perf.cancellationRate <= goldMaxCancellation &&
      perf.avgRating60Days >= goldMinRating &&
      tenureMonths >= goldMinTenureMonths &&
      perf.positiveFeedbackRate >= goldMinPositiveFeedback &&
      perf.onTimeDispatchRate >= goldMinOnTimeDispatch &&
      (goldRequiresVerified === 0 || shop.isVerified);

    // Fast-track path to Gold: relaxed by 25% on orders/rating
    const isFastTrackGold =
      isFastTrackEligible &&
      perf.successfulOrders >= goldMinOrders * 0.75 &&
      perf.avgRating60Days >= goldMinRating - 0.2 &&
      perf.cancellationRate <= goldMaxCancellation + 1;

    if (isGoldEligible || isFastTrackGold) {
      return SellerTier.GOLD;
    }

    // ── SILVER ───────────────────────────────────────────
    // Entry-level proven seller: basic track record established
    const isSilverEligible =
      perf.successfulOrders >= silverMinOrders &&
      perf.cancellationRate <= silverMaxCancellation &&
      perf.avgRating60Days >= silverMinRating &&
      tenureMonths >= silverMinTenureMonths;

    if (isSilverEligible) {
      return SellerTier.SILVER;
    }

    // ── STANDARD ─────────────────────────────────────────
    // Default tier: all new sellers start here, no criteria needed
    return SellerTier.STANDARD;
  }

  /**
   * Update a shop's tier and associated making charge cap
   */
  private async updateTier(shopId: string, newTier: SellerTier): Promise<void> {
    const cap = await this.configService.getMakingChargeCap(newTier);

    await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        sellerTier: newTier,
        tierUnlockedAt: new Date(),
        makingChargeCap: cap,
      },
    });

    // If upgrading to ELITE, award badge
    if (newTier === SellerTier.ELITE) {
      await this.prisma.sellerBadge.upsert({
        where: { shopId_badgeType: { shopId, badgeType: "ELITE_SELLER" } },
        update: { isActive: true, awardedAt: new Date() },
        create: {
          shopId,
          badgeType: "ELITE_SELLER",
          awardedBy: "SYSTEM",
          reason: "Met all Elite Seller criteria",
        },
      });
    }

    this.logger.log(`Shop ${shopId} tier updated to ${newTier} (cap: ${cap}%)`);

    // Notify shop owner about tier change
    try {
      const shop = await this.prisma.shop.findUnique({
        where: { id: shopId },
        select: { userId: true, sellerTier: true },
      });
      if (shop?.userId) {
        await this.notificationsService.create({
          userId: shop.userId,
          type: "SYSTEM_ALERT",
          titleKey: "notification.tier_change.title",
          titleParams: { tier: newTier },
          bodyKey: "notification.tier_change.body",
          bodyParams: { tier: newTier, cap },
          referenceType: "SHOP",
          referenceId: shopId,
          channels: ["EMAIL", "PUSH"],
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to notify tier change for shop ${shopId}: ${err.message}`,
      );
    }
  }

  /**
   * Get cached performance for a shop
   */
  async getPerformance(shopId: string): Promise<any> {
    // Check Redis
    const cacheKey = `${this.CACHE_PREFIX}${shopId}`;
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      /* continue */
    }

    // Fetch from DB
    const perf = await this.prisma.sellerPerformance.findUnique({
      where: { shopId },
    });

    if (perf) {
      await this.cachePerformance(shopId, perf);
    }

    return perf;
  }

  /**
   * Get full performance dashboard data for a shop (including tier progress)
   */
  async getDashboard(
    shopId: string,
    overrideTargetTier?: string,
  ): Promise<any> {
    const [performance, shop, badges] = await Promise.all([
      this.getPerformance(shopId),
      this.prisma.shop.findUnique({
        where: { id: shopId },
        select: {
          sellerTier: true,
          tierUnlockedAt: true,
          makingChargeCap: true,
          makingChargePercent: true,
          isVerified: true,
          createdAt: true,
          firstSaleAt: true,
          eliteFastTracked: true,
        },
      }),
      this.prisma.sellerBadge.findMany({
        where: { shopId, isActive: true },
        orderBy: { awardedAt: "desc" },
      }),
    ]);

    // Determine next tier and load its criteria
    const currentTier = shop?.sellerTier || "STANDARD";
    const nextTier =
      currentTier === "STANDARD"
        ? "SILVER"
        : currentTier === "SILVER"
          ? "GOLD"
          : currentTier === "GOLD"
            ? "ELITE"
            : null; // ELITE has no next tier

    // Load criteria for the next tier (or Elite if already Elite)
    // Allow override via query param so frontend can show any tier's requirements
    const TIER_ORDER = ["STANDARD", "SILVER", "GOLD", "ELITE"];
    const validOverride =
      overrideTargetTier &&
      TIER_ORDER.includes(overrideTargetTier.toUpperCase())
        ? overrideTargetTier.toUpperCase()
        : null;
    const targetTier = validOverride || nextTier || "ELITE";
    const prefix = targetTier.toLowerCase();

    const criteriaKeys = {
      minOrders: `${prefix}_min_orders`,
      maxCancellation: `${prefix}_max_cancellation_rate`,
      minRating: `${prefix}_min_rating`,
      minTenureMonths: `${prefix}_min_tenure_months`,
    };

    // Gold and Elite have additional criteria
    const hasAdvancedCriteria = targetTier === "GOLD" || targetTier === "ELITE";
    const advancedKeys = hasAdvancedCriteria
      ? {
          minPositive: `${prefix}_min_positive_feedback`,
          minOnTime: `${prefix}_min_on_time_dispatch`,
        }
      : null;

    const [minOrders, maxCancellation, minRating, minTenureMonths] =
      await Promise.all([
        this.configService.getValue(criteriaKeys.minOrders),
        this.configService.getValue(criteriaKeys.maxCancellation),
        this.configService.getValue(criteriaKeys.minRating),
        this.configService.getValue(criteriaKeys.minTenureMonths),
      ]);

    let minPositive = 0;
    let minOnTime = 0;
    if (advancedKeys) {
      [minPositive, minOnTime] = await Promise.all([
        this.configService.getValue(advancedKeys.minPositive),
        this.configService.getValue(advancedKeys.minOnTime),
      ]);
    }

    const tenureMs =
      Date.now() - new Date(shop?.createdAt || Date.now()).getTime();
    const tenureMonths = tenureMs / (30 * 24 * 60 * 60 * 1000);

    // Build tier progress (what's needed for the next tier)
    const tierProgress: Record<string, any> = {
      orders: {
        current: performance?.successfulOrders || 0,
        required: minOrders,
        met: (performance?.successfulOrders || 0) >= minOrders,
      },
      cancellationRate: {
        current: performance?.cancellationRate || 0,
        required: maxCancellation,
        met: (performance?.cancellationRate || 0) <= maxCancellation,
      },
      rating: {
        current: performance?.avgRating60Days || 0,
        required: minRating,
        met: (performance?.avgRating60Days || 0) >= minRating,
      },
      tenure: {
        current: Math.round(tenureMonths * 10) / 10,
        required: minTenureMonths,
        met: tenureMonths >= minTenureMonths,
      },
    };

    if (hasAdvancedCriteria) {
      tierProgress.positiveFeedback = {
        current: performance?.positiveFeedbackRate || 0,
        required: minPositive,
        met: (performance?.positiveFeedbackRate || 0) >= minPositive,
      };
      tierProgress.onTimeDispatch = {
        current: performance?.onTimeDispatchRate || 0,
        required: minOnTime,
        met: (performance?.onTimeDispatchRate || 0) >= minOnTime,
      };
    }

    // Gold and Elite require verification
    if (targetTier === "GOLD" || targetTier === "ELITE") {
      tierProgress.verified = {
        current: shop?.isVerified || false,
        required: true,
        met: shop?.isVerified || false,
      };
    }

    const totalCriteria = Object.keys(tierProgress).length;
    const metCriteria = Object.values(tierProgress).filter(
      (c: any) => c.met,
    ).length;

    return {
      performance,
      shop: {
        sellerTier: shop?.sellerTier,
        tierUnlockedAt: shop?.tierUnlockedAt,
        makingChargeCap: shop?.makingChargeCap,
        makingChargePercent: shop?.makingChargePercent,
        isVerified: shop?.isVerified,
        eliteFastTracked: shop?.eliteFastTracked,
      },
      badges,
      nextTier: nextTier, // null if already ELITE
      viewingTier: targetTier, // which tier's requirements are shown
      tierProgress,
      overallProgress: {
        met: metCriteria,
        total: totalCriteria,
        percentage: Math.round((metCriteria / totalCriteria) * 100),
      },
    };
  }

  private async cachePerformance(shopId: string, data: any): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${shopId}`;
      await this.redisService.set(
        cacheKey,
        JSON.stringify(data),
        this.CACHE_TTL,
      );
    } catch {
      /* ignore */
    }
  }

  /**
   * Weekly performance digest — every Monday at 9 AM
   * Sends a summary to each active shopkeeper
   */
  @Cron("0 0 9 * * 1") // Monday 9 AM
  async sendWeeklyDigest(): Promise<void> {
    this.logger.log("Sending weekly performance digests...");

    const shops = await this.prisma.shop.findMany({
      where: { isActive: true },
      select: { id: true, userId: true, shopName: true },
    });

    for (const shop of shops) {
      try {
        const perf = await this.prisma.sellerPerformance.findUnique({
          where: { shopId: shop.id },
        });
        if (!perf) continue;

        // Count orders this week
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weeklyOrders = await this.prisma.order.count({
          where: { shopId: shop.id, createdAt: { gte: weekAgo } },
        });

        await this.notificationsService.create({
          userId: shop.userId,
          type: "SYSTEM_ALERT",
          titleKey: "notification.weekly_digest.title",
          bodyKey: "notification.weekly_digest.body",
          bodyParams: {
            shopName: shop.shopName,
            weeklyOrders,
            totalOrders: perf.totalOrders,
            avgRating: perf.avgRating,
            revenue: perf.totalRevenue,
          },
          referenceType: "SHOP",
          referenceId: shop.id,
          channels: ["EMAIL"],
        });
      } catch (err) {
        this.logger.error(
          `Weekly digest failed for shop ${shop.id}: ${err.message}`,
        );
      }
    }

    this.logger.log(`Weekly digests sent to ${shops.length} shops`);
  }

  /**
   * Dormant shop detection — runs daily at 10 AM
   * Flags shops with no activity in last 14 days
   */
  @Cron("0 0 10 * * *") // Daily at 10 AM
  async detectDormantShops(): Promise<void> {
    this.logger.log("Checking for dormant shops...");

    const dormantThreshold = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const dormantShops = await this.prisma.shop.findMany({
      where: {
        isActive: true,
        isOnHold: false,
        // No orders in last 14 days
        orders: { none: { createdAt: { gte: dormantThreshold } } },
        // No quotes in last 14 days
        shopQuotes: { none: { createdAt: { gte: dormantThreshold } } },
      },
      select: { id: true, userId: true, shopName: true, updatedAt: true },
    });

    for (const shop of dormantShops) {
      try {
        await this.notificationsService.create({
          userId: shop.userId,
          type: "SYSTEM_ALERT",
          titleKey: "notification.dormant_shop.title",
          bodyKey: "notification.dormant_shop.body",
          bodyParams: { shopName: shop.shopName },
          referenceType: "SHOP",
          referenceId: shop.id,
          channels: ["EMAIL", "PUSH"],
        });
      } catch (err) {
        this.logger.error(
          `Dormant notification failed for shop ${shop.id}: ${err.message}`,
        );
      }
    }

    this.logger.log(
      `Found ${dormantShops.length} dormant shops, notifications sent`,
    );
  }
}
