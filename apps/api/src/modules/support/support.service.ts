import { Injectable, Logger } from "@nestjs/common";
import { RefundStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

/**
 * Aggregates data for the internal support team dashboard.
 * Support staff can view but not modify core admin-only actions.
 */
@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ─── Dashboard overview stats ───
  async getDashboardStats() {
    const [
      pendingRefunds,
      totalOrders,
      activeConversations,
      lockedConversations,
      recentViolations,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { refundStatus: RefundStatus.REQUESTED },
      }),
      this.prisma.order.count(),
      this.prisma.conversation.count({ where: { status: "ACTIVE" } }),
      this.prisma.conversation.count({ where: { status: "LOCKED" } }),
      this.prisma.message.count({
        where: { hasViolation: true, createdAt: { gte: last24Hours() } },
      }),
    ]);

    return {
      pendingRefunds,
      totalOrders,
      activeConversations,
      lockedConversations,
      recentViolations,
    };
  }

  // ─── Orders queue (for support review) ───
  async getOrdersQueue(page = 1, limit = 20, status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          orderType: true,
          status: true,
          detailedStatus: true,
          totalNpr: true,
          displayCurrency: true,
          refundStatus: true,
          createdAt: true,
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          shop: { select: { id: true, shopName: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Flagged conversations (violations) ───
  async getFlaggedConversations() {
    return this.prisma.conversation.findMany({
      where: {
        OR: [
          { status: "LOCKED" },
          { messages: { some: { hasViolation: true } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        buyer: { select: { id: true, firstName: true, lastName: true } },
        shop: { select: { id: true, shopName: true } },
        _count: { select: { messages: true } },
        messages: {
          where: { hasViolation: true },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            content: true,
            maskedContent: true,
            violationType: true,
            senderRole: true,
            createdAt: true,
            sender: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
        },
      },
    });
  }

  // ─── KYC verifications pending ───
  async getPendingVerifications() {
    return this.prisma.verificationRequest.findMany({
      where: { status: "PENDING", type: "KYC" },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  // ─── Recent activity log ───
  async getRecentActivity(limit = 50) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        userId: true,
        actorType: true,
        action: true,
        resourceType: true,
        resourceId: true,
        createdAt: true,
      },
    });
  }

  // ─── AI Chat Logs & Analytics ───

  /**
   * Creates/updates a BotSession record for the given sessionId.
   * Called once per user message turn (before logAiChat).
   */
  async upsertBotSession(
    sessionId: string,
    data: { ipAddress?: string; userAgent?: string; newIntents?: string[] },
  ) {
    const existing = await this.prisma.botSession.findUnique({
      where: { id: sessionId },
      select: { leadIntents: true },
    });

    if (!existing) {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      await this.prisma.botSession.create({
        data: {
          id: sessionId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          leadIntents: data.newIntents ?? [],
          messageCount: 1,
          expiresAt,
        },
      });
    } else {
      const merged = [
        ...new Set([...existing.leadIntents, ...(data.newIntents ?? [])]),
      ];
      await this.prisma.botSession.update({
        where: { id: sessionId },
        data: {
          messageCount: { increment: 1 },
          lastMessageAt: new Date(),
          leadIntents: merged,
        },
      });
    }
  }

  /** Marks session as escalated and captures guest contact details. */
  async markSessionEscalated(
    sessionId: string,
    guestName?: string,
    guestEmail?: string,
  ) {
    const existing = await this.prisma.botSession.findUnique({
      where: { id: sessionId },
      select: { escalated: true, leadIntents: true, messageCount: true },
    });

    await this.prisma.botSession.update({
      where: { id: sessionId },
      data: { escalated: true, guestName, guestEmail },
    });

    if (!existing?.escalated) {
      await this.notifications.notifyAdmins({
        type: "SYSTEM_ALERT",
        titleKey: "notification.admin.ai_escalation.title",
        titleParams: { title: "AI chat needs human follow-up" },
        bodyKey: "notification.admin.ai_escalation.body",
        bodyParams: {
          message: `${guestName || guestEmail || "A visitor"} asked the AI for human support.`,
          guestName,
          guestEmail,
          leadIntents: existing?.leadIntents ?? [],
          messageCount: existing?.messageCount ?? 0,
        },
        referenceType: "AI_CHAT",
        referenceId: sessionId,
        channels: ["IN_APP"],
      });
    }
  }

  async logAiChat(
    sessionId: string | null,
    role: "user" | "assistant",
    content: string,
    actionTaken?: string,
    confidence?: number,
    ipAddress?: string,
  ) {
    return this.prisma.aiChatLog.create({
      data: {
        sessionId,
        role,
        content,
        actionTaken,
        confidence,
        ipAddress,
      },
    });
  }

  async getAiAnalytics() {
    const totalChats = await this.prisma.aiChatLog.count({
      where: { role: 'user' }
    });
    
    const actionsTaken = await this.prisma.aiChatLog.count({
      where: { actionTaken: { not: null } }
    });

    const recentLogs = await this.prisma.aiChatLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return {
      totalChats,
      actionsTaken,
      recentLogs
    };
  }

  /**
   * Paginated list of bot sessions with full message threads.
   * Used by admin dashboard to review conversations and track leads.
   */
  async getBotSessions(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [sessions, total] = await Promise.all([
      this.prisma.botSession.findMany({
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        include: {
          logs: { orderBy: { createdAt: 'asc' } },
        },
      }),
      this.prisma.botSession.count(),
    ]);

    return { sessions, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Aggregate stats useful for investor reporting. */
  async getBotStats() {
    const [
      totalSessions,
      escalatedSessions,
      avgMessages,
      intentCounts,
      dailySessions,
    ] = await Promise.all([
      this.prisma.botSession.count(),
      this.prisma.botSession.count({ where: { escalated: true } }),
      this.prisma.botSession.aggregate({ _avg: { messageCount: true } }),
      // Raw intent breakdown
      this.prisma.$queryRaw<{ intent: string; count: bigint }[]>`
        SELECT unnest("leadIntents") AS intent, COUNT(*) AS count
        FROM "BotSession"
        GROUP BY intent
        ORDER BY count DESC
      `,
      // Sessions per day (last 30 days)
      this.prisma.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT DATE("startedAt") AS day, COUNT(*) AS count
        FROM "BotSession"
        WHERE "startedAt" >= NOW() - INTERVAL '30 days'
        GROUP BY day
        ORDER BY day
      `,
    ]);

    return {
      totalSessions,
      escalatedSessions,
      escalationRate: totalSessions
        ? ((escalatedSessions / totalSessions) * 100).toFixed(1) + '%'
        : '0%',
      avgMessagesPerSession: avgMessages._avg.messageCount?.toFixed(1) ?? '0',
      intentBreakdown: intentCounts.map((r) => ({
        intent: r.intent,
        count: Number(r.count),
      })),
      dailySessions: dailySessions.map((r) => ({
        day: r.day,
        count: Number(r.count),
      })),
    };
  }

  // ─── Global Contacts ───
  async getGlobalContacts(onlyActive = true) {
    return this.prisma.supportContact.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { country: 'asc' }
    });
  }

  async upsertGlobalContact(data: { id?: string, country: string, countryFlag: string, type: string, value: string, isActive: boolean }) {
    if (data.id) {
       return this.prisma.supportContact.update({
          where: { id: data.id },
          data
       });
    }
    return this.prisma.supportContact.create({
       data
    });
  }

  async deleteGlobalContact(id: string) {
    return this.prisma.supportContact.delete({
       where: { id }
    });
  }
}

function last24Hours() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}
