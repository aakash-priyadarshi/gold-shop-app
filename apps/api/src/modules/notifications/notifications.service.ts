import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { MailService } from '../mail/mail.service';
import { SmsService } from './sms.service';

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
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
    private mailService: MailService,
    private smsService: SmsService,
  ) {}

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

    // Out-of-app delivery (EMAIL, SMS) is handled by dispatchOutOfAppChannels
    // below. PUSH and WhatsApp are not yet implemented and are ignored if
    // present in `channels`.

    // For now, just log (debug-level so user metadata is not emitted in prod).
    this.logger.debug(
      `Notification created: ${dto.type} for user ${dto.userId} (channels: ${dto.channels.join(', ')})`,
    );

    // Real-time in-app delivery: push to the recipient's socket room so the
    // bell updates instantly instead of waiting for the polling interval.
    this.gateway.emitToUser(dto.userId, notification);

    // Out-of-app fan-out (email / SMS). IN_APP is considered delivered as
    // soon as the record exists + is emitted. Errors here never block the
    // in-app notification — they only affect deliveredVia bookkeeping.
    void this.dispatchOutOfAppChannels(notification.id, dto);

    return notification;
  }

  /**
   * Deliver a notification through its out-of-app channels (EMAIL, SMS) and
   * record which channels actually succeeded in `deliveredVia`. PUSH/WhatsApp
   * remain unimplemented and are skipped.
   */
  private async dispatchOutOfAppChannels(
    notificationId: string,
    dto: CreateNotificationDto,
  ): Promise<void> {
    const channels = dto.channels || [];
    const wantsEmail = channels.includes('EMAIL');
    const wantsSms = channels.includes('SMS');

    // IN_APP is always delivered at this point.
    const delivered: string[] = channels.includes('IN_APP') ? ['IN_APP'] : [];

    if (!wantsEmail && !wantsSms) {
      if (delivered.length) {
        await this.recordDelivered(notificationId, delivered);
      }
      return;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { email: true, phone: true, firstName: true },
      });

      if (!user) {
        await this.recordDelivered(notificationId, delivered);
        return;
      }

      const { title, body } = this.renderNotificationText(dto);

      const tasks: Promise<void>[] = [];

      if (wantsEmail && user.email) {
        tasks.push(
          this.mailService
            .sendHtml({
              to: user.email,
              subject: title,
              html: this.buildEmailHtml(user.firstName, title, body),
            })
            .then((res) => {
              if (res.success) delivered.push('EMAIL');
            })
            .catch((err) =>
              this.logger.error(`Notification email failed: ${err?.message || err}`),
            ),
        );
      }

      if (wantsSms && user.phone) {
        const smsBody = body ? `${title} — ${body}` : title;
        tasks.push(
          this.smsService
            .send(user.phone, smsBody.slice(0, 320))
            .then((res) => {
              if (res.success) delivered.push('SMS');
            })
            .catch((err) =>
              this.logger.error(`Notification SMS failed: ${err?.message || err}`),
            ),
        );
      }

      await Promise.allSettled(tasks);
      await this.recordDelivered(notificationId, delivered);
    } catch (err: any) {
      this.logger.error(
        `Out-of-app notification dispatch failed: ${err?.message || err}`,
      );
    }
  }

  private async recordDelivered(notificationId: string, delivered: string[]) {
    if (!delivered.length) return;
    try {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { deliveredVia: Array.from(new Set(delivered)) },
      });
    } catch (err: any) {
      this.logger.error(
        `Failed to record notification delivery channels: ${err?.message || err}`,
      );
    }
  }

  /**
   * Build a human-readable {title, body} from a notification's i18n keys and
   * params. Mirrors the frontend fallback logic so email/SMS read sensibly
   * without requiring a full server-side translation catalogue.
   */
  private renderNotificationText(dto: CreateNotificationDto): {
    title: string;
    body: string;
  } {
    const titleParams = (dto.titleParams || {}) as Record<string, unknown>;
    const bodyParams = (dto.bodyParams || {}) as Record<string, unknown>;
    const all = { ...titleParams, ...bodyParams } as Record<string, unknown>;

    const title =
      this.firstString(all.title, all.orderNumber && `Order #${all.orderNumber}`) ||
      this.humanizeKey(dto.titleKey) ||
      this.humanizeKey(dto.type);

    const body =
      this.firstString(all.message, all.reason, all.preview) ||
      this.humanizeKey(dto.bodyKey) ||
      '';

    return { title, body };
  }

  private firstString(...values: unknown[]): string | undefined {
    for (const v of values) {
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return undefined;
  }

  private humanizeKey(key?: string): string {
    if (!key) return '';
    return key
      .replace(/^notification\./i, '')
      .replace(/\.(title|body)$/i, '')
      .replace(/[_.]+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private buildEmailHtml(firstName: string, title: string, body: string): string {
    const safe = (s: string) =>
      String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    return `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #111827; margin-bottom: 8px;">${safe(title)}</h2>
        <p style="margin: 0 0 12px;">Hi ${safe(firstName) || 'there'},</p>
        ${body ? `<p style="margin: 0 0 16px; line-height: 1.5;">${safe(body)}</p>` : ''}
        <p style="margin: 24px 0 0; font-size: 12px; color: #6b7280;">
          You received this email because of activity on your Orivraa account.
        </p>
      </div>
    `;
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
