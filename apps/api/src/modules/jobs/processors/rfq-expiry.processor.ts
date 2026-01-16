import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Processor('rfq-expiry')
export class RfqExpiryProcessor {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  @Process('expire-rfq')
  async handleRfqExpiry(job: Job<{ rfqId: string }>) {
    const { rfqId } = job.data;

    const rfq = await this.prisma.rfqRequest.findUnique({
      where: { id: rfqId },
      include: { customer: true, offers: true },
    });

    if (!rfq) {
      console.log(`RFQ ${rfqId} not found`);
      return;
    }

    // Don't expire if already in final state
    if (['CONFIRMED', 'EXPIRED', 'CANCELLED'].includes(rfq.status)) {
      return;
    }

    // Expire the RFQ
    await this.prisma.rfqRequest.update({
      where: { id: rfqId },
      data: { status: 'EXPIRED' },
    });

    // Expire all pending offers
    await this.prisma.rfqOffer.updateMany({
      where: {
        rfqId,
        status: { in: ['PENDING', 'ACCEPTED', 'COUNTERED'] },
      },
      data: { status: 'EXPIRED' },
    });

    // Notify customer (only if not a walk-in RFQ)
    if (rfq.customerId) {
      await this.notificationsService.create({
        userId: rfq.customerId,
        type: 'SYSTEM_ALERT',
        titleKey: 'notification.rfqExpired.title',
        bodyKey: 'notification.rfqExpired.body',
        referenceType: 'RFQ',
        referenceId: rfqId,
        channels: ['EMAIL', 'PUSH'],
      });
    }

    console.log(`RFQ ${rfqId} expired`);
    return { success: true };
  }
}
