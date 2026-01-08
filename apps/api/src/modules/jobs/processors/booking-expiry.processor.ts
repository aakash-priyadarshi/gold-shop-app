import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Processor('booking-expiry')
export class BookingExpiryProcessor {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Expire booking if payment not received within 24 hours
   */
  @Process('expire-booking')
  async handleBookingExpiry(job: Job<{ orderId: string }>) {
    const { orderId } = job.data;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, shop: true },
    });

    if (!order) {
      console.log(`Order ${orderId} not found, skipping expiry`);
      return;
    }

    // Check if payment was made
    if (order.paymentStatus === 'COMPLETED' || order.paymentStatus === 'PARTIAL') {
      console.log(`Order ${orderId} already has payment, skipping expiry`);
      return;
    }

    // Expire the order
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'EXPIRED' },
    });

    // If this was from an RFQ, update the RFQ and offer
    if (order.rfqOfferId) {
      await this.prisma.rfqRequest.updateMany({
        where: {
          selectedOfferId: order.rfqOfferId,
        },
        data: { status: 'EXPIRED' },
      });

      await this.prisma.rfqOffer.update({
        where: { id: order.rfqOfferId },
        data: { status: 'EXPIRED' },
      });
    }

    // Notify customer
    await this.notificationsService.create({
      userId: order.customerId,
      type: 'BOOKING_EXPIRED',
      titleKey: 'notification.bookingExpired.title',
      bodyKey: 'notification.bookingExpired.body',
      bodyParams: {
        orderNumber: order.orderNumber,
      },
      referenceType: 'ORDER',
      referenceId: orderId,
      channels: ['EMAIL', 'PUSH', 'SMS'],
    });

    // Notify shop
    await this.notificationsService.create({
      userId: order.shop.userId,
      type: 'BOOKING_EXPIRED',
      titleKey: 'notification.bookingExpiredShop.title',
      bodyKey: 'notification.bookingExpiredShop.body',
      bodyParams: {
        orderNumber: order.orderNumber,
      },
      referenceType: 'ORDER',
      referenceId: orderId,
      channels: ['EMAIL', 'PUSH'],
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        actorType: 'SYSTEM',
        action: 'EXPIRE',
        resourceType: 'ORDER',
        resourceId: orderId,
        metadata: { reason: 'Payment not received within 24 hours' },
      },
    });

    console.log(`Order ${orderId} expired due to non-payment`);
    return { success: true, orderId };
  }

  /**
   * Send booking reminder
   */
  @Process('booking-reminder')
  async handleBookingReminder(job: Job<{ orderId: string; minutesRemaining: number }>) {
    const { orderId, minutesRemaining } = job.data;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) return;

    // Don't send reminder if already paid
    if (order.paymentStatus === 'COMPLETED' || order.paymentStatus === 'PARTIAL') {
      return;
    }

    // Don't send reminder if already expired
    if (order.status === 'EXPIRED') {
      return;
    }

    // Send reminder notification
    await this.notificationsService.create({
      userId: order.customerId,
      type: 'BOOKING_REMINDER',
      titleKey: 'notification.bookingReminder.title',
      bodyKey: 'notification.bookingReminder.body',
      bodyParams: {
        orderNumber: order.orderNumber,
        minutesRemaining,
        bookingFee: order.bookingFeePaidNpr || order.balanceDueNpr * 0.2,
      },
      referenceType: 'ORDER',
      referenceId: orderId,
      channels: ['PUSH', 'SMS'],
    });

    console.log(`Booking reminder sent for order ${orderId}`);
    return { success: true };
  }
}
