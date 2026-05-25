import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { SellerPerformanceModule } from "../seller-performance/seller-performance.module";
import { AdminController } from "./admin.controller";
import { SeoAuditController } from "./seo-audit.controller";
import { SeoAuditService } from "./seo-audit.service";

@Module({
  imports: [NotificationsModule, SellerPerformanceModule],
  controllers: [AdminController, SeoAuditController],
  providers: [PrismaService, SeoAuditService],
})
export class AdminModule {}
