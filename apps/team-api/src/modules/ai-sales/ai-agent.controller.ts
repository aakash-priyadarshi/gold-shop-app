import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Header,
    HttpException,
    HttpStatus,
    Logger,
    Param,
    Patch,
    Post,
    Put,
    Query,
    Res,
    UploadedFile,
    UseInterceptors
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { Prisma } from "@prisma/client";
import { Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { Resend } from "resend";
import { Roles } from "../../auth/roles.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { AIAgentService } from "./ai-agent.service";
import { ABTestingService } from "./services/ab-testing.service";
import { AgentMemoryService } from "./services/agent-memory.service";
import { AgentVoiceService } from "./services/agent-voice.service";
import { AiEmailService } from "./services/ai-email.service";
import { BehaviorInsightService } from "./services/behavior-insight.service";
import { CallOrchestratorService } from "./services/call-orchestrator.service";
import { CallRecordingService } from "./services/call-recording.service";
import { CampaignSchedulerService } from "./services/campaign-scheduler.service";
import { CentralBrainService } from "./services/central-brain.service";
import { ConversationBrainService } from "./services/conversation-brain.service";
import { FollowUpSequencerService } from "./services/follow-up-sequencer.service";
import { GeminiStreamingClient } from "./services/gemini-streaming.service";
import { GoogleMeetBotService } from "./services/google-meet-bot.service";
import { LeadInteractionService } from "./services/lead-interaction.service";
import { LeadScoringService } from "./services/lead-scoring.service";
import { LeadStrategyService } from "./services/lead-strategy.service";
import { MeetingOrchestratorService } from "./services/meeting-orchestrator.service";
import { MeetingSchedulerService } from "./services/meeting-scheduler.service";
import { ObjectionPlaybookService } from "./services/objection-playbook.service";
import { PostCallProcessor } from "./services/post-call-processor.service";
import { PostInteractionPipelineService } from "./services/post-interaction-pipeline.service";
import { STTRouterService } from "./services/stt-router.service";
import { StrategyExecutorService } from "./services/strategy-executor.service";
import { WebhookService } from "./services/webhook.service";

@Controller("ai-sales")
export class AIAgentController {
  private readonly logger = new Logger(AIAgentController.name);

  constructor(
    private svc: AIAgentService,
    private campaigns: CampaignSchedulerService,
    private calls: CallOrchestratorService,
    private scoring: LeadScoringService,
    private agentMemory: AgentMemoryService,
    private behaviorInsights: BehaviorInsightService,
    private agentVoices: AgentVoiceService,
    private brain: ConversationBrainService,
    private gemini: GeminiStreamingClient,
    private prisma: PrismaService,
    private config: ConfigService,
    private centralBrain: CentralBrainService,
    private abTesting: ABTestingService,
    private followUps: FollowUpSequencerService,
    private playbook: ObjectionPlaybookService,
    private webhooks: WebhookService,
    private recordings: CallRecordingService,
    private sttRouter: STTRouterService,
    private meetBot: GoogleMeetBotService,
    private aiEmail: AiEmailService,
    private interactionService: LeadInteractionService,
    private postCallProcessor: PostCallProcessor,
    private meetingOrchestrator: MeetingOrchestratorService,
    private meetingScheduler: MeetingSchedulerService,
    private leadStrategy: LeadStrategyService,
    private strategyExecutor: StrategyExecutorService,
    private interactionPipeline: PostInteractionPipelineService,
  ) {}

  /* ─── AGENTS ─── */

  @Post("agents")
  @Roles("ADMIN")
  createAgent(@Body() body: any) {
    return this.svc.createAgent(body);
  }

  @Get("agents")
  listAgents() {
    return this.svc.listAgents();
  }

  @Get("agents/:id")
  getAgent(@Param("id") id: string) {
    return this.svc.getAgent(id);
  }

  @Put("agents/:id")
  @Roles("ADMIN")
  updateAgent(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateAgent(id, body);
  }

  @Patch("agents/:id/toggle")
  @Roles("ADMIN")
  toggleAgent(@Param("id") id: string, @Body() body: { isActive: boolean }) {
    return this.svc.toggleAgent(id, body.isActive);
  }

  /* ─── SCRIPTS ─── */

  @Post("scripts")
  @Roles("ADMIN")
  createScript(@Body() body: any) {
    return this.svc.createScript(body);
  }

  @Get("agents/:agentId/scripts")
  listScripts(@Param("agentId") agentId: string) {
    return this.svc.listScripts(agentId);
  }

  @Get("scripts")
  listAllScripts() {
    return this.svc.listScripts();
  }

  @Put("scripts/:id")
  @Roles("ADMIN")
  updateScript(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateScript(id, body);
  }

  @Delete("scripts/:id")
  @Roles("ADMIN")
  deleteScript(@Param("id") id: string) {
    return this.svc.deleteScript(id);
  }

  /* ─── LEADS ─── */

  @Post("leads")
  createLead(@Body() body: any) {
    return this.svc.createLead(body);
  }

  @Get("leads")
  listLeads(
    @Query("stage") stage?: string,
    @Query("source") source?: string,
    @Query("assignedToId") assignedToId?: string,
    @Query("search") search?: string,
  ) {
    return this.svc.listLeads({ stage, source, assignedToId, search });
  }

  @Get("leads/pipeline")
  getLeadPipeline() {
    return this.svc.getLeadPipeline();
  }

  @Put("leads/:id")
  updateLead(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateLead(id, body);
  }

  @Patch("leads/:id/stage")
  moveLeadStage(@Param("id") id: string, @Body() body: { stage: string }) {
    return this.svc.moveLeadStage(id, body.stage);
  }

  /* ─── CALLS ─── */

  @Post("calls")
  createCall(@Body() body: any) {
    return this.svc.createCall(body);
  }

  @Get("calls")
  listCalls(
    @Query("agentId") agentId?: string,
    @Query("leadId") leadId?: string,
    @Query("status") status?: string,
  ) {
    return this.svc.listCalls({ agentId, leadId, status });
  }

  @Get("calls/stats")
  getCallStats() {
    return this.svc.getCallStats();
  }

  @Patch("calls/:id/end")
  endCall(@Param("id") id: string, @Body() body: any) {
    return this.svc.endCall(id, body);
  }

  /* ─── PRODUCTS ─── */

  @Post("products")
  @Roles("ADMIN")
  createProduct(@Body() body: any) {
    return this.svc.createProduct(body);
  }

  @Get("products")
  listProducts() {
    return this.svc.listProducts();
  }

  @Put("products/:id")
  @Roles("ADMIN")
  updateProduct(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateProduct(id, body);
  }

  @Delete("products/:id")
  @Roles("ADMIN")
  deleteProduct(@Param("id") id: string) {
    return this.svc.deleteProduct(id);
  }

  /* ─── OBJECTIONS ─── */

  @Post("objections")
  @Roles("ADMIN")
  createObjection(@Body() body: any) {
    return this.svc.createObjection(body);
  }

  @Get("objections")
  listObjections(@Query("category") category?: string) {
    return this.svc.listObjections(category);
  }

  @Put("objections/:id")
  @Roles("ADMIN")
  updateObjection(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateObjection(id, body);
  }

  @Delete("objections/:id")
  @Roles("ADMIN")
  deleteObjection(@Param("id") id: string) {
    return this.svc.deleteObjection(id);
  }

  /* ─── CAMPAIGNS ─── */

  @Post("campaigns")
  @Roles("ADMIN")
  createCampaign(@Body() body: any) {
    return this.campaigns.createCampaign(body);
  }

  @Get("campaigns")
  listCampaigns(@Query("status") status?: string) {
    return this.campaigns.listCampaigns(status);
  }

  @Get("campaigns/:id")
  getCampaign(@Param("id") id: string) {
    return this.campaigns.getCampaign(id);
  }

  @Put("campaigns/:id")
  @Roles("ADMIN")
  updateCampaign(@Param("id") id: string, @Body() body: any) {
    return this.campaigns.updateCampaign(id, body);
  }

  @Post("campaigns/:id/leads")
  @Roles("ADMIN")
  addLeadsToCampaign(@Param("id") id: string, @Body() body: { leadIds: string[] }) {
    return this.campaigns.addLeadsToCampaign(id, body.leadIds);
  }

  @Delete("campaigns/:id/leads/:leadId")
  @Roles("ADMIN")
  removeLeadFromCampaign(@Param("id") id: string, @Param("leadId") leadId: string) {
    return this.campaigns.removeLeadFromCampaign(id, leadId);
  }

  @Post("campaigns/:id/start")
  @Roles("ADMIN")
  startCampaign(@Param("id") id: string) {
    const webhookBaseUrl = this.config.get("WEBHOOK_BASE_URL") || "https://team-api.orivraa.com";
    return this.campaigns.startCampaign(id, webhookBaseUrl);
  }

  @Post("campaigns/:id/pause")
  @Roles("ADMIN")
  pauseCampaign(@Param("id") id: string) {
    return this.campaigns.pauseCampaign(id);
  }

  @Get("campaigns/:id/stats")
  getCampaignStats(@Param("id") id: string) {
    return this.campaigns.getCampaignStats(id);
  }

  /* ─── CALL ORCHESTRATOR ─── */

  @Post("calls/initiate")
  @Roles("ADMIN")
  initiateCall(@Body() body: { agentId: string; leadId: string; campaignId?: string; goal?: string }) {
    const webhookBaseUrl = this.config.get("WEBHOOK_BASE_URL") || "https://team-api.orivraa.com";
    return this.calls.initiateCall({ ...body, webhookBaseUrl });
  }

  @Get("calls/active-count")
  getActiveCallsCount() {
    return this.calls.getActiveCalls();
  }

  @Get("calls/detailed-stats")
  getDetailedCallStats(@Query("from") from?: string, @Query("to") to?: string) {
    const dateRange = from && to ? { from: new Date(from), to: new Date(to) } : undefined;
    return this.calls.getDetailedStats(dateRange);
  }

  /* ─── LEAD SCORING ─── */

  @Get("leads/:id/score")
  getLeadScore(@Param("id") id: string) {
    return this.scoring.scoreLeead(id);
  }

  @Post("leads/bulk-score")
  @Roles("ADMIN")
  bulkScoreLeads() {
    return this.scoring.bulkScoreLeads();
  }

  /* ─── SCHEDULES ─── */

  @Post("schedules")
  createSchedule(@Body() body: any) {
    return this.svc.createSchedule(body);
  }

  @Get("schedules")
  listSchedules(@Query("agentId") agentId?: string, @Query("status") status?: string) {
    return this.svc.listSchedules({ agentId, status });
  }

  @Put("schedules/:id")
  updateSchedule(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateSchedule(id, body);
  }

  @Delete("schedules/:id")
  deleteSchedule(@Param("id") id: string) {
    return this.svc.deleteSchedule(id);
  }

  /* ─── ANALYTICS ─── */

  @Get("analytics/dashboard")
  getAnalyticsDashboard() {
    return this.svc.getAnalyticsDashboard();
  }

  /* ─── TWILIO WEBHOOKS ─── */

  @Post("twilio/voice/:sessionId")
  @Header("Content-Type", "text/xml")
  handleTwilioVoice(@Param("sessionId") sessionId: string) {
    const wsBaseUrl = (this.config.get("WEBHOOK_BASE_URL") || "https://team-api.orivraa.com").replace("https://", "wss://").replace("http://", "ws://");
    return this.calls.generateTwiML(sessionId, wsBaseUrl);
  }

  @Post("twilio/status/:sessionId")
  handleTwilioStatus(
    @Param("sessionId") sessionId: string,
    @Body() body: { CallStatus: string; CallSid: string },
  ) {
    return this.calls.handleStatusCallback(sessionId, body.CallStatus, body.CallSid);
  }

  /* ─── AGENT MEMORY (DB-backed config) ─── */

  @Get("memory")
  getMemory() {
    return this.agentMemory.getAll();
  }

  @Post("memory")
  @Roles("ADMIN")
  setMemory(@Body() body: { category: string; key: string; value: string; label?: string }) {
    return this.agentMemory.set(body.category, body.key, body.value, body.label);
  }

  @Post("memory/bulk")
  @Roles("ADMIN")
  bulkSetMemory(@Body() body: { entries: Array<{ category: string; key: string; value: string; label?: string }> }) {
    return this.agentMemory.bulkSet(body.entries);
  }

  @Delete("memory/:category/:key")
  @Roles("ADMIN")
  deleteMemory(@Param("category") category: string, @Param("key") key: string) {
    return this.agentMemory.remove(category, key);
  }

  @Post("memory/seed")
  @Roles("ADMIN")
  seedMemory() {
    return this.agentMemory.seedDefaults();
  }

  /* ─── BEHAVIOR INSIGHTS ─── */

  @Get("behavior-insights")
  listBehaviorInsights(
    @Query("category") category?: string,
    @Query("segment") segment?: string,
  ) {
    return this.behaviorInsights.list({ category, segment });
  }

  @Post("behavior-insights")
  @Roles("ADMIN")
  createBehaviorInsight(@Body() body: {
    category: string;
    segment?: string;
    pattern: string;
    response: string;
    confidence?: number;
    sampleSize?: number;
  }) {
    return this.behaviorInsights.create(body);
  }

  @Put("behavior-insights/:id")
  @Roles("ADMIN")
  updateBehaviorInsight(@Param("id") id: string, @Body() body: any) {
    return this.behaviorInsights.update(id, body);
  }

  @Delete("behavior-insights/:id")
  @Roles("ADMIN")
  deleteBehaviorInsight(@Param("id") id: string) {
    return this.behaviorInsights.remove(id);
  }

  @Post("behavior-insights/seed")
  @Roles("ADMIN")
  seedBehaviorInsights() {
    return this.behaviorInsights.seedDefaults();
  }

  /* ─── VOICE AGENTS ─── */

  @Get("voices")
  listVoices() {
    return this.agentVoices.list();
  }

  @Post("voices")
  @Roles("ADMIN")
  createVoice(@Body() body: Record<string, any>) {
    return this.agentVoices.create(body);
  }

  @Put("voices/:id")
  @Roles("ADMIN")
  updateVoice(@Param("id") id: string, @Body() body: any) {
    return this.agentVoices.update(id, body);
  }

  @Delete("voices/:id")
  @Roles("ADMIN")
  deleteVoice(@Param("id") id: string) {
    return this.agentVoices.remove(id);
  }

  @Post("voices/seed")
  @Roles("ADMIN")
  seedVoices() {
    return this.agentVoices.seedDefaults();
  }

  /* ─── PLAYGROUND (test endpoints) ─── */

  @Get("playground/test-services")
  async testServices(@Query("agentId") agentId: string) {
    const results: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

    // Test Database
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      results.database = { ok: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      results.database = { ok: false, error: err.message };
    }

    // Test Gemini Flash
    try {
      const start = Date.now();
      let reply = "";
      for await (const chunk of this.gemini.streamResponse("Hello, who are you?", "You are a test assistant. Reply briefly.", 0)) {
        reply += chunk;
      }
      results.gemini = { ok: !!reply, latencyMs: Date.now() - start, error: reply ? undefined : "Empty response" };
    } catch (err: any) {
      results.gemini = { ok: false, error: err.message };
    }

    // Test Claude Sonnet
    try {
      const start = Date.now();
      const resp = await this.brain.getFullResponse({
        agentName: "Test",
        conversationHistory: [{ role: "user", content: "Say hello briefly." }],
      });
      results.claude = { ok: !!resp, latencyMs: Date.now() - start, error: resp ? undefined : "Empty response" };
    } catch (err: any) {
      results.claude = { ok: false, error: err.message };
    }

    // Test ElevenLabs TTS (ping API for available voices)
    try {
      const start = Date.now();
      const apiKey = this.config.get<string>("ELEVENLABS_API_KEY");
      if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");
      const resp = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": apiKey },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      results.elevenLabsTTS = { ok: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      results.elevenLabsTTS = { ok: false, error: err.message };
    }

    // Test Google STT (ping endpoint with empty audio to validate API key)
    try {
      const start = Date.now();
      const apiKey = this.config.get<string>("GOOGLE_STT_API_KEY");
      if (!apiKey) throw new Error("GOOGLE_STT_API_KEY not set");
      const resp = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: { encoding: "LINEAR16", sampleRateHertz: 8000, languageCode: "en-US" },
          audio: { content: "" },
        }),
      });
      // Google returns 200 even with empty audio (just empty results), or 400 — both mean API key works
      // Only 403/401 means bad key
      if (resp.status === 401 || resp.status === 403) throw new Error("Invalid API key");
      results.googleSTT = { ok: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      results.googleSTT = { ok: false, error: err.message };
    }

    // Test Sarvam AI STT
    try {
      const start = Date.now();
      const sarvamKey = this.config.get<string>("SARVAM_API_KEY");
      if (!sarvamKey) throw new Error("SARVAM_API_KEY not set");
      const resp = await fetch("https://api.sarvam.ai/speech-to-text", {
        method: "POST",
        headers: { "api-subscription-key": sarvamKey },
        body: new FormData(),
      });
      // Any non-401/403 means key is valid (may get 400 for empty audio, that's fine)
      if (resp.status === 401 || resp.status === 403) throw new Error("Invalid API key");
      results.sarvamSTT = { ok: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      results.sarvamSTT = { ok: false, error: err.message };
    }

    return results;
  }

  @Post("playground/voice")
  @UseInterceptors(FileInterceptor("audio"))
  async playgroundVoice(
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string },
    @Body() body: { agentId: string; history?: string; sttProvider?: string },
  ) {
    if (!file) throw new Error("No audio file uploaded");

    let agent = await this.svc.getAgent(body.agentId);
    const history: { role: string; text: string }[] = body.history ? JSON.parse(body.history) : [];

    // 1. STT — transcribe audio (with optional provider override)
    const sttStart = Date.now();
    const sttResult = await this.sttRouter.transcribeBrowserAudio(
      file.buffer,
      `playground-${Date.now()}`,
      agent.languages?.[0] || "en",
      body.sttProvider || "auto",
    );
    const sttLatencyMs = Date.now() - sttStart;

    if (!sttResult.transcript) {
      return {
        transcript: "",
        sttProvider: sttResult.provider,
        sttLatencyMs,
        reply: "Sorry, I couldn't understand that. Could you try again?",
        llmProvider: "none",
        llmLatencyMs: 0,
      };
    }

    // Detect agent handoff + language switch via LLM (supports any language/phrasing)
    const previousAgentName = agent.name;
    const availableAgents = this.agentVoices.getAllVoices().map((v) => v.name);
    const intents = await this.gemini.detectIntents(sttResult.transcript, availableAgents);
    if (intents.isHandoff && intents.agentName) {
      const requestedAgent = this.agentVoices.getVoiceByName(intents.agentName);
      if (requestedAgent) {
        agent = requestedAgent as any;
        this.logger.log(`Playground voice handoff → ${requestedAgent.name} (${requestedAgent.id})`);
      }
    }

    // Apply language switch if detected
    const effectiveLanguage = intents.isLanguageSwitch && intents.language
      ? intents.language
      : agent.languages?.[0]?.split("-")[0] || "en";

    // 2. LLM — generate response
    const conversationHistory = history.map((m) => ({
      role: m.role === "user" ? "user" as const : "assistant" as const,
      content: m.text,
    }));
    conversationHistory.push({ role: "user", content: sttResult.transcript });

    // If handoff happened, inject context so new agent introduces themselves
    const handoffHappened = intents.isHandoff && intents.agentName && agent.name !== previousAgentName;
    if (handoffHappened) {
      conversationHistory.push({
        role: "user" as const,
        content: `[SYSTEM: You are now ${agent.name}. The customer was just transferred to you from ${previousAgentName}. Introduce yourself warmly — e.g. "Hi! I'm ${agent.name}, ${previousAgentName} told me you wanted to speak with me. How can I help you?" Do NOT continue the previous agent's conversation as if nothing changed.]`,
      });
    }

    const llmStart = Date.now();
    const systemPrompt = this.brain.buildSystemPrompt({
      agentName: agent.name,
      agentPersonality: agent.personalityDescription || undefined,
      language: agent.languages?.[0]?.split("-")[0] || "en",
      greeting: agent.greeting || undefined,
      conversationHistory,
    });

    let reply = "";
    for await (const chunk of this.gemini.streamResponse(sttResult.transcript, systemPrompt, 0)) {
      reply += chunk;
    }
    const llmLatencyMs = Date.now() - llmStart;

    // 3. TTS — synthesize reply (ElevenLabs primary, Sarvam fallback)
    let audioBase64: string | undefined;
    let ttsLatencyMs: number | undefined;
    let ttsProvider: string | undefined;

    // Try ElevenLabs first
    const elevenLabsKey = this.config.get<string>("ELEVENLABS_API_KEY");
    const voiceId = agent.voiceId
      || this.agentVoices.getDefaultVoice()?.voiceId
      || "pFZP5JQG7iQjIQuC4Bku"; // Lily — ElevenLabs default multilingual female voice
    if (elevenLabsKey && voiceId && reply) {
      try {
        this.logger.log(`TTS ElevenLabs: voiceId=${voiceId}, reply length=${reply.length}`);
        const ttsStart = Date.now();
        const ttsResp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: "POST",
          headers: { "xi-api-key": elevenLabsKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            text: reply,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: agent.voiceStability ?? 0.5,
              similarity_boost: agent.voiceSimilarityBoost ?? 0.75,
            },
          }),
        });
        if (ttsResp.ok) {
          const buffer = Buffer.from(await ttsResp.arrayBuffer());
          audioBase64 = buffer.toString("base64");
          ttsLatencyMs = Date.now() - ttsStart;
          ttsProvider = "elevenlabs";
        } else {
          const errBody = await ttsResp.text().catch(() => "");
          this.logger.warn(`ElevenLabs TTS HTTP ${ttsResp.status}: ${errBody.substring(0, 200)}`);
        }
      } catch (err: any) {
        this.logger.warn(`ElevenLabs TTS failed: ${err.message}`);
      }
    }

    // Fallback: Sarvam TTS (supports Hindi and Indian languages natively)
    const sarvamKey = this.config.get<string>("SARVAM_API_KEY");
    if (!audioBase64 && sarvamKey && reply) {
      try {
        this.logger.log(`TTS Sarvam fallback: reply length=${reply.length}`);
        const ttsStart = Date.now();
        // Detect language — use agent's language or default to Hindi
        const lang = agent.languages?.[0] || sttResult.detectedLanguage || "hi-IN";
        const sarvamTtsResp = await fetch("https://api.sarvam.ai/text-to-speech", {
          method: "POST",
          headers: {
            "api-subscription-key": sarvamKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: [reply],
            target_language_code: lang.includes("-") ? lang : `${lang}-IN`,
            speaker: "meera", // Sarvam's default female Hindi voice
            model: "bulbul:v2",
          }),
        });
        if (sarvamTtsResp.ok) {
          const sarvamData = await sarvamTtsResp.json() as { audios?: string[] };
          if (sarvamData.audios?.[0]) {
            audioBase64 = sarvamData.audios[0]; // Sarvam returns base64 WAV directly
            ttsLatencyMs = Date.now() - ttsStart;
            ttsProvider = "sarvam";
          }
        } else {
          const errBody = await sarvamTtsResp.text().catch(() => "");
          this.logger.warn(`Sarvam TTS HTTP ${sarvamTtsResp.status}: ${errBody.substring(0, 200)}`);
        }
      } catch (err: any) {
        this.logger.warn(`Sarvam TTS failed: ${err.message}`);
      }
    }

    if (!audioBase64) {
      this.logger.warn(`TTS: no provider succeeded for reply (${reply.length} chars)`);
    }

    return {
      transcript: sttResult.transcript,
      detectedLanguage: sttResult.detectedLanguage,
      sttProvider: sttResult.provider,
      sttLatencyMs,
      reply,
      llmProvider: "gemini-flash",
      llmLatencyMs,
      ttsProvider,
      ttsLatencyMs,
      audioBase64,
      switchedAgentId: agent.id !== body.agentId ? agent.id : undefined,
      switchedAgentName: agent.id !== body.agentId ? agent.name : undefined,
    };
  }

  @Post("playground/chat")
  async playgroundChat(
    @Body() body: {
      agentId: string;
      message: string;
      history?: { role: string; text: string }[];
    },
  ) {
    let agent = await this.svc.getAgent(body.agentId);

    // Detect agent handoff + language switch via LLM (supports any language/phrasing)
    const previousAgentName = agent.name;
    const availableAgents = this.agentVoices.getAllVoices().map((v) => v.name);
    const intents = await this.gemini.detectIntents(body.message, availableAgents);
    if (intents.isHandoff && intents.agentName) {
      const requestedAgent = this.agentVoices.getVoiceByName(intents.agentName);
      if (requestedAgent) {
        agent = requestedAgent as any;
        this.logger.log(`Playground chat handoff → ${requestedAgent.name} (${requestedAgent.id})`);
      }
    }

    const conversationHistory = (body.history || []).map((m) => ({
      role: m.role === "user" ? "user" as const : "assistant" as const,
      content: m.text,
    }));
    conversationHistory.push({ role: "user", content: body.message });

    // If handoff happened, inject context so new agent introduces themselves
    const handoffHappened = intents.isHandoff && intents.agentName && agent.name !== previousAgentName;
    if (handoffHappened) {
      conversationHistory.push({
        role: "user" as const,
        content: `[SYSTEM: You are now ${agent.name}. The customer was just transferred to you from ${previousAgentName}. Introduce yourself warmly — e.g. "Hi! I'm ${agent.name}, ${previousAgentName} told me you wanted to speak with me. How can I help you?" Do NOT continue the previous agent's conversation as if nothing changed.]`,
      });
    }

    // Use Gemini for standard turns
    const start = Date.now();
    const systemPrompt = this.brain.buildSystemPrompt({
      agentName: agent.name,
      agentPersonality: agent.personalityDescription || undefined,
      language: agent.languages?.[0]?.split("-")[0] || "en",
      greeting: agent.greeting || undefined,
      conversationHistory,
    });

    let reply = "";
    for await (const chunk of this.gemini.streamResponse(body.message, systemPrompt, 0)) {
      reply += chunk;
    }
    const llmLatencyMs = Date.now() - start;

    // Optionally generate TTS (use switched agent's voice)
    let audioBase64: string | undefined;
    let ttsLatencyMs: number | undefined;
    let ttsProvider: string | undefined;
    const elevenLabsKey = this.config.get<string>("ELEVENLABS_API_KEY");
    const chatVoiceId = agent.voiceId
      || this.agentVoices.getDefaultVoice()?.voiceId
      || "pFZP5JQG7iQjIQuC4Bku"; // Lily fallback
    if (elevenLabsKey && chatVoiceId && reply) {
      try {
        const ttsStart = Date.now();
        const ttsResp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${chatVoiceId}`, {
          method: "POST",
          headers: { "xi-api-key": elevenLabsKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            text: reply,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: agent.voiceStability ?? 0.5,
              similarity_boost: agent.voiceSimilarityBoost ?? 0.75,
            },
          }),
        });
        if (ttsResp.ok) {
          const buffer = Buffer.from(await ttsResp.arrayBuffer());
          audioBase64 = buffer.toString("base64");
          ttsLatencyMs = Date.now() - ttsStart;
          ttsProvider = "elevenlabs";
        }
      } catch (err: any) {
        this.logger.warn(`ElevenLabs TTS failed: ${err.message}`);
      }
    }

    // Sarvam TTS fallback
    const sarvamKey = this.config.get<string>("SARVAM_API_KEY");
    if (!audioBase64 && sarvamKey && reply) {
      try {
        const ttsStart = Date.now();
        const lang = agent.languages?.[0] || "hi-IN";
        const sarvamTtsResp = await fetch("https://api.sarvam.ai/text-to-speech", {
          method: "POST",
          headers: { "api-subscription-key": sarvamKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            inputs: [reply],
            target_language_code: lang.includes("-") ? lang : `${lang}-IN`,
            speaker: "meera",
            model: "bulbul:v2",
          }),
        });
        if (sarvamTtsResp.ok) {
          const sarvamData = await sarvamTtsResp.json() as { audios?: string[] };
          if (sarvamData.audios?.[0]) {
            audioBase64 = sarvamData.audios[0];
            ttsLatencyMs = Date.now() - ttsStart;
            ttsProvider = "sarvam";
          }
        }
      } catch (err: any) {
        this.logger.warn(`Sarvam TTS failed: ${err.message}`);
      }
    }

    return {
      reply,
      llmProvider: "gemini-flash",
      llmLatencyMs,
      ttsProvider,
      ttsLatencyMs,
      audioBase64,
      switchedAgentId: agent.id !== body.agentId ? agent.id : undefined,
      switchedAgentName: agent.id !== body.agentId ? agent.name : undefined,
    };
  }

  @Post("playground/call")
  @Roles("ADMIN")
  async playgroundCall(
    @Body() body: { agentId: string; phoneNumber: string },
  ) {
    const webhookBaseUrl = this.config.get("WEBHOOK_BASE_URL") || "https://team-api.orivraa.com";
    const agent = await this.svc.getAgent(body.agentId);

    // Create a temporary lead for the test call
    const lead = await this.svc.createLead({
      name: "Playground Test",
      phone: body.phoneNumber,
      source: "MANUAL" as any,
      notes: `Test call from playground at ${new Date().toISOString()}`,
    });

    const result = await this.calls.initiateCall({
      agentId: agent.id,
      leadId: lead.id,
      webhookBaseUrl,
    });

    return {
      message: `Calling ${body.phoneNumber} with agent ${agent.name}...`,
      sessionId: result.id,
      leadId: lead.id,
    };
  }

  @Get("playground/call-status/:sessionId")
  @Roles("ADMIN")
  async playgroundCallStatus(@Param("sessionId") sessionId: string) {
    const session = await this.prisma.callSession.findUnique({
      where: { id: sessionId },
      select: { status: true },
    });
    if (!session) return { status: "NOT_FOUND" };
    return { status: session.status };
  }

  /* ─── PLAYGROUND: GOOGLE MEET BOT ─── */

  @Post("playground/meet")
  @Roles("ADMIN")
  async playgroundMeetJoin(
    @Body() body: { agentId: string; meetUrl: string; leadId?: string },
  ) {
    const session = await this.meetBot.startSession(body.meetUrl, body.agentId, body.leadId);
    return {
      sessionId: session.id,
      agentName: session.agentName,
      status: session.status,
    };
  }

  /** Create a meeting via Calendar API then auto-join it with the bot */
  @Post("playground/meet-create-and-join")
  @Roles("ADMIN")
  async playgroundMeetCreateAndJoin(
    @Body() body: { agentId: string; leadId?: string; summary?: string },
  ) {
    try {
      const { meetUrl, eventId } = await this.meetBot.createMeeting(body.agentId, body.summary);
      const session = await this.meetBot.startSession(meetUrl, body.agentId, body.leadId);
      return {
        sessionId: session.id,
        agentName: session.agentName,
        status: session.status,
        meetUrl,
        eventId,
      };
    } catch (err: any) {
      throw new HttpException(err.message || "Failed to create and join meeting", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post("playground/meet-stop")
  @Roles("ADMIN")
  async playgroundMeetStop(
    @Body() body: { sessionId: string },
  ) {
    await this.meetBot.stopSession(body.sessionId);
    return { status: "ended" };
  }

  @Get("playground/meet-status/:sessionId")
  @Roles("ADMIN")
  async playgroundMeetStatus(@Param("sessionId") sessionId: string) {
    const session = this.meetBot.getSession(sessionId);
    if (!session) return { status: "NOT_FOUND" };
    return {
      status: session.status,
      logs: session.logs.slice(-50), // last 50 logs
      transcript: session.transcript,
      agentName: session.agentName,
    };
  }

  @Get("playground/meet-screenshot/:sessionId")
  @Roles("ADMIN")
  async playgroundMeetScreenshot(@Param("sessionId") sessionId: string) {
    const screenshot = await this.meetBot.getScreenshot(sessionId);
    if (!screenshot) return { error: "No screenshot available" };
    return { screenshot }; // base64 PNG
  }

  @Get("playground/meet-debug/:sessionId")
  @Roles("ADMIN")
  async playgroundMeetDebug(@Param("sessionId") sessionId: string) {
    const debug = await this.meetBot.getPageDebugInfo(sessionId);
    if (!debug) return { error: "Session not found or page closed" };
    return debug;
  }

  /* ─── GOOGLE OAUTH FOR MEET BOT ─── */

  @Get("google/auth-url")
  @Roles("ADMIN")
  async getGoogleAuthUrl() {
    const oauth = this.getOAuth2Client();
    if (!oauth) {
      throw new HttpException(
        "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const url = oauth.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/calendar.events",
      ],
      state: "meet-bot-connect",
    });
    return { url };
  }

  @Get("google/callback")
  async handleGoogleCallback(
    @Query("code") code: string,
    @Query("error") error: string,
    @Query("state") state: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.config.get<string>("TEAM_FRONTEND_URL") || "http://localhost:3001";

    if (error || !code) {
      return res.redirect(`${frontendUrl}/settings?google_auth=error&message=${encodeURIComponent(error || "No authorization code")}`);
    }

    if (state !== "meet-bot-connect") {
      return res.redirect(`${frontendUrl}/settings?google_auth=error&message=${encodeURIComponent("Invalid state parameter")}`);
    }

    const oauth = this.getOAuth2Client();
    if (!oauth) {
      return res.redirect(`${frontendUrl}/settings?google_auth=error&message=${encodeURIComponent("OAuth not configured")}`);
    }

    try {
      const { tokens } = await oauth.getToken(code);
      if (!tokens.refresh_token) {
        return res.redirect(`${frontendUrl}/settings?google_auth=error&message=${encodeURIComponent("No refresh token received. Try revoking app access at myaccount.google.com/permissions and reconnecting.")}`);
      }

      // Get user info
      oauth.setCredentials(tokens);
      const userInfo = await oauth.request({ url: "https://www.googleapis.com/oauth2/v2/userinfo" });
      const email = (userInfo.data as any)?.email || "Unknown";

      // Store in DB
      await this.prisma.teamSettings.upsert({
        where: { id: "singleton" },
        create: {
          id: "singleton",
          googleMeetBotRefreshToken: tokens.refresh_token,
          googleMeetBotAccountEmail: email,
          googleMeetBotCookies: Prisma.JsonNull,
        },
        update: {
          googleMeetBotRefreshToken: tokens.refresh_token,
          googleMeetBotAccountEmail: email,
          googleMeetBotCookies: Prisma.JsonNull, // invalidate old cookies
        },
      });

      this.logger.log(`Google Meet bot account connected: ${email}`);
      return res.redirect(`${frontendUrl}/settings?google_auth=success&email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      this.logger.error(`Google OAuth callback failed: ${err.message}`);
      return res.redirect(`${frontendUrl}/settings?google_auth=error&message=${encodeURIComponent(err.message)}`);
    }
  }

  @Get("google/bot-status")
  @Roles("ADMIN")
  async getGoogleBotStatus() {
    const settings = await this.prisma.teamSettings.findUnique({ where: { id: "singleton" } });
    return {
      connected: !!settings?.googleMeetBotRefreshToken,
      email: (settings as any)?.googleMeetBotAccountEmail || null,
      hasCachedCookies: !!(settings as any)?.googleMeetBotCookies,
    };
  }

  @Post("google/disconnect")
  @Roles("ADMIN")
  async disconnectGoogleBot() {
    await this.prisma.teamSettings.update({
      where: { id: "singleton" },
      data: {
        googleMeetBotRefreshToken: null,
        googleMeetBotAccountEmail: null,
        googleMeetBotCookies: Prisma.JsonNull,
        googleMeetBotEmail: null,
        googleMeetBotPassword: null,
      },
    });
    return { success: true };
  }

  /** Save Google session cookies so the Meet bot can join external meetings as an authenticated user. */
  @Post("google/refresh-cookies")
  @Roles("ADMIN")
  async refreshGoogleCookies(@Body() body: { cookies: any[] }) {
    if (!body.cookies || !Array.isArray(body.cookies) || body.cookies.length === 0) {
      return { success: false, message: "Please provide a non-empty array of cookies." };
    }
    await this.prisma.teamSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", googleMeetBotCookies: body.cookies as any },
      update: { googleMeetBotCookies: body.cookies as any },
    });
    return { success: true, message: `Saved ${body.cookies.length} cookies. The Meet bot will use them when joining meetings.` };
  }

  @Post("google/login-bot")
  @Roles("ADMIN")
  async loginBot() {
    try {
      const result = await this.meetBot.loginAndSaveProfile();
      return result;
    } catch (err: any) {
      return { success: false, message: err.message || "Login failed" };
    }
  }

  @Post("google/create-meeting")
  @Roles("ADMIN")
  async createGoogleMeeting(
    @Body() body: { agentId: string; summary?: string },
  ) {
    try {
      const result = await this.meetBot.createMeeting(body.agentId, body.summary);
      return result;
    } catch (err: any) {
      throw new HttpException(err.message || "Failed to create meeting", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private getOAuth2Client(): OAuth2Client | null {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = this.config.get<string>("GOOGLE_CLIENT_SECRET");
    if (!clientId || !clientSecret) return null;

    const webhookBase = this.config.get<string>("WEBHOOK_BASE_URL") || "http://localhost:3002";
    const callbackUrl = `${webhookBase}/api/ai-sales/google/callback`;
    return new OAuth2Client(clientId, clientSecret, callbackUrl);
  }

  /* ─── PLAYGROUND: EMAIL ─── */

  @Post("playground/email-draft")
  @Roles("ADMIN")
  async playgroundEmailDraft(
    @Body() body: { leadId?: string; purpose: string; includeMeetLink?: boolean },
  ) {
    try {
      const draft = await this.aiEmail.generateDraft({
        leadId: body.leadId || "playground-lead",
        purpose: body.purpose,
        includeMeetLink: body.includeMeetLink,
      });
      return draft;
    } catch (err: any) {
      // If lead not found, generate a standalone draft using Gemini directly
      this.logger.warn(`Lead not found for draft, generating standalone: ${err.message}`);
      const geminiApiKey = this.config.get<string>("GEMINI_API_KEY");
      if (!geminiApiKey) throw new Error("GEMINI_API_KEY not configured");

      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
          maxOutputTokens: 800,
          thinkingConfig: { thinkingBudget: 1024 },
        } as any,
      });

      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{
            text: `Draft a professional sales email.\n\nPurpose: ${body.purpose}\n${body.includeMeetLink ? "Include a mention of scheduling a Google Meet." : ""}\n\nReturn JSON: { "subject": "email subject", "body": "email body in plain text" }`,
          }],
        }],
      });

      const text = result.response.text()
        .replace(/```json?\n?/g, "").replace(/```/g, "")
        .replace(/,\s*([}\]])/g, "$1").trim();
      return JSON.parse(text);
    }
  }

  @Post("playground/email-send")
  @Roles("ADMIN")
  async playgroundEmailSend(
    @Body() body: { to: string; subject: string; body: string; fromEmail?: string },
  ) {
    if (!body.to || !body.subject || !body.body) {
      throw new BadRequestException("Missing required fields: to, subject, body");
    }

    const resendKey = this.config.get<string>("RESEND_API_KEY");
    if (!resendKey) {
      throw new HttpException(
        "RESEND_API_KEY is not configured. Add it in Railway environment variables.",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      const resend = new Resend(resendKey);
      const from = body.fromEmail || this.config.get<string>("AI_SALES_FROM_EMAIL") || this.config.get<string>("MAIL_FROM") || "Orivraa Sales <onboarding@resend.dev>";

      const result = await resend.emails.send({
        from,
        to: body.to,
        subject: body.subject,
        html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <div style="background:linear-gradient(135deg,#d4a843,#b8941f);padding:16px 24px;border-radius:12px 12px 0 0;">
            <h2 style="color:#fff;margin:0;font-size:20px;">Orivraa</h2>
          </div>
          <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
            <p style="color:#4b5563;line-height:1.8;white-space:pre-wrap;">${body.body}</p>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">
              Sent from Orivraa AI Sales Playground
            </p>
          </div>
        </div>`,
      });

      // Resend v6+ returns { data: { id }, error }
      if (result.error) {
        this.logger.error(`Resend error: ${JSON.stringify(result.error)}`);
        throw new HttpException(
          `Resend error: ${result.error.message || JSON.stringify(result.error)}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      return { success: true, resendId: result.data?.id, from, to: body.to };
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Playground email send failed: ${err.message}`);
      // Common Resend errors: unverified domain, invalid from address
      const msg = err.message || "Unknown error";
      if (msg.includes("not a verified") || msg.includes("not verified")) {
        throw new HttpException(
          `Email domain not verified in Resend. Either verify your domain at resend.com/domains or use the default "onboarding@resend.dev" as the From address.`,
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(`Email send failed: ${msg}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /* ─── PLAYGROUND: INTERACTION SIMULATOR ─── */

  @Post("playground/simulate-interaction")
  @Roles("ADMIN")
  async playgroundSimulateInteraction(
    @Body() body: { transcript: string; goal?: string; applyToLeadId?: string },
  ) {
    const transcript = body.transcript || "";
    // Estimate 2 seconds per word as a very rough conversation duration placeholder
    const durationSeconds = Math.max(10, Math.floor(transcript.split(" ").length * 2));

    const report = await this.postCallProcessor.generateCallReport({
      transcript,
      durationSeconds,
    });
    const goalEval = await this.postCallProcessor.evaluateGoal(transcript, body.goal || "Have a productive sales conversation.");
    const insights = await this.postCallProcessor.extractPersonalityInsights(transcript);

    if (body.applyToLeadId) {
      // Create interaction and optionally update lead fields if we had a dedicated updater
      await this.interactionService.recordInteraction({
        leadId: body.applyToLeadId,
        type: "SIMULATED_INTERACTION" as any,
        summary: report.summary,
        details: JSON.stringify({ report, goalEval, insights }, null, 2),
      });
    }

    return { report, goalEval, insights };
  }

  @Post("playground/simulate-chain")
  @Roles("ADMIN")
  async playgroundSimulateChain(
    @Body() body: {
      chain: Array<{
        type: "call" | "email" | "sms" | "gmeet";
        transcript: string;
        summary?: string;
        goal?: string;
        aiResult?: any;
      }>;
      currentIndex: number;
    },
  ) {
    const { chain, currentIndex } = body;
    const current = chain[currentIndex];
    if (!current) return { error: "Invalid index" };

    const previousInteractions = chain.slice(0, currentIndex);
    const transcript = current.transcript || "";
    const durationSeconds = Math.max(10, Math.floor(transcript.split(" ").length * 2));

    // 1. Run standard post-call analysis on the current interaction
    const report = await this.postCallProcessor.generateCallReport({
      transcript,
      durationSeconds,
    });
    const goalEval = await this.postCallProcessor.evaluateGoal(
      transcript,
      current.goal || "Have a productive sales conversation.",
    );
    const insights = await this.postCallProcessor.extractPersonalityInsights(transcript);

    // 2. Build chain context and ask Gemini to recommend next action
    let nextAction: any = null;
    const geminiApiKey = this.config.get<string>("GEMINI_API_KEY");
    if (geminiApiKey) {
      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
            maxOutputTokens: 1000,
            thinkingConfig: { thinkingBudget: 2048 },
          } as any,
        });

        const historyBlock = previousInteractions.map((p, i) => {
          const r = p.aiResult?.report;
          return `--- Interaction ${i + 1} (${p.type.toUpperCase()}) ---
Summary: ${r?.summary || p.summary || "N/A"}
Outcome: ${r?.outcome || "N/A"}
Key Topics: ${(r?.keyTopics || []).join(", ") || "N/A"}
Objections: ${(r?.objectionsRaised || []).join(", ") || "None"}
Buying Signals: ${(r?.buyingSignals || []).join(", ") || "None"}
Deal Probability: ${r?.dealProbability ?? "N/A"}`;
        }).join("\n\n");

        const result = await model.generateContent({
          contents: [{
            role: "user",
            parts: [{
              text: `You are a senior sales strategist. You are analyzing a chain of interactions with a lead.

${historyBlock ? `## Previous Interactions:\n${historyBlock}\n\n` : "This is the FIRST interaction with this lead.\n\n"}## Current Interaction (${current.type.toUpperCase()}) — JUST COMPLETED:
Transcript:
${transcript}

Current Analysis:
- Outcome: ${report.outcome}
- Key topics: ${report.keyTopics.join(", ")}
- Objections: ${report.objectionsRaised.join(", ") || "None"}
- Buying signals: ${report.buyingSignals.join(", ") || "None"}
- Deal probability: ${report.dealProbability}
- Personality insights: ${JSON.stringify(insights)}

Based on ALL the interactions so far (${previousInteractions.length} previous + 1 current), recommend the BEST next action.

Return JSON:
{
  "recommendedType": "call|email|sms|gmeet",
  "urgency": "immediate|within_24h|within_week|not_urgent",
  "reasoning": "2-3 sentence explanation of WHY this action type is best given the full history",
  "suggestedContent": "Brief outline of what the next interaction should cover",
  "leadTemperature": "hot|warm|cool|cold",
  "riskFactors": ["array of things that could go wrong"],
  "overallProgress": "A one-line summary of where this lead stands after all ${previousInteractions.length + 1} interactions"
}`,
            }],
          }],
        });

        const text = result.response.text()
          .replace(/```json?\n?/g, "").replace(/```/g, "")
          .replace(/,\s*([}\]])/g, "$1").trim();
        nextAction = JSON.parse(text);
      } catch (err: any) {
        this.logger.error(`Chain analysis failed: ${err.message}`);
        nextAction = {
          recommendedType: "call",
          urgency: "within_24h",
          reasoning: "Analysis failed — defaulting to follow-up call.",
          suggestedContent: "Follow up on previous conversation.",
          leadTemperature: "warm",
          riskFactors: ["AI analysis unavailable"],
          overallProgress: "Unable to evaluate."
        };
      }
    }

    return { report, goalEval, insights, nextAction };
  }

  /* ─── CENTRAL BRAIN / INTELLIGENCE ─── */

  @Get("intelligence/dashboard")
  getBrainDashboard() {
    return this.centralBrain.getBrainDashboard();
  }

  @Get("intelligence/lead/:leadId")
  async getLeadInsights(@Param("leadId") leadId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { error: "Lead not found" };
    return this.centralBrain.queryForLead(lead);
  }

  @Get("intelligence/winning-patterns")
  getWinningPatterns(@Query("segment") segment?: string) {
    return this.centralBrain.getWinningPatterns(segment);
  }

  @Get("intelligence/lost-patterns")
  getLostDealPatterns(@Query("segment") segment?: string) {
    return this.centralBrain.getLostDealPatterns(segment);
  }

  @Get("intelligence/moments")
  getConversationMoments(@Query("type") type?: string) {
    return this.centralBrain.getConversationMoments(type);
  }

  @Get("intelligence/timing")
  getTimingIntelligence(@Query("segment") segment?: string) {
    return this.centralBrain.getTimingIntelligence(segment);
  }

  @Get("intelligence/competitors")
  getCompetitorTrends() {
    return this.centralBrain.getCompetitorTrends();
  }

  @Get("intelligence/persona-performance")
  getPersonaPerformance(@Query("personaId") personaId?: string) {
    return this.centralBrain.getPersonaPerformance(personaId);
  }

  @Get("intelligence/re-engagement")
  getReEngagementPatterns() {
    return this.centralBrain.getReEngagementPatterns();
  }

  @Get("intelligence/call-remarks/:leadId")
  getCallRemarks(@Param("leadId") leadId: string) {
    return this.centralBrain.getCallRemarks(leadId);
  }

  /* ─── A/B TESTING ENGINE ─── */

  @Post("experiments")
  @Roles("ADMIN")
  createExperiment(@Body() body: any) {
    return this.abTesting.createExperiment(body);
  }

  @Get("experiments")
  listExperiments(@Query("status") status?: string) {
    return this.abTesting.listExperiments(status);
  }

  @Get("experiments/:id")
  getExperiment(@Param("id") id: string) {
    return this.abTesting.getExperiment(id);
  }

  @Put("experiments/:id")
  @Roles("ADMIN")
  updateExperiment(@Param("id") id: string, @Body() body: any) {
    return this.abTesting.updateExperiment(id, body);
  }

  @Delete("experiments/:id")
  @Roles("ADMIN")
  deleteExperiment(@Param("id") id: string) {
    return this.abTesting.deleteExperiment(id);
  }

  @Post("experiments/:id/start")
  @Roles("ADMIN")
  startExperiment(@Param("id") id: string) {
    return this.abTesting.startExperiment(id);
  }

  @Post("experiments/:id/pause")
  @Roles("ADMIN")
  pauseExperiment(@Param("id") id: string) {
    return this.abTesting.pauseExperiment(id);
  }

  @Post("experiments/record-outcome")
  recordExperimentOutcome(@Body() body: any) {
    return this.abTesting.recordOutcome(body);
  }

  @Get("experiments/variant/:leadId")
  getVariantForLead(
    @Param("leadId") leadId: string,
    @Query("type") type: string,
  ) {
    return this.abTesting.getActiveVariantForLead(leadId, type);
  }

  /* ─── SMART FOLLOW-UP SEQUENCER ─── */

  @Post("follow-ups/schedule")
  scheduleFollowUp(@Body() body: any) {
    return this.followUps.scheduleFollowUp(body);
  }

  @Get("follow-ups")
  listFollowUps(@Query("status") status?: string, @Query("limit") limit?: string) {
    return this.followUps.listFollowUps(status, limit ? parseInt(limit) : undefined);
  }

  @Get("follow-ups/stats")
  getFollowUpStats() {
    return this.followUps.getStats();
  }

  @Get("follow-ups/pending")
  getPendingFollowUps(@Query("limit") limit?: string) {
    return this.followUps.getPendingFollowUps(limit ? parseInt(limit) : undefined);
  }

  @Get("follow-ups/lead/:leadId")
  getLeadFollowUps(@Param("leadId") leadId: string) {
    return this.followUps.getLeadFollowUps(leadId);
  }

  @Patch("follow-ups/:id/complete")
  completeFollowUp(
    @Param("id") id: string,
    @Body() body: { resultSessionId?: string; outcome?: string },
  ) {
    return this.followUps.completeFollowUp(id, body.resultSessionId ?? '', body.outcome ?? '');
  }

  @Patch("follow-ups/:id/cancel")
  cancelFollowUp(@Param("id") id: string) {
    return this.followUps.cancelFollowUp(id);
  }

  @Post("follow-ups/re-engage")
  scheduleReEngagement(@Body() body: { leadId: string; dormantDays: number; segmentKey?: string }) {
    return this.followUps.scheduleReEngagement(body.leadId, body.dormantDays, body.segmentKey ?? '');
  }

  /* ─── OBJECTION PLAYBOOK ─── */

  @Post("playbook")
  @Roles("ADMIN")
  createPlaybookEntry(@Body() body: any) {
    return this.playbook.create(body);
  }

  @Get("playbook")
  listPlaybook(
    @Query("category") category?: string,
    @Query("segment") segment?: string,
    @Query("approved") approved?: string,
  ) {
    return this.playbook.list({
      category,
      segmentKey: segment,
      isApproved: approved === "true" ? true : approved === "false" ? false : undefined,
    });
  }

  @Get("playbook/stats")
  getPlaybookStats() {
    return this.playbook.getStats();
  }

  @Get("playbook/find")
  findBestResponse(
    @Query("objection") objection: string,
    @Query("segment") segment?: string,
  ) {
    return this.playbook.findBestResponse(objection, segment);
  }

  @Get("playbook/:id")
  getPlaybookEntry(@Param("id") id: string) {
    return this.playbook.get(id);
  }

  @Put("playbook/:id")
  @Roles("ADMIN")
  updatePlaybookEntry(@Param("id") id: string, @Body() body: any) {
    return this.playbook.update(id, body);
  }

  @Delete("playbook/:id")
  @Roles("ADMIN")
  deletePlaybookEntry(@Param("id") id: string) {
    return this.playbook.remove(id);
  }

  @Post("playbook/:id/approve")
  @Roles("ADMIN")
  approvePlaybookEntry(@Param("id") id: string) {
    return this.playbook.approve(id);
  }

  @Post("playbook/:id/reject")
  @Roles("ADMIN")
  rejectPlaybookEntry(@Param("id") id: string) {
    return this.playbook.reject(id);
  }

  @Post("playbook/:id/record-outcome")
  recordPlaybookOutcome(
    @Param("id") id: string,
    @Body() body: { won: boolean },
  ) {
    return this.playbook.recordOutcome(id, body.won);
  }

  @Post("playbook/seed")
  @Roles("ADMIN")
  seedPlaybook() {
    return this.playbook.seedDefaults();
  }

  /* ─── WEBHOOK / CRM PUSH ─── */

  @Post("webhooks")
  @Roles("ADMIN")
  createWebhook(@Body() body: any) {
    return this.webhooks.createEndpoint(body);
  }

  @Get("webhooks")
  listWebhooks() {
    return this.webhooks.listEndpoints();
  }

  @Get("webhooks/stats")
  getWebhookStats() {
    return this.webhooks.getStats();
  }

  @Get("webhooks/:id")
  getWebhook(@Param("id") id: string) {
    return this.webhooks.getEndpoint(id);
  }

  @Put("webhooks/:id")
  @Roles("ADMIN")
  updateWebhook(@Param("id") id: string, @Body() body: any) {
    return this.webhooks.updateEndpoint(id, body);
  }

  @Delete("webhooks/:id")
  @Roles("ADMIN")
  deleteWebhook(@Param("id") id: string) {
    return this.webhooks.deleteEndpoint(id);
  }

  @Post("webhooks/:id/toggle")
  @Roles("ADMIN")
  toggleWebhook(@Param("id") id: string, @Body() body: { isActive: boolean }) {
    return this.webhooks.toggleEndpoint(id, body.isActive);
  }

  @Post("webhooks/:id/test")
  @Roles("ADMIN")
  testWebhook(@Param("id") id: string) {
    return this.webhooks.testEndpoint(id);
  }

  @Get("webhooks/:id/deliveries")
  getWebhookDeliveries(@Param("id") id: string, @Query("limit") limit?: string) {
    return this.webhooks.listDeliveries(id, limit ? parseInt(limit) : undefined);
  }

  @Post("webhooks/deliveries/:id/retry")
  retryDelivery(@Param("id") id: string) {
    return this.webhooks.retryDelivery(id);
  }

  /* ─── CALL RECORDINGS + ANNOTATIONS ─── */

  @Get("recordings")
  listRecordings(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.recordings.listRecordings(
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined,
    );
  }

  @Get("recordings/stats")
  getRecordingStats() {
    return this.recordings.getStats();
  }

  @Get("recordings/annotations/stats")
  getAnnotationStats() {
    return this.recordings.getAnnotationStats();
  }

  @Get("recordings/:callSessionId")
  getRecording(@Param("callSessionId") callSessionId: string) {
    return this.recordings.getRecording(callSessionId);
  }

  @Delete("recordings/:id")
  @Roles("ADMIN")
  deleteRecording(@Param("id") id: string) {
    return this.recordings.deleteRecording(id);
  }

  @Post("recordings/save")
  saveRecording(@Body() body: any) {
    return this.recordings.saveRecording(body);
  }

  @Post("recordings/:id/annotations")
  addAnnotation(@Param("id") id: string, @Body() body: any) {
    return this.recordings.addAnnotation({ ...body, recordingId: id });
  }

  @Get("recordings/:id/annotations")
  listAnnotations(@Param("id") id: string) {
    return this.recordings.listAnnotations(id);
  }

  @Put("recordings/annotations/:id")
  updateAnnotation(@Param("id") id: string, @Body() body: any) {
    return this.recordings.updateAnnotation(id, body);
  }

  @Delete("recordings/annotations/:id")
  deleteAnnotation(@Param("id") id: string) {
    return this.recordings.deleteAnnotation(id);
  }

  @Post("recordings/annotations/:id/verify")
  verifyAnnotation(@Param("id") id: string) {
    return this.recordings.verifyAnnotation(id);
  }

  @Get("recordings/:callSessionId/suggestions")
  suggestAnnotations(@Param("callSessionId") callSessionId: string) {
    return this.recordings.suggestAnnotations(callSessionId);
  }

  /* ─── LIVE SENTIMENT DASHBOARD ─── */

  @Get("live/sentiment")
  async getLiveSentiment() {
    // Get active calls with recent emotion logs
    const activeCalls = await this.prisma.callSession.findMany({
      where: { status: "IN_PROGRESS" },
      include: {
        lead: { select: { name: true, phone: true } },
        agent: { select: { name: true } },
        emotionLogs: {
          orderBy: { timestamp: "desc" },
          take: 5,
        },
      },
    });

    return activeCalls.map((call: any) => ({
      sessionId: call.id,
      leadName: call.lead?.name,
      agentName: call.agent?.name,
      duration: call.startedAt
        ? Math.round((Date.now() - new Date(call.startedAt).getTime()) / 1000)
        : 0,
      emotions: call.emotionLogs.map((e: any) => ({
        emotion: e.emotion,
        confidence: e.confidence,
        timestamp: e.createdAt,
      })),
      currentSentiment: call.emotionLogs[0]?.emotion || "neutral",
    }));
  }

  @Get("live/sentiment/history/:callSessionId")
  async getCallSentimentHistory(@Param("callSessionId") id: string) {
    const emotions = await this.prisma.emotionLog.findMany({
      where: { callSessionId: id },
      orderBy: { timestamp: "asc" },
    });
    return emotions;
  }

  /* ─── LEAD INTERACTIONS / TIMELINE ─── */

  @Get("leads/:id/interactions")
  getLeadInteractions(
    @Param("id") leadId: string,
    @Query("limit") limit?: string,
  ) {
    return this.interactionService.getTimeline(leadId, limit ? parseInt(limit) : undefined);
  }

  @Get("leads/:id/interaction-stats")
  getLeadInteractionStats(@Param("id") leadId: string) {
    return this.interactionService.getLeadInteractionStats(leadId);
  }

  @Post("leads/:id/interactions")
  recordInteraction(
    @Param("id") leadId: string,
    @Body() body: { type: string; summary?: string; details?: string; channel?: string },
  ) {
    return this.interactionService.recordInteraction({
      leadId,
      type: body.type as any,
      channel: body.channel,
      summary: body.summary,
      details: body.details,
    });
  }

  /* ─── AI EMAIL ─── */

  @Post("email/send")
  sendEmail(@Body() body: {
    leadId: string;
    subject: string;
    body: string;
    htmlBody?: string;
    goalForEmail?: string;
    meetLink?: string;
    meetScheduledAt?: string;
    fromEmail?: string;
  }) {
    return this.aiEmail.sendEmail({
      ...body,
      meetScheduledAt: body.meetScheduledAt ? new Date(body.meetScheduledAt) : undefined,
    });
  }

  @Post("email/draft")
  generateEmailDraft(@Body() body: {
    leadId: string;
    purpose: string;
    includeMeetLink?: boolean;
  }) {
    return this.aiEmail.generateDraft(body);
  }

  @Post("email/inbound")
  async processInboundEmail(@Body() body: {
    from: string;
    to: string;
    subject: string;
    body: string;
    htmlBody?: string;
    messageId?: string;
    inReplyTo?: string;
  }) {
    const result = await this.aiEmail.processInbound(body);

    // Auto-join detected meetings from inbound emails
    if (result?.meetLinks?.length && result?.leadId) {
      for (const meetUrl of result.meetLinks) {
        this.strategyExecutor.autoJoinDetectedMeeting({
          leadId: result.leadId,
          meetUrl,
          emailSubject: body.subject,
        }).catch(err => {
          // Non-blocking — log but don't fail the inbound processing
          console.error(`Auto-join failed for ${meetUrl}:`, err.message);
        });
      }
    }

    return result;
  }

  @Get("leads/:id/emails")
  getLeadEmails(@Param("id") leadId: string) {
    return this.aiEmail.getLeadEmails(leadId);
  }

  @Get("email/:id")
  getEmail(@Param("id") id: string) {
    return this.aiEmail.getEmail(id);
  }

  /* ─── MEETINGS (Daily.co + Pipecat + MeetingBaas) ─── */

  @Post("meetings/schedule")
  @Roles("ADMIN")
  async scheduleMeeting(@Body() body: {
    leadId?: string;
    agentId: string;
    scheduledAt: string;
    title?: string;
    type?: "daily" | "external";
    externalMeetUrl?: string;
  }) {
    const scheduledAt = new Date(body.scheduledAt);
    // Allow a 2-minute grace window so "schedule now" from the playground works
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
    if (scheduledAt < twoMinAgo) {
      throw new HttpException("Scheduled time must be in the future", HttpStatus.BAD_REQUEST);
    }
    // If scheduledAt is in the past (within grace), bump to now + 10s
    if (scheduledAt <= new Date()) {
      scheduledAt.setTime(Date.now() + 10_000);
    }

    if (body.type === "external" && body.externalMeetUrl) {
      const extResult = await this.meetingOrchestrator.scheduleExternalMeeting({
        leadId: body.leadId,
        agentId: body.agentId,
        scheduledAt,
        externalMeetUrl: body.externalMeetUrl,
        title: body.title,
      });
      // Schedule BullMQ jobs for reminders + auto-launch
      await this.meetingScheduler.scheduleJobs(extResult.meetingId, scheduledAt).catch(() => {});
      return extResult;
    }

    // Default: create a Daily.co room
    const result = await this.meetingOrchestrator.scheduleDailyMeeting({
      leadId: body.leadId,
      agentId: body.agentId,
      scheduledAt,
      title: body.title,
    });

    // Schedule BullMQ jobs for reminders
    await this.meetingScheduler.scheduleJobs(result.meetingId, scheduledAt).catch(() => {});

    // Send email with meeting link if lead has email
    if (body.leadId) {
      const lead = await this.prisma.lead.findUnique({ where: { id: body.leadId } });
      const agent = await this.prisma.agentVoice.findUnique({ where: { id: body.agentId } });
      if (lead?.email) {
        await this.aiEmail.sendEmail({
          leadId: body.leadId,
          subject: body.title || `Meeting with ${agent?.name || "Orivraa"} — ${scheduledAt.toLocaleDateString()}`,
          body: `Hi ${lead.preferredName || lead.name},\n\nWe've scheduled a video meeting for ${scheduledAt.toLocaleString()}.\n\nJoin here: ${result.roomUrl}\n\nLooking forward to speaking with you!\n\nBest regards,\n${agent?.name || "Orivraa Team"}`,
          meetLink: result.roomUrl,
          meetScheduledAt: scheduledAt,
          goalForEmail: "Video meeting invitation",
          fromEmail: agent?.agentEmail || undefined,
        });
      }
    }

    return result;
  }

  @Get("meetings")
  @Roles("ADMIN")
  async listMeetings(
    @Query("status") status?: string,
    @Query("leadId") leadId?: string,
    @Query("limit") limit?: string,
  ) {
    return this.meetingOrchestrator.listMeetings({
      status,
      leadId,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get("meetings/:id")
  @Roles("ADMIN")
  async getMeeting(@Param("id") id: string) {
    const meeting = await this.meetingOrchestrator.getMeeting(id);
    if (!meeting) throw new HttpException("Meeting not found", HttpStatus.NOT_FOUND);
    return meeting;
  }

  @Post("meetings/:id/launch")
  @Roles("ADMIN")
  async launchMeeting(@Param("id") id: string) {
    try {
      return await this.meetingOrchestrator.launchDailyAgent(id);
    } catch (err: any) {
      throw new HttpException(err.message || "Failed to launch meeting", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post("meetings/:id/cancel")
  @Roles("ADMIN")
  async cancelMeeting(@Param("id") id: string) {
    try {
      await this.meetingOrchestrator.cancelMeeting(id);
      await this.meetingScheduler.cancelJobs(id).catch(() => {});
      return { success: true };
    } catch (err: any) {
      throw new HttpException(err.message || "Failed to cancel meeting", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post("meetings/webhook/daily")
  async dailyWebhook(@Body() body: any) {
    this.logger.log(`Daily.co webhook: ${body.event}`);
    // Handle Daily.co room events (participant-joined, participant-left, etc.)
    if (body.event === "meeting.ended") {
      const session = await this.prisma.meetingSession.findFirst({
        where: { dailyRoomName: body.payload?.room_name },
      });
      if (session) {
        await this.meetingOrchestrator.onMeetingEnd(session.id, body.payload?.transcript);
      }
    }
    return { received: true };
  }

  @Post("meetings/webhook/pipecat")
  async pipecatWebhook(@Body() body: any) {
    this.logger.log(`Pipecat webhook: ${JSON.stringify(body).substring(0, 200)}`);
    // Handle Pipecat session events (session.ended, etc.)
    if (body.event === "session.ended" || body.status === "completed") {
      const session = await this.prisma.meetingSession.findFirst({
        where: { pipecatSessionId: body.session_id || body.sessionId },
      });
      if (session) {
        await this.meetingOrchestrator.onMeetingEnd(session.id, body.transcript);
      }
    }
    return { received: true };
  }

  @Post("meetings/webhook/meetingbaas")
  async meetingBaasWebhook(@Body() body: any) {
    this.logger.log(`MeetingBaas webhook: ${JSON.stringify(body).substring(0, 200)}`);
    if (body.event === "bot.leave_call" || body.event === "complete") {
      const session = await this.prisma.meetingSession.findFirst({
        where: { meetingBaasBotId: body.bot_id || body.botId },
      });
      if (session) {
        // MeetingBaas sends transcript as array of {speaker, words, ...} or as string
        let transcript = "";
        if (typeof body.transcript === "string") {
          transcript = body.transcript;
        } else if (Array.isArray(body.transcript)) {
          transcript = body.transcript
            .map((t: any) => `${t.speaker || "Unknown"}: ${t.words || t.text || ""}`)
            .join("\n");
        } else if (body.mp4) {
          // Some MeetingBaas events include recording URL but no inline transcript
          this.logger.log(`MeetingBaas recording available: ${body.mp4}`);
        }
        await this.meetingOrchestrator.onMeetingEnd(session.id, transcript || undefined);
      }
    }
    return { received: true };
  }

  /* ─── LEAD STRATEGY (AI-powered next action) ─── */

  @Get("leads/:id/suggest-action")
  @Roles("ADMIN")
  async suggestAction(@Param("id") leadId: string) {
    return this.leadStrategy.suggestNextAction(leadId);
  }

  /* ─── INVITE LEAD TO BRANDED ORIVRAA MEETING ─── */

  @Post("leads/:id/invite-meeting")
  @Roles("ADMIN")
  async inviteLeadToMeeting(
    @Param("id") leadId: string,
    @Body() body: {
      agentId: string;
      scheduledAt: string;
      subject?: string;
      message?: string;
    },
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new HttpException("Lead not found", HttpStatus.NOT_FOUND);
    if (!lead.email) throw new HttpException("Lead has no email — cannot send invite", HttpStatus.BAD_REQUEST);

    const scheduledAt = new Date(body.scheduledAt);
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
    if (scheduledAt < twoMinAgo) {
      throw new HttpException("Scheduled time must be in the future", HttpStatus.BAD_REQUEST);
    }
    if (scheduledAt <= new Date()) {
      scheduledAt.setTime(Date.now() + 10_000);
    }

    const agent = await this.prisma.agentVoice.findUnique({ where: { id: body.agentId } });
    if (!agent) throw new HttpException("Agent not found", HttpStatus.NOT_FOUND);

    // 1. Create a branded Daily.co room with Pipecat agent
    const result = await this.meetingOrchestrator.scheduleDailyMeeting({
      leadId,
      agentId: body.agentId,
      scheduledAt,
      title: body.subject || `Orivraa Meeting with ${lead.name}`,
    });

    // 2. Schedule reminder jobs
    await this.meetingScheduler.scheduleJobs(result.meetingId, scheduledAt).catch(() => {});

    // 3. Send branded email invite
    const meetLink = result.roomUrl;
    const agentName = agent.name || "Orivraa";
    const customMessage = body.message || `I'd love to have a quick video call to discuss how Orivraa can help you. I've set up a meeting for us.`;

    await this.aiEmail.sendEmail({
      leadId,
      subject: body.subject || `${agentName} has invited you to a meeting — Orivraa`,
      body: `Hi ${lead.preferredName || lead.name},\n\n${customMessage}\n\n📅 When: ${scheduledAt.toLocaleString()}\n🔗 Join the meeting: ${meetLink}\n\nLooking forward to connecting!\n\nBest,\n${agentName}\nOrivraa Sales Team`,
      meetLink,
      meetScheduledAt: scheduledAt,
      goalForEmail: "Video meeting invitation — Orivraa branded session",
      fromEmail: agent.agentEmail || undefined,
    });

    // 4. Record as interaction
    await this.interactionService.recordInteraction({
      leadId,
      type: "GMEET",
      channel: "daily",
      direction: "outbound",
      referenceId: result.meetingId,
      referenceType: "MeetingSession",
      summary: `Invited to Orivraa meeting: ${body.subject || "Video call"}`,
      goalSet: "Video meeting with lead",
      agentName: agentName,
      metadata: {
        meetingId: result.meetingId,
        roomUrl: meetLink,
        scheduledAt: scheduledAt.toISOString(),
      },
    });

    return {
      meetingId: result.meetingId,
      roomUrl: meetLink,
      scheduledAt,
      emailSent: true,
    };
  }

  /* ─── JOIN EXTERNAL MEETING (Google Meet / Zoom) ─── */

  @Post("leads/:id/join-external-meeting")
  @Roles("ADMIN")
  async joinExternalMeeting(
    @Param("id") leadId: string,
    @Body() body: {
      meetUrl: string;
      agentId: string;
    },
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new HttpException("Lead not found", HttpStatus.NOT_FOUND);

    const agent = await this.prisma.agentVoice.findUnique({ where: { id: body.agentId } });
    if (!agent) throw new HttpException("Agent not found", HttpStatus.NOT_FOUND);

    // Create meeting session record
    const session = await this.prisma.meetingSession.create({
      data: {
        leadId,
        agentId: body.agentId,
        type: "external",
        status: "launching",
        title: `Joining ${lead.name}'s meeting`,
        externalMeetUrl: body.meetUrl,
        scheduledAt: new Date(),
        startedAt: new Date(),
      },
    });

    // Determine meeting type and join accordingly
    const isGoogleMeet = body.meetUrl.includes("meet.google.com");

    if (isGoogleMeet) {
      // Use GoogleMeetBotService to join Google Meet
      try {
        const meetSession = await this.meetBot.startSession(
          body.meetUrl,
          body.agentId,
          leadId,
        );

        await this.prisma.meetingSession.update({
          where: { id: session.id },
          data: { status: "active" },
        });

        return { meetingSessionId: session.id, botSessionId: meetSession.id, status: "joining" };
      } catch (err: any) {
        await this.prisma.meetingSession.update({
          where: { id: session.id },
          data: { status: "error" },
        });
        throw new HttpException(`Failed to join Google Meet: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    // Fallback: use MeetingBaas for other meeting types
    try {
      const extResult = await this.meetingOrchestrator.scheduleExternalMeeting({
        leadId,
        agentId: body.agentId,
        scheduledAt: new Date(),
        externalMeetUrl: body.meetUrl,
        title: `Joining ${lead.name}'s meeting`,
      });

      return { meetingSessionId: session.id, status: "joining" };
    } catch (err: any) {
      await this.prisma.meetingSession.update({
        where: { id: session.id },
        data: { status: "error" },
      });
      throw new HttpException(`Failed to join meeting: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /* ─── DETECT MEET LINKS IN LEAD EMAILS ─── */

  @Get("leads/:id/detected-meetings")
  @Roles("ADMIN")
  async getDetectedMeetings(@Param("id") leadId: string) {
    // Find emails from this lead that contain meet links
    const emails = await this.prisma.leadEmail.findMany({
      where: {
        leadId,
        direction: "RECEIVED",
        meetLink: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Also find pending external meeting sessions for this lead
    const pendingSessions = await this.prisma.meetingSession.findMany({
      where: {
        leadId,
        type: "external",
        status: { in: ["scheduled", "launching"] },
      },
      orderBy: { scheduledAt: "desc" },
    });

    return { emailsWithMeetLinks: emails, pendingMeetings: pendingSessions };
  }

  /* ─── AUTONOMOUS EXECUTION ─── */

  @Post("leads/:id/auto-execute")
  @Roles("ADMIN")
  async autoExecuteStrategy(@Param("id") leadId: string) {
    return this.strategyExecutor.executeStrategy(leadId);
  }

  @Post("leads/auto-execute-all")
  @Roles("ADMIN")
  async autoExecuteAll() {
    const activeLeads = await this.prisma.lead.findMany({
      where: {
        stage: { in: ["NEW", "CONTACTED", "QUALIFIED", "DEMO"] },
      },
      select: { id: true, name: true },
    });

    const results = [];
    for (const lead of activeLeads) {
      try {
        const result = await this.strategyExecutor.executeStrategy(lead.id);
        results.push({ leadId: lead.id, name: lead.name, ...result });
      } catch (err) {
        results.push({ leadId: lead.id, name: lead.name, error: err.message });
      }
    }
    return { executed: results.length, results };
  }

  // ── Post-Interaction Pipeline ──────────────────────────────────────────

  @Post("leads/:id/run-pipeline")
  @Roles("ADMIN")
  async runPipelineForLead(@Param("id") leadId: string) {
    // Manually trigger the pipeline for a lead (re-score + stage + strategy)
    await this.interactionPipeline.afterCall(leadId, "manual-trigger");
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, name: true, score: true, temperature: true, stage: true, nextCallStrategy: true },
    });
    return { success: true, lead };
  }

  @Post("leads/run-pipeline-all")
  @Roles("ADMIN")
  async runPipelineForAll() {
    const leads = await this.prisma.lead.findMany({
      where: { stage: { notIn: ["WON", "LOST", "CHURNED"] } },
      select: { id: true, name: true },
    });

    const results = [];
    for (const lead of leads) {
      try {
        await this.interactionPipeline.afterCall(lead.id, "bulk-trigger");
        const updated = await this.prisma.lead.findUnique({
          where: { id: lead.id },
          select: { score: true, temperature: true, stage: true, nextCallStrategy: true },
        });
        results.push({ leadId: lead.id, name: lead.name, ...updated });
      } catch (err) {
        results.push({ leadId: lead.id, name: lead.name, error: err.message });
      }
    }
    return { processed: results.length, results };
  }
}
