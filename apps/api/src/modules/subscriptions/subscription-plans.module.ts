import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { PlanLimitsService } from "./plan-limits.service";
import { SellerSubscriptionsController } from "./seller-subscriptions.controller";
import { SellerSubscriptionsService } from "./seller-subscriptions.service";
import { SubscriptionPlansController } from "./subscription-plans.controller";
import { SubscriptionPlansService } from "./subscription-plans.service";

@Module({
  imports: [ConfigModule, PrismaModule, AuditModule],
  controllers: [SubscriptionPlansController, SellerSubscriptionsController],
  providers: [SubscriptionPlansService, SellerSubscriptionsService, PlanLimitsService],
  exports: [SubscriptionPlansService, SellerSubscriptionsService, PlanLimitsService],
})
export class SubscriptionPlansModule {}
