import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { SubscriptionPlansModule } from "../subscriptions/subscription-plans.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({
  imports: [PrismaModule, SubscriptionPlansModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
