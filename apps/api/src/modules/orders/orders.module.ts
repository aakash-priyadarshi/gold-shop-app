import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { MarketplaceIntelligenceModule } from "../marketplace-intelligence/marketplace-intelligence.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PaymentGatewayModule } from "../payment-gateway/payment-gateway.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { StateMachineService } from "./state-machine.service";

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    MarketplaceIntelligenceModule,
    forwardRef(() => PaymentGatewayModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, StateMachineService],
  exports: [OrdersService, StateMachineService],
})
export class OrdersModule {}
