import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { SubscriptionPlansModule } from "../core/subscriptions/subscription-plans.module";
import { ShopPriceRebaseModule } from "../shops/shop-price-rebase.module";
import { KarigarController } from "./karigar.controller";
import { KarigarService } from "./karigar.service";

@Module({
  imports: [PrismaModule, SubscriptionPlansModule, ShopPriceRebaseModule],
  controllers: [KarigarController],
  providers: [KarigarService],
  exports: [KarigarService],
})
export class KarigarModule {}
