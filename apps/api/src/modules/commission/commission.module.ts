import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommissionController } from './commission.controller';
import { CommissionService } from './commission.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';

@Module({
  imports: [ConfigModule, PrismaModule, SubscriptionPlansModule],
  controllers: [CommissionController],
  providers: [CommissionService],
  exports: [CommissionService],
})
export class CommissionModule {}
