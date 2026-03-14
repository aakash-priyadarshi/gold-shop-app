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
    dailyRoomUrl?: string; // Optional: use pre-created room, otherwise Pipecat creates one
    agentName?: string;
    systemPrompt: string;
    voiceId: string;
    greeting?: string;
    leadName?: string;
    language?: string;
    webhookUrl?: string;
  }): Promise<{ sessionId: string; roomUrl: string; token: string }> {
    const data = await this.request(`/agents/${this.agentName}/start`, {
      method: "POST",
      body: JSON.stringify({
        // Pass dynamic config to bot.py via runner_args.body
        body: {
          system_prompt: opts.systemPrompt,
          voice_id: opts.voiceId,
          greeting: opts.greeting || `I'm calling from Orivraa. How are you today?`,
          lead_name: opts.leadName || "",
          agent_name: opts.agentName || "Orivraa Sales",
          language: opts.language || "en-IN",
        },
        // Optional: join a pre-created Daily room
        ...(opts.dailyRoomUrl && { room_url: opts.dailyRoomUrl }),
        // Webhook for session lifecycle events
        ...(opts.webhookUrl && { webhook_url: opts.webhookUrl }),
      }),
    });

    this.logger.log(
      `Started Pipecat session ${data.session_id} → room ${data.room_url || data.url}`,
    );

    return {
      sessionId: data.session_id,
      roomUrl: data.room_url || data.url || opts.dailyRoomUrl || "",
      token: data.token || "",
    };
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
