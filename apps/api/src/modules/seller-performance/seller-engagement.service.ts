import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  PlatformReviewStatus,
  ReferralStatus,
} from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

/* ─────────────────────── TYPES ─────────────────────── */

export interface HealthScoreBreakdown {
  profileCompleteness: { score: number; max: number; missing: string[] };
  performanceMetrics: {
    score: number;
    max: number;
    details: Record<string, number>;
  };
  verificationStatus: { score: number; max: number };
  capabilitySetup: { score: number; max: number; missing: string[] };
  engagementActivity: {
    score: number;
    max: number;
    details: Record<string, number>;
  };
  totalScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
}

export interface OnboardingStep {
  key: string;
  label: string;
  completed: boolean;
  category: string;
}

export interface OnboardingProgress {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  percentage: number;
  categories: Record<string, { completed: number; total: number }>;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "orders" | "revenue" | "ratings" | "engagement" | "tenure";
  achieved: boolean;
  achievedAt?: Date;
  progress: number; // 0-100
  target: number;
  current: number;
}

export interface RfqFunnelData {
  totalTargeted: number;
  viewed: number;
  responded: number;
  viewRate: number;
  responseRate: number;
  avgResponseTimeHours: number | null;
  periodBreakdown: {
    period: string;
    targeted: number;
    viewed: number;
    responded: number;
  }[];
}

/* ─────────────────────── SERVICE ─────────────────────── */

