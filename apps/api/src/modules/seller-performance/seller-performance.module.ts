import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { SellerEngagementService } from "./seller-engagement.service";
import { SellerPerformanceController } from "./seller-performance.controller";
import { SellerPerformanceService } from "./seller-performance.service";

@Module({
  imports: [NotificationsModule],
  controllers: [SellerPerformanceController],
  providers: [SellerPerformanceService, SellerEngagementService],
  exports: [SellerPerformanceService, SellerEngagementService],
})
export class SellerPerformanceModule {}
