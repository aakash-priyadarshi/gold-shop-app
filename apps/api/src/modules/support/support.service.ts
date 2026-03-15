import { Injectable, Logger } from "@nestjs/common";
import { RefundStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Aggregates data for the internal support team dashboard.
 * Support staff can view but not modify core admin-only actions.
 */
@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private prisma: PrismaService) {}

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
  async logAiChat(
    sessionId: string | null,
    role: "user" | "assistant",
    content: string,
    actionTaken?: string,
    confidence?: number,
    ipAddress?: string
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
