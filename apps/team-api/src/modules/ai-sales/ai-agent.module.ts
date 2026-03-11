import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../../prisma/prisma.module";
import { AIAgentService } from "./ai-agent.service";
import { AIAgentController } from "./ai-agent.controller";
import { ConversationBrainService } from "./services/conversation-brain.service";
import { GeminiStreamingClient } from "./services/gemini-streaming.service";
import { ThinkingBudgetManager } from "./services/thinking-budget-manager.service";
import { PreCallBrainService } from "./services/pre-call-brain.service";
import { ModelRouter } from "./services/model-router.service";
import { PostCallProcessor } from "./services/post-call-processor.service";
import { InworldTTSClient } from "./services/inworld-tts.service";
import { GeminiLiveClient } from "./services/gemini-live.service";
import { EmotionEngineService } from "./services/emotion-engine.service";
import { CallOrchestratorService } from "./services/call-orchestrator.service";
import { CampaignSchedulerService } from "./services/campaign-scheduler.service";
import { LeadScoringService } from "./services/lead-scoring.service";
import { AudioPipelineGateway } from "./gateways/audio-pipeline.gateway";
import { ChannelPreferenceManager } from "./messaging/channel-preference-manager";
import { MessagingTriggerDetector } from "./messaging/messaging-trigger-detector";
import { MessageBuilder } from "./messaging/message-builder";
import { InCallMessagingService } from "./messaging/in-call-messaging-service";

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [
    AIAgentService,
    ConversationBrainService,
    GeminiStreamingClient,
    ThinkingBudgetManager,
    PreCallBrainService,
    ModelRouter,
    PostCallProcessor,
    InworldTTSClient,
    GeminiLiveClient,
    EmotionEngineService,
    CallOrchestratorService,
    CampaignSchedulerService,
    LeadScoringService,
    AudioPipelineGateway,
    ChannelPreferenceManager,
    MessagingTriggerDetector,
    MessageBuilder,
    InCallMessagingService,
  ],
  controllers: [AIAgentController],
  exports: [AIAgentService, CallOrchestratorService],
})
export class AIAgentModule {}
