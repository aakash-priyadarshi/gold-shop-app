import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../../prisma/prisma.module";
import {
  PublicTaxShareController,
  TaxReportsController,
} from "./tax-reports.controller";
import { TaxReportsService } from "./tax-reports.service";

@Module({
  imports: [PrismaModule, ConfigModule, JwtModule.register({})],
  controllers: [TaxReportsController, PublicTaxShareController],
  providers: [TaxReportsService],
  exports: [TaxReportsService],
})
export class TaxReportsModule {}
