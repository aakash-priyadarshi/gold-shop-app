import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../../prisma/prisma.module";
import { AiCreditsModule } from "../ai-credits/ai-credits.module";
import { AuditModule } from "../audit/audit.module";
import { OrdersModule } from "../orders/orders.module";
import { PaymentGatewayController } from "./payment-gateway.controller";
import { PaymentGatewayService } from "./payment-gateway.service";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuditModule,
    forwardRef(() => OrdersModule),
    forwardRef(() => AiCreditsModule),
  ],
  controllers: [PaymentGatewayController],
  providers: [PaymentGatewayService],
  exports: [PaymentGatewayService],
})
export class PaymentGatewayModule {}
