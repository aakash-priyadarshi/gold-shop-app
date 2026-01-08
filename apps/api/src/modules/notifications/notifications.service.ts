import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

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
  constructor(private prisma: PrismaService) {}

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
