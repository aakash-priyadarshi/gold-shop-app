import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { EnterpriseModule } from "../enterprise/enterprise.module";
import { InventoryModule } from "../inventory/inventory.module";
import { OrdersModule } from "../orders/orders.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { SellerAiApiKeyGuard } from "./seller-ai-api-key.guard";
import { SellerAiController } from "./seller-ai.controller";
import { SellerAiService } from "./seller-ai.service";

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    EnterpriseModule,
    InventoryModule,
    OrdersModule,
  ],
  controllers: [SellerAiController],
  providers: [SellerAiApiKeyGuard, SellerAiService],
})
export class SellerAiModule {}
