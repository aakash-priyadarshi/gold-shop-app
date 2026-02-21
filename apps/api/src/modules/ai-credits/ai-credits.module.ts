import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RedisModule } from "../../common/redis";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { AiCreditsController } from "./ai-credits.controller";
import { AiCreditsService } from "./ai-credits.service";

@Module({
  imports: [ConfigModule, PrismaModule, RedisModule, AuditModule],
  controllers: [AiCreditsController],
  providers: [AiCreditsService],
  exports: [AiCreditsService],
})
export class AiCreditsModule {}
