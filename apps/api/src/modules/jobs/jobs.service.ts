import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue('booking-expiry') private bookingExpiryQueue: Queue,
    @InjectQueue('rfq-expiry') private rfqExpiryQueue: Queue,
  ) {}

  /**
   * Schedule a booking expiry job (24 hours)
   */
  async scheduleBookingExpiry(orderId: string, expiresAt: Date) {
    const delay = expiresAt.getTime() - Date.now();
    
    if (delay > 0) {
      await this.bookingExpiryQueue.add(
        'expire-booking',
        { orderId },
        {
          delay,
          jobId: `booking-expiry-${orderId}`,
          removeOnComplete: true,
        },
      );

      // Also schedule reminder at 1 hour before
      const reminderDelay = delay - (60 * 60 * 1000);
      if (reminderDelay > 0) {
        await this.bookingExpiryQueue.add(
          'booking-reminder',
          { orderId, minutesRemaining: 60 },
          {
            delay: reminderDelay,
            jobId: `booking-reminder-${orderId}`,
            removeOnComplete: true,
          },
        );
      }
    }
  }

  /**
   * Cancel a scheduled booking expiry
   */
  async cancelBookingExpiry(orderId: string) {
    const job = await this.bookingExpiryQueue.getJob(`booking-expiry-${orderId}`);
    if (job) {
      await job.remove();
    }

    const reminderJob = await this.bookingExpiryQueue.getJob(`booking-reminder-${orderId}`);
    if (reminderJob) {
      await reminderJob.remove();
    }
  }

  /**
   * Schedule RFQ expiry
   */
  async scheduleRfqExpiry(rfqId: string, expiresAt: Date) {
    const delay = expiresAt.getTime() - Date.now();
    
    if (delay > 0) {
      await this.rfqExpiryQueue.add(
        'expire-rfq',
        { rfqId },
        {
          delay,
          jobId: `rfq-expiry-${rfqId}`,
          removeOnComplete: true,
        },
      );
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName: string, jobId: string) {
    let queue: Queue;
    
    switch (queueName) {
      case 'booking-expiry':
        queue = this.bookingExpiryQueue;
        break;
      case 'rfq-expiry':
        queue = this.rfqExpiryQueue;
        break;
      default:
        return null;
    }

    const job = await queue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress(),
      data: job.data,
    };
  }
}
