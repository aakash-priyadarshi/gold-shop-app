import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private prisma: PrismaService) {}

  /* ─── TICKETS ─── */

  async createTicket(data: {
    subject: string;
    customerName: string;
    customerEmail: string;
    channel?: any;
    priority?: any;
    category?: string;
    tags?: string[];
    assignedToId?: string;
    mainUserId?: string;
    mainOrderId?: string;
  }) {
    return this.prisma.supportTicket.create({
      data,
      include: { assignedTo: { select: { firstName: true, lastName: true } } },
    });
  }

  async listTickets(filters?: {
    status?: string;
    priority?: string;
    assigneeId?: string;
    channel?: string;
    search?: string;
  }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.assigneeId) where.assignedToId = filters.assigneeId;
    if (filters?.channel) where.channel = filters.channel;
    if (filters?.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: "insensitive" } },
        { customerName: { contains: filters.search, mode: "insensitive" } },
        { customerEmail: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return this.prisma.supportTicket.findMany({
      where,
      include: {
        assignedTo: { select: { firstName: true, lastName: true, employeeCode: true } },
        _count: { select: { messages: true } },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });
  }

  async getTicket(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { firstName: true, lastName: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    return ticket;
  }

  async updateTicket(id: string, data: Record<string, any>) {
    return this.prisma.supportTicket.update({
      where: { id },
      data,
      include: { assignedTo: { select: { firstName: true, lastName: true } } },
    });
  }

  async assignTicket(id: string, assignedToId: string) {
    return this.prisma.supportTicket.update({
      where: { id },
      data: { assignedToId },
      include: { assignedTo: { select: { firstName: true, lastName: true } } },
    });
  }

  async resolveTicket(id: string) {
    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        firstResponseAt:
          (await this.prisma.supportTicket.findUnique({ where: { id } }))
            ?.firstResponseAt || new Date(),
      },
    });
  }

  async closeTicket(id: string) {
    return this.prisma.supportTicket.update({
      where: { id },
      data: { status: "CLOSED" },
    });
  }

  async reopenTicket(id: string) {
    return this.prisma.supportTicket.update({
      where: { id },
      data: { status: "OPEN", resolvedAt: null },
    });
  }

  /* ─── MESSAGES ─── */

  async addMessage(ticketId: string, data: {
    content: string;
    employeeId?: string;
    isCustomer?: boolean;
    isInternal?: boolean;
    attachments?: string[];
  }) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Ticket not found");

    // Set first response time if this is the first agent response
    if (!data.isCustomer && !ticket.firstResponseAt) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { firstResponseAt: new Date(), status: "IN_PROGRESS" },
      });
    }

    return this.prisma.ticketMessage.create({
      data: {
        ticketId,
        content: data.content,
        employeeId: data.employeeId,
        isCustomer: data.isCustomer || false,
        isInternal: data.isInternal || false,
        attachments: data.attachments || [],
      },
    });
  }

  async getMessages(ticketId: string) {
    return this.prisma.ticketMessage.findMany({
      where: { ticketId },
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  /* ─── KNOWLEDGE BASE ─── */

  async createArticle(data: {
    title: string;
    content: string;
    category: string;
    tags?: string[];
    isPublic?: boolean;
  }) {
    return this.prisma.knowledgeArticle.create({ data });
  }

  async listArticles(filters?: { category?: string; search?: string; published?: boolean }) {
    const where: any = {};
    if (filters?.category) where.category = filters.category;
    if (filters?.published !== undefined) where.isPublic = filters.published;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { content: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return this.prisma.knowledgeArticle.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });
  }

  async getArticle(id: string) {
    const article = await this.prisma.knowledgeArticle.findUnique({ where: { id } });
    if (!article) throw new NotFoundException("Article not found");

    // Increment views
    await this.prisma.knowledgeArticle.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return article;
  }

  async updateArticle(id: string, data: Record<string, any>) {
    return this.prisma.knowledgeArticle.update({ where: { id }, data });
  }

  async deleteArticle(id: string) {
    return this.prisma.knowledgeArticle.delete({ where: { id } });
  }

  /* ─── CANNED RESPONSES ─── */

  async createCannedResponse(data: { shortcode: string; title: string; content: string; category?: string }) {
    return this.prisma.cannedResponse.create({ data });
  }

  async listCannedResponses(category?: string) {
    const where: any = {};
    if (category) where.category = category;
    return this.prisma.cannedResponse.findMany({ where, orderBy: { usageCount: "desc" } });
  }

  async useCannedResponse(id: string) {
    return this.prisma.cannedResponse.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }

  async deleteCannedResponse(id: string) {
    return this.prisma.cannedResponse.delete({ where: { id } });
  }

  /* ─── DASHBOARD ─── */

  async getDashboard() {
    const [total, open, inProgress, resolved] = await Promise.all([
      this.prisma.supportTicket.count(),
      this.prisma.supportTicket.count({ where: { status: "OPEN" } }),
      this.prisma.supportTicket.count({ where: { status: "IN_PROGRESS" } }),
      this.prisma.supportTicket.count({ where: { status: "RESOLVED" } }),
    ]);

    const avgCsat = await this.prisma.supportTicket.aggregate({
      _avg: { csatScore: true },
      where: { csatScore: { not: null } },
    });

    const byPriority = await this.prisma.supportTicket.groupBy({
      by: ["priority"],
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      _count: true,
    });

    const byChannel = await this.prisma.supportTicket.groupBy({
      by: ["channel"],
      _count: true,
    });

    return {
      total,
      open,
      inProgress,
      resolved,
      avgCsat: Math.round((avgCsat._avg.csatScore || 0) * 10) / 10,
      byPriority: byPriority.reduce(
        (acc, p) => ({ ...acc, [p.priority]: p._count }),
        {},
      ),
      byChannel: byChannel.reduce(
        (acc, c) => ({ ...acc, [c.channel]: c._count }),
        {},
      ),
    };
  }
}
