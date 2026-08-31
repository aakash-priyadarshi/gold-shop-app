import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { CrashReportAlertsService } from "./crash-report-alerts.service";
import { CrashReportsController } from "./crash-reports.controller";
import { CrashReportsService } from "./crash-reports.service";

@Module({
  imports: [PrismaModule],
  controllers: [CrashReportsController],
  providers: [CrashReportsService, CrashReportAlertsService],
  exports: [CrashReportsService],
})
export class CrashReportsModule {}
