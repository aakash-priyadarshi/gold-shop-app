import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { SubscriptionPlansModule } from "../core/subscriptions/subscription-plans.module";
import { ShopPriceRebaseModule } from "../shops/shop-price-rebase.module";
import { AccountingModule } from "../accounting/accounting.module";
import { KarigarController } from "./karigar.controller";
import { KarigarService } from "./karigar.service";
import { WorkshopTraceableController } from "./workshop/workshop.controller";
import { WorkshopMetalJournalService } from "./workshop/workshop-metal-journal.service";
import { WorkshopScaleService } from "./workshop/workshop-scale.service";

@Module({
  imports: [
    PrismaModule,
    SubscriptionPlansModule,
    ShopPriceRebaseModule,
    AccountingModule,
  ],
  controllers: [KarigarController, WorkshopTraceableController],
  providers: [KarigarService, WorkshopMetalJournalService, WorkshopScaleService],
  exports: [KarigarService, WorkshopMetalJournalService, WorkshopScaleService],
})
export class KarigarModule {}
