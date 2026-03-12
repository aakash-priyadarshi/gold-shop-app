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
import { GeminiStreamingClient } from "../services/gemini-streaming.service";
import { ThinkingBudgetManager } from "../services/thinking-budget-manager.service";
import { PreCallBrainService } from "../services/pre-call-brain.service";
import { ModelRouter } from "../services/model-router.service";
import { PostCallProcessor } from "../services/post-call-processor.service";
import { InworldTTSClient } from "../services/inworld-tts.service";
import { GeminiLiveClient } from "../services/gemini-live.service";
import { EmotionEngineService } from "../services/emotion-engine.service";
import { CallOrchestratorService } from "../services/call-orchestrator.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { InCallMessagingService } from "../messaging/in-call-messaging-service";
import { MessagingTriggerDetector } from "../messaging/messaging-trigger-detector";
import { STTRouterService } from "../services/stt-router.service";
import { AgentMemoryService } from "../services/agent-memory.service";
import { AgentVoiceService } from "../services/agent-voice.service";

/**
 * Audio Pipeline Gateway — handles Twilio Media Streams via WebSocket.
 *
 * Multi-LLM Architecture:
 * - PreCallBrain (Claude Sonnet): generates strategic brief BEFORE call
 * - GeminiStreaming (Flash-Lite): handles 99% of live conversation turns
 * - ModelRouter: escalates ~1% high-value closes to Claude Sonnet
 * - ThinkingBudget: adjusts Gemini reasoning depth per turn (0–8000)
 * - PostCallProcessor (Flash-Lite): generates call report AFTER call
 *
 * Audio modes (AUDIO_MODE env):
 * - "deepgram" (default): Twilio → Deepgram STT → LLM text → TTS → Twilio
 * - "gemini_live": Twilio → Gemini Live API → Twilio (native audio-to-audio)
 *
 * TTS providers (TTS_PROVIDER env):
 * - "elevenlabs" (default): ElevenLabs streaming TTS
 * - "inworld": Inworld TTS (A/B benchmarking)
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
    private gemini: GeminiStreamingClient,
    private thinkingBudget: ThinkingBudgetManager,
    private preCallBrain: PreCallBrainService,
    private modelRouter: ModelRouter,
    private postCallProcessor: PostCallProcessor,
    private inworldTTS: InworldTTSClient,
    private geminiLive: GeminiLiveClient,
    private emotion: EmotionEngineService,
    private callOrchestrator: CallOrchestratorService,
    private prisma: PrismaService,
    private messagingService: InCallMessagingService,
    private triggerDetector: MessagingTriggerDetector,
    private sttRouter: STTRouterService,
    private memory: AgentMemoryService,
    private voiceService: AgentVoiceService,
  ) {}

  async handleConnection(client: any) {
    this.logger.log("WebSocket connection established");

    // Manually wire message handling — NestJS WsAdapter doesn't auto-route
    // raw WebSocket messages to handleMessage without @SubscribeMessage decorators,
    // and Twilio's message format doesn't match NestJS's expected {event, data} shape.
    client.on("message", (data: any) => this.handleMessage(client, data));
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
      agentPersonality: callSession.agent?.personalityDescription || undefined,
      language: callSession.agent?.languages?.[0]?.split("-")[0] || "en",
      greeting: callSession.agent?.greeting || undefined,
      leadName: callSession.lead?.name || undefined,
      leadCompany: callSession.lead?.company || undefined,
      leadRole: callSession.lead?.role || undefined,
      leadTemperature: callSession.lead?.temperature || "cold",
      conversationHistory: [],
      currentPhase: "WARM_OPEN",
    };

    // Generate pre-call brief via Claude Sonnet (strategic thinking BEFORE call)
    let systemPrompt: string;
    try {
      const brief = await this.preCallBrain.generateBrief(
        {
          name: callSession.lead?.name || undefined,
          company: callSession.lead?.company || undefined,
          role: callSession.lead?.role || undefined,
          temperature: callSession.lead?.temperature || "cold",
          notes: (callSession.lead as any)?.notes || undefined,
        },
        {
          name: callSession.agent?.name || undefined,
          description: context.productDescription,
          benefits: context.productBenefits,
          pricing: context.productPricing,
        },
      );

      systemPrompt = this.preCallBrain.buildGeminiSystemPrompt(
        brief,
        { description: context.productDescription, benefits: context.productBenefits, pricing: context.productPricing },
        context.culturalContext,
      );

      // Prime Gemini with the strategic brief
      this.gemini.primeWithBrief(JSON.stringify(brief));
    } catch (err: any) {
      this.logger.warn(`Pre-call brief failed, using default prompt: ${err.message}`);
      systemPrompt = this.brain.buildSystemPrompt(context);
    }

    // Inject voice identity into system prompt
    const voices = this.voiceService.getAllVoices();
    if (voices.length > 0) {
      const defaultVoice = this.voiceService.getDefaultVoice();
      const voiceList = voices.map((v) => `- ${v.name} (${v.gender || "neutral"}, ${v.accent || "neutral"}, speaks ${v.languages.join(", ")})`).join("\n");
      systemPrompt += `\n\n## YOUR VOICE IDENTITY
You are currently speaking as "${defaultVoice?.name || voices[0].name}".
If a customer asks your name, tell them you are ${defaultVoice?.name || voices[0].name}.
If a customer asks to speak with someone specific, acknowledge the request naturally.

Available voice identities on this team:
${voiceList}`;
    }

    const session: ActiveCallSession = {
      sessionId,
      client,
      streamSid: msg.start.streamSid,
      context,
      systemPrompt,
      transcript: [],
      startTime: Date.now(),
      sttRawBuffer: [],
      sttBufferBytes: 0,
      tokenCount: { input: 0, output: 0 },
      isSpeaking: false,
      isProcessing: false,
      greetingDoneAt: 0,
    };

    this.activeSessions.set(sessionId, session);
    this.logger.log(`Audio session started for call ${sessionId}`);

    // Initialize in-call messaging for this session
    const leadPhone = callSession.lead?.phone || callSession.toNumber || "";
    const firstName = (callSession.lead?.name || "there").split(" ")[0];
    this.messagingService.initSession(sessionId, {
      callId: sessionId,
      leadId: callSession.leadId || "",
      leadPhone,
      firstName,
    });

    // Initialize Gemini Live mode if enabled
    if (this.geminiLive.isEnabled()) {
      const opened = await this.geminiLive.openSession(systemPrompt, context.language || "en");
      if (opened) {
        this.geminiLive.onResponseAudio((audio) => {
          const base64Audio = audio.toString("base64");
          const mediaMsg = JSON.stringify({
            event: "media",
            streamSid: session.streamSid,
            media: { payload: base64Audio },
          });
          if (session.client.readyState === 1) {
            session.client.send(mediaMsg);
          }
        });
        this.logger.log("Gemini Live audio mode active");
      }
    }

    // Send initial greeting via TTS (always greet — use fallback if none configured)
    const greeting = context.greeting
      || `Hello${context.leadName ? `, ${context.leadName}` : ""}! This is ${context.agentName}. How can I help you today?`;
    await this.synthesizeAndSend(session, greeting);
    session.greetingDoneAt = Date.now();
    session.transcript.push({ role: "assistant", content: greeting, timestamp: Date.now() });
    session.context.conversationHistory.push({ role: "assistant", content: greeting });
  }

  /** Process incoming audio chunk — forward to Deepgram STT or Gemini Live */
  private async handleMediaChunk(client: any, msg: any) {
    const session = this.findSessionByClient(client);
    if (!session) return;

    // Audio payload is base64-encoded mulaw/8000
    const audioPayload = msg.media.payload;

    // Gemini Live mode: feed audio directly (skip Deepgram STT + TTS)
    if (this.geminiLive.isEnabled()) {
      this.geminiLive.feedAudio(Buffer.from(audioPayload, "base64"));
      return;
    }

    // Discard audio while AI is speaking (prevents echo loop) or processing
    if (session.isSpeaking || session.isProcessing) return;

    // Cooldown: ignore audio for 2s after greeting finishes (prevents processing greeting echo)
    if (session.greetingDoneAt && Date.now() - session.greetingDoneAt < 2000) return;

    // Standard mode: decode each chunk to raw bytes, then buffer
    const rawChunk = Buffer.from(audioPayload, "base64");
    session.sttRawBuffer.push(rawChunk);
    session.sttBufferBytes += rawChunk.length;

    // Batch process every ~4 seconds of audio (32000 bytes at 8kHz mulaw)
    if (session.sttBufferBytes > 32000) {
      await this.processAudioBuffer(session);
    }
  }

  /**
   * Process buffered audio through STT → ThinkingBudget → ModelRouter → LLM → TTS pipeline.
   *
   * Flow: STT Router (Deepgram or Sarvam based on language) → emotion detect →
   *       thinking budget → model route → Gemini Flash-Lite (99%) or Claude Sonnet (1%) → TTS → Twilio
   */
  private async processAudioBuffer(session: ActiveCallSession) {
    // Prevent concurrent processing (flooding)
    if (session.isProcessing) return;
    session.isProcessing = true;

    const audioBuffer = Buffer.concat(session.sttRawBuffer);
    session.sttRawBuffer = [];
    session.sttBufferBytes = 0;

    try {
      // Route to best STT provider (Deepgram for English, Sarvam for Hindi/regional, auto-detect)
      const sttResult = await this.sttRouter.transcribe(
        audioBuffer,
        session.sessionId,
        session.context.language || "en",
      );

      const transcript = sttResult.transcript;
      if (!transcript || transcript.trim().length < 3) return;  // skip noise/empty

      // Track detected language for this session
      if (sttResult.detectedLanguage && sttResult.detectedLanguage !== "unknown") {
        session.detectedLanguage = sttResult.detectedLanguage;
      }

      // Detect voice-switch request via LLM (supports any language/phrasing)
      const availableAgents = this.voiceService.getAllVoices().map((v) => v.name);
      const handoff = await this.gemini.detectHandoff(transcript, availableAgents);
      if (handoff.isHandoff && handoff.agentName) {
        const requestedVoice = this.voiceService.getVoiceByName(handoff.agentName);
        if (requestedVoice) {
          session.activeVoiceName = requestedVoice.name;
          // Full persona handoff — update system prompt, language, agent context
          if (requestedVoice.personalityDescription) {
            session.systemPrompt = session.systemPrompt.replace(
              /You are .+?\./,
              `You are ${requestedVoice.name}, ${requestedVoice.personalityDescription}.`,
            );
          }
          if (requestedVoice.languages?.[0]) {
            session.context.language = requestedVoice.languages[0];
          }
          session.context.agentName = requestedVoice.name;
          this.logger.log(`Full persona switch → ${requestedVoice.name} (voice: ${requestedVoice.voiceId})`);
        }
      }

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

      // Calculate thinking budget for this turn
      const budget = this.thinkingBudget.calculate(
        transcript,
        session.context.emotionState,
        session.context.currentPhase,
        session.context.conversationHistory,
      );

      // Play filler audio while model thinks (budget > 0)
      const fillerType = this.thinkingBudget.getFillerContext(budget);
      if (fillerType !== "none") {
        const fillerText = fillerType === "short"
          ? "Hmm, let me think about that..."
          : fillerType === "medium"
            ? "That's a great question, give me just a moment..."
            : "You know, that's really important, let me make sure I give you the right answer...";
        await this.synthesizeAndSend(session, fillerText);
      }

      // Inject pending messaging question if any (e.g. "Should I send this on WhatsApp?")
      let effectiveTranscript = transcript;
      if (session.pendingInjection) {
        const injectionHint = `[SYSTEM: After responding to the customer, naturally ask: "${session.pendingInjection}"]`;
        effectiveTranscript = transcript + " " + injectionHint;
        session.pendingInjection = undefined;
      }

      // Route: Claude Sonnet for high-value closes, Gemini Flash-Lite for everything else
      const buyingIntentScore = emotionState.primary === "buying" ? 0.85 : emotionState.primary === "excited" ? 0.7 : 0.3;
      const useClaude = this.modelRouter.shouldEscalateToClaude(
        session.sessionId,
        session.context.emotionState,
        buyingIntentScore,
        session.context.currentPhase,
      );

      let responseText = "";
      const responseStream = useClaude
        ? this.modelRouter.escalateToClaudeSonnet(
            effectiveTranscript,
            session.systemPrompt,
            session.context.conversationHistory.slice(0, -1) as { role: "user" | "assistant"; content: string }[],
          )
        : this.gemini.streamResponse(effectiveTranscript, session.systemPrompt, budget);

      for await (const chunk of responseStream) {
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

      // Check AI response for messaging triggers (fire-and-forget)
      const fullAiResponse = session.transcript
        .filter((t) => t.role === "assistant")
        .slice(-3)
        .map((t) => t.content)
        .join(" ");
      const triggerType = this.triggerDetector.detect(fullAiResponse);
      if (triggerType) {
        // If waiting for channel confirmation, process customer's answer instead
        if (this.messagingService.isWaitingForChannelConfirmation(session.sessionId)) {
          const result = await this.messagingService.processChannelResponse(session.sessionId, transcript);
          if (result?.aiLine) {
            session.pendingInjection = result.aiLine;
          }
        } else {
          const question = await this.messagingService.handleTrigger(session.sessionId, triggerType);
          if (question) {
            session.pendingInjection = question;
          }
        }
      } else if (this.messagingService.isWaitingForChannelConfirmation(session.sessionId)) {
        // No trigger but waiting for answer — process this utterance as channel response
        const result = await this.messagingService.processChannelResponse(session.sessionId, transcript);
        if (result?.aiLine) {
          session.pendingInjection = result.aiLine;
        }
      }
    } catch (err: any) {
      this.logger.error(`Audio processing error: ${err.message}`);
    } finally {
      session.isProcessing = false;
    }
  }
  /** Synthesize text to speech and send audio back to Twilio (ElevenLabs or Inworld) */
  private async synthesizeAndSend(session: ActiveCallSession, text: string) {
    session.isSpeaking = true;
    // Clear any buffered audio to prevent processing echo after TTS
    session.sttRawBuffer = [];
    session.sttBufferBytes = 0;

    try {
      const ttsProvider = (this.memory.get("advanced", "tts_provider") || "elevenlabs") as "elevenlabs" | "inworld";

      // Inworld TTS path
      if (ttsProvider === "inworld") {
        const voiceId = this.memory.get("advanced", "inworld_voice_id") || "default";
        for await (const chunk of this.inworldTTS.streamFromText(text, voiceId)) {
          const base64Audio = chunk.toString("base64");
          const mediaMsg = JSON.stringify({
            event: "media",
            streamSid: session.streamSid,
            media: { payload: base64Audio },
          });
          if (session.client.readyState === 1) {
            session.client.send(mediaMsg);
          }
        }
        return;
      }

      // ElevenLabs TTS path (default)
      const elevenLabsKey = this.config.get("ELEVENLABS_API_KEY");

      // Multi-voice: pick voice by name request, then by detected language, then default
      const namedVoice = session.activeVoiceName
        ? this.voiceService.getVoiceByName(session.activeVoiceName)
        : null;
      const activeVoice = namedVoice || this.voiceService.getVoiceForLanguage(session.detectedLanguage);
      const voiceId = activeVoice?.voiceId || this.config.get("ELEVENLABS_VOICE_ID") || "21m00Tcm4TlvDq8ikWAM";
      if (activeVoice) session.activeVoiceName = activeVoice.name;

      if (!elevenLabsKey) {
        this.logger.debug(`[TTS stub] ${text}`);
        return;
      }

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
        this.logger.error(`ElevenLabs TTS failed: ${response.status} ${response.statusText}`);
        return;
      }

      this.logger.debug(`TTS streaming audio for: "${text.substring(0, 50)}..."`);
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
    } finally {
      session.isSpeaking = false;
      // Clear any audio that leaked in during TTS
      session.sttRawBuffer = [];
      session.sttBufferBytes = 0;
    }
  }

  /** Finalize call: save transcript, emotion arc, generate summary via Flash-Lite */
  private async finalizeCall(session: ActiveCallSession) {
    try {
      const emotionArc = this.emotion.getEmotionArc(session.sessionId);

      // Generate call report via Gemini Flash-Lite (post-call processor)
      const fullTranscript = session.transcript
        .map((t) => `${t.role === "user" ? "Customer" : "Agent"}: ${t.content}`)
        .join("\n");

      const durationSec = Math.round((Date.now() - session.startTime) / 1000);

      let summary: string | null = null;
      try {
        const report = await this.postCallProcessor.generateCallReport({
          transcript: fullTranscript,
          durationSeconds: durationSec,
          leadName: session.context.leadName,
          agentName: session.context.agentName,
        });
        summary = report.summary;
      } catch {
        // Summary generation is optional — try simple fallback
        try {
          summary = await this.postCallProcessor.generateSimpleSummary(fullTranscript);
        } catch {
          // Fully optional
        }
      }

      // Derive overall sentiment from emotion arc
      let sentiment: "VERY_POSITIVE" | "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "VERY_NEGATIVE" = "NEUTRAL";
      if (emotionArc.length > 0) {
        const lastEmotions = emotionArc.slice(-3);
        const positiveEmotions = ["buying", "excited", "happy", "interested", "curious"];
        const negativeEmotions = ["frustrated", "angry", "annoyed", "confused", "skeptical"];
        const posCount = lastEmotions.filter((e) => positiveEmotions.includes(e.primary)).length;
        const negCount = lastEmotions.filter((e) => negativeEmotions.includes(e.primary)).length;
        if (posCount >= 2) sentiment = posCount === lastEmotions.length ? "VERY_POSITIVE" : "POSITIVE";
        else if (negCount >= 2) sentiment = negCount === lastEmotions.length ? "VERY_NEGATIVE" : "NEGATIVE";
      }

      // Save to database
      await this.callOrchestrator.endCall(session.sessionId, {
        sentiment,
        transcript: fullTranscript,
        summary: summary || "No summary available.",
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

      // Cleanup all session state
      this.emotion.clearCallHistory(session.sessionId);
      this.modelRouter.clearSession(session.sessionId);
      this.gemini.resetHistory();

      // Send end-of-call summary via messaging (fire-and-forget)
      this.messagingService.sendCallSummary(session.sessionId).catch(() => {});
      // Delay cleanup to allow summary to send
      setTimeout(() => this.messagingService.clearSession(session.sessionId), 5000);
      this.sttRouter.clearSession(session.sessionId);

      if (this.geminiLive.isEnabled()) {
        await this.geminiLive.closeSession();
      }
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
  systemPrompt: string;
  transcript: TranscriptEntry[];
  startTime: number;
  sttRawBuffer: Buffer[];  // raw decoded audio chunks (mulaw/8000)
  sttBufferBytes: number;  // total bytes accumulated
  tokenCount: { input: number; output: number };
  pendingInjection?: string; // messaging question/confirmation to inject into next AI turn
  detectedLanguage?: string; // auto-detected from STT (e.g. "hi-IN", "en-IN")
  activeVoiceName?: string;  // current voice identity name (e.g. "Priya")
  isSpeaking: boolean;       // true while TTS is streaming to Twilio (prevents echo)
  isProcessing: boolean;     // true while processAudioBuffer is running (prevents flooding)
  greetingDoneAt: number;    // timestamp when greeting TTS finished (for cooldown)
}

interface TranscriptEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}
