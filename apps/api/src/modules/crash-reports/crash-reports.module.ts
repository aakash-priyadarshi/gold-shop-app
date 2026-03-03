import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { CrashReportsController } from "./crash-reports.controller";
import { CrashReportsService } from "./crash-reports.service";

@Module({
  imports: [PrismaModule],
  controllers: [CrashReportsController],
  providers: [CrashReportsService],
  exports: [CrashReportsService],
})
export class CrashReportsModule {}
