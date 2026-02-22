import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SubscriptionPlansModule } from "../subscriptions/subscription-plans.module";
import { DescriptionGeneratorService } from "./description-generator.service";
import { DesignsController } from "./designs.controller";
import { DesignsService } from "./designs.service";
import { ImageGenerationService } from "./image-generation.service";

@Module({
  imports: [AuditModule, NotificationsModule, ConfigModule, SubscriptionPlansModule],
  controllers: [DesignsController],
  providers: [
    DesignsService,
    ImageGenerationService,
    DescriptionGeneratorService,
  ],
  exports: [
    DesignsService,
    ImageGenerationService,
    DescriptionGeneratorService,
  ],
})
export class DesignsModule {}
