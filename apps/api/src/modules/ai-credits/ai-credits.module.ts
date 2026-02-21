import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AiCreditsService } from "./ai-credits.service";
import { AiCreditsController } from "./ai-credits.controller";
import { PrismaModule } from "../../prisma/prisma.module";
import { RedisModule } from "../../common/redis";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [ConfigModule, PrismaModule, RedisModule, AuditModule],
  controllers: [AiCreditsController],
  providers: [AiCreditsService],
  exports: [AiCreditsService],
})
export class AiCreditsModule {}
