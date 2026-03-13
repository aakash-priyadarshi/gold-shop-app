import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../../prisma/prisma.module";
import { AIAgentController } from "./ai-agent.controller";
import { AIAgentService } from "./ai-agent.service";
import { AudioPipelineGateway } from "./gateways/audio-pipeline.gateway";
import { ChannelPreferenceManager } from "./messaging/channel-preference-manager";
import { InCallMessagingService } from "./messaging/in-call-messaging-service";
import { MessageBuilder } from "./messaging/message-builder";
import { MessagingTriggerDetector } from "./messaging/messaging-trigger-detector";
import { ABTestingService } from "./services/ab-testing.service";
import { AgentMemoryService } from "./services/agent-memory.service";
import { AgentVoiceService } from "./services/agent-voice.service";
import { BehaviorInsightService } from "./services/behavior-insight.service";
import { CallOrchestratorService } from "./services/call-orchestrator.service";
import { CallRecordingService } from "./services/call-recording.service";
import { CallSchedulerDaemonService } from "./services/call-scheduler-daemon.service";
import { CampaignSchedulerService } from "./services/campaign-scheduler.service";
import { CentralBrainService } from "./services/central-brain.service";
import { ConversationBrainService } from "./services/conversation-brain.service";
import { EmotionEngineService } from "./services/emotion-engine.service";
import { FollowUpSequencerService } from "./services/follow-up-sequencer.service";
import { GeminiLiveClient } from "./services/gemini-live.service";
import { GeminiStreamingClient } from "./services/gemini-streaming.service";
import { GoogleMeetBotService } from "./services/google-meet-bot.service";
import { GoogleSTTClient } from "./services/google-stt.service";
import { InworldTTSClient } from "./services/inworld-tts.service";
import { LeadScoringService } from "./services/lead-scoring.service";
import { ModelRouter } from "./services/model-router.service";
import { ObjectionPlaybookService } from "./services/objection-playbook.service";
import { PostCallProcessor } from "./services/post-call-processor.service";
import { PreCallBrainService } from "./services/pre-call-brain.service";
import { SarvamSTTClient } from "./services/sarvam-stt.service";
import { STTRouterService } from "./services/stt-router.service";
import { ThinkingBudgetManager } from "./services/thinking-budget-manager.service";
import { WebhookService } from "./services/webhook.service";

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
    CallSchedulerDaemonService,
    CampaignSchedulerService,
    LeadScoringService,
    AudioPipelineGateway,
    ChannelPreferenceManager,
    MessagingTriggerDetector,
    MessageBuilder,
    InCallMessagingService,
    AgentMemoryService,
    BehaviorInsightService,
    AgentVoiceService,
    SarvamSTTClient,
    STTRouterService,
    GoogleSTTClient,
    CentralBrainService,
    ABTestingService,
    FollowUpSequencerService,
    ObjectionPlaybookService,
    WebhookService,
    CallRecordingService,
    GoogleMeetBotService,
    LeadInteractionService,
    AiEmailService,
  ],
  controllers: [AIAgentController],
  exports: [AIAgentService, CallOrchestratorService, CentralBrainService, WebhookService, LeadInteractionService, AiEmailService],
})
export class AIAgentModule {}
