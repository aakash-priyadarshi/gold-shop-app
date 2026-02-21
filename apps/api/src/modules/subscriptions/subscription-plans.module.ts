import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SubscriptionPlansController } from "./subscription-plans.controller";
import { SubscriptionPlansService } from "./subscription-plans.service";
import { SellerSubscriptionsController } from "./seller-subscriptions.controller";
import { SellerSubscriptionsService } from "./seller-subscriptions.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [ConfigModule, PrismaModule, AuditModule],
  controllers: [SubscriptionPlansController, SellerSubscriptionsController],
  providers: [SubscriptionPlansService, SellerSubscriptionsService],
  exports: [SubscriptionPlansService, SellerSubscriptionsService],
})
export class SubscriptionPlansModule {}
