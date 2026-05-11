import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateNotificationDto {
  userId: string;
  type: string;
  titleKey: string;
  titleParams?: Record<string, unknown>;
  bodyKey: string;
  bodyParams?: Record<string, unknown>;
  referenceType?: string;
  referenceId?: string;
  channels: string[];
}

export type NotificationTestScenario =
  | 'admin_ai_escalation'
  | 'admin_policy_alert'
  | 'shop_new_message'
  | 'shop_new_order'
  | 'shop_payment_received'
  | 'shop_rfq_received'
  | 'shop_ticket_message';

const TEST_SCENARIOS: Record<
  NotificationTestScenario,
  {
    label: string;
    description: string;
    targetRole: 'ADMIN' | 'SHOPKEEPER';
    notification: Omit<CreateNotificationDto, 'userId'>;
  }
> = {
  admin_ai_escalation: {
    label: 'AI chat needs human follow-up',
    description: 'Admin alert when the AI assistant escalates a visitor/shopkeeper conversation.',
    targetRole: 'ADMIN',
    notification: {
      type: 'SYSTEM_ALERT',
      titleKey: 'notification.admin.ai_escalation.title',
      titleParams: { title: 'AI chat needs follow-up' },
      bodyKey: 'notification.admin.ai_escalation.body',
      bodyParams: {
        message: 'A visitor asked for human support after discussing pricing and setup.',
      },
      referenceType: 'AI_CHAT',
      referenceId: 'test-ai-session',
      channels: ['IN_APP'],
    },
  },
  admin_policy_alert: {
    label: 'Chat policy alert',
    description: 'Admin alert for contact-sharing or unsafe chat behaviour.',
    targetRole: 'ADMIN',
    notification: {
      type: 'SYSTEM_ALERT',
      titleKey: 'notification.admin.policy_alert.title',
      titleParams: { title: 'Chat policy review needed' },
      bodyKey: 'notification.admin.policy_alert.body',
      bodyParams: {
        message: 'A user triggered a second chat-policy warning and needs review.',
      },
      referenceType: 'User',
      referenceId: 'test-user',
      channels: ['IN_APP'],
    },
  },
  shop_new_message: {
    label: 'New customer message',
    description: 'Shopkeeper notification for an incoming buyer/support message.',
    targetRole: 'SHOPKEEPER',
    notification: {
      type: 'NEW_MESSAGE',
      titleKey: 'notification.message.new.title',
      titleParams: { senderName: 'Test Customer' },
      bodyKey: 'notification.message.new.body',
      bodyParams: { preview: 'Can you share the final price for this necklace?' },
      referenceType: 'CONVERSATION',
      referenceId: 'test-conversation',
      channels: ['IN_APP'],
    },
  },
  shop_new_order: {
    label: 'New order placed',
    description: 'Shopkeeper notification for a newly placed order.',
    targetRole: 'SHOPKEEPER',
    notification: {
      type: 'ORDER_PLACED',
      titleKey: 'notification.order.new.title',
      titleParams: { orderNumber: 'TEST-1001' },
      bodyKey: 'notification.order.new.body',
      bodyParams: { orderNumber: 'TEST-1001', itemName: '22K Gold Ring', total: 29999 },
      referenceType: 'ORDER',
      referenceId: 'test-order',
      channels: ['IN_APP'],
    },
  },
  shop_payment_received: {
    label: 'Payment received',
    description: 'Shopkeeper notification for booking/order payment confirmation.',
    targetRole: 'SHOPKEEPER',
    notification: {
      type: 'PAYMENT_RECEIVED',
      titleKey: 'notification.payment.received.title',
      titleParams: { amount: 9999 },
      bodyKey: 'notification.payment.received.body',
      bodyParams: { amount: 9999, orderNumber: 'TEST-1001' },
      referenceType: 'PAYMENT',
      referenceId: 'test-payment',
      channels: ['IN_APP'],
    },
  },
  shop_rfq_received: {
    label: 'New RFQ received',
    description: 'Shopkeeper notification for a customer quote request.',
    targetRole: 'SHOPKEEPER',
    notification: {
      type: 'RFQ_RECEIVED',
      titleKey: 'notification.rfq.received.title',
      titleParams: { customerName: 'Test Customer' },
      bodyKey: 'notification.rfq.received.body',
      bodyParams: { customerName: 'Test Customer', rfqNumber: 'RFQ-TEST' },
      referenceType: 'RFQ',
      referenceId: 'test-rfq',
      channels: ['IN_APP'],
    },
  },
  shop_ticket_message: {
    label: 'Support ticket reply',
    description: 'Shopkeeper notification when support/admin replies to a ticket.',
    targetRole: 'SHOPKEEPER',
    notification: {
      type: 'TICKET_MESSAGE',
      titleKey: 'notification.ticket.message.title',
      titleParams: { ticketNumber: 'TKT-TEST' },
      bodyKey: 'notification.ticket.message.body',
      bodyParams: { ticketNumber: 'TKT-TEST', message: 'Support replied to your ticket.' },
      referenceType: 'TICKET',
      referenceId: 'test-ticket',
      channels: ['IN_APP'],
    },
  },
};

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  getTestScenarios() {
    return Object.entries(TEST_SCENARIOS).map(([id, scenario]) => ({
      id,
      label: scenario.label,
      description: scenario.description,
      targetRole: scenario.targetRole,
      type: scenario.notification.type,
    }));
  }

  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type as NotificationType,
        titleKey: dto.titleKey,
        titleParams: dto.titleParams ? JSON.parse(JSON.stringify(dto.titleParams)) : undefined,
        bodyKey: dto.bodyKey,
        bodyParams: dto.bodyParams ? JSON.parse(JSON.stringify(dto.bodyParams)) : undefined,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        channels: dto.channels,
        deliveredVia: [],
      },
    });

    // TODO: Integrate with actual notification providers
    // - Email: SendGrid, AWS SES, etc.
    // - SMS: Twilio, local SMS gateway
    // - Push: Firebase Cloud Messaging
    // - WhatsApp: WhatsApp Business API

    // For now, just log
    console.log(`Notification created: ${dto.type} for user ${dto.userId}`);
    console.log(`Title: ${dto.titleKey}, Body: ${dto.bodyKey}`);
    console.log(`Channels: ${dto.channels.join(', ')}`);

    return notification;
  }

  async findAllForUser(userId: string, unreadOnly = false) {
    // Hard guard: a missing userId would cause Prisma to ignore the filter
    // and return every notification in the database (Prisma treats undefined as no-filter).
    if (!userId) return [];

    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly === true && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async deleteForUser(notificationId: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  }

  async notifyAdmins(dto: Omit<CreateNotificationDto, 'userId'>) {
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN, status: { not: UserStatus.DEACTIVATED } },
      select: { id: true },
    });

    return Promise.all(admins.map((admin) => this.create({ ...dto, userId: admin.id })));
  }

  async createTestNotification(
    requesterId: string,
    scenarioId: NotificationTestScenario,
    targetRole?: 'ADMIN' | 'SHOPKEEPER',
  ) {
    const scenario = TEST_SCENARIOS[scenarioId];
    if (!scenario) {
      throw new BadRequestException('Unknown notification test scenario');
    }

    const resolvedRole = targetRole ?? scenario.targetRole;
    const recipient = await this.resolveTestRecipient(requesterId, resolvedRole);
    const notification = await this.create({
      ...scenario.notification,
      userId: recipient.id,
      titleParams: {
        ...scenario.notification.titleParams,
        testMode: true,
      },
      bodyParams: {
        ...scenario.notification.bodyParams,
        testMode: true,
      },
    });

    return {
      notification,
      scenario: {
        id: scenarioId,
        label: scenario.label,
        targetRole: resolvedRole,
      },
      recipient,
    };
  }

  private async resolveTestRecipient(requesterId: string, targetRole: 'ADMIN' | 'SHOPKEEPER') {
    if (targetRole === 'ADMIN') {
      const admin = await this.prisma.user.findUnique({
        where: { id: requesterId },
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      });

      if (!admin || admin.role !== UserRole.ADMIN) {
        throw new NotFoundException('Admin test recipient not found');
      }

      return admin;
    }

    const shopkeeper = await this.prisma.user.findFirst({
      where: { role: UserRole.SHOPKEEPER, status: { not: UserStatus.DEACTIVATED } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    if (!shopkeeper) {
      throw new NotFoundException('No active shopkeeper user found for test notification');
    }

    return shopkeeper;
  }
}
