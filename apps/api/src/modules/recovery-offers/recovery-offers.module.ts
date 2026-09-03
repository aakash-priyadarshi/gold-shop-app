import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { PrismaModule } from "../../prisma/prisma.module";
import { RecoveryOffersController } from "./recovery-offers.controller";
import { RecoveryOffersService } from "./recovery-offers.service";
import { RecoveryOfferProcessor } from "./recovery-offer.processor";
import { RecoveryOffersWebhookController } from "./recovery-offers.webhook.controller";
import { RECOVERY_OFFERS_QUEUE } from "./recovery-offers.service";
import { FestivalCalendarService } from "./festival-calendar.service";

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: RECOVERY_OFFERS_QUEUE }),
  ],
  controllers: [RecoveryOffersController, RecoveryOffersWebhookController],
  providers: [
    RecoveryOffersService,
    RecoveryOfferProcessor,
    FestivalCalendarService,
  ],
  exports: [RecoveryOffersService],
})
export class RecoveryOffersModule {}
