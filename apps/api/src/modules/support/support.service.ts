import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { LeadStatus, RefundStatus } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { MailService } from "../mail/mail.service";

export const LEAD_ALERT_SETTINGS_KEY = "lead_alert_settings";

export interface LeadAlertSettings {
  emails: string[];
  digestEnabled: boolean;
}

const DEFAULT_LEAD_ALERT_SETTINGS: LeadAlertSettings = {
  emails: [],
  digestEnabled: true,
};

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
    private mailService: MailService,
    private config: ConfigService,
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

  /**
   * Saves contact info (email or phone) captured by the AI during a
   * guest conversation. Sends admin alerts (in-app + email) on first capture.
   */
  async saveLeadContact(
    sessionId: string,
    contactType: "email" | "phone",
    contactValue: string,
    guestName?: string,
  ) {
    const existing = await this.prisma.botSession.findUnique({
      where: { id: sessionId },
      select: {
        contactCaptured: true,
        leadIntents: true,
        messageCount: true,
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        leadStatus: true,
      },
    });

    const updateData: Record<string, unknown> = {
      contactCaptured: true,
      awaitingContact: false,
    };
    if (contactType === "email") updateData.guestEmail = contactValue;
    else updateData.guestPhone = contactValue;
    if (guestName) updateData.guestName = guestName;

    const isFirstCapture = !existing?.contactCaptured;
    if (isFirstCapture) {
      updateData.leadStatus = LeadStatus.NEW;
    } else if (!existing?.leadStatus) {
      updateData.leadStatus = LeadStatus.NEW;
    }

    await this.prisma.botSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    if (isFirstCapture) {
      const name = guestName || existing?.guestName || "A visitor";
      const contactLabel =
        contactType === "email" ? contactValue : `📞 ${contactValue}`;
      const frontendUrl =
        this.config.get<string>("FRONTEND_URL") || "https://www.orivraa.com";
      const leadsUrl = `${frontendUrl}/dashboard/admin/leads?session=${sessionId}`;

      await this.notifications.notifyAdmins({
        type: "SYSTEM_ALERT",
        titleKey: "notification.admin.ai_lead_contact.title",
        titleParams: { title: "New lead contact captured via AI chat" },
        bodyKey: "notification.admin.ai_lead_contact.body",
        bodyParams: {
          message: `${name} shared their ${contactType}: ${contactLabel}`,
          guestName: name,
          contact: contactLabel,
          leadIntents: existing?.leadIntents ?? [],
          messageCount: existing?.messageCount ?? 0,
        },
        referenceType: "AI_CHAT",
        referenceId: sessionId,
        channels: ["IN_APP", "EMAIL"],
      });

      await this.dispatchLeadCaptureAlerts({
        sessionId,
        name,
        contactType,
        contactValue,
        leadIntents: existing?.leadIntents ?? [],
        messageCount: existing?.messageCount ?? 0,
        leadsUrl,
      });
    }
  }

  /** Mark that the bot asked the visitor for email/WhatsApp. */
  async setAwaitingContact(sessionId: string, awaiting: boolean) {
    try {
      await this.prisma.botSession.update({
        where: { id: sessionId },
        data: { awaitingContact: awaiting },
      });
    } catch (err: any) {
      this.logger.warn(
        `Failed to set awaitingContact on ${sessionId}: ${err?.message || err}`,
      );
    }
  }

  async getSessionAwaitingContact(sessionId: string): Promise<boolean> {
    const session = await this.prisma.botSession.findUnique({
      where: { id: sessionId },
      select: { awaitingContact: true, contactCaptured: true },
    });
    return !!session?.awaitingContact && !session?.contactCaptured;
  }

  async getLeadAlertSettings(): Promise<
    LeadAlertSettings & { updatedAt?: string }
  > {
    const row = await this.prisma.systemConfig.findUnique({
      where: { key: LEAD_ALERT_SETTINGS_KEY },
    });
    const settings = this.normalizeLeadAlertSettings(row?.value);
    return {
      ...settings,
      updatedAt: row?.updatedAt?.toISOString(),
    };
  }

  async updateLeadAlertSettings(
    data: LeadAlertSettings,
    updatedBy: string,
  ): Promise<LeadAlertSettings & { updatedAt: string }> {
    const emails = [
      ...new Set(
        (data.emails || [])
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    if (emails.length > 10) {
      throw new BadRequestException("At most 10 alert emails are allowed");
    }
    for (const email of emails) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new BadRequestException(`Invalid email: ${email}`);
      }
    }

    const value: LeadAlertSettings = {
      emails,
      digestEnabled: data.digestEnabled !== false,
    };

    const row = await this.prisma.systemConfig.upsert({
      where: { key: LEAD_ALERT_SETTINGS_KEY },
      update: { value: value as any, updatedBy },
      create: {
        key: LEAD_ALERT_SETTINGS_KEY,
        value: value as any,
        updatedBy,
      },
    });

    this.logger.log(
      `Lead alert settings updated (${emails.length} email(s)) by ${updatedBy}`,
    );

    return {
      ...value,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private normalizeLeadAlertSettings(raw: unknown): LeadAlertSettings {
    if (!raw || typeof raw !== "object") {
      return { ...DEFAULT_LEAD_ALERT_SETTINGS };
    }
    const o = raw as Record<string, unknown>;
    const emails = Array.isArray(o.emails)
      ? [
          ...new Set(
            o.emails
              .filter((e): e is string => typeof e === "string")
              .map((e) => e.trim().toLowerCase())
              .filter(Boolean),
          ),
        ]
      : [];
    return {
      emails,
      digestEnabled: o.digestEnabled !== false,
    };
  }

  private async resolveLeadAlertEmails(): Promise<string[]> {
    const settings = await this.getLeadAlertSettings();
    return settings.emails;
  }

  private async dispatchLeadCaptureAlerts(opts: {
    sessionId: string;
    name: string;
    contactType: "email" | "phone";
    contactValue: string;
    leadIntents: string[];
    messageCount: number;
    leadsUrl: string;
  }) {
    const alertEmails = await this.resolveLeadAlertEmails();
    if (alertEmails.length === 0) {
      this.logger.debug(
        "Lead capture email skipped — no alert emails configured in admin settings",
      );
      return;
    }

    const title = "New AI chat lead";
    const message = `${opts.name} shared their ${opts.contactType}: ${opts.contactValue}`;
    const details: Record<string, string> = {
      Contact: opts.contactValue,
      Type: opts.contactType,
      Name: opts.name,
      Intents: opts.leadIntents.join(", ") || "—",
      Messages: String(opts.messageCount),
      Session: opts.sessionId,
    };

    for (const alertEmail of alertEmails) {
      try {
        await this.mailService.sendAdminAlert(alertEmail, {
          alertType: "AI_LEAD",
          title,
          message,
          details,
          actionUrl: opts.leadsUrl,
          actionText: "Open lead",
        });
      } catch (err: any) {
        this.logger.error(
          `Lead alert email to ${alertEmail} failed: ${err?.message || err}`,
        );
      }
    }
  }

  /**
   * Daily digest of NEW (uncontacted) leads — safety net if a realtime alert was missed.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendNewLeadsDigest() {
    const newLeads = await this.prisma.botSession.findMany({
      where: { contactCaptured: true, leadStatus: LeadStatus.NEW },
      orderBy: { lastMessageAt: "desc" },
      take: 50,
      select: {
        id: true,
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        leadIntents: true,
        messageCount: true,
        lastMessageAt: true,
        startedAt: true,
      },
    });

    if (newLeads.length === 0) return;

    const alertSettings = await this.getLeadAlertSettings();
    if (!alertSettings.digestEnabled) {
      return;
    }

    const alertEmails = alertSettings.emails;
    if (alertEmails.length === 0) {
      this.logger.debug(
        "New-leads digest skipped — no alert emails configured in admin settings",
      );
      return;
    }

    const frontendUrl =
      this.config.get<string>("FRONTEND_URL") || "https://www.orivraa.com";
    const lines = newLeads.map((l, i) => {
      const contact = l.guestPhone || l.guestEmail || "—";
      const name = l.guestName || "Anonymous";
      return `${i + 1}. ${name} — ${contact} (${l.messageCount} msgs, since ${l.startedAt.toISOString().slice(0, 10)})`;
    });

    for (const alertEmail of alertEmails) {
      try {
        await this.mailService.sendAdminAlert(alertEmail, {
          alertType: "AI_LEAD_DIGEST",
          title: `${newLeads.length} uncontacted AI lead(s)`,
          message: `You have ${newLeads.length} AI chat lead(s) still marked NEW:\n\n${lines.join("\n")}`,
          details: {
            Count: String(newLeads.length),
          },
          actionUrl: `${frontendUrl}/dashboard/admin/leads?status=NEW`,
          actionText: "Review leads",
        });
        this.logger.log(
          `Sent NEW-leads digest (${newLeads.length}) to ${alertEmail}`,
        );
      } catch (err: any) {
        this.logger.error(
          `New-leads digest to ${alertEmail} failed: ${err?.message || err}`,
        );
      }
    }
  }

  /**
   * Paginated leads inbox (contactCaptured sessions).
   */
  async getLeads(opts: {
    page?: number;
    limit?: number;
    status?: LeadStatus | "ALL";
    search?: string;
    sessionId?: string;
  }) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { contactCaptured: true };
    if (opts.status && opts.status !== "ALL") {
      where.leadStatus = opts.status;
    }
    if (opts.sessionId) {
      where.id = opts.sessionId;
    }
    if (opts.search?.trim()) {
      const q = opts.search.trim();
      where.OR = [
        { guestName: { contains: q, mode: "insensitive" } },
        { guestEmail: { contains: q, mode: "insensitive" } },
        { guestPhone: { contains: q, mode: "insensitive" } },
      ];
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [sessions, total, newCount, contactedCount, wonThisWeek] =
      await Promise.all([
        this.prisma.botSession.findMany({
          where,
          orderBy: { lastMessageAt: "desc" },
          skip,
          take: limit,
          include: {
            logs: { orderBy: { createdAt: "asc" } },
          },
        }),
        this.prisma.botSession.count({ where }),
        this.prisma.botSession.count({
          where: { contactCaptured: true, leadStatus: LeadStatus.NEW },
        }),
        this.prisma.botSession.count({
          where: { contactCaptured: true, leadStatus: LeadStatus.CONTACTED },
        }),
        this.prisma.botSession.count({
          where: {
            contactCaptured: true,
            leadStatus: LeadStatus.WON,
            leadContactedAt: { gte: weekAgo },
          },
        }),
      ]);

    return {
      sessions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      stats: {
        newCount,
        contactedCount,
        wonThisWeek,
      },
    };
  }

  async updateLead(
    sessionId: string,
    data: {
      leadStatus?: LeadStatus;
      leadNotes?: string | null;
    },
  ) {
    const existing = await this.prisma.botSession.findUnique({
      where: { id: sessionId },
      select: { id: true, contactCaptured: true, leadStatus: true },
    });
    if (!existing || !existing.contactCaptured) {
      throw new NotFoundException("Lead not found");
    }

    const update: Record<string, unknown> = {};
    if (data.leadNotes !== undefined) update.leadNotes = data.leadNotes;
    if (data.leadStatus !== undefined) {
      update.leadStatus = data.leadStatus;
      if (
        data.leadStatus === LeadStatus.CONTACTED ||
        data.leadStatus === LeadStatus.WON
      ) {
        update.leadContactedAt = new Date();
      }
    }

    return this.prisma.botSession.update({
      where: { id: sessionId },
      data: update,
      include: {
        logs: { orderBy: { createdAt: "asc" } },
      },
    });
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
      newLeadsCount,
      capturedLeadsCount,
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
      this.prisma.botSession.count({
        where: { contactCaptured: true, leadStatus: LeadStatus.NEW },
      }),
      this.prisma.botSession.count({ where: { contactCaptured: true } }),
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
      newLeadsCount,
      capturedLeadsCount,
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
