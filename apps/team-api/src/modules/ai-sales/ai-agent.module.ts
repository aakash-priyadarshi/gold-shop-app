import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../../prisma/prisma.module";
import { AIAgentService } from "./ai-agent.service";
import { AIAgentController } from "./ai-agent.controller";
import { ConversationBrainService } from "./services/conversation-brain.service";
import { EmotionEngineService } from "./services/emotion-engine.service";
import { CallOrchestratorService } from "./services/call-orchestrator.service";
import { CampaignSchedulerService } from "./services/campaign-scheduler.service";
import { LeadScoringService } from "./services/lead-scoring.service";
import { AudioPipelineGateway } from "./gateways/audio-pipeline.gateway";

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [
    AIAgentService,
    ConversationBrainService,
    EmotionEngineService,
    CallOrchestratorService,
    CampaignSchedulerService,
    LeadScoringService,
    AudioPipelineGateway,
  ],
  controllers: [AIAgentController],
  exports: [AIAgentService, CallOrchestratorService],
})
export class AIAgentModule {}
