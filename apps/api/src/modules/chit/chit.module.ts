import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { ChitController } from "./chit.controller";
import { ChitService } from "./chit.service";

@Module({
  imports: [PrismaModule],
  controllers: [ChitController],
  providers: [ChitService],
  exports: [ChitService],
})
export class ChitModule {}
