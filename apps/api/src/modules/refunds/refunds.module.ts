import { Module } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { RefundsController } from './refunds.controller';
import { RefundEligibilityService } from './refund-eligibility.service';

@Module({
  controllers: [RefundsController],
  providers: [RefundsService, RefundEligibilityService],
  exports: [RefundsService, RefundEligibilityService],
})
export class RefundsModule {}
