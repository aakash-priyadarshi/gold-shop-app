import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { BranchController } from "./controllers/branch.controller";
import { StaffController } from "./controllers/staff.controller";
import { ApiKeyController } from "./controllers/api-key.controller";
import { WebhookController } from "./controllers/webhook.controller";
import { WhiteLabelController } from "./controllers/white-label.controller";
import { ReportsController } from "./controllers/reports.controller";
import { BulkImportController } from "./controllers/bulk-import.controller";
import { ForecastController } from "./controllers/forecast.controller";
import { RepricingController } from "./controllers/repricing.controller";
import { BranchService } from "./services/branch.service";
import { StaffService } from "./services/staff.service";
import { ApiKeyService } from "./services/api-key.service";
import { WebhookService } from "./services/webhook.service";
import { WhiteLabelService } from "./services/white-label.service";
import { ReportsService } from "./services/reports.service";
import { BulkImportService } from "./services/bulk-import.service";
import { ForecastService } from "./services/forecast.service";
import { RepricingService } from "./services/repricing.service";
import { EnterpriseGuard } from "./guards/enterprise.guard";

@Module({
  imports: [ConfigModule, PrismaModule, AuditModule],
  controllers: [
    BranchController,
    StaffController,
    ApiKeyController,
    WebhookController,
    WhiteLabelController,
    ReportsController,
    BulkImportController,
    ForecastController,
    RepricingController,
  ],
  providers: [
    BranchService,
    StaffService,
    ApiKeyService,
    WebhookService,
    WhiteLabelService,
    ReportsService,
    BulkImportService,
    ForecastService,
    RepricingService,
    EnterpriseGuard,
  ],
  exports: [
    BranchService,
    StaffService,
    ApiKeyService,
    WebhookService,
    WhiteLabelService,
    ReportsService,
    BulkImportService,
    ForecastService,
    RepricingService,
  ],
})
export class EnterpriseModule {}
