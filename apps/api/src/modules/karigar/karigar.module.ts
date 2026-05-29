import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { SubscriptionPlansModule } from "../subscriptions/subscription-plans.module";
import { KarigarController } from "./karigar.controller";
import { KarigarService } from "./karigar.service";

@Module({
  imports: [PrismaModule, SubscriptionPlansModule],
  controllers: [KarigarController],
  providers: [KarigarService],
  exports: [KarigarService],
})
export class KarigarModule {}
