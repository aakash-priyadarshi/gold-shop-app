import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "../../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { JobsService } from "./jobs.service";
import { BookingExpiryProcessor } from "./processors/booking-expiry.processor";
import { CommissionCheckProcessor } from "./processors/commission-check.processor";
import { PosExpiryProcessor } from "./processors/pos-expiry.processor";
import { RfqExpiryProcessor } from "./processors/rfq-expiry.processor";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue(
      { name: "booking-expiry" },
      { name: "rfq-expiry" },
      { name: "notifications" },
      { name: "pos-expiry" },
    ),
    NotificationsModule,
    PrismaModule,
  ],
  providers: [
    JobsService,
    BookingExpiryProcessor,
    RfqExpiryProcessor,
    CommissionCheckProcessor,
    PosExpiryProcessor,
  ],
  exports: [JobsService, CommissionCheckProcessor],
})
export class JobsModule {}
