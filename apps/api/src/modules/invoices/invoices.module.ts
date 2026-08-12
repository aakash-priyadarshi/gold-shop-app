import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AccountingModule } from "../accounting/accounting.module";
import { SubscriptionPlansModule } from "../core/subscriptions/subscription-plans.module";
import { PricingModule } from "../core/pricing/pricing.module";
import { NotificationsModule } from "../notifications/notifications.module";
import {
  InvoicesController,
  InvoicesPublicController,
} from "./invoices.controller";
import { InvoicePdfService } from "./invoice-pdf.service";
import { InvoicesService } from "./invoices.service";
import { SaleBuilderService } from "./sale-builder.service";
import { StockCommitService } from "./stock-commit.service";

@Module({
  imports: [
    PrismaModule,
    AccountingModule,
    SubscriptionPlansModule,
    PricingModule,
    NotificationsModule,
  ],
  controllers: [InvoicesController, InvoicesPublicController],
  providers: [
    InvoicesService,
    InvoicePdfService,
    SaleBuilderService,
    StockCommitService,
  ],
  exports: [
    InvoicesService,
    InvoicePdfService,
    SaleBuilderService,
    StockCommitService,
  ],
})
export class InvoicesModule {}
