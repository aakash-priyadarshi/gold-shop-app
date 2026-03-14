import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * Pipecat Cloud Service
 *
 * Deploys voice AI agents on Pipecat Cloud (owned by Daily.co).
 * Agents use Daily.co WebRTC transport for real-time audio.
 * Pricing: $0.01/min per running agent.
 *
 * API docs: https://docs.pipecat.ai/cloud/api-reference
 */
@Injectable()
export class PipecatCloudService {
  private readonly logger = new Logger(PipecatCloudService.name);
  private readonly baseUrl = "https://api.pipecat.daily.co/v1";

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
   * Deploy a voice agent to a Daily.co room.
   * The agent runs STT → LLM → TTS in real-time.
   */
  async deployAgent(opts: {
    dailyRoomUrl: string;
    agentName: string;
    systemPrompt: string;
    voiceId: string; // ElevenLabs voice ID
    greeting?: string;
    webhookUrl?: string;
  }): Promise<{ sessionId: string }> {
    const data = await this.request("/agents/start", {
      method: "POST",
      body: JSON.stringify({
        // Daily.co room to join
        room_url: opts.dailyRoomUrl,

        // Agent configuration
        agent_name: opts.agentName,
        config: {
          // STT: Google Cloud Speech-to-Text (primary), Deepgram (fallback)
          stt: {
            provider: "google",
            language: "en-IN",
            model: "latest_long",
          },

          // LLM: The agent's brain
          llm: {
            provider: "google",
            model: "gemini-2.5-flash",
            system_prompt: opts.systemPrompt,
            temperature: 0.7,
          },

          // TTS: ElevenLabs for natural voice
          tts: {
            provider: "elevenlabs",
            voice_id: opts.voiceId,
            model_id: "eleven_turbo_v2_5",
            stability: 0.5,
            similarity_boost: 0.75,
          },

          // Transport: Daily.co WebRTC
          transport: {
            provider: "daily",
            room_url: opts.dailyRoomUrl,
          },
        },

        // Initial greeting when agent joins
        initial_message: opts.greeting || `Hello! I'm ${opts.agentName} from Orivraa. How can I help you today?`,

        // Webhook for meeting-end events
        webhook_url: opts.webhookUrl,
      }),
    });

    this.logger.log(`Deployed Pipecat agent "${opts.agentName}" → session ${data.session_id}`);
    return { sessionId: data.session_id };
  }

  /** Stop a running agent session */
  async stopAgent(sessionId: string): Promise<void> {
    try {
      await this.request(`/agents/${sessionId}/stop`, { method: "POST" });
      this.logger.log(`Stopped Pipecat agent session: ${sessionId}`);
    } catch (err: any) {
      this.logger.warn(`Failed to stop session ${sessionId}: ${err.message}`);
    }
  }

  /** Get session status */
  async getSessionStatus(sessionId: string): Promise<any> {
    return this.request(`/agents/${sessionId}`);
  }
}
