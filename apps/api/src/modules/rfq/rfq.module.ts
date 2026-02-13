import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ShopsModule } from "../shops/shops.module";
import { RfqController } from "./rfq.controller";
import { RfqService } from "./rfq.service";

@Module({
  imports: [ShopsModule, NotificationsModule, AuditModule],
  controllers: [RfqController],
  providers: [RfqService],
  exports: [RfqService],
})
export class RfqModule {}
