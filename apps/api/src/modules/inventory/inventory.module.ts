import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../../prisma/prisma.module";
import { MarketRatesModule } from "../core/market-rates/market-rates.module";
import { SubscriptionPlansModule } from "../core/subscriptions/subscription-plans.module";
import { AiCreditsModule } from "../core/ai-credits/ai-credits.module";
import { ShopPriceRebaseModule } from "../shops/shop-price-rebase.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import {
  InventorySetsService,
  InventoryLocationTransferService,
} from "./inventory-sets.service";
import { StorageLocationsService } from "./storage-locations.service";
import { StockAuditService } from "./stock-audit.service";
import { ProductDescriptionService } from "./product-description.service";
import { ImageEnhancementService } from "./image-enhancement.service";
import { ImageWorkerUploadService } from "../media/image-worker-upload.service";

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    MarketRatesModule,
    SubscriptionPlansModule,
    AiCreditsModule,
    ShopPriceRebaseModule,
  ],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventorySetsService,
    InventoryLocationTransferService,
    StorageLocationsService,
    StockAuditService,
    ProductDescriptionService,
    ImageEnhancementService,
    ImageWorkerUploadService,
  ],
  exports: [InventoryService, InventorySetsService, StorageLocationsService, StockAuditService],
})
export class InventoryModule {}
