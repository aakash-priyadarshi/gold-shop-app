import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { SubscriptionPlansModule } from "../core/subscriptions/subscription-plans.module";
import { ShopPriceRebaseModule } from "../shops/shop-price-rebase.module";
import { AccountingModule } from "../accounting/accounting.module";
import { KarigarController } from "./karigar.controller";
import { KarigarService } from "./karigar.service";
import { WorkshopTraceableController } from "./workshop/workshop.controller";
import { WorkshopMetalJournalService } from "./workshop/workshop-metal-journal.service";
import { WorkshopScaleService } from "./workshop/workshop-scale.service";
import { WorkshopPermissionGuard } from "./workshop/workshop-permission.guard";
import { WorkshopCutoverService } from "./workshop/workshop-cutover.service";
import { WorkshopCatalogService } from "./workshop/workshop-catalog.service";
import { WorkshopCatalogController } from "./workshop/workshop-catalog.controller";
import { WorkshopMovementService } from "./workshop/workshop-movement.service";
import { WorkshopMovementController } from "./workshop/workshop-movement.controller";
import { WorkshopProductionService } from "./workshop/workshop-production.service";
import { WorkshopProductionController } from "./workshop/workshop-production.controller";
import { WorkshopTransferService } from "./workshop/workshop-transfer.service";
import { WorkshopTransferController } from "./workshop/workshop-transfer.controller";
import { WorkshopRecoveryService } from "./workshop/workshop-recovery.service";
import { WorkshopRecoveryController } from "./workshop/workshop-recovery.controller";
import { WorkshopControlService } from "./workshop/workshop-control.service";
import { WorkshopControlController } from "./workshop/workshop-control.controller";
import { WorkshopReportService } from "./workshop/workshop-report.service";
import { WorkshopReportController } from "./workshop/workshop-report.controller";
import { WorkshopAssignmentsController } from "./workshop/workshop-assignments.controller";

@Module({
  imports: [
    PrismaModule,
    SubscriptionPlansModule,
    ShopPriceRebaseModule,
    AccountingModule,
  ],
  controllers: [KarigarController, WorkshopTraceableController, WorkshopCatalogController, WorkshopMovementController, WorkshopProductionController, WorkshopTransferController, WorkshopRecoveryController, WorkshopControlController, WorkshopReportController, WorkshopAssignmentsController],
  providers: [KarigarService, WorkshopMetalJournalService, WorkshopScaleService, WorkshopCutoverService, WorkshopCatalogService, WorkshopMovementService, WorkshopProductionService, WorkshopTransferService, WorkshopRecoveryService, WorkshopControlService, WorkshopReportService, WorkshopPermissionGuard],
  exports: [KarigarService, WorkshopMetalJournalService, WorkshopScaleService],
})
export class KarigarModule {}
