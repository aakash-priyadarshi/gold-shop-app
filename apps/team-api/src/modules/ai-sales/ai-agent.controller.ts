import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { Roles } from "../../auth/roles.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { AIAgentService } from "./ai-agent.service";
import { ABTestingService } from "./services/ab-testing.service";
import { AgentMemoryService } from "./services/agent-memory.service";
import { AgentVoiceService } from "./services/agent-voice.service";
import { BehaviorInsightService } from "./services/behavior-insight.service";
import { CallOrchestratorService } from "./services/call-orchestrator.service";
import { CallRecordingService } from "./services/call-recording.service";
import { CampaignSchedulerService } from "./services/campaign-scheduler.service";
import { CentralBrainService } from "./services/central-brain.service";
import { ConversationBrainService } from "./services/conversation-brain.service";
import { FollowUpSequencerService } from "./services/follow-up-sequencer.service";
import { GeminiStreamingClient } from "./services/gemini-streaming.service";
import { LeadScoringService } from "./services/lead-scoring.service";
import { ObjectionPlaybookService } from "./services/objection-playbook.service";
import { STTRouterService } from "./services/stt-router.service";
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
  initiateCall(@Body() body: { agentId: string; leadId: string; campaignId?: string }) {
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
    @Body() body: { agentId: string; history?: string },
  ) {
    if (!file) throw new Error("No audio file uploaded");

    let agent = await this.svc.getAgent(body.agentId);
    const history: { role: string; text: string }[] = body.history ? JSON.parse(body.history) : [];

    // 1. STT — transcribe audio
    const sttStart = Date.now();
    const sttResult = await this.sttRouter.transcribeBrowserAudio(
      file.buffer,
      `playground-${Date.now()}`,
      agent.languages?.[0] || "en",
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
}
