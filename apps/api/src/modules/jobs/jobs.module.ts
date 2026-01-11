import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { BookingExpiryProcessor } from './processors/booking-expiry.processor';
import { RfqExpiryProcessor } from './processors/rfq-expiry.processor';
import { CommissionCheckProcessor } from './processors/commission-check.processor';
import { JobsService } from './jobs.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue(
      { name: 'booking-expiry' },
      { name: 'rfq-expiry' },
      { name: 'notifications' },
    ),
    NotificationsModule,
    PrismaModule,
  ],
  providers: [
    JobsService,
    BookingExpiryProcessor,
    RfqExpiryProcessor,
    CommissionCheckProcessor,
  ],
  exports: [JobsService, CommissionCheckProcessor],
})
export class JobsModule {}
