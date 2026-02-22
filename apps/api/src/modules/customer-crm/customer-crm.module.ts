import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { SubscriptionPlansModule } from "../subscriptions/subscription-plans.module";
import { CustomerCrmController } from "./customer-crm.controller";
import { CustomerCrmService } from "./customer-crm.service";

@Module({
  imports: [PrismaModule, SubscriptionPlansModule],
  controllers: [CustomerCrmController],
  providers: [CustomerCrmService],
  exports: [CustomerCrmService],
})
export class CustomerCrmModule {}
