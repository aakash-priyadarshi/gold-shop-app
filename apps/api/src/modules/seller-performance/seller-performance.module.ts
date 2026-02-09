import { Module } from "@nestjs/common";
import { SellerPerformanceController } from "./seller-performance.controller";
import { SellerPerformanceService } from "./seller-performance.service";

@Module({
  controllers: [SellerPerformanceController],
  providers: [SellerPerformanceService],
  exports: [SellerPerformanceService],
})
export class SellerPerformanceModule {}
