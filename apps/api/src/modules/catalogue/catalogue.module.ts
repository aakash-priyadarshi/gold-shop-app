import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { SubscriptionPlansModule } from "../subscriptions/subscription-plans.module";
import { CatalogueController } from "./catalogue.controller";
import { CataloguePublicController } from "./catalogue.public.controller";
import { CatalogueService } from "./catalogue.service";

@Module({
  imports: [AuditModule, SubscriptionPlansModule],
  controllers: [CatalogueController, CataloguePublicController],
  providers: [CatalogueService],
  exports: [CatalogueService],
})
export class CatalogueModule {}
