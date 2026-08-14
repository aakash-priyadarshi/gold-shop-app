import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { SubscriptionPlansModule } from "../core/subscriptions/subscription-plans.module";
import { ShopPriceRebaseModule } from "../shops/shop-price-rebase.module";
import { CatalogueController } from "./catalogue.controller";
import { CataloguePublicController } from "./catalogue.public.controller";
import { CatalogueService } from "./catalogue.service";

@Module({
  imports: [AuditModule, SubscriptionPlansModule, ShopPriceRebaseModule],
  controllers: [CatalogueController, CataloguePublicController],
  providers: [CatalogueService],
  exports: [CatalogueService],
})
export class CatalogueModule {}
