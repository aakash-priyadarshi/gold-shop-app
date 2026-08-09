import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AccountingModule } from "../accounting/accounting.module";
import { SubscriptionPlansModule } from "../core/subscriptions/subscription-plans.module";
import { PricingModule } from "../core/pricing/pricing.module";
import { InvoicesController, InvoicesPublicController } from "./invoices.controller";
import { InvoicesService } from "./invoices.service";

@Module({
  imports: [
    PrismaModule,
    AccountingModule,
    SubscriptionPlansModule,
    PricingModule,
  ],
  controllers: [InvoicesController, InvoicesPublicController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
