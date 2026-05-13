import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { RedisModule } from "../../common/redis";
import { TranslationController } from "./translation.controller";
import { TranslationService } from "./translation.service";

@Module({
  imports: [RedisModule, PrismaModule],
  controllers: [TranslationController],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationModule {}
