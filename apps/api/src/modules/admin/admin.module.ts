import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { SellerPerformanceModule } from "../seller-performance/seller-performance.module";
import { AdminController } from "./admin.controller";

@Module({
  imports: [NotificationsModule, SellerPerformanceModule],
  controllers: [AdminController],
  providers: [PrismaService],
})
export class AdminModule {}