@Injectable()
export class SellerEngagementService {
  private readonly logger = new Logger(SellerEngagementService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /* ═══════════════════════════════════════════════════════
   *  1. SELLER HEALTH SCORE
   * ═══════════════════════════════════════════════════════ */

  async calculateHealthScore(shopId: string): Promise<HealthScoreBreakdown> {
    const [shop, performance, badges, recentOrders, rfqTargets] =
      await Promise.all([
        this.prisma.shop.findUnique({ where: { id: shopId } }),
        this.prisma.sellerPerformance.findUnique({ where: { shopId } }),
        this.prisma.sellerBadge.findMany({
          where: { shopId, isActive: true },
        }),
        this.prisma.order.count({
          where: {
            shopId,
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
        this.prisma.rfqShopTarget.count({ where: { shopId } }),
      ]);

    if (!shop) throw new NotFoundException("Shop not found");

    // ── 1. PROFILE COMPLETENESS (max 25) ──
    const profileFields: { key: string; label: string; check: boolean }[] = [
      { key: "shopName", label: "Shop name", check: !!shop.shopName },
      { key: "description", label: "Description", check: !!shop.description },
      { key: "about", label: "About section", check: !!shop.about },
      {
        key: "profileImage",
        label: "Profile image",
        check: !!shop.profileImage,
      },
      { key: "coverImage", label: "Cover image", check: !!shop.coverImage },
      {
        key: "contactEmail",
        label: "Contact email",
        check: !!shop.contactEmail,
      },
      {
        key: "whatsappNumber",
        label: "WhatsApp number",
        check: !!shop.whatsappNumber,
      },
      { key: "address", label: "Address", check: !!shop.address },
      { key: "city", label: "City", check: !!shop.city },
      { key: "panNumber", label: "PAN number", check: !!shop.panNumber },
    ];
    const profileFilled = profileFields.filter((f) => f.check).length;
    const profileMissing = profileFields
      .filter((f) => !f.check)
      .map((f) => f.label);
    const profileScore = Math.round(
      (profileFilled / profileFields.length) * 25,
    );

    // ── 2. PERFORMANCE METRICS (max 35) ──
    const perfDetails: Record<string, number> = {};
    let perfScore = 0;

    if (performance) {
      // Rating component (max 10)
      const ratingScore = Math.min(
        10,
        Math.round((performance.avgRating / 5) * 10),
      );
      perfDetails.rating = ratingScore;
      perfScore += ratingScore;

      // Cancellation rate (max 10) — lower is better
      const cancelScore = Math.max(
        0,
        10 - Math.round(performance.cancellationRate / 2),
      );
      perfDetails.cancellation = cancelScore;
      perfScore += cancelScore;

      // Order volume (max 10)
      const volumeScore = Math.min(
        10,
        Math.round(performance.successfulOrders / 10),
      );
      perfDetails.volume = volumeScore;
      perfScore += volumeScore;

      // Positive feedback (max 5)
      const feedbackScore = Math.min(
        5,
        Math.round((performance.positiveFeedbackRate / 100) * 5),
      );
      perfDetails.feedback = feedbackScore;
      perfScore += feedbackScore;
    }

    // ── 3. VERIFICATION STATUS (max 15) ──
    let verifyScore = 0;
    if (shop.isVerified) verifyScore = 15;
    else if (shop.verificationDocuments) verifyScore = 5; // docs submitted but not verified

    // ── 4. CAPABILITY SETUP (max 15) ──
    const capFields: { key: string; label: string; check: boolean }[] = [
      {
        key: "jewelleryTypes",
        label: "Jewellery types",
        check: shop.supportedJewelleryTypes.length > 0,
      },
      {
        key: "methods",
        label: "Making methods",
        check: shop.supportedMethods.length > 0,
      },
      {
        key: "materials",
        label: "Materials",
        check: shop.supportedMaterials.length > 0,
      },
      {
        key: "finishes",
        label: "Surface finishes",
        check: shop.supportedFinishes.length > 0,
      },
      {
        key: "bankDetails",
        label: "Bank account details",
        check: !!shop.bankAccountDetails,
      },
    ];
    const capFilled = capFields.filter((f) => f.check).length;
    const capMissing = capFields.filter((f) => !f.check).map((f) => f.label);
    const capScore = Math.round((capFilled / capFields.length) * 15);

    // ── 5. ENGAGEMENT ACTIVITY (max 10) ──
    const engDetails: Record<string, number> = {};
    // Recent orders (max 4)
    const ordersScore = Math.min(4, Math.round(recentOrders / 3));
    engDetails.recentOrders = ordersScore;

    // RFQ participation (max 3)
    const rfqScore = Math.min(3, Math.round(rfqTargets / 5));
    engDetails.rfqActivity = rfqScore;

    // Badges earned (max 3)
    const badgeScore = Math.min(3, badges.length);
    engDetails.badges = badgeScore;

    const engScore = ordersScore + rfqScore + badgeScore;

    // ── TOTAL ──
    const totalScore =
      profileScore + perfScore + verifyScore + capScore + engScore;
    const grade: HealthScoreBreakdown["grade"] =
      totalScore >= 85
        ? "A"
        : totalScore >= 70
          ? "B"
          : totalScore >= 50
            ? "C"
            : totalScore >= 30
              ? "D"
              : "F";

    return {
      profileCompleteness: {
        score: profileScore,
        max: 25,
        missing: profileMissing,
      },
      performanceMetrics: { score: perfScore, max: 35, details: perfDetails },
      verificationStatus: { score: verifyScore, max: 15 },
      capabilitySetup: { score: capScore, max: 15, missing: capMissing },
      engagementActivity: { score: engScore, max: 10, details: engDetails },
      totalScore,
      grade,
    };
  }

  /* ═══════════════════════════════════════════════════════
   *  2. ONBOARDING PROGRESS TRACKER
   * ═══════════════════════════════════════════════════════ */

  async getOnboardingProgress(shopId: string): Promise<OnboardingProgress> {
    const [shop, performance, hasInventory, hasPricing, approvedReviewCount] =
      await Promise.all([
        this.prisma.shop.findUnique({ where: { id: shopId } }),
        this.prisma.sellerPerformance.findUnique({ where: { shopId } }),
        this.prisma.inventoryItem.count({ where: { shopId }, take: 1 }),
        this.prisma.shopFinishPricing.count({ where: { shopId }, take: 1 }),
        this.prisma.platformReview.count({
          where: { shopId, status: PlatformReviewStatus.APPROVED },
        }),
      ]);

    if (!shop) throw new NotFoundException("Shop not found");

    const steps: OnboardingStep[] = [
      // Profile setup
      {
        key: "shopName",
        label: "Set shop name",
        completed: !!shop.shopName,
        category: "Profile",
      },
      {
        key: "description",
        label: "Add shop description",
        completed: !!shop.description,
        category: "Profile",
      },
      {
        key: "about",
        label: "Write about section",
        completed: !!shop.about,
        category: "Profile",
      },
      {
        key: "profileImage",
        label: "Upload profile image",
        completed: !!shop.profileImage,
        category: "Profile",
      },
      {
        key: "coverImage",
        label: "Upload cover image",
        completed: !!shop.coverImage,
        category: "Profile",
      },
      {
        key: "contactEmail",
        label: "Add contact email",
        completed: !!shop.contactEmail,
        category: "Profile",
      },
      {
        key: "whatsappNumber",
        label: "Add WhatsApp number",
        completed: !!shop.whatsappNumber,
        category: "Profile",
      },

      // Business setup
      {
        key: "panNumber",
        label: "Add PAN number",
        completed: !!shop.panNumber,
        category: "Business",
      },
      {
        key: "bankDetails",
        label: "Add bank account details",
        completed: !!shop.bankAccountDetails,
        category: "Business",
      },
      {
        key: "verification",
        label: "Submit verification documents",
        completed: !!shop.verificationDocuments,
        category: "Business",
      },
      {
        key: "verified",
        label: "Get shop verified",
        completed: shop.isVerified,
        category: "Business",
      },

      // Capability setup
      {
        key: "jewelleryTypes",
        label: "Set supported jewellery types",
        completed: shop.supportedJewelleryTypes.length > 0,
        category: "Capabilities",
      },
      {
        key: "materials",
        label: "Set supported materials",
        completed: shop.supportedMaterials.length > 0,
        category: "Capabilities",
      },
      {
        key: "methods",
        label: "Set making methods",
        completed: shop.supportedMethods.length > 0,
        category: "Capabilities",
      },
      {
        key: "finishes",
        label: "Set surface finishes",
        completed: shop.supportedFinishes.length > 0,
        category: "Capabilities",
      },

      // Catalog & pricing
      {
        key: "inventory",
        label: "Add first inventory item",
        completed: hasInventory > 0,
        category: "Catalog",
      },
      {
        key: "pricing",
        label: "Set up finish pricing",
        completed: hasPricing > 0,
        category: "Catalog",
      },

      // First engagement
      {
        key: "platformReview",
        label:
          "Leave a review on SaaSHub, G2, or Crunchbase (earn 1 month Pro free!)",
        completed: approvedReviewCount > 0,
        category: "Engagement",
      },
      {
        key: "firstSale",
        label: "Complete your first sale",
        completed: !!performance?.firstSaleAt,
        category: "Engagement",
      },
    ];

    const completedCount = steps.filter((s) => s.completed).length;
    const totalCount = steps.length;
    const percentage = Math.round((completedCount / totalCount) * 100);

    // Group by category
    const categories: Record<string, { completed: number; total: number }> = {};
    for (const step of steps) {
      if (!categories[step.category])
        categories[step.category] = { completed: 0, total: 0 };
      categories[step.category].total++;
      if (step.completed) categories[step.category].completed++;
    }

    return { steps, completedCount, totalCount, percentage, categories };
  }

  /* ═══════════════════════════════════════════════════════
   *  3. MILESTONES & ACHIEVEMENTS
   * ═══════════════════════════════════════════════════════ */

  async getMilestones(shopId: string): Promise<Milestone[]> {
    const [shop, performance, badges, totalRevenue, reviewCount] =
      await Promise.all([
        this.prisma.shop.findUnique({ where: { id: shopId } }),
        this.prisma.sellerPerformance.findUnique({ where: { shopId } }),
        this.prisma.sellerBadge.findMany({ where: { shopId, isActive: true } }),
        this.prisma.sellerPerformance.findUnique({
          where: { shopId },
          select: { totalRevenue: true },
        }),
        this.prisma.shopRating.count({ where: { shopId } }),
      ]);

    if (!shop) throw new NotFoundException("Shop not found");

    const perf = performance || {
      totalOrders: 0,
      successfulOrders: 0,
      avgRating: 0,
      totalRevenue: 0,
      firstSaleAt: null,
    };

    const tenureMs = Date.now() - new Date(shop.createdAt).getTime();
    const tenureMonths = tenureMs / (30 * 24 * 60 * 60 * 1000);

    const milestones: Milestone[] = [
      // Order milestones
      {
        id: "first_sale",
        title: "First Sale",
        description: "Complete your very first order",
        icon: "🎉",
        category: "orders",
        achieved: perf.successfulOrders >= 1,
        achievedAt: perf.firstSaleAt || undefined,
        progress: Math.min(100, (perf.successfulOrders / 1) * 100),
        target: 1,
        current: perf.successfulOrders,
      },
      {
        id: "orders_10",
        title: "Rising Star",
        description: "Complete 10 successful orders",
        icon: "⭐",
        category: "orders",
        achieved: perf.successfulOrders >= 10,
        progress: Math.min(100, (perf.successfulOrders / 10) * 100),
        target: 10,
        current: perf.successfulOrders,
      },
      {
        id: "orders_50",
        title: "Established Seller",
        description: "Complete 50 successful orders",
        icon: "🏆",
        category: "orders",
        achieved: perf.successfulOrders >= 50,
        progress: Math.min(100, (perf.successfulOrders / 50) * 100),
        target: 50,
        current: perf.successfulOrders,
      },
      {
        id: "orders_100",
        title: "Century Club",
        description: "Complete 100 successful orders",
        icon: "💯",
        category: "orders",
        achieved: perf.successfulOrders >= 100,
        progress: Math.min(100, (perf.successfulOrders / 100) * 100),
        target: 100,
        current: perf.successfulOrders,
      },
      {
        id: "orders_500",
        title: "Master Craftsman",
        description: "Complete 500 successful orders",
        icon: "👑",
        category: "orders",
        achieved: perf.successfulOrders >= 500,
        progress: Math.min(100, (perf.successfulOrders / 500) * 100),
        target: 500,
        current: perf.successfulOrders,
      },

      // Revenue milestones (in NPR)
      {
        id: "revenue_100k",
        title: "Bronze Earner",
        description: "Earn Rs. 100,000 in total revenue",
        icon: "💰",
        category: "revenue",
        achieved: perf.totalRevenue >= 100000,
        progress: Math.min(100, (perf.totalRevenue / 100000) * 100),
        target: 100000,
        current: perf.totalRevenue,
      },
      {
        id: "revenue_500k",
        title: "Silver Earner",
        description: "Earn Rs. 500,000 in total revenue",
        icon: "💎",
        category: "revenue",
        achieved: perf.totalRevenue >= 500000,
        progress: Math.min(100, (perf.totalRevenue / 500000) * 100),
        target: 500000,
        current: perf.totalRevenue,
      },
      {
        id: "revenue_1m",
        title: "Gold Earner",
        description: "Earn Rs. 1,000,000 in total revenue",
        icon: "🏅",
        category: "revenue",
        achieved: perf.totalRevenue >= 1000000,
        progress: Math.min(100, (perf.totalRevenue / 1000000) * 100),
        target: 1000000,
        current: perf.totalRevenue,
      },
      {
        id: "revenue_5m",
        title: "Platinum Earner",
        description: "Earn Rs. 5,000,000 in total revenue",
        icon: "💫",
        category: "revenue",
        achieved: perf.totalRevenue >= 5000000,
        progress: Math.min(100, (perf.totalRevenue / 5000000) * 100),
        target: 5000000,
        current: perf.totalRevenue,
      },

      // Rating milestones
      {
        id: "first_review",
        title: "First Review",
        description: "Receive your first customer review",
        icon: "📝",
        category: "ratings",
        achieved: reviewCount >= 1,
        progress: Math.min(100, (reviewCount / 1) * 100),
        target: 1,
        current: reviewCount,
      },
      {
        id: "reviews_25",
        title: "Well Reviewed",
        description: "Receive 25 customer reviews",
        icon: "🌟",
        category: "ratings",
        achieved: reviewCount >= 25,
        progress: Math.min(100, (reviewCount / 25) * 100),
        target: 25,
        current: reviewCount,
      },
      {
        id: "top_rated",
        title: "Top Rated",
        description: "Maintain an average rating of 4.5+ stars",
        icon: "⭐",
        category: "ratings",
        achieved: perf.avgRating >= 4.5 && reviewCount >= 5,
        progress: Math.min(100, (perf.avgRating / 4.5) * 100),
        target: 4.5,
        current: perf.avgRating,
      },

      // Engagement milestones
      {
        id: "verified",
        title: "Verified Seller",
        description: "Get your shop verified by the platform",
        icon: "✅",
        category: "engagement",
        achieved: shop.isVerified,
        progress: shop.isVerified ? 100 : shop.verificationDocuments ? 50 : 0,
        target: 1,
        current: shop.isVerified ? 1 : 0,
      },
      {
        id: "badge_collector",
        title: "Badge Collector",
        description: "Earn 3 or more badges",
        icon: "🎖️",
        category: "engagement",
        achieved: badges.length >= 3,
        progress: Math.min(100, (badges.length / 3) * 100),
        target: 3,
        current: badges.length,
      },

      // Tenure milestones
      {
        id: "tenure_3m",
        title: "Getting Started",
        description: "Be on the platform for 3 months",
        icon: "🌱",
        category: "tenure",
        achieved: tenureMonths >= 3,
        progress: Math.min(100, (tenureMonths / 3) * 100),
        target: 3,
        current: Math.round(tenureMonths * 10) / 10,
      },
      {
        id: "tenure_12m",
        title: "One Year Strong",
        description: "Be on the platform for 12 months",
        icon: "🎂",
        category: "tenure",
        achieved: tenureMonths >= 12,
        progress: Math.min(100, (tenureMonths / 12) * 100),
        target: 12,
        current: Math.round(tenureMonths * 10) / 10,
      },
      {
        id: "tenure_24m",
        title: "Veteran Seller",
        description: "Be on the platform for 2 years",
        icon: "🏛️",
        category: "tenure",
        achieved: tenureMonths >= 24,
        progress: Math.min(100, (tenureMonths / 24) * 100),
        target: 24,
        current: Math.round(tenureMonths * 10) / 10,
      },
    ];

    return milestones;
  }

  /* ═══════════════════════════════════════════════════════
   *  4. RFQ CONVERSION FUNNEL
   * ═══════════════════════════════════════════════════════ */

  async getRfqFunnel(shopId: string, days = 90): Promise<RfqFunnelData> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const targets = await this.prisma.rfqShopTarget.findMany({
      where: { shopId, sentAt: { gte: since } },
      select: { sentAt: true, viewedAt: true, respondedAt: true },
      orderBy: { sentAt: "desc" },
    });

    const totalTargeted = targets.length;
    const viewed = targets.filter((t) => t.viewedAt).length;
    const responded = targets.filter((t) => t.respondedAt).length;

    // Avg response time (for those who responded)
    const responseTimes = targets
      .filter((t) => t.respondedAt && t.sentAt)
      .map(
        (t) =>
          (t.respondedAt!.getTime() - t.sentAt.getTime()) / (1000 * 60 * 60),
      );
    const avgResponseTimeHours =
      responseTimes.length > 0
        ? Math.round(
            (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) *
              10,
          ) / 10
        : null;

    // Period breakdown (weekly for last N days)
    const weeks: {
      period: string;
      targeted: number;
      viewed: number;
      responded: number;
    }[] = [];
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    for (let i = 0; i < Math.ceil(days / 7); i++) {
      const weekStart = new Date(Date.now() - (i + 1) * weekMs);
      const weekEnd = new Date(Date.now() - i * weekMs);
      const weekTargets = targets.filter(
        (t) => t.sentAt >= weekStart && t.sentAt < weekEnd,
      );
      if (weekTargets.length > 0 || i < 4) {
        weeks.push({
          period: `Week ${i + 1}`,
          targeted: weekTargets.length,
          viewed: weekTargets.filter((t) => t.viewedAt).length,
          responded: weekTargets.filter((t) => t.respondedAt).length,
        });
      }
    }

    return {
      totalTargeted,
      viewed,
      responded,
      viewRate:
        totalTargeted > 0 ? Math.round((viewed / totalTargeted) * 100) : 0,
      responseRate:
        totalTargeted > 0 ? Math.round((responded / totalTargeted) * 100) : 0,
      avgResponseTimeHours,
      periodBreakdown: weeks.reverse(),
    };
  }

  /* ═══════════════════════════════════════════════════════
   *  5. ADMIN SELLER CRM — AGGREGATED DATA
   * ═══════════════════════════════════════════════════════ */

  async getSellerDirectory(params: {
    search?: string;
    tier?: string;
    status?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      search,
      tier,
      status,
      sortBy = "createdAt",
      page = 1,
      limit = 20,
    } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { shopName: { contains: search, mode: "insensitive" } },
        { contactPhone: { contains: search } },
        { contactEmail: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }
    if (tier) where.sellerTier = tier;
    if (status === "active") {
      where.isActive = true;
      where.isOnHold = false;
    } else if (status === "inactive") where.isActive = false;
    else if (status === "onHold") where.isOnHold = true;
    else if (status === "verified") where.isVerified = true;
    else if (status === "unverified") where.isVerified = false;

    const orderBy: any = {};
    if (sortBy === "revenue") orderBy.performance = { totalRevenue: "desc" };
    else if (sortBy === "orders") orderBy.performance = { totalOrders: "desc" };
    else if (sortBy === "rating") orderBy.performance = { avgRating: "desc" };
    else orderBy.createdAt = "desc";

    const [shops, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        include: {
          performance: true,
          badges: { where: { isActive: true } },
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          _count: {
            select: {
              orders: true,
              rfqOffers: true,
              inventoryItems: true,
              shopQuotes: true,
              ratings: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.shop.count({ where }),
    ]);

    // Calculate quick health scores for each
    const directory = await Promise.all(
      shops.map(async (shop) => {
        let healthScore = 0;
        try {
          const health = await this.calculateHealthScore(shop.id);
          healthScore = health.totalScore;
        } catch {
          /* skip */
        }

        return {
          id: shop.id,
          shopName: shop.shopName,
          city: shop.city,
          state: shop.state,
          contactPhone: shop.contactPhone,
          contactEmail: shop.contactEmail,
          profileImage: shop.profileImage,
          isVerified: shop.isVerified,
          isActive: shop.isActive,
          isOnHold: shop.isOnHold,
          sellerTier: shop.sellerTier,
          createdAt: shop.createdAt,
          owner: shop.user,
          performance: shop.performance,
          badges: shop.badges,
          counts: shop._count,
          healthScore,
        };
      }),
    );

    return {
      shops: directory,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSellerCrmStats() {
    const [total, active, inactive, onHold, verified, tierCounts, avgRevenue] =
      await Promise.all([
        this.prisma.shop.count(),
        this.prisma.shop.count({ where: { isActive: true, isOnHold: false } }),
        this.prisma.shop.count({ where: { isActive: false } }),
        this.prisma.shop.count({ where: { isOnHold: true } }),
        this.prisma.shop.count({ where: { isVerified: true } }),
        this.prisma.shop.groupBy({
          by: ["sellerTier"],
          _count: { id: true },
        }),
        this.prisma.sellerPerformance.aggregate({
          _avg: { totalRevenue: true, avgRating: true },
        }),
      ]);

    const tiers: Record<string, number> = {};
    tierCounts.forEach((t) => {
      tiers[t.sellerTier] = t._count.id;
    });

    return {
      total,
      active,
      inactive,
      onHold,
      verified,
      tiers,
      avgRevenue: Math.round(avgRevenue._avg.totalRevenue || 0),
      avgRating: Math.round((avgRevenue._avg.avgRating || 0) * 10) / 10,
    };
  }

  async getSellerProfile(shopId: string) {
    // Use Promise.allSettled so one sub-call failure doesn't kill the entire profile
    const results = await Promise.allSettled([
      this.prisma.shop.findUnique({
        where: { id: shopId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              orders: true,
              rfqOffers: true,
              inventoryItems: true,
              shopQuotes: true,
              ratings: true,
              invoices: true,
            },
          },
        },
      }),
      this.prisma.sellerPerformance.findUnique({ where: { shopId } }),
      this.prisma.sellerBadge.findMany({
        where: { shopId },
        orderBy: { awardedAt: "desc" },
      }),
      this.prisma.order.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalNpr: true,
          createdAt: true,
          customer: { select: { firstName: true, lastName: true } },
        },
      }),
      this.getRfqFunnel(shopId).catch(() => null),
      this.calculateHealthScore(shopId).catch(() => null),
      this.getOnboardingProgress(shopId).catch(() => null),
      this.getMilestones(shopId).catch(() => null),
    ]);

    const shop = results[0].status === "fulfilled" ? results[0].value : null;
    if (!shop) throw new NotFoundException("Shop not found");

    const performance =
      results[1].status === "fulfilled" ? results[1].value : null;
    const badges = results[2].status === "fulfilled" ? results[2].value : [];
    const recentOrders =
      results[3].status === "fulfilled" ? results[3].value : [];
    const rfqFunnel =
      results[4].status === "fulfilled" ? results[4].value : null;
    const healthScore =
      results[5].status === "fulfilled" ? results[5].value : null;
    const onboarding =
      results[6].status === "fulfilled" ? results[6].value : null;
    const milestones =
      results[7].status === "fulfilled" ? results[7].value : [];

    // Log any failures for debugging
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        this.logger.warn(
          `getSellerProfile sub-call ${i} failed for shop ${shopId}: ${r.reason}`,
        );
      }
    });

