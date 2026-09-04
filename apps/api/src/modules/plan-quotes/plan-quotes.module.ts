import { Module } from "@nestjs/common";
import { PlanQuotesController } from "./plan-quotes.controller";
import { PlanQuotesService } from "./plan-quotes.service";

@Module({
  controllers: [PlanQuotesController],
  providers: [PlanQuotesService],
  exports: [PlanQuotesService],
})
export class PlanQuotesModule {}
