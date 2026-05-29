import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { SubscriptionPlansModule } from "../subscriptions/subscription-plans.module";
import { GoldLoansController } from "./gold-loans.controller";
import { GoldLoansService } from "./gold-loans.service";

@Module({
  imports: [PrismaModule, SubscriptionPlansModule],
  controllers: [GoldLoansController],
  providers: [GoldLoansService],
  exports: [GoldLoansService],
})
export class GoldLoansModule {}
