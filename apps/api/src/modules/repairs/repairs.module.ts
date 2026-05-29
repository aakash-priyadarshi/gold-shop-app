import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { SubscriptionPlansModule } from "../subscriptions/subscription-plans.module";
import { RepairsController } from "./repairs.controller";
import { RepairsService } from "./repairs.service";

@Module({
  imports: [PrismaModule, SubscriptionPlansModule],
  controllers: [RepairsController],
  providers: [RepairsService],
  exports: [RepairsService],
})
export class RepairsModule {}
