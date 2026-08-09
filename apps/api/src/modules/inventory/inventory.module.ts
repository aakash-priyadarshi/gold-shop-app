import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { SubscriptionPlansModule } from "../core/subscriptions/subscription-plans.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import {
  InventorySetsService,
  InventoryLocationTransferService,
} from "./inventory-sets.service";
import { StorageLocationsService } from "./storage-locations.service";

@Module({
  imports: [PrismaModule, SubscriptionPlansModule],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventorySetsService,
    InventoryLocationTransferService,
    StorageLocationsService,
  ],
  exports: [InventoryService, InventorySetsService, StorageLocationsService],
})
export class InventoryModule {}
