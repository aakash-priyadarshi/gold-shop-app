import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { PaymentGatewayController } from "./payment-gateway.controller";
import { PaymentGatewayService } from "./payment-gateway.service";

@Module({
  imports: [ConfigModule, PrismaModule, AuditModule],
  controllers: [PaymentGatewayController],
  providers: [PaymentGatewayService],
  exports: [PaymentGatewayService],
})
export class PaymentGatewayModule {}
