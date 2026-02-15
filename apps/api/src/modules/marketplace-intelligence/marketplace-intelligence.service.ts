import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisService } from '../../common/redis';

/**
 * Marketplace Intelligence Service
 * 
 * Responsibilities:
 * 1. Data capture: Populates RfqOrderInsight from completed RFQ→Order cycles
 * 2. Phase milestone tracking: Monitors order counts and alerts admin at thresholds
 * 3. Quote anomaly detection: Flags offers with unusual pricing patterns
 * 4. Market analytics: Aggregates data for AI training and admin dashboards
 */
@Injectable()
export class MarketplaceIntelligenceService {
  private readonly logger = new Logger(MarketplaceIntelligenceService.name);
  private readonly CACHE_PREFIX = 'mkt:intel:';
  private readonly CACHE_TTL = 1800; // 30 minutes

  // Phase milestone definitions
  private readonly MILESTONES = [
    {
      phase: 1,
      name: 'PHASE_1_LAUNCH',
      threshold: 0,
      description: 'Platform launched — AI uses general knowledge only. RFQ builder, feasibility checker, and tooltips all active with zero-data prompts.',
      actions: [
        'Verify Gemini Flash API is responding',
        'Test RFQ builder with sample queries',
        'Ensure data capture is recording insights',
        'Monitor AI response quality manually',
      ],
    },
    {
      phase: 2,
      name: 'PHASE_2_100_ORDERS',
      threshold: 100,
      description: 'Enough data for category-level insights. AI can now reference real pricing ranges, popular materials, and average delivery times.',
      actions: [
        'Review captured RfqOrderInsight data quality',
        'Enable market-aware prompts in RFQ builder',
        'Update feasibility checker with real price ranges',
        'Generate category pricing reports',
        'Review quote anomaly patterns',
      ],
    },
    {
      phase: 2,
      name: 'PHASE_2_200_ORDERS',
      threshold: 200,
      description: 'Strong data foundation. Can compute per-shop benchmarks and reliable market averages.',
      actions: [
        'Enable per-shop performance benchmarks in AI prompts',
        'Turn on automated counter-offer suggestions',
        'Publish market price indices to sellers',
        'Generate first AI accuracy report',
      ],
    },
    {
      phase: 3,
      name: 'PHASE_3_500_ORDERS',
      threshold: 500,
      description: 'Full AI capability unlocked. Predictive pricing, personalized recommendations, and advanced anomaly detection.',
      actions: [
        'Enable predictive price suggestions for customers',
        'Turn on personalized seller recommendations',
        'Activate advanced anomaly detection (ML-like patterns)',
        'Generate comprehensive market report for admin',
        'Review and potentially increase Gemini daily limits',
      ],
    },
  ];

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private redisService: RedisService,
  ) {}

  // ═══════════════════════════════════════
  // PHASE MILESTONE MANAGEMENT
  // ═══════════════════════════════════════

  /**
   * Initialize milestones on module startup (idempotent)
   */
  async initializeMilestones(): Promise<void> {
    for (const milestone of this.MILESTONES) {
      await this.prisma.aiPhaseMilestone.upsert({
        where: {
          phase_milestoneName: {
            phase: milestone.phase,
            milestoneName: milestone.name,
          },
        },
        update: {},
        create: {
          phase: milestone.phase,
          milestoneName: milestone.name,
          description: milestone.description,
          thresholdValue: milestone.threshold,
          actionItems: milestone.actions.map((action) => ({
            action,
            status: 'pending',
            completedAt: null,
          })),
        },
      });
    }
    this.logger.log('AI phase milestones initialized');
  }

  /**
   * Check phase milestones every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkPhaseMilestones(): Promise<void> {
    const completedInsights = await this.prisma.rfqOrderInsight.count({
      where: { orderCompleted: true },
    });

    const totalInsights = await this.prisma.rfqOrderInsight.count();

    this.logger.log(
      `Phase milestone check: ${completedInsights} completed orders, ${totalInsights} total insights`,
    );

    const unreachedMilestones = await this.prisma.aiPhaseMilestone.findMany({
      where: { isReached: false },
      orderBy: { thresholdValue: 'asc' },
    });

    for (const milestone of unreachedMilestones) {
      if (completedInsights >= milestone.thresholdValue) {
        await this.prisma.aiPhaseMilestone.update({
          where: { id: milestone.id },
          data: {
            isReached: true,
            reachedAt: new Date(),
            currentValue: completedInsights,
          },
        });

        // Notify all admin users
        await this.notifyAdminsOfMilestone(milestone, completedInsights);

        this.logger.log(
          `🎯 Milestone reached: ${milestone.milestoneName} (${completedInsights}/${milestone.thresholdValue})`,
        );
      } else {
        // Update current value for progress tracking
        await this.prisma.aiPhaseMilestone.update({
          where: { id: milestone.id },
          data: { currentValue: completedInsights },
        });
      }
    }
  }

  /**
   * Get all milestones with progress
   */
  async getMilestones(): Promise<any[]> {
    const milestones = await this.prisma.aiPhaseMilestone.findMany({
      orderBy: [{ phase: 'asc' }, { thresholdValue: 'asc' }],
    });

    const completedOrders = await this.prisma.rfqOrderInsight.count({
      where: { orderCompleted: true },
    });

    return milestones.map((m) => ({
      ...m,
      progress: m.thresholdValue > 0
        ? Math.min(100, Math.round((completedOrders / m.thresholdValue) * 100))
        : 100,
      currentValue: completedOrders,
    }));
  }

  /**
   * Update a milestone action item status
   */
  async updateMilestoneAction(
    milestoneId: string,
    actionIndex: number,
    status: 'pending' | 'completed' | 'skipped',
  ): Promise<any> {
    const milestone = await this.prisma.aiPhaseMilestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone || !milestone.actionItems) return null;

    const actions = milestone.actionItems as any[];
    if (actionIndex >= 0 && actionIndex < actions.length) {
      actions[actionIndex].status = status;
      if (status === 'completed') {
        actions[actionIndex].completedAt = new Date().toISOString();
      }
    }

    return this.prisma.aiPhaseMilestone.update({
      where: { id: milestoneId },
      data: { actionItems: actions },
    });
  }

  private async notifyAdminsOfMilestone(milestone: any, currentValue: number): Promise<void> {
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN', status: 'ACTIVE' },
        select: { id: true },
      });

      for (const admin of admins) {
        await this.notificationsService.create({
          userId: admin.id,
          type: 'SYSTEM_ALERT',
          titleKey: 'notification.ai_milestone.title',
          titleParams: { milestone: milestone.milestoneName, phase: milestone.phase },
          bodyKey: 'notification.ai_milestone.body',
          bodyParams: {
            milestone: milestone.milestoneName,
            description: milestone.description,
            currentValue,
            threshold: milestone.thresholdValue,
          },
          referenceType: 'AI_PHASE',
          referenceId: milestone.id,
          channels: ['EMAIL', 'PUSH'],
        });
      }

      await this.prisma.aiPhaseMilestone.update({
        where: { id: milestone.id },
        data: { adminNotifiedAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Failed to notify admins of milestone: ${error.message}`);
    }
  }

  // ═══════════════════════════════════════
  // DATA CAPTURE (RfqOrderInsight)
  // ═══════════════════════════════════════

  /**
   * Capture insight when an offer is selected (called from offers service)
   */
  async captureOfferSelection(rfqId: string, selectedOfferId: string): Promise<void> {
    try {
      const rfq = await this.prisma.rfqRequest.findUnique({
        where: { id: rfqId },
        include: {
          offers: {
            include: { shop: { select: { id: true, country: true } } },
          },
          customer: { select: { preferredCountry: true } },
        },
      });

      if (!rfq) return;

      const selectedOffer = rfq.offers.find((o) => o.id === selectedOfferId);
      const nonDeclinedOffers = rfq.offers.filter((o) => o.status !== 'DECLINED');

      const avgPrice = nonDeclinedOffers.length > 0
        ? nonDeclinedOffers.reduce((sum, o) => sum + o.totalPriceNpr, 0) / nonDeclinedOffers.length
        : null;

      const avgMakingPct = nonDeclinedOffers.length > 0
        ? nonDeclinedOffers.reduce((sum, o) => {
            const pct = o.metalCostNpr > 0 ? (o.makingChargeNpr / o.metalCostNpr) * 100 : 0;
            return sum + pct;
          }, 0) / nonDeclinedOffers.length
        : null;

      const avgDays = nonDeclinedOffers.length > 0
        ? Math.round(nonDeclinedOffers.reduce((sum, o) => sum + o.estimatedDays, 0) / nonDeclinedOffers.length)
        : null;

      const firstOffer = nonDeclinedOffers.length > 0
        ? nonDeclinedOffers.reduce((earliest, o) =>
            o.createdAt < earliest.createdAt ? o : earliest,
          ).createdAt
        : null;

      await this.prisma.rfqOrderInsight.create({
        data: {
          rfqId: rfq.id,
          rfqJewelleryType: rfq.jewelleryType,
          rfqBuildMethod: rfq.buildMethod,
          rfqComposition: rfq.composition as any,
          rfqBudgetMin: rfq.budgetMinNpr,
          rfqBudgetMax: rfq.budgetMaxNpr,
          rfqWeightCategory: rfq.weightCategory,
          rfqSpecialNotes: rfq.specialInstructions,
          rfqMarketRegion: rfq.customer?.preferredCountry || 'NP',
          totalOffers: nonDeclinedOffers.length,
          avgOfferPrice: avgPrice,
          minOfferPrice: nonDeclinedOffers.length > 0
            ? Math.min(...nonDeclinedOffers.map((o) => o.totalPriceNpr))
            : null,
          maxOfferPrice: nonDeclinedOffers.length > 0
            ? Math.max(...nonDeclinedOffers.map((o) => o.totalPriceNpr))
            : null,
          avgMakingChargePct: avgMakingPct,
          avgEstimatedDays: avgDays,
          selectedOfferId,
          selectedShopId: selectedOffer?.shopId || null,
          selectedPrice: selectedOffer?.totalPriceNpr || null,
          rfqCreatedAt: rfq.createdAt,
          firstOfferAt: firstOffer,
          offerSelectedAt: new Date(),
        },
      });

      this.logger.log(`Captured RFQ insight for RFQ ${rfqId}`);
    } catch (error) {
      this.logger.error(`Failed to capture offer selection insight: ${error.message}`);
    }
  }

  /**
   * Update insight when order completes (called from orders service)
   */
  async captureOrderCompletion(orderId: string, rfqOfferId: string, rating?: number): Promise<void> {
    try {
      // Find the insight by selectedOfferId
      const insight = await this.prisma.rfqOrderInsight.findFirst({
        where: { selectedOfferId: rfqOfferId },
      });

      if (insight) {
        await this.prisma.rfqOrderInsight.update({
          where: { id: insight.id },
          data: {
            orderId,
            orderCompleted: true,
            orderCompletedAt: new Date(),
            orderRating: rating,
          },
        });
        this.logger.log(`Updated insight for completed order ${orderId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to capture order completion insight: ${error.message}`);
    }
  }

  /**
   * Record loss reason for a non-selected offer
   */
  async recordLossReason(
    offerId: string,
    category: string,
    note?: string,
  ): Promise<void> {
    await this.prisma.rfqOffer.update({
      where: { id: offerId },
      data: {
        lossReasonCategory: category,
        lossReasonNote: note,
      },
    });

    // Also update the RfqOrderInsight if it exists
    const offer = await this.prisma.rfqOffer.findUnique({
      where: { id: offerId },
      select: { rfqId: true },
    });

    if (offer) {
      const insight = await this.prisma.rfqOrderInsight.findFirst({
        where: { rfqId: offer.rfqId },
      });

      if (insight) {
        const existingReasons = (insight.lossReasons as any[]) || [];
        existingReasons.push({ offerId, category, note, recordedAt: new Date().toISOString() });

        await this.prisma.rfqOrderInsight.update({
          where: { id: insight.id },
          data: { lossReasons: existingReasons },
        });
      }
    }
  }

  // ═══════════════════════════════════════
  // QUOTE ANOMALY DETECTION
  // ═══════════════════════════════════════

  /**
   * Run anomaly detection every 6 hours
   */
  @Cron('0 30 */6 * * *') // Every 6 hours at :30
  async detectQuoteAnomalies(): Promise<void> {
    this.logger.log('Running quote anomaly detection...');

    try {
      // Get recent offers (last 24h)
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentOffers = await this.prisma.rfqOffer.findMany({
        where: {
          createdAt: { gte: since },
          status: { not: 'DECLINED' },
        },
        include: {
          rfq: { select: { jewelleryType: true, buildMethod: true } },
          shop: { select: { id: true, shopName: true, sellerTier: true } },
        },
      });

      if (recentOffers.length < 3) {
        this.logger.log('Not enough recent offers for anomaly detection');
        return;
      }

      // Group by jewellery type for comparison
      const grouped: Record<string, typeof recentOffers> = {};
      for (const offer of recentOffers) {
        const key = `${offer.rfq.jewelleryType}_${offer.rfq.buildMethod}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(offer);
      }

      let anomaliesFound = 0;

      for (const [key, offers] of Object.entries(grouped)) {
        if (offers.length < 2) continue;

        // Calculate statistics
        const prices = offers.map((o) => o.totalPriceNpr);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const stdDev = Math.sqrt(
          prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length,
        );

        // Making charge percentages
        const makingPcts = offers
          .filter((o) => o.metalCostNpr > 0)
          .map((o) => (o.makingChargeNpr / o.metalCostNpr) * 100);
        const avgMakingPct = makingPcts.length > 0
          ? makingPcts.reduce((a, b) => a + b, 0) / makingPcts.length
          : 0;

        for (const offer of offers) {
          // Price anomaly: more than 2 standard deviations from mean
          if (stdDev > 0) {
            const deviation = Math.abs(offer.totalPriceNpr - avgPrice);
            if (deviation > 2 * stdDev) {
              const deviationPct = (deviation / avgPrice) * 100;
              const anomalyType = offer.totalPriceNpr > avgPrice
                ? 'PRICE_TOO_HIGH'
                : 'PRICE_TOO_LOW';

              await this.prisma.quoteAnomaly.create({
                data: {
                  offerId: offer.id,
                  shopId: offer.shopId,
                  rfqId: offer.rfqId,
                  anomalyType,
                  severity: deviationPct > 100 ? 'HIGH' : deviationPct > 50 ? 'MEDIUM' : 'LOW',
                  expectedValue: avgPrice,
                  actualValue: offer.totalPriceNpr,
                  deviationPct,
                },
              });
              anomaliesFound++;
            }
          }

          // Making charge anomaly
          if (offer.metalCostNpr > 0) {
            const offerMakingPct = (offer.makingChargeNpr / offer.metalCostNpr) * 100;
            if (avgMakingPct > 0 && Math.abs(offerMakingPct - avgMakingPct) > 10) {
              await this.prisma.quoteAnomaly.create({
                data: {
                  offerId: offer.id,
                  shopId: offer.shopId,
                  rfqId: offer.rfqId,
                  anomalyType: 'MAKING_CHARGE_SPIKE',
                  severity: Math.abs(offerMakingPct - avgMakingPct) > 20 ? 'HIGH' : 'MEDIUM',
                  expectedValue: avgMakingPct,
                  actualValue: offerMakingPct,
                  deviationPct: Math.abs(offerMakingPct - avgMakingPct),
                },
              });
              anomaliesFound++;
            }
          }
        }
      }

      if (anomaliesFound > 0) {
        this.logger.warn(`Found ${anomaliesFound} quote anomalies`);
        // Notify admins if there are high-severity anomalies
        const highSeverity = await this.prisma.quoteAnomaly.count({
          where: {
            createdAt: { gte: since },
            severity: 'HIGH',
            isReviewed: false,
          },
        });

        if (highSeverity > 0) {
          await this.notifyAdminsOfAnomalies(highSeverity);
        }
      } else {
        this.logger.log('No anomalies detected');
      }
    } catch (error) {
      this.logger.error(`Anomaly detection failed: ${error.message}`);
    }
  }

  /**
   * Get anomalies for admin review
   */
  async getAnomalies(filters?: {
    type?: string;
    severity?: string;
    reviewed?: boolean;
    limit?: number;
  }): Promise<any> {
    const where: any = {};
    if (filters?.type) where.anomalyType = filters.type;
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.reviewed !== undefined) where.isReviewed = filters.reviewed;

    const anomalies = await this.prisma.quoteAnomaly.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
    });

    const stats = await this.prisma.quoteAnomaly.groupBy({
      by: ['anomalyType', 'severity'],
      where: { isReviewed: false },
      _count: { id: true },
    });

    return { anomalies, stats };
  }

  /**
   * Mark anomaly as reviewed
   */
  async reviewAnomaly(anomalyId: string, adminId: string, note?: string): Promise<any> {
    return this.prisma.quoteAnomaly.update({
      where: { id: anomalyId },
      data: {
        isReviewed: true,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        reviewNote: note,
      },
    });
  }

  private async notifyAdminsOfAnomalies(count: number): Promise<void> {
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN', status: 'ACTIVE' },
        select: { id: true },
      });

      for (const admin of admins) {
        await this.notificationsService.create({
          userId: admin.id,
          type: 'SYSTEM_ALERT',
          titleKey: 'notification.quote_anomaly.title',
          titleParams: { count },
          bodyKey: 'notification.quote_anomaly.body',
          bodyParams: { count },
          referenceType: 'QUOTE_ANOMALY',
          channels: ['EMAIL', 'PUSH'],
        });
      }
    } catch (error) {
      this.logger.error(`Failed to notify admins of anomalies: ${error.message}`);
    }
  }

  // ═══════════════════════════════════════
  // OFFER COMPARISON (Sprint 1)
  // ═══════════════════════════════════════

  /**
   * Get normalized comparison data for all offers on an RFQ
   */
  async getOfferComparison(rfqId: string): Promise<any> {
    const rfq = await this.prisma.rfqRequest.findUnique({
      where: { id: rfqId },
      include: {
        offers: {
          where: { status: { not: 'DECLINED' } },
          include: {
            shop: {
              select: {
                id: true,
                shopName: true,
                city: true,
                isVerified: true,
                sellerTier: true,
                profileImage: true,
              },
            },
          },
          orderBy: { totalPriceNpr: 'asc' },
        },
      },
    });

    if (!rfq) return null;

    // Get performance data for each shop
    const shopIds = rfq.offers.map((o) => o.shop.id);
    const performances = await this.prisma.sellerPerformance.findMany({
      where: { shopId: { in: shopIds } },
    });
    const perfMap = new Map(performances.map((p) => [p.shopId, p]));

    // Get badge data
    const badges = await this.prisma.sellerBadge.findMany({
      where: { shopId: { in: shopIds }, isActive: true },
    });
    const badgeMap = new Map<string, string[]>();
    for (const badge of badges) {
      if (!badgeMap.has(badge.shopId)) badgeMap.set(badge.shopId, []);
      badgeMap.get(badge.shopId)!.push(badge.badgeType);
    }

    // Compute comparison metrics
    const offers = rfq.offers.map((offer) => {
      const perf = perfMap.get(offer.shop.id);
      const makingPct = offer.metalCostNpr > 0
        ? Math.round((offer.makingChargeNpr / offer.metalCostNpr) * 100 * 10) / 10
        : 0;

      return {
        id: offer.id,
        shop: {
          id: offer.shop.id,
          name: offer.shop.shopName,
          city: offer.shop.city,
          isVerified: offer.shop.isVerified,
          tier: offer.shop.sellerTier,
          profileImage: offer.shop.profileImage,
          badges: badgeMap.get(offer.shop.id) || [],
          rating: perf?.avgRating || 0,
          totalOrders: perf?.totalOrders || 0,
          onTimeRate: perf?.onTimeDispatchRate || 0,
          responseTime: perf?.responseTimeHours || 0,
        },
        pricing: {
          metalCost: offer.metalCostNpr,
          makingCharge: offer.makingChargeNpr,
          makingChargePct: makingPct,
          finishCost: offer.finishCostNpr,
          gemstoneCost: offer.gemstoneCostNpr,
          tax: offer.taxNpr,
          total: offer.totalPriceNpr,
          bookingFee: offer.bookingFeeNpr,
          bookingFeePct: offer.bookingFeePercent,
        },
        delivery: {
          estimatedDays: offer.estimatedDays,
          weight: offer.confirmedTotalWeightG,
          goldWeight: offer.confirmedGoldWeightG,
        },
        notes: offer.shopNotes,
        status: offer.status,
        createdAt: offer.createdAt,
      };
    });

    // Highlight best values
    const highlights = {
      lowestPrice: offers.length > 0 ? offers[0].id : null,
      fastestDelivery: offers.length > 0
        ? offers.reduce((best, o) =>
            o.delivery.estimatedDays < best.delivery.estimatedDays ? o : best,
          ).id
        : null,
      highestRated: offers.length > 0
        ? offers.reduce((best, o) =>
            o.shop.rating > best.shop.rating ? o : best,
          ).id
        : null,
      lowestMakingCharge: offers.length > 0
        ? offers.reduce((best, o) =>
            o.pricing.makingChargePct < best.pricing.makingChargePct ? o : best,
          ).id
        : null,
    };

    return {
      rfqId,
      jewelleryType: rfq.jewelleryType,
      buildMethod: rfq.buildMethod,
      budget: { min: rfq.budgetMinNpr, max: rfq.budgetMaxNpr },
      totalOffers: offers.length,
      offers,
      highlights,
    };
  }

  // ═══════════════════════════════════════
  // ORDER PROTECTION TIMELINE (Sprint 1)
  // ═══════════════════════════════════════

  /**
   * Get order protection timeline for customer trust
   */
  async getOrderProtectionTimeline(orderId: string): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        milestones: { orderBy: { completedAt: 'asc' } },
        shop: {
          select: { shopName: true, isVerified: true, sellerTier: true },
        },
      },
    });

    if (!order) return null;

    // Build protection stages
    const stages = [
      {
        id: 'booking',
        label: 'Booking Fee Protected',
        description: 'Your booking fee is held securely. If the seller doesn\'t start production, you get a full refund.',
        icon: 'shield',
        status: this.getStageStatus(order, ['CREATED', 'PAYMENT_PENDING']),
        protectedAmount: order.bookingFeePaidNpr || 0,
      },
      {
        id: 'production',
        label: 'Production Monitored',
        description: 'We track every milestone. If you approved the design, the seller commits to specifications.',
        icon: 'factory',
        status: this.getStageStatus(order, ['IN_PRODUCTION', 'QC_PENDING']),
        milestones: order.milestones
          .filter((m) => ['CAD_APPROVED', 'CASTING_STARTED', 'STONE_SETTING', 'POLISHING'].includes(m.type))
          .map((m) => ({
            type: m.type,
            title: m.title,
            completedAt: m.completedAt,
            hasEvidence: m.evidenceUrls.length > 0,
          })),
      },
      {
        id: 'quality',
        label: 'Quality Assured',
        description: 'Every piece undergoes quality check. If it doesn\'t match specs, we intervene.',
        icon: 'check-circle',
        status: this.getStageStatus(order, ['QC_PASSED', 'READY_TO_SHIP']),
        qcPassed: order.milestones.some((m) => m.type === 'QUALITY_CHECK'),
      },
      {
        id: 'shipping',
        label: 'Insured Delivery',
        description: 'Tracked and insured shipping. Full protection until delivery is confirmed.',
        icon: 'truck',
        status: this.getStageStatus(order, ['SHIPPED', 'OUT_FOR_DELIVERY']),
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery,
      },
      {
        id: 'delivered',
        label: 'Satisfaction Guaranteed',
        description: 'Inspect your jewellery. If it doesn\'t match, raise a dispute within 48 hours.',
        icon: 'star',
        status: this.getStageStatus(order, ['DELIVERED', 'COMPLETED']),
        disputeWindowEnds: order.actualDelivery
          ? new Date(new Date(order.actualDelivery).getTime() + 48 * 60 * 60 * 1000)
          : null,
      },
    ];

    return {
      orderId,
      orderNumber: order.orderNumber,
      currentStatus: order.detailedStatus,
      shop: order.shop,
      stages,
      totalProtected: order.totalNpr,
      protectionLevel: order.shop.isVerified ? 'FULL' : 'STANDARD',
    };
  }

  private getStageStatus(
    order: any,
    relevantStatuses: string[],
  ): 'completed' | 'active' | 'upcoming' {
    const orderIdx = this.getStatusIndex(order.detailedStatus);
    const stageIdx = Math.max(
      ...relevantStatuses.map((s) => this.getStatusIndex(s)),
    );

    if (orderIdx > stageIdx) return 'completed';
    if (relevantStatuses.includes(order.detailedStatus)) return 'active';
    return 'upcoming';
  }

  private getStatusIndex(status: string): number {
    const order = [
      'PLACED', 'CONFIRMED', 'IN_PROGRESS', 'READY',
      'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED',
    ];
    const idx = order.indexOf(status);
    return idx >= 0 ? idx : -1;
  }

  // ═══════════════════════════════════════
  // TRUST-FIRST SHOP PROFILES (Sprint 1)
  // ═══════════════════════════════════════

  /**
   * Get trust profile data for a shop (public facing)
   */
  async getTrustProfile(shopId: string): Promise<any> {
    const [shop, perf, badges, recentRatings, orderCount] = await Promise.all([
      this.prisma.shop.findUnique({
        where: { id: shopId },
        select: {
          id: true,
          shopName: true,
          city: true,
          country: true,
          isVerified: true,
          sellerTier: true,
          profileImage: true,
          coverImage: true,
          about: true,
          supportedJewelleryTypes: true,
          supportedMethods: true,
          supportedMaterials: true,
          firstSaleAt: true,
          createdAt: true,
        },
      }),
      this.prisma.sellerPerformance.findUnique({
        where: { shopId },
      }),
      this.prisma.sellerBadge.findMany({
        where: { shopId, isActive: true },
        select: { badgeType: true, awardedAt: true },
      }),
      this.prisma.shopRating.findMany({
        where: { shopId, isPublic: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          overall: true,
          quality: true,
          communication: true,
          delivery: true,
          accuracy: true,
          reviewText: true,
          createdAt: true,
        },
      }),
      this.prisma.order.count({
        where: { shopId, status: { in: ['DELIVERED', 'COMPLETED'] } },
      }),
    ]);

    if (!shop) return null;

    // Calculate trust score (0-100)
    let trustScore = 0;
    if (shop.isVerified) trustScore += 25;
    if (perf) {
      trustScore += Math.min(25, (perf.avgRating / 5) * 25);
      trustScore += Math.min(15, (perf.onTimeDispatchRate / 100) * 15);
      trustScore += Math.min(10, Math.min(perf.totalOrders, 50) / 50 * 10);
      trustScore += Math.min(10, (1 - perf.cancellationRate / 100) * 10);
      trustScore += Math.min(15, ((100 - (perf.responseTimeHours || 48)) / 48) * 15);
    }
    trustScore = Math.max(0, Math.min(100, Math.round(trustScore)));

    // Tenure
    const tenureMonths = Math.floor(
      (Date.now() - new Date(shop.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000),
    );

    return {
      shop: {
        ...shop,
        tenureMonths,
      },
      performance: perf
        ? {
            avgRating: perf.avgRating,
            avgRating60Days: perf.avgRating60Days,
            totalOrders: perf.totalOrders,
            successfulOrders: perf.successfulOrders,
            onTimeRate: perf.onTimeDispatchRate,
            responseTimeHours: perf.responseTimeHours,
            cancellationRate: perf.cancellationRate,
          }
        : null,
      trustScore,
      badges: badges.map((b) => b.badgeType),
      completedOrders: orderCount,
      recentReviews: recentRatings,
    };
  }

  // ═══════════════════════════════════════
  // COUNTER-OFFER PLAYBOOKS (Sprint 3)
  // ═══════════════════════════════════════

  /**
   * Generate counter-offer suggestions based on market data
   */
  async getCounterOfferSuggestions(offerId: string): Promise<any> {
    const offer = await this.prisma.rfqOffer.findUnique({
      where: { id: offerId },
      include: {
        rfq: true,
        shop: { select: { sellerTier: true, makingChargeCap: true } },
      },
    });

    if (!offer) return null;

    // Get market averages for this jewellery type
    const avgData = await this.prisma.rfqOrderInsight.aggregate({
      where: {
        rfqJewelleryType: offer.rfq.jewelleryType,
        rfqBuildMethod: offer.rfq.buildMethod,
        orderCompleted: true,
      },
      _avg: {
        avgOfferPrice: true,
        avgMakingChargePct: true,
        avgEstimatedDays: true,
      },
      _count: { id: true },
    });

    const suggestions: Array<{
      type: string;
      label: string;
      description: string;
      suggestedValue: number;
      currentValue: number;
      potentialSaving: number;
    }> = [];

    // Suggestion 1: Negotiate making charge if above market average
    if (avgData._avg.avgMakingChargePct && offer.metalCostNpr > 0) {
      const currentMakingPct = (offer.makingChargeNpr / offer.metalCostNpr) * 100;
      const marketAvgPct = avgData._avg.avgMakingChargePct;

      if (currentMakingPct > marketAvgPct * 1.1) {
        const suggestedMakingNpr = (marketAvgPct / 100) * offer.metalCostNpr;
        suggestions.push({
          type: 'MAKING_CHARGE',
          label: 'Negotiate Making Charge',
          description: `The making charge (${currentMakingPct.toFixed(1)}%) is above the market average (${marketAvgPct.toFixed(1)}%). Consider negotiating.`,
          suggestedValue: Math.round(suggestedMakingNpr),
          currentValue: offer.makingChargeNpr,
          potentialSaving: Math.round(offer.makingChargeNpr - suggestedMakingNpr),
        });
      }
    }

    // Suggestion 2: If budget exists, suggest budget-aligned counter
    if (offer.rfq.budgetMaxNpr && offer.totalPriceNpr > offer.rfq.budgetMaxNpr) {
      const overBudget = offer.totalPriceNpr - offer.rfq.budgetMaxNpr;
      suggestions.push({
        type: 'BUDGET_ALIGN',
        label: 'Budget Alignment',
        description: `This offer is NPR ${overBudget.toLocaleString()} over your budget. You could counter with your max budget.`,
        suggestedValue: offer.rfq.budgetMaxNpr,
        currentValue: offer.totalPriceNpr,
        potentialSaving: overBudget,
      });
    }

    // Suggestion 3: Faster delivery
    if (avgData._avg.avgEstimatedDays && offer.estimatedDays > avgData._avg.avgEstimatedDays * 1.2) {
      suggestions.push({
        type: 'DELIVERY_TIME',
        label: 'Negotiate Delivery',
        description: `Estimated ${offer.estimatedDays} days is slower than average (${Math.round(avgData._avg.avgEstimatedDays)} days).`,
        suggestedValue: Math.round(avgData._avg.avgEstimatedDays),
        currentValue: offer.estimatedDays,
        potentialSaving: offer.estimatedDays - Math.round(avgData._avg.avgEstimatedDays),
      });
    }

    // Suggestion 4: Lower booking fee
    if (offer.bookingFeePercent > 20) {
      const standardFee = Math.round((offer.totalPriceNpr * 20) / 100);
      suggestions.push({
        type: 'BOOKING_FEE',
        label: 'Lower Booking Fee',
        description: `Booking fee is ${offer.bookingFeePercent}% (standard is 20%). Request a lower upfront payment.`,
        suggestedValue: standardFee,
        currentValue: offer.bookingFeeNpr,
        potentialSaving: offer.bookingFeeNpr - standardFee,
      });
    }

    return {
      offerId,
      currentTotal: offer.totalPriceNpr,
      marketDataPoints: avgData._count.id,
      suggestions,
      hasMarketData: avgData._count.id >= 10,
    };
  }

  // ═══════════════════════════════════════
  // ANALYTICS & DASHBOARD
  // ═══════════════════════════════════════

  /**
   * Get intelligence dashboard data for admin
   */
  async getDashboard(): Promise<any> {
    const cacheKey = `${this.CACHE_PREFIX}dashboard`;
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    const [
      totalInsights,
      completedInsights,
      avgMetrics,
      recentAnomalies,
      milestones,
      topJewelleryTypes,
      lossReasonBreakdown,
    ] = await Promise.all([
      this.prisma.rfqOrderInsight.count(),
      this.prisma.rfqOrderInsight.count({ where: { orderCompleted: true } }),
      this.prisma.rfqOrderInsight.aggregate({
        _avg: {
          avgOfferPrice: true,
          avgMakingChargePct: true,
          avgEstimatedDays: true,
          totalOffers: true,
        },
      }),
      this.prisma.quoteAnomaly.count({ where: { isReviewed: false } }),
      this.prisma.aiPhaseMilestone.findMany({
        orderBy: [{ phase: 'asc' }, { thresholdValue: 'asc' }],
      }),
      this.prisma.rfqOrderInsight.groupBy({
        by: ['rfqJewelleryType'],
        _count: { id: true },
        _avg: { avgOfferPrice: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      this.prisma.rfqOffer.groupBy({
        by: ['lossReasonCategory'],
        where: { lossReasonCategory: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    // Determine current phase
    const currentPhase = this.determineCurrentPhase(completedInsights);

    const dashboard = {
      overview: {
        totalInsights,
        completedOrders: completedInsights,
        currentPhase,
        unreviewedAnomalies: recentAnomalies,
      },
      averages: {
        avgOfferPrice: avgMetrics._avg.avgOfferPrice,
        avgMakingChargePct: avgMetrics._avg.avgMakingChargePct,
        avgEstimatedDays: avgMetrics._avg.avgEstimatedDays,
        avgOffersPerRfq: avgMetrics._avg.totalOffers,
      },
      milestones: milestones.map((m) => ({
        ...m,
        progress: m.thresholdValue > 0
          ? Math.min(100, Math.round((completedInsights / m.thresholdValue) * 100))
          : 100,
      })),
      topJewelleryTypes,
      lossReasonBreakdown,
    };

    try {
      await this.redisService.set(cacheKey, JSON.stringify(dashboard), this.CACHE_TTL);
    } catch {}

    return dashboard;
  }

  private determineCurrentPhase(completedOrders: number): { phase: number; name: string } {
    if (completedOrders >= 500) return { phase: 3, name: 'Full AI Capability' };
    if (completedOrders >= 100) return { phase: 2, name: 'Category Insights' };
    return { phase: 1, name: 'General Knowledge' };
  }

  /**
   * Get current AI capabilities based on data available
   */
  async getAiCapabilities(): Promise<any> {
    const totalCompleted = await this.prisma.rfqOrderInsight.count({
      where: { orderCompleted: true },
    });

    const phase = this.determineCurrentPhase(totalCompleted);

    return {
      ...phase,
      completedOrders: totalCompleted,
      capabilities: {
        rfqBuilder: {
          available: true,
          accuracy: totalCompleted >= 500 ? 'high' : totalCompleted >= 100 ? 'medium' : 'general',
          description: totalCompleted >= 500
            ? 'Uses real market data for highly accurate suggestions'
            : totalCompleted >= 100
              ? 'Uses category-level pricing insights'
              : 'Uses general jewellery knowledge (no market data yet)',
        },
        feasibilityChecker: {
          available: true,
          accuracy: 'high', // Always high — it's math-based
          description: 'Validates budgets against current metal prices and making charges',
        },
        tooltips: {
          available: true,
          accuracy: 'high',
          description: 'Pre-generated explanations for jewellery terms and processes',
        },
        counterOfferPlaybooks: {
          available: totalCompleted >= 100,
          accuracy: totalCompleted >= 200 ? 'high' : 'medium',
          description: totalCompleted >= 100
            ? 'Data-driven counter-offer suggestions based on market averages'
            : 'Requires 100+ completed orders to activate',
        },
        anomalyDetection: {
          available: totalCompleted >= 50,
          accuracy: totalCompleted >= 200 ? 'high' : 'medium',
          description: totalCompleted >= 50
            ? 'Detects pricing outliers using statistical analysis'
            : 'Requires 50+ completed orders to activate',
        },
      },
    };
  }
}
