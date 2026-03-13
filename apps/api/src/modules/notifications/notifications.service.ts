import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { MailService } from '../mail/mail.service';

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

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

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

    const deliveredVia: string[] = [];

    // Deliver via email when EMAIL channel is requested
    if (dto.channels.includes('EMAIL')) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: dto.userId },
          select: { email: true, firstName: true },
        });

        if (user?.email) {
          const subject = this.resolveText(dto.titleKey, dto.titleParams);
          const body = this.resolveText(dto.bodyKey, dto.bodyParams);

          const result = await this.mailService.send({
            to: user.email,
            subject,
            template: 'notification',
            context: {
              name: user.firstName || 'User',
              title: subject,
              message: body,
              type: dto.type,
            },
          });

          if (result.success) {
            deliveredVia.push('EMAIL');
            this.logger.log(`Email notification delivered to ${user.email} — ${dto.type}`);
          } else {
            this.logger.warn(`Email notification failed for ${user.email}: ${result.error}`);
          }
        }
      } catch (err: any) {
        this.logger.error(`Email notification error for user ${dto.userId}: ${err.message}`);
      }
    }

    // Update deliveredVia if any channel succeeded
    if (deliveredVia.length > 0) {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { deliveredVia },
      });
    }

    return notification;
  }

  /** Resolve a localisation key by substituting params */
  private resolveText(key: string, params?: Record<string, unknown>): string {
    if (!params) return key;
    const entries = Object.entries(params);
    if (entries.length === 0) return key;
    return entries.reduce(
      (text, [k, v]) => text.split(`{${k}}`).join(String(v)),
      key,
    );
  }

  async findAllForUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
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
}
