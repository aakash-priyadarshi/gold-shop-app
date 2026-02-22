import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';

@Module({
  imports: [PrismaModule, SubscriptionPlansModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