    return {
      shop,
      performance,
      badges,
      recentOrders,
      rfqFunnel,
      healthScore,
      onboarding,
      milestones,
    };
  }

  /* ═══════════════════════════════════════════════════════
   *  6. ADMIN SELLER NOTES
   * ═══════════════════════════════════════════════════════ */

  async addSellerNote(
    shopId: string,
    adminId: string,
    note: string,
    category = "GENERAL",
  ) {
    // Reuse CustomerNote model — shopId = the shop being noted about, customerId = shop owner userId
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { userId: true },
    });
    if (!shop) throw new NotFoundException("Shop not found");

    return this.prisma.customerNote.create({
      data: {
        customerId: shop.userId,
        authorId: adminId,
        shopId: null, // admin-level note
        note,
        category,
      },
      include: { author: { select: { firstName: true, lastName: true } } },
    });
  }

  async getSellerNotes(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { userId: true },
    });
    if (!shop) throw new NotFoundException("Shop not found");

    return this.prisma.customerNote.findMany({
      where: { customerId: shop.userId, shopId: null },
      include: { author: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /* ═══════════════════════════════════════════════════════
   *  7. CSV EXPORT DATA
   * ═══════════════════════════════════════════════════════ */

  async getExportData() {
    const shops = await this.prisma.shop.findMany({
      include: {
        performance: true,
        user: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
        badges: { where: { isActive: true }, select: { badgeType: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return shops.map((s) => ({
      shopName: s.shopName,
      ownerName: `${s.user.firstName} ${s.user.lastName}`,
      ownerEmail: s.user.email,
      ownerPhone: s.user.phone,
      city: s.city,
      state: s.state || "",
      tier: s.sellerTier,
      isVerified: s.isVerified ? "Yes" : "No",
      isActive: s.isActive ? "Yes" : "No",
      totalOrders: s.performance?.totalOrders || 0,
      successfulOrders: s.performance?.successfulOrders || 0,
      totalRevenue: s.performance?.totalRevenue || 0,
      avgRating: s.performance?.avgRating || 0,
      cancellationRate: s.performance?.cancellationRate || 0,
      badges: s.badges.map((b) => b.badgeType).join(", "),
      joinDate: s.createdAt.toISOString().split("T")[0],
    }));
  }

  /* ═══════════════════════════════════════════════════════
   *  8. PLATFORM REVIEW INCENTIVE ("Review & Earn")
   * ═══════════════════════════════════════════════════════ */

  static readonly REVIEW_PLATFORMS = ["saashub", "g2", "crunchbase"] as const;

  /** Seller submits proof of a review on an external platform. */
  async submitPlatformReview(
    shopId: string,
    platform: string,
    proofScreenshot: string,
    reviewUrl?: string,
  ) {
    const normalised = platform.toLowerCase().trim();
    if (!SellerEngagementService.REVIEW_PLATFORMS.includes(normalised as any)) {
      throw new BadRequestException(
        `Invalid platform. Must be one of: ${SellerEngagementService.REVIEW_PLATFORMS.join(", ")}`,
      );
    }

    const existing = await this.prisma.platformReview.findUnique({
      where: { shopId_platform: { shopId, platform: normalised } },
    });

    if (existing && existing.status === "APPROVED") {
      throw new ConflictException(
        "Your review on this platform has already been approved.",
      );
    }

    // Upsert — allow re-submission if previously rejected
    const review = await this.prisma.platformReview.upsert({
      where: { shopId_platform: { shopId, platform: normalised } },
      create: {
        shopId,
        platform: normalised,
        proofScreenshot,
        reviewUrl: reviewUrl || null,
        status: "PENDING",
      },
      update: {
        proofScreenshot,
        reviewUrl: reviewUrl || null,
        status: "PENDING",
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        adminNotes: null,
      },
    });

    this.logger.log(
      `Platform review submitted: shop=${shopId} platform=${normalised}`,
    );

    return review;
  }

  /** Get all review submissions for a shop. */
  async getShopPlatformReviews(shopId: string) {
    const reviews = await this.prisma.platformReview.findMany({
      where: { shopId },
      orderBy: { submittedAt: "desc" },
    });

    // Return which platforms are available vs submitted
    const submitted = new Map(reviews.map((r) => [r.platform, r]));
    return SellerEngagementService.REVIEW_PLATFORMS.map((platform) => ({
      platform,
      submitted: submitted.has(platform),
      review: submitted.get(platform) || null,
    }));
  }

  /** Admin: list all pending reviews across all shops. */
  async listPendingReviews(status?: string) {
    const where = status
      ? { status: status as PlatformReviewStatus }
      : undefined;
    return this.prisma.platformReview.findMany({
      where,
      include: {
        shop: {
          select: {
            id: true,
            shopName: true,
            userId: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });
  }

  /** Admin: approve or reject a review submission. */
  async reviewPlatformSubmission(
    reviewId: string,
    adminId: string,
    action: "approve" | "reject",
    adminNotes?: string,
  ) {
    const review = await this.prisma.platformReview.findUnique({
      where: { id: reviewId },
      include: { shop: { select: { userId: true, country: true } } },
    });

    if (!review) throw new NotFoundException("Review submission not found");
    if (review.status !== "PENDING") {
      throw new BadRequestException("This review has already been processed.");
    }

    const isApproval = action === "approve";

    const updated = await this.prisma.platformReview.update({
      where: { id: reviewId },
      data: {
        status: isApproval ? "APPROVED" : "REJECTED",
        reviewedAt: new Date(),
        reviewedBy: adminId,
        adminNotes: adminNotes || null,
        ...(isApproval && {
          rewardGranted: true,
          rewardGrantedAt: new Date(),
        }),
      },
    });

    // Grant Pro month if approved
    if (isApproval) {
      await this.grantOneMonthPro(review.shopId, review.shop.country);
    }

    // Notify seller
    await this.notifications.create({
      userId: review.shop.userId,
      type: isApproval ? "REVIEW_APPROVED" : "REVIEW_REJECTED",
      titleKey: isApproval ? "Review approved! 🎉" : "Review submission update",
      bodyKey: isApproval
        ? `Your ${review.platform} review has been verified. 1 month of Pro has been added to your account!`
        : `Your ${review.platform} review submission was not approved.${adminNotes ? ` Reason: ${adminNotes}` : ""}`,
      referenceType: "PlatformReview",
      referenceId: reviewId,
      channels: ["IN_APP"],
    });

    return updated;
  }

  /** Grant 1 month of Pro by extending or creating a subscription. */
  private async grantOneMonthPro(shopId: string, country: string) {
    return this.grantPlanReward(
      shopId,
      country,
      "PRO",
      1,
      "Review & Earn reward",
    );
  }

  /**
   * Generic method to grant N months of a given plan (PRO / PRO_PLUS) as a reward.
   * Extends if the seller already has that plan, or creates a new subscription.
   */
  private async grantPlanReward(
    shopId: string,
    country: string,
    planName: string,
    months: number,
    reason: string,
  ) {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { name: planName, country: country as any, isActive: true },
    });

    if (!plan) {
      this.logger.warn(
        `No ${planName} plan found for country=${country}, cannot grant reward for shop=${shopId}`,
      );
      return;
    }

    const now = new Date();
    const rewardEnd = new Date(now);
    // Support fractional months (e.g. 1.5)
    const fullMonths = Math.floor(months);
    const extraDays = Math.round((months - fullMonths) * 30);
    rewardEnd.setMonth(rewardEnd.getMonth() + fullMonths);
    rewardEnd.setDate(rewardEnd.getDate() + extraDays);

    // Check for existing active subscription
    const existing = await this.prisma.sellerSubscription.findFirst({
      where: {
        shopId,
        status: { in: ["ACTIVE", "TRIALING"] },
      },
      include: { plan: true },
    });

    if (existing && existing.plan.name === planName) {
      // Extend the current subscription
      const newEnd = new Date(existing.currentPeriodEnd);
      newEnd.setMonth(newEnd.getMonth() + fullMonths);
      newEnd.setDate(newEnd.getDate() + extraDays);

      await this.prisma.sellerSubscription.update({
        where: { id: existing.id },
        data: { currentPeriodEnd: newEnd },
      });

      this.logger.log(
        `Extended ${planName} subscription for shop=${shopId} until ${newEnd.toISOString()} (${reason})`,
      );
    } else {
      // Cancel existing plan, create a new one
      if (existing) {
        await this.prisma.sellerSubscription.update({
          where: { id: existing.id },
          data: {
            status: "CANCELLED",
            cancelledAt: now,
            cancelReason: `Upgraded via ${reason}`,
          },
        });
      }

      await this.prisma.sellerSubscription.create({
        data: {
          shopId,
          planId: plan.id,
          status: "ACTIVE",
          country: country as any,
          startedAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: rewardEnd,
          autoRenew: false,
        },
      });

      this.logger.log(
        `Created ${planName} subscription (${reason}) for shop=${shopId} until ${rewardEnd.toISOString()}`,
      );
    }
  }

  /** Send review reminders to shops that haven't submitted any reviews yet. */
  async sendReviewReminders() {
    const MAX_REMINDERS = 3;

    // Find all active shops that have zero platform reviews
    const shops = await this.prisma.shop.findMany({
      where: {
        isActive: true,
        isVerified: true,
        platformReviews: { none: {} },
      },
      select: { id: true, userId: true, createdAt: true },
    });

    let sentCount = 0;
    for (const shop of shops) {
      // Only remind shops older than 7 days
      const shopAge = Date.now() - new Date(shop.createdAt).getTime();
      if (shopAge < 7 * 24 * 60 * 60 * 1000) continue;

      // Check existing reminder record (we store it as a PlatformReview with platform="__reminder__")
      // Instead, count notifications of type REVIEW_REMINDER for this user
      const reminderCount = await this.prisma.notification.count({
        where: {
          userId: shop.userId,
          type: "REVIEW_REMINDER",
        },
      });

      if (reminderCount >= MAX_REMINDERS) continue;

      await this.notifications.create({
        userId: shop.userId,
        type: "REVIEW_REMINDER",
        titleKey: "Earn 1 month of Pro for free! ⭐",
        bodyKey:
          "Leave a review on SaaSHub, G2, or Crunchbase and get 1 month of Pro — per platform! Go to Engagement → Reviews to submit proof.",
        referenceType: "ReviewIncentive",
        referenceId: shop.id,
        channels: ["IN_APP"],
      });

      sentCount++;
    }

    this.logger.log(`Sent ${sentCount} review reminder notifications`);
    return { sentCount };
  }

  /* ═══════════════════════════════════════════════════════
   *  9. REFERRAL PROGRAMME
   * ═══════════════════════════════════════════════════════ */

  /** Load referral settings (or create default singleton). */
  private async getReferralSettings() {
    let settings = await this.prisma.referralSettings.findUnique({
      where: { id: "singleton" },
    });
    if (!settings) {
      settings = await this.prisma.referralSettings.create({
        data: { id: "singleton" },
      });
    }
    return settings;
  }

  /** Generate a unique referral code. */
  private generateReferralCode(): string {
    return randomBytes(6).toString("hex").toUpperCase(); // 12-char code
  }

  /** Create a referral invitation. */
  async createReferral(
    shopId: string,
    refereeEmail: string,
  ) {
    const settings = await this.getReferralSettings();
    if (!settings.isActive) {
      throw new BadRequestException("Referral programme is currently paused.");
    }

    // Check cap
    const existingCount = await this.prisma.referral.count({
      where: { referrerShopId: shopId },
    });
    if (existingCount >= settings.maxReferralsPerShop) {
      throw new BadRequestException(
        `You have reached the maximum of ${settings.maxReferralsPerShop} referrals.`,
      );
    }

    // Check duplicate
    const existing = await this.prisma.referral.findUnique({
      where: {
        referrerShopId_refereeEmail: { referrerShopId: shopId, refereeEmail },
      },
    });
    if (existing) {
      throw new ConflictException("You have already invited this email.");
    }

    // Prevent self-referral
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: { user: { select: { email: true } } },
    });
    if (shop?.user.email.toLowerCase() === refereeEmail.toLowerCase()) {
      throw new BadRequestException("You cannot refer yourself.");
    }

    const referral = await this.prisma.referral.create({
      data: {
        referrerShopId: shopId,
        refereeEmail: refereeEmail.toLowerCase(),
        referralCode: this.generateReferralCode(),
      },
    });

    // Notify the referrer
    if (shop) {
      await this.notifications.create({
        userId: shop.userId,
        type: "REFERRAL_INVITE_SENT",
        titleKey: "Referral invitation sent! 🎉",
        bodyKey: `You invited ${refereeEmail}. When they sign up, verify, and buy any plan, you'll both earn 1 extra month + 50 AI credits!`,
        referenceType: "Referral",
        referenceId: referral.id,
        channels: ["IN_APP"],
      });
    }

    return referral;
  }

  /** Get all referrals for a seller's shop. */
  async getMyReferrals(shopId: string) {
    const referrals = await this.prisma.referral.findMany({
      where: { referrerShopId: shopId },
      orderBy: { invitedAt: "desc" },
      include: {
        refereeShop: { select: { shopName: true, isVerified: true } },
      },
    });

    const settings = await this.getReferralSettings();

    return {
      referrals,
      settings: {
        freeMonths: settings.freeMonths,
        aiCreditsReward: settings.aiCreditsReward,
        maxReferrals: settings.maxReferralsPerShop,
        isActive: settings.isActive,
      },
    };
  }

  /** Called when a referred seller signs up — link them to the referral. */
  async processReferralSignup(refereeEmail: string, refereeShopId: string) {
    const referral = await this.prisma.referral.findFirst({
      where: {
        refereeEmail: refereeEmail.toLowerCase(),
        status: "PENDING",
      },
    });

    if (!referral) return null; // no referral found, that's fine

    // Check expiration
    const settings = await this.getReferralSettings();
    const expiresAt = new Date(referral.invitedAt);
    expiresAt.setDate(expiresAt.getDate() + settings.expirationDays);

    if (new Date() > expiresAt) {
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: { status: "EXPIRED" },
      });
      return null;
    }

    const updated = await this.prisma.referral.update({
      where: { id: referral.id },
      data: {
        refereeShopId,
        status: "SIGNED_UP",
        signedUpAt: new Date(),
      },
    });

    // Notify the referrer
    const referrerShop = await this.prisma.shop.findUnique({
      where: { id: referral.referrerShopId },
      select: { userId: true },
    });
    if (referrerShop) {
      await this.notifications.create({
        userId: referrerShop.userId,
        type: "REFERRAL_SIGNUP",
        titleKey: "Your referral signed up! 🎯",
        bodyKey: `${refereeEmail} has joined Orivraa! Rewards will be granted once they buy a plan.`,
        referenceType: "Referral",
        referenceId: referral.id,
        channels: ["IN_APP"],
      });
    }

    return updated;
  }

  /** Complete a referral and grant rewards (1 extra month + AI credits) to both parties. */
  async completeReferral(referralId: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
      include: {
        referrerShop: { select: { id: true, country: true, userId: true } },
        refereeShop: { select: { id: true, country: true, userId: true } },
      },
    });

    if (!referral) throw new NotFoundException("Referral not found.");
    if (referral.status === "COMPLETED") {
      throw new BadRequestException("Referral already completed.");
    }
    if (!referral.refereeShopId || !referral.refereeShop) {
      throw new BadRequestException("Referee has not signed up yet.");
    }

    const settings = await this.getReferralSettings();
    const freeMonths = settings.freeMonths;
    const aiCredits = settings.aiCreditsReward;
    const now = new Date();

    // Extend current plan for both parties (whatever plan they are on)
    for (const shop of [referral.referrerShop, referral.refereeShop]) {
      if (!shop) continue;

      // Find their active subscription to extend
      const activeSub = await this.prisma.sellerSubscription.findFirst({
        where: {
          shopId: shop.id,
          status: { in: ["ACTIVE", "TRIALING"] },
        },
        include: { plan: true },
      });

      if (activeSub) {
        // Extend the existing plan
        const newEnd = new Date(activeSub.currentPeriodEnd);
        const fullMonths = Math.floor(freeMonths);
        const extraDays = Math.round((freeMonths - fullMonths) * 30);
        newEnd.setMonth(newEnd.getMonth() + fullMonths);
        newEnd.setDate(newEnd.getDate() + extraDays);

        await this.prisma.sellerSubscription.update({
          where: { id: activeSub.id },
          data: { currentPeriodEnd: newEnd },
        });

        this.logger.log(
          `Extended ${activeSub.plan.name} subscription for shop=${shop.id} until ${newEnd.toISOString()} (Referral reward)`,
        );
      }

      // Grant AI credits
      await this.grantAiCredits(shop.userId, shop.id, aiCredits, `Referral reward (referral ${referralId})`);
    }

    const updated = await this.prisma.referral.update({
      where: { id: referralId },
      data: {
        status: "COMPLETED",
        completedAt: now,
        referrerRewarded: true,
        refereeRewarded: true,
        referrerRewardedAt: now,
        refereeRewardedAt: now,
      },
    });

    // Notify both
    for (const party of [referral.referrerShop, referral.refereeShop]) {
      if (party) {
        await this.notifications.create({
          userId: party.userId,
          type: "REFERRAL_REWARD_GRANTED",
          titleKey: "Referral reward granted! 🎁",
          bodyKey: `You've earned ${freeMonths} extra month(s) on your plan + ${aiCredits} AI credits via the referral programme!`,
          referenceType: "Referral",
          referenceId: referralId,
          channels: ["IN_APP"],
        });
      }
    }

    this.logger.log(
      `Completed referral ${referralId}: granted ${freeMonths} month(s) extension + ${aiCredits} AI credits to both parties`,
    );

    return updated;
  }

  /** Grant AI credits to a user and record in the ledger. */
  private async grantAiCredits(userId: string, shopId: string, amount: number, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { aiCreditsBalance: true },
    });
    if (!user) return;

    const balanceBefore = user.aiCreditsBalance;
    const balanceAfter = balanceBefore + amount;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { aiCreditsBalance: balanceAfter },
      }),
      this.prisma.aiCreditLedger.create({
        data: {
          userId,
          shopId,
          action: "GRANT",
          amount,
          balanceBefore,
          balanceAfter,
          reason,
        },
      }),
    ]);

    this.logger.log(`Granted ${amount} AI credits to user=${userId} (${reason})`);
  }

  /** Called when a referred seller purchases a plan — auto-complete the referral. */
  async processReferralPlanPurchase(refereeShopId: string) {
    const referral = await this.prisma.referral.findFirst({
      where: {
        refereeShopId,
        status: { in: ["SIGNED_UP", "PLAN_PURCHASED"] },
      },
    });

    if (!referral) return null;

    // Mark as PLAN_PURCHASED then auto-complete
    if (referral.status === "SIGNED_UP") {
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: "PLAN_PURCHASED",
          planPurchasedAt: new Date(),
        },
      });
    }

    // Auto-complete and grant rewards
    return this.completeReferral(referral.id);
  }

  /** Admin: list all referrals with optional status filter. */
  async listReferrals(status?: string) {
    return this.prisma.referral.findMany({
      where:
        status && status !== "ALL"
          ? { status: status as ReferralStatus }
          : undefined,
      orderBy: { invitedAt: "desc" },
      include: {
        referrerShop: {
          select: {
            shopName: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        refereeShop: {
          select: { shopName: true, isVerified: true },
        },
      },
    });
  }

  /** Admin: get & update referral programme settings. */
  async getReferralSettingsAdmin() {
    return this.getReferralSettings();
  }

  async updateReferralSettings(data: {
    freeMonths?: number;
    aiCreditsReward?: number;
    expirationDays?: number;
    maxReferralsPerShop?: number;
    isActive?: boolean;
  }) {
    const settings = await this.getReferralSettings();
    return this.prisma.referralSettings.update({
      where: { id: settings.id },
      data,
    });
  }

  /** Expire old pending referrals (call via cron). */
  async expireOldReferrals() {
    const settings = await this.getReferralSettings();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - settings.expirationDays);

    const result = await this.prisma.referral.updateMany({
      where: {
        status: "PENDING",
        invitedAt: { lt: cutoff },
      },
      data: { status: "EXPIRED" },
    });

    this.logger.log(`Expired ${result.count} old referral invitations`);
    return { expiredCount: result.count };
  }
}
