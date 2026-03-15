import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * Pipecat Cloud Service
 *
 * Starts sessions of the deployed "orivraa-sales" agent on Pipecat Cloud.
 * The Python bot (pipecat-agent/bot.py) must be deployed first via:
 *   cd pipecat-agent && uv run pipecat cloud deploy
 *
 * Agent uses: Google STT → Gemini 2.5 Flash → ElevenLabs TTS
 * Transport: Daily.co WebRTC
 * Pricing: $0.01/min per running agent (agent-1x profile)
 *
 * Docs: https://docs.pipecat.ai/deployment/pipecat-cloud
 */
@Injectable()
export class PipecatCloudService {
  private readonly logger = new Logger(PipecatCloudService.name);
  private readonly baseUrl = "https://api.pipecat.daily.co/v1";
  // Must match agent_name in pipecat-agent/pcc-deploy.toml
  private readonly agentName = "orivraa-sales";

  constructor(private prisma: PrismaService) {}

  private async getApiKey(): Promise<string> {
    const settings = (await this.prisma.teamSettings.findUnique({ where: { id: "singleton" } })) as any;
    const key = settings?.pipecatCloudApiKey;
    if (!key) throw new Error("Pipecat Cloud API key not configured. Add it in Settings.");
    return key;
  }

  private async request(path: string, options: RequestInit = {}) {
    const apiKey = await this.getApiKey();
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Pipecat Cloud API error (${res.status}): ${body}`);
    }
    return res.json();
  }

  /**
   * Start a new session of the deployed agent.
   * Pipecat Cloud creates a Daily room and returns connection credentials.
   *
   * Dynamic config is passed via `body` and received in bot.py's runner_args.body
   */
  async deployAgent(opts: {
    agentName?: string;
    systemPrompt: string;
    voiceId: string;
    greeting?: string;
    leadName?: string;
    language?: string;
    webhookUrl?: string;
    availableAgents?: Array<{ name: string; voice_id: string; personality?: string; greeting?: string }>;
  }): Promise<{ sessionId: string; roomUrl: string; token: string }> {
    // Pipecat Cloud REST API: POST /v1/public/{service}/start
    // MUST use createDailyRoom: true so Pipecat Cloud sets runner_args.room_url/token
    // for the agent's DailyTransport. Without it the agent starts headless.
    const payload: Record<string, any> = {
      createDailyRoom: true,
      body: {
        system_prompt: opts.systemPrompt,
        voice_id: opts.voiceId,
        greeting: opts.greeting || `I'm calling from Orivraa. How are you today?`,
        lead_name: opts.leadName || "",
        agent_name: opts.agentName || "Orivraa Sales",
        language: opts.language || "en-IN",
        ...(opts.webhookUrl && { webhook_url: opts.webhookUrl }),
        ...(opts.availableAgents && { available_agents: opts.availableAgents }),
      },
      dailyRoomProperties: {
        max_participants: 10,
        enable_chat: true,
        enable_screenshare: true,
        enable_recording: "cloud",
        enable_people_ui: true,
        enable_emoji_reactions: true,
        enable_prejoin_ui: true,
        start_video_off: true,
      },
    };

    const data = await this.request(`/public/${this.agentName}/start`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // Response: { sessionId, dailyRoom, dailyToken, ... }
    const roomUrl = data.dailyRoom || data.room_url || data.url || "";
    const token = data.dailyToken || data.token || "";
    const sessionId = data.sessionId || data.session_id || "";

    this.logger.log(`Started Pipecat session ${sessionId} → room ${roomUrl}`);

    return { sessionId, roomUrl, token };
  }

  /** Stop a running agent session */
  async stopAgent(sessionId: string): Promise<void> {
    try {
      await this.request(`/agents/${this.agentName}/sessions/${sessionId}/stop`, {
        method: "POST",
      });
      this.logger.log(`Stopped Pipecat session: ${sessionId}`);
    } catch (err: any) {
      this.logger.warn(`Failed to stop session ${sessionId}: ${err.message}`);
    }
  }

  /** Get session status */
  async getSessionStatus(sessionId: string): Promise<any> {
    return this.request(`/agents/${this.agentName}/sessions/${sessionId}`);
  }

  /** List all active sessions */
  async listSessions(): Promise<any> {
    return this.request(`/agents/${this.agentName}/sessions`);
  }
}
