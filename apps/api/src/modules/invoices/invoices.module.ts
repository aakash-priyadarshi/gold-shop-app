import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AccountingModule } from "../accounting/accounting.module";
import { SubscriptionPlansModule } from "../core/subscriptions/subscription-plans.module";
import { PricingModule } from "../core/pricing/pricing.module";
import { InvoicesController, InvoicesPublicController } from "./invoices.controller";
import { InvoicesService } from "./invoices.service";
import { SaleBuilderService } from "./sale-builder.service";
import { StockCommitService } from "./stock-commit.service";

@Module({
  imports: [
    PrismaModule,
    AccountingModule,
    SubscriptionPlansModule,
    PricingModule,
  ],
  controllers: [InvoicesController, InvoicesPublicController],
  providers: [InvoicesService, SaleBuilderService, StockCommitService],
  exports: [InvoicesService, SaleBuilderService, StockCommitService],
})
export class InvoicesModule {}
