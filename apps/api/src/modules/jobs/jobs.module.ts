import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BookingExpiryProcessor } from './processors/booking-expiry.processor';
import { RfqExpiryProcessor } from './processors/rfq-expiry.processor';
import { JobsService } from './jobs.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'booking-expiry' },
      { name: 'rfq-expiry' },
      { name: 'notifications' },
    ),
    NotificationsModule,
  ],
  providers: [
    JobsService,
    BookingExpiryProcessor,
    RfqExpiryProcessor,
  ],
  exports: [JobsService],
})
export class JobsModule {}
