import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { SubscriptionPlansModule } from "../subscriptions/subscription-plans.module";
import { SavingsController } from "./savings.controller";
import { SavingsService } from "./savings.service";

@Module({
  imports: [PrismaModule, SubscriptionPlansModule],
  controllers: [SavingsController],
  providers: [SavingsService],
  exports: [SavingsService],
})
export class SavingsModule {}
