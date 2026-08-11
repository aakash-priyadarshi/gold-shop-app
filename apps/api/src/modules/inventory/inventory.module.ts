import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { MarketRatesModule } from "../core/market-rates/market-rates.module";
import { SubscriptionPlansModule } from "../core/subscriptions/subscription-plans.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import {
  InventorySetsService,
  InventoryLocationTransferService,
} from "./inventory-sets.service";
import { StorageLocationsService } from "./storage-locations.service";
import { StockAuditService } from "./stock-audit.service";

@Module({
  imports: [PrismaModule, MarketRatesModule, SubscriptionPlansModule],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventorySetsService,
    InventoryLocationTransferService,
    StorageLocationsService,
    StockAuditService,
  ],
  exports: [InventoryService, InventorySetsService, StorageLocationsService, StockAuditService],
})
export class InventoryModule {}
