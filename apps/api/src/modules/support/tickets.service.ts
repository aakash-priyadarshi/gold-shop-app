import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  TicketStatus,
  TicketType,
  TicketPriority,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// Helper to create notification compatible with the service's DTO
function ticketNotif(
  userId: string,
  type: string,
  title: string,
  body: string,
  ticketId: string,
) {
  return {
    userId,
    type,
    titleKey: title,
    bodyKey: body,
    referenceType: 'TICKET',
    referenceId: ticketId,
    channels: ['IN_APP'],
  };
}

// ─── DTOs ───
export interface CreateTicketDto {
  type: TicketType;
  subject: string;
  description: string;
  priority?: TicketPriority;
  orderId?: string;
  conversationId?: string;
  // Guest fields (for non-logged-in users)
  guestEmail?: string;
  guestName?: string;
}

export interface AddTicketMessageDto {
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
  isInternal?: boolean;
}

export interface ListTicketsQuery {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  type?: TicketType;
  priority?: TicketPriority;
  assigneeId?: string;
  userId?: string;
  search?: string;
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ─── Generate unique ticket number ───
  private async generateTicketNumber(): Promise<string> {
    const lastTicket = await this.prisma.supportTicket.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { ticketNumber: true },
    });

    let nextNum = 1;
    if (lastTicket?.ticketNumber) {
      const num = parseInt(lastTicket.ticketNumber.replace('TKT-', ''), 10);
      if (!isNaN(num)) nextNum = num + 1;
    }

    return `TKT-${String(nextNum).padStart(5, '0')}`;
  }

  // ─── Create a ticket (logged-in user or guest) ───
  async createTicket(
    dto: CreateTicketDto,
    userId?: string,
    userRole?: string,
  ) {
    const ticketNumber = await this.generateTicketNumber();

    // Auto-set priority for certain types
    let priority = dto.priority || TicketPriority.MEDIUM;
    if (
      dto.type === TicketType.HACKED_ACCOUNT ||
      dto.type === TicketType.ACCOUNT_SUSPENSION
    ) {
      priority = TicketPriority.HIGH;
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId: userId || null,
        guestEmail: dto.guestEmail || null,
        guestName: dto.guestName || null,
        type: dto.type,
        subject: dto.subject,
        description: dto.description,
        priority,
        orderId: dto.orderId || null,
        conversationId: dto.conversationId || null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });

    // Create initial system message
    await this.prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderRole: 'SYSTEM',
        senderName: 'System',
        content: `Ticket ${ticketNumber} created. Our support team will review your issue shortly.`,
      },
    });

    // Notify all SUPPORT and ADMIN users about new ticket
    const supportStaff = await this.prisma.user.findMany({
      where: { role: { in: ['SUPPORT', 'ADMIN'] }, status: 'ACTIVE' },
      select: { id: true },
    });

    for (const staff of supportStaff) {
      await this.notifications.create(
        ticketNotif(
          staff.id,
          'TICKET_CREATED',
          `New ticket: ${ticketNumber}`,
          `${dto.subject} (${dto.type.replace(/_/g, ' ')})`,
          ticket.id,
        ),
      );
    }

    this.logger.log(`Ticket ${ticketNumber} created by ${userId || dto.guestEmail || 'anonymous'}`);
    return ticket;
  }

  // ─── List tickets with filters ───
  async listTickets(query: ListTicketsQuery) {
    const { page = 1, limit = 20, status, type, priority, assigneeId, userId, search } = query;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    if (userId) where.userId = userId;
    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: [
          { priority: 'desc' }, // URGENT first
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          },
          assignee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Get single ticket with messages ───
  async getTicket(ticketId: string, requesterId?: string, requesterRole?: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true, phone: true },
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    // Access control: users can only see their own tickets (unless support/admin)
    if (
      requesterRole !== 'SUPPORT' &&
      requesterRole !== 'ADMIN' &&
      ticket.userId !== requesterId
    ) {
      throw new ForbiddenException('You can only view your own tickets');
    }

    // Filter internal messages for non-staff
    if (requesterRole !== 'SUPPORT' && requesterRole !== 'ADMIN') {
      ticket.messages = ticket.messages.filter((m) => !m.isInternal);
    }

    return ticket;
  }

  // ─── Claim a ticket ───
  async claimTicket(ticketId: string, staffId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.assigneeId && ticket.assigneeId !== staffId) {
      throw new BadRequestException('This ticket is already claimed by another agent');
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assigneeId: staffId,
        status: TicketStatus.CLAIMED,
        claimedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Notify the ticket creator
    if (ticket.userId) {
      await this.notifications.create(
        ticketNotif(
          ticket.userId,
          'TICKET_CLAIMED',
          `Ticket ${ticket.ticketNumber} claimed`,
          'A support agent is now working on your issue.',
          ticket.id,
        ),
      );
    }

    // System message
    const agent = updated.assignee;
    await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        senderRole: 'SYSTEM',
        senderName: 'System',
        content: `${agent?.firstName || 'Support agent'} has claimed this ticket and is reviewing your issue.`,
      },
    });

    return updated;
  }

  // ─── Update ticket status ───
  async updateTicketStatus(
    ticketId: string,
    status: TicketStatus,
    staffId: string,
    note?: string,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const data: any = { status };

    if (status === TicketStatus.RESOLVED) {
      data.resolvedAt = new Date();
      if (note) data.resolutionNote = note;
    }
    if (status === TicketStatus.CLOSED) {
      data.closedAt = new Date();
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Notify ticket creator about status change
    const notifType =
      status === TicketStatus.RESOLVED
        ? 'TICKET_RESOLVED'
        : status === TicketStatus.CLOSED
          ? 'TICKET_CLOSED'
          : 'TICKET_UPDATED';

    if (ticket.userId) {
      await this.notifications.create(
        ticketNotif(
          ticket.userId,
          notifType,
          `Ticket ${ticket.ticketNumber} — ${status.replace(/_/g, ' ')}`,
          note || `Your ticket status has been updated to ${status.replace(/_/g, ' ')}.`,
          ticket.id,
        ),
      );
    }

    // System message
    await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        senderRole: 'SYSTEM',
        senderName: 'System',
        content: `Ticket status changed to ${status.replace(/_/g, ' ')}.${note ? ` Note: ${note}` : ''}`,
      },
    });

    return updated;
  }

  // ─── Add message to ticket ───
  async addMessage(
    ticketId: string,
    senderId: string | null,
    senderRole: string,
    senderName: string,
    dto: AddTicketMessageDto,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    // If ticket is closed, don't allow new messages
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Cannot add messages to a closed ticket');
    }

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId,
        senderRole,
        senderName,
        content: dto.content,
        attachmentUrl: dto.attachmentUrl || null,
        attachmentType: dto.attachmentType || null,
        isInternal: dto.isInternal || false,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    // If user replied, update status from WAITING_USER to IN_PROGRESS
    if (
      senderRole !== 'SUPPORT' &&
      senderRole !== 'ADMIN' &&
      senderRole !== 'SYSTEM' &&
      ticket.status === TicketStatus.WAITING_USER
    ) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.IN_PROGRESS },
      });
    }

    // Notifications
    if (!dto.isInternal) {
      if (
        (senderRole === 'SUPPORT' || senderRole === 'ADMIN') &&
        ticket.userId
      ) {
        // Support replied → notify user
        await this.notifications.create(
          ticketNotif(
            ticket.userId,
            'TICKET_MESSAGE',
            `Reply on ticket ${ticket.ticketNumber}`,
            dto.content.substring(0, 100),
            ticket.id,
          ),
        );
      } else if (ticket.assigneeId) {
        // User replied → notify assigned support
        await this.notifications.create(
          ticketNotif(
            ticket.assigneeId,
            'TICKET_MESSAGE',
            `Reply on ticket ${ticket.ticketNumber}`,
            dto.content.substring(0, 100),
            ticket.id,
          ),
        );
      }
    }

    return message;
  }

  // ─── Resolve ticket ───
  async resolveTicket(ticketId: string, staffId: string, note?: string) {
    return this.updateTicketStatus(ticketId, TicketStatus.RESOLVED, staffId, note);
  }

  // ─── Close ticket ───
  async closeTicket(ticketId: string, staffId: string) {
    return this.updateTicketStatus(ticketId, TicketStatus.CLOSED, staffId);
  }

  // ─── Get ticket stats for support dashboard ───
  async getTicketStats() {
    const [open, claimed, inProgress, waitingUser, resolved, total] =
      await Promise.all([
        this.prisma.supportTicket.count({ where: { status: TicketStatus.OPEN } }),
        this.prisma.supportTicket.count({ where: { status: TicketStatus.CLAIMED } }),
        this.prisma.supportTicket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
        this.prisma.supportTicket.count({ where: { status: TicketStatus.WAITING_USER } }),
        this.prisma.supportTicket.count({ where: { status: TicketStatus.RESOLVED } }),
        this.prisma.supportTicket.count(),
      ]);

    return { open, claimed, inProgress, waitingUser, resolved, total };
  }

  // ─── Get my tickets (for end users) ───
  async getMyTickets(userId: string, page = 1, limit = 10) {
    return this.listTickets({ userId, page, limit });
  }
}
