import { Module } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { RefundsController } from './refunds.controller';
import { RefundEligibilityService } from './refund-eligibility.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [RefundsController],
  providers: [RefundsService, RefundEligibilityService],
  exports: [RefundsService, RefundEligibilityService],
})
export class RefundsModule {}
