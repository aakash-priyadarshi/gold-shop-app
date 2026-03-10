import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(private prisma: PrismaService) {}

  /* ─── ACCOUNTS ─── */

  async connectAccount(data: {
    platform: any;
    accountName: string;
    accountId?: string;
    accessToken?: string;
    refreshToken?: string;
  }) {
    return this.prisma.socialAccount.create({ data });
  }

  async listAccounts() {
    return this.prisma.socialAccount.findMany({
      where: { isActive: true },
      include: { _count: { select: { posts: true } } },
      orderBy: { platform: "asc" },
    });
  }

  async updateAccount(id: string, data: Record<string, any>) {
    return this.prisma.socialAccount.update({ where: { id }, data });
  }

  async disconnectAccount(id: string) {
    return this.prisma.socialAccount.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /* ─── POSTS ─── */

  async createPost(data: {
    accountId: string;
    authorId: string;
    content: string;
    mediaUrls?: string[];
    hashtags?: string[];
    scheduledAt?: string;
  }) {
    return this.prisma.socialPost.create({
      data: {
        accountId: data.accountId,
        authorId: data.authorId,
        content: data.content,
        mediaUrls: data.mediaUrls || [],
        hashtags: data.hashtags || [],
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        status: data.scheduledAt ? "SCHEDULED" : "DRAFT",
      },
      include: { account: { select: { platform: true, accountName: true } } },
    });
  }

  async listPosts(filters?: {
    accountId?: string;
    status?: string;
  }) {
    const where: any = {};
    if (filters?.accountId) where.accountId = filters.accountId;
    if (filters?.status) where.status = filters.status;

    return this.prisma.socialPost.findMany({
      where,
      include: { account: { select: { platform: true, accountName: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getPost(id: string) {
    const post = await this.prisma.socialPost.findUnique({
      where: { id },
      include: { account: true },
    });
    if (!post) throw new NotFoundException("Post not found");
    return post;
  }

  async updatePost(id: string, data: Record<string, any>) {
    if (data.scheduledAt) data.scheduledAt = new Date(data.scheduledAt);
    return this.prisma.socialPost.update({
      where: { id },
      data,
      include: { account: { select: { platform: true, accountName: true } } },
    });
  }

  async approvePost(id: string, approverId: string) {
    return this.prisma.socialPost.update({
      where: { id },
      data: { status: "APPROVED", approverId, approvedAt: new Date() },
    });
  }

  async publishPost(id: string) {
    return this.prisma.socialPost.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
  }

  async deletePost(id: string) {
    return this.prisma.socialPost.delete({ where: { id } });
  }

  async getScheduledPosts() {
    return this.prisma.socialPost.findMany({
      where: {
        status: { in: ["SCHEDULED", "APPROVED"] },
        scheduledAt: { not: null },
      },
      include: { account: { select: { platform: true, accountName: true } } },
      orderBy: { scheduledAt: "asc" },
    });
  }

  /* ─── ANALYTICS (account-level, per date) ─── */

  async recordAccountAnalytics(accountId: string, date: string, data: {
    followers?: number;
    following?: number;
    engagementRate?: number;
    impressions?: number;
    profileViews?: number;
  }) {
    const dateObj = new Date(date);
    return this.prisma.socialAnalytics.upsert({
      where: { accountId_date: { accountId, date: dateObj } },
      update: data,
      create: { accountId, date: dateObj, ...data },
    });
  }

  async getAnalyticsDashboard() {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { isActive: true },
    });

    const totalPosts = await this.prisma.socialPost.count({
      where: { status: "PUBLISHED" },
    });

    // Post-level engagement (inline fields on SocialPost)
    const postStats = await this.prisma.socialPost.aggregate({
      _sum: {
        impressions: true,
        likes: true,
        comments: true,
        shares: true,
        clicks: true,
      },
      where: { status: "PUBLISHED" },
    });

    // Account-level analytics (latest entry per account)
    const latestAnalytics = await this.prisma.socialAnalytics.findMany({
      orderBy: { date: "desc" },
      distinct: ["accountId"],
    });

    const totalFollowers = latestAnalytics.reduce((sum, a) => sum + a.followers, 0);

    return {
      accounts: accounts.length,
      totalPosts,
      totalFollowers,
      totalImpressions: postStats._sum.impressions || 0,
      totalLikes: postStats._sum.likes || 0,
      totalComments: postStats._sum.comments || 0,
      totalShares: postStats._sum.shares || 0,
      totalClicks: postStats._sum.clicks || 0,
    };
  }
}
