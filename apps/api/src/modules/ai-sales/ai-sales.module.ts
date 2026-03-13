import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import {
  AiSalesCallsController,
  AiSalesEmailController,
  AiSalesEmailWebhookController,
  AiSalesLeadsController,
  AiSalesMeetController,
  AiSalesVoicesController,
} from "./ai-sales.controller";
import { AiSalesService } from "./ai-sales.service";

@Module({
  imports: [PrismaModule],
  controllers: [
    AiSalesLeadsController,
    AiSalesCallsController,
    AiSalesVoicesController,
    AiSalesEmailController,
    AiSalesEmailWebhookController,
    AiSalesMeetController,
  ],
  providers: [AiSalesService],
  exports: [AiSalesService],
})
export class AiSalesModule {}
