import { Module } from "@nestjs/common";
import { FxRatesModule } from "../fx-rates/fx-rates.module";
import { AccountingController } from "./accounting.controller";
import { AccountingService } from "./accounting.service";

@Module({
  imports: [FxRatesModule],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
