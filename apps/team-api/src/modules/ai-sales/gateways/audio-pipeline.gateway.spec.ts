import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";
import { AgentMemoryService } from "../services/agent-memory.service";
import { AgentVoiceService } from "../services/agent-voice.service";
import { CallOrchestratorService } from "../services/call-orchestrator.service";
import { ConversationBrainService } from "../services/conversation-brain.service";
import { EmotionEngineService } from "../services/emotion-engine.service";
import { GeminiLiveClient } from "../services/gemini-live.service";
import { GeminiStreamingClient } from "../services/gemini-streaming.service";
import { InworldTTSClient } from "../services/inworld-tts.service";
import { ModelRouter } from "../services/model-router.service";
import { PostCallProcessor } from "../services/post-call-processor.service";
import { PreCallBrainService } from "../services/pre-call-brain.service";
import { STTRouterService } from "../services/stt-router.service";
import { ThinkingBudgetManager } from "../services/thinking-budget-manager.service";
import { InCallMessagingService } from "../messaging/in-call-messaging-service";
import { MessagingTriggerDetector } from "../messaging/messaging-trigger-detector";
import { AudioPipelineGateway } from "./audio-pipeline.gateway";

function buildGateway(): AudioPipelineGateway {
  return new AudioPipelineGateway(
    { get: jest.fn() } as unknown as ConfigService,
    {} as ConversationBrainService,
    {} as GeminiStreamingClient,
    {} as ThinkingBudgetManager,
    {} as PreCallBrainService,
    {} as ModelRouter,
    {} as PostCallProcessor,
    {} as InworldTTSClient,
    { isEnabled: jest.fn().mockReturnValue(false) } as unknown as GeminiLiveClient,
    {} as EmotionEngineService,
    {} as CallOrchestratorService,
    {} as PrismaService,
    {} as InCallMessagingService,
    {} as MessagingTriggerDetector,
    {} as STTRouterService,
    { get: jest.fn() } as unknown as AgentMemoryService,
    {} as AgentVoiceService,
  );
}

describe("AudioPipelineGateway", () => {
  it("stripStageDirections removes spoken stage directions", () => {
    const gateway = buildGateway() as any;

    expect(gateway.stripStageDirections("Hello [softly] (pauses) *waits patiently* there")).toBe("Hello there");
  });

  it("isRepetitiveHallucination detects repeated phrases but not normal speech", () => {
    const gateway = buildGateway() as any;

    expect(gateway.isRepetitiveHallucination("hello hello hello hello hello hello hello hello")).toBe(true);
    expect(gateway.isRepetitiveHallucination("I understand your concern and I can help with pricing options today")).toBe(false);
  });

  it("hasVoiceActivity separates mu-law silence from strong speech-like audio", () => {
    const gateway = buildGateway() as any;

    expect(gateway.hasVoiceActivity(Buffer.alloc(160, 0xff))).toBe(false);
    expect(gateway.hasVoiceActivity(Buffer.alloc(160, 0x00))).toBe(true);
  });

  it("sendClear interrupts buffered playback and resets speaking state", () => {
    const gateway = buildGateway() as any;
    const send = jest.fn();
    const session = {
      client: { readyState: 1, send },
      streamSid: "stream-1",
      isSpeaking: true,
    };

    gateway.sendClear(session);

    expect(send).toHaveBeenCalledWith(JSON.stringify({ event: "clear", streamSid: "stream-1" }));
    expect(session.isSpeaking).toBe(false);
  });
});