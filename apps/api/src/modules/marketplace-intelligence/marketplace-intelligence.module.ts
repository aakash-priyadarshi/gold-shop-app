import { Module, OnModuleInit } from "@nestjs/common";
import { RedisModule } from "../../common/redis";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { AiRfqBuilderService } from "./ai-rfq-builder.service";
import { MarketplaceIntelligenceController } from "./marketplace-intelligence.controller";
import { MarketplaceIntelligenceService } from "./marketplace-intelligence.service";

@Module({
  imports: [NotificationsModule, RedisModule],
  controllers: [MarketplaceIntelligenceController],
  providers: [
    PrismaService,
    MarketplaceIntelligenceService,
    AiRfqBuilderService,
  ],
  exports: [MarketplaceIntelligenceService, AiRfqBuilderService],
})
export class MarketplaceIntelligenceModule implements OnModuleInit {
  constructor(private intelligenceService: MarketplaceIntelligenceService) {}

  async onModuleInit() {
    // Initialize AI phase milestones on startup (idempotent)
    // Wrapped in try-catch so the app still starts if migration hasn't been applied yet
    try {
      await this.intelligenceService.initializeMilestones();
    } catch (err) {
      console.warn(
        "MarketplaceIntelligence: Could not initialize milestones — migration may not be applied yet.",
        err?.message,
      );
    }
  }
}
