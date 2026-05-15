import { Module } from "@nestjs/common";
import { RedisModule } from "../../common/redis";
import { PrismaModule } from "../../prisma/prisma.module";
import { TranslationController } from "./translation.controller";
import { TranslationService } from "./translation.service";

@Module({
  imports: [RedisModule, PrismaModule],
  controllers: [TranslationController],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationModule {}
