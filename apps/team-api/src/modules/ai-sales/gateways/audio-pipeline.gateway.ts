import { Logger } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server } from "ws";
import { ConfigService } from "@nestjs/config";
import { ConversationBrainService, ConversationContext } from "../services/conversation-brain.service";
import { EmotionEngineService } from "../services/emotion-engine.service";
import { CallOrchestratorService } from "../services/call-orchestrator.service";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * Audio Pipeline Gateway — handles Twilio Media Streams via WebSocket.
 *
 * Flow:
 * 1. Twilio connects via WebSocket when call is answered
 * 2. Audio chunks streamed from Twilio → Deepgram STT
 * 3. Transcribed text → ConversationBrain (Claude) for response
 * 4. Response text → ElevenLabs TTS → audio back to Twilio
 *
 * Cost optimization:
 * - Deepgram Nova-2: ~$0.0043/min (cheapest production STT)
 * - ElevenLabs: Pre-recorded fillers (one-time cost) + streaming TTS
 * - Claude claude-sonnet-4-20250514: ~$3/$15 per 1M tokens (cheapest smart LLM)
 * - Sentence-level streaming to reduce perceived latency
 */
@WebSocketGateway({ path: "/ai-sales-audio" })
export class AudioPipelineGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AudioPipelineGateway.name);
  private activeSessions: Map<string, ActiveCallSession> = new Map();

  constructor(
    private config: ConfigService,
    private brain: ConversationBrainService,
    private emotion: EmotionEngineService,
    private callOrchestrator: CallOrchestratorService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: any) {
    this.logger.log("WebSocket connection established");
  }

  async handleDisconnect(client: any) {
    const session = this.findSessionByClient(client);
    if (session) {
      this.logger.log(`Call ended for session ${session.sessionId}`);
      await this.finalizeCall(session);
      this.activeSessions.delete(session.sessionId);
    }
  }

  /** Handle incoming WebSocket messages from Twilio */
  async handleMessage(client: any, rawData: any) {
    try {
      const msg = JSON.parse(typeof rawData === "string" ? rawData : rawData.toString());

      switch (msg.event) {
        case "connected":
          this.logger.log("Twilio media stream connected");
          break;

        case "start":
          await this.handleStreamStart(client, msg);
          break;

        case "media":
          await this.handleMediaChunk(client, msg);
          break;

        case "stop":
          this.logger.log(`Twilio media stream stopped: ${msg.streamSid}`);
          break;

        default:
          break;
      }
    } catch (err: any) {
      this.logger.error(`WebSocket message error: ${err.message}`);
    }
  }

  /** Initialize session when Twilio starts streaming */
  private async handleStreamStart(client: any, msg: any) {
    const sessionId = msg.start?.customParameters?.sessionId;
    if (!sessionId) {
      this.logger.error("No sessionId in stream start");
      return;
    }

    // Load call session with agent + lead data
    const callSession = await this.prisma.callSession.findUnique({
      where: { id: sessionId },
      include: {
        agent: { include: { scripts: { take: 1 } } },
        lead: true,
      },
    });

    if (!callSession) {
      this.logger.error(`Call session ${sessionId} not found`);
      return;
    }

    // Build conversation context from DB data
    const context: ConversationContext = {
      agentName: callSession.agent?.name ?? "Sales Agent",
      agentPersonality: callSession.agent?.personality || undefined,
      language: callSession.agent?.language || "en",
      greeting: callSession.agent?.greeting || undefined,
      leadName: callSession.lead?.name || undefined,
      leadCompany: callSession.lead?.company || undefined,
      leadRole: callSession.lead?.role || undefined,
      leadTemperature: callSession.lead?.temperature || "cold",
      conversationHistory: [],
      currentPhase: "WARM_OPEN",
    };

    const session: ActiveCallSession = {
      sessionId,
      client,
      streamSid: msg.start.streamSid,
      context,
      transcript: [],
      startTime: Date.now(),
      sttBuffer: "",
      tokenCount: { input: 0, output: 0 },
    };

    this.activeSessions.set(sessionId, session);
    this.logger.log(`Audio session started for call ${sessionId}`);

    // Send initial greeting via TTS
    if (context.greeting) {
      await this.synthesizeAndSend(session, context.greeting);
      session.transcript.push({ role: "assistant", content: context.greeting, timestamp: Date.now() });
      session.context.conversationHistory.push({ role: "assistant", content: context.greeting });
    }
  }

  /** Process incoming audio chunk — forward to Deepgram STT */
  private async handleMediaChunk(client: any, msg: any) {
    const session = this.findSessionByClient(client);
    if (!session) return;

    // Audio payload is base64-encoded mulaw/8000
    const audioPayload = msg.media.payload;

    // In production: stream to Deepgram for real-time transcription
    // For now, buffer and process when we detect silence (simplified approach)
    session.sttBuffer += audioPayload;

    // Batch process every ~2 seconds of audio (16000 bytes at 8kHz mulaw)
    if (session.sttBuffer.length > 16000) {
      await this.processAudioBuffer(session);
    }
  }

  /**
   * Process buffered audio through STT → Brain → TTS pipeline.
   * In production, this would use Deepgram's streaming WebSocket API
   * for lower latency. This simplified version uses REST as fallback.
   */
  private async processAudioBuffer(session: ActiveCallSession) {
    const audioData = session.sttBuffer;
    session.sttBuffer = "";

    const deepgramKey = this.config.get("DEEPGRAM_API_KEY");
    if (!deepgramKey) {
      // Dev mode: simulate transcription
      return;
    }

    try {
      // Use Deepgram Nova-2 for STT ($0.0043/min)
      const { createClient: createDeepgramClient } = await import("@deepgram/sdk") as any;
      const deepgram = createDeepgramClient(deepgramKey);

      const audioBuffer = Buffer.from(audioData, "base64");
      const { result } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
        model: "nova-2",
        language: session.context.language || "en",
        smart_format: true,
        encoding: "mulaw",
        sample_rate: 8000,
      });

      const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
      if (!transcript || transcript.trim().length === 0) return;

      // Record user utterance
      session.transcript.push({ role: "user", content: transcript, timestamp: Date.now() });
      session.context.conversationHistory.push({ role: "user", content: transcript });

      // Detect emotion from transcript (free — no API call)
      const emotionState = this.emotion.detectFromTranscript(transcript, session.sessionId);
      session.context.emotionState = emotionState.primary;

      // Update call phase
      const durationSec = (Date.now() - session.startTime) / 1000;
      session.context.currentPhase = await this.brain.detectCallPhase(
        session.context.conversationHistory,
        durationSec,
      );

      // Check if we need human escalation
      if (this.emotion.needsEscalation(session.sessionId)) {
        await this.synthesizeAndSend(session,
          "I understand your frustration, and I want to make sure you get the help you need. Let me connect you with a team member who can better assist you.");
        return;
      }

      // Get AI response (streamed for lower latency)
      let responseText = "";
      const adaptation = this.emotion.getAdaptation(emotionState);

      for await (const chunk of this.brain.streamResponse(session.context)) {
        responseText += chunk;
        // Send sentence-by-sentence for lower perceived latency
        if (chunk.includes(".") || chunk.includes("?") || chunk.includes("!")) {
          await this.synthesizeAndSend(session, responseText.trim());
          session.transcript.push({ role: "assistant", content: responseText.trim(), timestamp: Date.now() });
          session.context.conversationHistory.push({ role: "assistant", content: responseText.trim() });
          responseText = "";
        }
      }

      // Send any remaining text
      if (responseText.trim()) {
        await this.synthesizeAndSend(session, responseText.trim());
        session.transcript.push({ role: "assistant", content: responseText.trim(), timestamp: Date.now() });
        session.context.conversationHistory.push({ role: "assistant", content: responseText.trim() });
      }
    } catch (err: any) {
      this.logger.error(`Audio processing error: ${err.message}`);
    }
  }

  /** Synthesize text to speech and send audio back to Twilio */
  private async synthesizeAndSend(session: ActiveCallSession, text: string) {
    const elevenLabsKey = this.config.get("ELEVENLABS_API_KEY");
    const voiceId = this.config.get("ELEVENLABS_VOICE_ID") || "21m00Tcm4TlvDq8ikWAM"; // Rachel default

    if (!elevenLabsKey) {
      this.logger.debug(`[TTS stub] ${text}`);
      return;
    }

    try {
      // ElevenLabs streaming TTS
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`,
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenLabsKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_turbo_v2_5",
            output_format: "ulaw_8000",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: false,
            },
          }),
        },
      );

      if (!response.ok || !response.body) {
        this.logger.error(`ElevenLabs TTS failed: ${response.status}`);
        return;
      }

      // Stream audio chunks back to Twilio
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const base64Audio = Buffer.from(value).toString("base64");
        const mediaMsg = JSON.stringify({
          event: "media",
          streamSid: session.streamSid,
          media: { payload: base64Audio },
        });

        if (session.client.readyState === 1) {
          session.client.send(mediaMsg);
        }
      }
    } catch (err: any) {
      this.logger.error(`TTS error: ${err.message}`);
    }
  }

  /** Finalize call: save transcript, emotion arc, generate summary */
  private async finalizeCall(session: ActiveCallSession) {
    try {
      const emotionArc = this.emotion.getEmotionArc(session.sessionId);

      // Generate call summary via Claude
      const fullTranscript = session.transcript
        .map((t) => `${t.role === "user" ? "Customer" : "Agent"}: ${t.content}`)
        .join("\n");

      let summary: any = null;
      try {
        summary = await this.brain.generateCallSummary(fullTranscript);
      } catch {
        // Summary generation is optional
      }

      const durationSec = Math.round((Date.now() - session.startTime) / 1000);

      // Save to database
      await this.callOrchestrator.endCall(session.sessionId, {
        transcript: fullTranscript,
        summary: typeof summary === "string" ? summary : JSON.stringify(summary),
        emotionArc: emotionArc.map((e) => ({
          emotion: e.primary,
          intensity: e.intensity,
          timestamp: e.detectedAt,
        })),
        objectionsEncountered: this.extractObjections(session.transcript),
        buyingSignals: this.extractBuyingSignals(session.transcript),
        keyTopics: this.extractKeyTopics(session.transcript),
        callPhaseReached: session.context.currentPhase,
        followUpNeeded: this.emotion.isReadyToClose(session.sessionId) || emotionArc.some((e) => e.primary === "buying"),
      });

      // Cleanup
      this.emotion.clearCallHistory(session.sessionId);
    } catch (err: any) {
      this.logger.error(`Call finalization error: ${err.message}`);
    }
  }

  private findSessionByClient(client: any): ActiveCallSession | undefined {
    for (const session of this.activeSessions.values()) {
      if (session.client === client) return session;
    }
    return undefined;
  }

  private extractObjections(transcript: TranscriptEntry[]): string[] {
    const objectionPatterns = [
      /too expensive|too much|can't afford|not in.*budget/i,
      /not the right time|too busy|maybe later/i,
      /already using|happy with current/i,
      /need to think|not sure|need to discuss/i,
      /don't trust|never heard of/i,
    ];
    const objections: string[] = [];
    for (const entry of transcript) {
      if (entry.role !== "user") continue;
      for (const pattern of objectionPatterns) {
        if (pattern.test(entry.content)) {
          objections.push(entry.content.substring(0, 100));
          break;
        }
      }
    }
    return objections;
  }

  private extractBuyingSignals(transcript: TranscriptEntry[]): string[] {
    const signalPatterns = [
      /how much|what.*cost|pricing/i,
      /how.*get started|sign up|next step/i,
      /send.*info|email.*details/i,
      /sounds good|interested|tell me more/i,
      /demo|trial|test/i,
    ];
    const signals: string[] = [];
    for (const entry of transcript) {
      if (entry.role !== "user") continue;
      for (const pattern of signalPatterns) {
        if (pattern.test(entry.content)) {
          signals.push(entry.content.substring(0, 100));
          break;
        }
      }
    }
    return signals;
  }

  private extractKeyTopics(transcript: TranscriptEntry[]): string[] {
    // Simple keyword extraction - in production, use Claude for this
    const topics = new Set<string>();
    const topicKeywords: Record<string, RegExp> = {
      pricing: /pric|cost|budget|expensive|afford/i,
      features: /feature|capabilit|function|can it|does it/i,
      timeline: /when|timeline|deadline|schedule|urgency/i,
      competition: /competitor|alternative|comparison|other option/i,
      integration: /integrat|connect|api|compatible|work with/i,
      support: /support|help|service|maintenance/i,
      security: /security|safe|protect|complian|gdpr/i,
    };

    for (const entry of transcript) {
      for (const [topic, pattern] of Object.entries(topicKeywords)) {
        if (pattern.test(entry.content)) topics.add(topic);
      }
    }
    return Array.from(topics);
  }
}

interface ActiveCallSession {
  sessionId: string;
  client: any;
  streamSid: string;
  context: ConversationContext;
  transcript: TranscriptEntry[];
  startTime: number;
  sttBuffer: string;
  tokenCount: { input: number; output: number };
}

interface TranscriptEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}
