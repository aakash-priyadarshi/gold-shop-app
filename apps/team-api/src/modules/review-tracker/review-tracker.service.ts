import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ReviewTrackerService {
  private readonly logger = new Logger(ReviewTrackerService.name);

  constructor(private prisma: PrismaService) {}

  /* ─── TRACKERS ─── */

  async createTracker(data: {
    platform: any;
    profileUrl: string;
  }) {
    return this.prisma.reviewTracker.create({ data });
  }

  async listTrackers() {
    return this.prisma.reviewTracker.findMany({
      where: { isActive: true },
      include: { _count: { select: { reviews: true } } },
      orderBy: { platform: "asc" },
    });
  }

  async getTracker(id: string) {
    const tracker = await this.prisma.reviewTracker.findUnique({
      where: { id },
      include: {
        reviews: { take: 20, orderBy: { detectedAt: "desc" } },
      },
    });
    if (!tracker) throw new NotFoundException("Tracker not found");
    return tracker;
  }

  async updateTracker(id: string, data: Record<string, any>) {
    return this.prisma.reviewTracker.update({ where: { id }, data });
  }

  async deleteTracker(id: string) {
    return this.prisma.reviewTracker.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /* ─── REVIEWS ─── */

  async addReview(data: {
    trackerId: string;
    externalId?: string;
    authorName?: string;
    rating?: number;
    content?: string;
    publishedAt?: string;
    sentiment?: any;
  }) {
    return this.prisma.trackedReview.create({
      data: {
        trackerId: data.trackerId,
        externalId: data.externalId,
        authorName: data.authorName,
        rating: data.rating,
        content: data.content,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
        sentiment: data.sentiment,
      },
    });
  }

  async listReviews(filters?: {
    trackerId?: string;
    sentiment?: string;
    minRating?: number;
    maxRating?: number;
    needsResponse?: boolean;
  }) {
    const where: any = {};
    if (filters?.trackerId) where.trackerId = filters.trackerId;
    if (filters?.sentiment) where.sentiment = filters.sentiment;
    if (filters?.minRating || filters?.maxRating) {
      where.rating = {};
      if (filters.minRating) where.rating.gte = filters.minRating;
      if (filters.maxRating) where.rating.lte = filters.maxRating;
    }
    if (filters?.needsResponse) where.isResponded = false;

    return this.prisma.trackedReview.findMany({
      where,
      include: {
        tracker: { select: { platform: true, profileUrl: true } },
        responses: { take: 1, orderBy: { createdAt: "desc" } },
      },
      orderBy: { detectedAt: "desc" },
    });
  }

  async getReview(id: string) {
    const review = await this.prisma.trackedReview.findUnique({
      where: { id },
      include: {
        tracker: true,
        responses: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!review) throw new NotFoundException("Review not found");
    return review;
  }

  async markResponded(id: string) {
    return this.prisma.trackedReview.update({
      where: { id },
      data: { isResponded: true },
    });
  }

  /* ─── RESPONSES ─── */

  async draftResponse(reviewId: string, data: {
    content: string;
    isAiDraft?: boolean;
  }) {
    return this.prisma.reviewTrackerResponse.create({
      data: {
        reviewId,
        content: data.content,
        isAiDraft: data.isAiDraft || false,
      },
    });
  }

  async approveResponse(id: string) {
    const resp = await this.prisma.reviewTrackerResponse.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    });

    // Mark the review as responded
    await this.prisma.trackedReview.update({
      where: { id: resp.reviewId },
      data: { isResponded: true },
    });

    return resp;
  }

  async publishResponse(id: string) {
    return this.prisma.reviewTrackerResponse.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    });
  }

  /* ─── DASHBOARD ─── */

  async getDashboard() {
    const trackers = await this.prisma.reviewTracker.findMany({
      where: { isActive: true },
    });

    const totalReviews = await this.prisma.trackedReview.count();
    const unanswered = await this.prisma.trackedReview.count({
      where: { isResponded: false },
    });

    const avgRating = await this.prisma.trackedReview.aggregate({
      _avg: { rating: true },
    });

    const sentimentBreakdown = await this.prisma.trackedReview.groupBy({
      by: ["sentiment"],
      _count: true,
    });

    const recentNegative = await this.prisma.trackedReview.findMany({
      where: { sentiment: "NEGATIVE", isResponded: false },
      include: { tracker: { select: { platform: true, profileUrl: true } } },
      orderBy: { detectedAt: "desc" },
      take: 5,
    });

    return {
      trackers: trackers.length,
      totalReviews,
      unanswered,
      avgRating: Math.round((avgRating._avg.rating || 0) * 10) / 10,
      sentimentBreakdown: sentimentBreakdown.reduce(
        (acc, s) => ({ ...acc, [s.sentiment || "UNKNOWN"]: s._count }),
        {},
      ),
      recentNegative,
    };
  }
}
