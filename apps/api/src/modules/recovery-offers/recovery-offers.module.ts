import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { PrismaModule } from "../../prisma/prisma.module";
import { RecoveryOffersController } from "./recovery-offers.controller";
import { RecoveryOffersService } from "./recovery-offers.service";
import { RecoveryOfferProcessor } from "./recovery-offer.processor";
import { RECOVERY_OFFERS_QUEUE } from "./recovery-offers.service";

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: RECOVERY_OFFERS_QUEUE }),
  ],
  controllers: [RecoveryOffersController],
  providers: [RecoveryOffersService, RecoveryOfferProcessor],
  exports: [RecoveryOffersService],
})
export class RecoveryOffersModule {}
