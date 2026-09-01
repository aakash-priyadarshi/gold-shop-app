import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { PlatformConfigModule } from "../platform-config/platform-config.module";
import { SellerPerformanceModule } from "../core/seller-performance/seller-performance.module";
import { AdminController } from "./admin.controller";
import { SeoAuditController } from "./seo-audit.controller";
import { SeoAuditService } from "./seo-audit.service";

@Module({
  imports: [NotificationsModule, PlatformConfigModule, SellerPerformanceModule],
  controllers: [AdminController, SeoAuditController],
  providers: [PrismaService, SeoAuditService],
})
export class AdminModule {}
