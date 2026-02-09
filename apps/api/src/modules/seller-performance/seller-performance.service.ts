import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SellerTier } from "@prisma/client";
import { RedisService } from "../../common/redis";
import { PrismaService } from "../../prisma/prisma.service";
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
    const [
      minOrders,
      maxCancellation,
      minRating,
      minTenureMonths,
      minPositiveFeedback,
      minOnTimeDispatch,
    ] = await Promise.all([
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

    // Check for disqualifications
    if (shop.suspensionCount > 0 || shop.disputeCount > 3) {
      return SellerTier.STANDARD;
    }

    // Check ELITE eligibility
    const isEliteEligible =
      perf.successfulOrders >= minOrders &&
      perf.cancellationRate <= maxCancellation &&
      perf.avgRating60Days >= minRating &&
      tenureMonths >= minTenureMonths &&
      perf.positiveFeedbackRate >= minPositiveFeedback &&
      perf.onTimeDispatchRate >= minOnTimeDispatch &&
      shop.isVerified;

    // Fast-track elite (campaign/escrow/express participation)
    const isFastTrackEligible =
      shop.eliteFastTracked ||
      shop.badges?.some((b: any) =>
        ["CAMPAIGN_PARTICIPANT", "ESCROW_PARTNER", "EXPRESS_SHIPPING"].includes(
          b.badgeType,
        ),
      );

    if (isEliteEligible) {
      return SellerTier.ELITE;
    }

    // Fast-track can achieve GOLD even without full ELITE criteria
    if (
      isFastTrackEligible &&
      perf.successfulOrders >= minOrders * 0.5 &&
      perf.avgRating60Days >= 4.5 &&
      perf.cancellationRate <= maxCancellation + 1
    ) {
      return SellerTier.GOLD;
    }

    // Check GOLD eligibility (relaxed criteria)
    if (
      perf.successfulOrders >= minOrders * 0.75 &&
      perf.cancellationRate <= maxCancellation + 1 &&
      perf.avgRating60Days >= 4.5 &&
      tenureMonths >= minTenureMonths * 0.75 &&
      shop.isVerified
    ) {
      return SellerTier.GOLD;
    }

    // Check SILVER eligibility
    if (
      perf.successfulOrders >= minOrders * 0.3 &&
      perf.cancellationRate <= maxCancellation + 3 &&
      perf.avgRating60Days >= 4.0 &&
      tenureMonths >= 3
    ) {
      return SellerTier.SILVER;
    }

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
  async getDashboard(shopId: string): Promise<any> {
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

    // Calculate tier progress
    const [
      minOrders,
      maxCancellation,
      minRating,
      minTenureMonths,
      minPositive,
      minOnTime,
    ] = await Promise.all([
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

    const tenureMs =
      Date.now() - new Date(shop?.createdAt || Date.now()).getTime();
    const tenureMonths = tenureMs / (30 * 24 * 60 * 60 * 1000);

    const tierProgress = {
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
      positiveFeedback: {
        current: performance?.positiveFeedbackRate || 0,
        required: minPositive,
        met: (performance?.positiveFeedbackRate || 0) >= minPositive,
      },
      onTimeDispatch: {
        current: performance?.onTimeDispatchRate || 0,
        required: minOnTime,
        met: (performance?.onTimeDispatchRate || 0) >= minOnTime,
      },
      verified: {
        current: shop?.isVerified || false,
        required: true,
        met: shop?.isVerified || false,
      },
    };

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
}
