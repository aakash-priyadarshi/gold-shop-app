import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { RecoveryOffersController } from "./recovery-offers.controller";
import { RecoveryOffersService } from "./recovery-offers.service";

@Module({
  imports: [PrismaModule],
  controllers: [RecoveryOffersController],
  providers: [RecoveryOffersService],
  exports: [RecoveryOffersService],
})
export class RecoveryOffersModule {}
