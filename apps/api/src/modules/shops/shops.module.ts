import { Module } from "@nestjs/common";
import { RedisModule } from "../../common";
import { AuditModule } from "../audit/audit.module";
import { SubscriptionPlansModule } from "../subscriptions/subscription-plans.module";
import { ContentModerationService } from "./content-moderation.service";
import { ShopsController } from "./shops.controller";
import { ShopsService } from "./shops.service";

@Module({
  imports: [AuditModule, RedisModule, SubscriptionPlansModule],
  controllers: [ShopsController],
  providers: [ShopsService, ContentModerationService],
  exports: [ShopsService, ContentModerationService],
})
export class ShopsModule {}
