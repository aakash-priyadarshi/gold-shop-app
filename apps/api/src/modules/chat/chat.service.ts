import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ContactMaskingService } from './contact-masking.service';
import { ConversationStatus, UserRole } from '@prisma/client';

const MAX_VIOLATIONS_BEFORE_LOCK = 5;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private masking: ContactMaskingService,
  ) {}

  // ─── Create or get existing conversation ───
  async getOrCreateConversation(
    buyerId: string,
    shopId: string,
    orderId?: string,
    rfqId?: string,
  ) {
    // Try to find existing
    const where: any = { buyerId, shopId };
    if (orderId) where.orderId = orderId;
    else if (rfqId) where.rfqId = rfqId;

    let conversation = await this.prisma.conversation.findFirst({
      where,
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { buyerId, shopId, orderId, rfqId },
        include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
    }

    return conversation;
  }

  // ─── Send a message ───
  async sendMessage(
    conversationId: string,
    senderId: string,
    senderRole: string,
    content: string,
    attachmentUrl?: string,
    attachmentType?: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.status === ConversationStatus.LOCKED) {
      throw new BadRequestException(
        'This conversation has been locked due to policy violations.',
      );
    }

    // Authorize
    this.authorizeConversationAccess(conversation, senderId, senderRole);

    // Mask contact info
    const maskResult = this.masking.mask(content);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        senderRole,
        content: maskResult.hasViolation ? maskResult.maskedContent : content,
        maskedContent: maskResult.hasViolation ? maskResult.maskedContent : null,
        hasViolation: maskResult.hasViolation,
        violationType: maskResult.violationType,
        attachmentUrl,
        attachmentType,
      },
    });

    // Handle violation logging
    if (maskResult.hasViolation) {
      await this.audit.log({
        userId: senderId,
        actorType: senderRole,
        action: 'CONTACT_INFO_DETECTED',
        resourceType: 'Conversation',
        resourceId: conversationId,
        metadata: {
          violationType: maskResult.violationType,
          matchCount: maskResult.originalMatches.length,
        },
      });

      // Check if we should auto-lock
      const violationCount = await this.prisma.message.count({
        where: { conversationId, hasViolation: true },
      });

      if (violationCount >= MAX_VIOLATIONS_BEFORE_LOCK) {
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { status: ConversationStatus.LOCKED },
        });

        // Add system message
        await this.prisma.message.create({
          data: {
            conversationId,
            senderId,
            senderRole: 'SYSTEM',
            content:
              'This conversation has been locked due to repeated policy violations. ' +
              'Sharing contact information is not allowed on this platform.',
            isSystem: true,
          },
        });

        await this.audit.log({
          userId: senderId,
          actorType: 'SYSTEM',
          action: 'CONVERSATION_LOCKED',
          resourceType: 'Conversation',
          resourceId: conversationId,
          metadata: { reason: 'MAX_VIOLATIONS_EXCEEDED', violationCount },
        });
      }
    }

    return message;
  }

  // ─── Get conversation messages (paginated) ───
  async getMessages(
    conversationId: string,
    userId: string,
    userRole: string,
    page = 1,
    limit = 50,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');
    this.authorizeConversationAccess(conversation, userId, userRole);

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      messages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── List conversations for a user ───
  async listConversations(userId: string, userRole: string, shopId?: string) {
    let where: any;

    if (userRole === 'CUSTOMER') {
      where = { buyerId: userId };
    } else if (userRole === 'SHOPKEEPER' && shopId) {
      where = { shopId };
    } else if (userRole === 'ADMIN' || userRole === 'SUPPORT') {
      where = {}; // Access all
    } else {
      throw new ForbiddenException('No access to conversations');
    }

    return this.prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        buyer: { select: { id: true, firstName: true, lastName: true } },
        shop: { select: { id: true, shopName: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true, senderRole: true, isRead: true },
        },
      },
    });
  }

  // ─── Mark messages as read ───
  async markAsRead(conversationId: string, userId: string) {
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // ─── Admin: get violation stats ───
  async getViolationStats() {
    const [totalViolations, violationsByType, lockedConversations] =
      await Promise.all([
        this.prisma.message.count({ where: { hasViolation: true } }),
        this.prisma.message.groupBy({
          by: ['violationType'],
          where: { hasViolation: true },
          _count: true,
        }),
        this.prisma.conversation.count({
          where: { status: ConversationStatus.LOCKED },
        }),
      ]);

    return { totalViolations, violationsByType, lockedConversations };
  }

  // ─── Admin: unlock a conversation ───
  async unlockConversation(conversationId: string, adminId: string) {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: ConversationStatus.ACTIVE },
    });

    await this.audit.log({
      userId: adminId,
      actorType: 'ADMIN',
      action: 'CONVERSATION_UNLOCKED',
      resourceType: 'Conversation',
      resourceId: conversationId,
    });
  }

  // ─── Authorization helper ───
  private authorizeConversationAccess(
    conversation: any,
    userId: string,
    userRole: string,
  ) {
    if (userRole === 'ADMIN' || userRole === 'SUPPORT') return;

    if (userRole === 'CUSTOMER' && conversation.buyerId !== userId) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    // Shopkeeper access is checked via shop ownership in the controller
  }
}
