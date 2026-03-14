import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * MeetingBaas Service
 *
 * Integrates with MeetingBaas (https://meetingbaas.com) to send a speaking AI bot
 * into external meetings (Google Meet, Zoom, Microsoft Teams).
 *
 * Used in Scenario 2: lead shares their own meeting link.
 */
@Injectable()
export class MeetingBaasService {
  private readonly logger = new Logger(MeetingBaasService.name);
  private readonly baseUrl = "https://api.meetingbaas.com";

  constructor(private prisma: PrismaService) {}

  private async getApiKey(): Promise<string> {
    const settings = await this.prisma.teamSettings.findUnique({
      where: { id: "singleton" },
    });
    if (!settings?.meetingBaasApiKey) {
      throw new Error("MeetingBaas API key not configured. Add it in Settings.");
    }
    return settings.meetingBaasApiKey;
  }

  /**
   * Deploy a bot to join an external meeting.
   * The bot will speak using the configured TTS voice and listen via STT.
   *
   * MeetingBaas supports a "speaking bot" mode where the bot can:
   * - Listen to participants via STT
   * - Process audio through an LLM
   * - Respond via TTS back into the meeting
   */
  async joinMeeting(opts: {
    meetingUrl: string;
    botName: string;
    botImage?: string;
    entryMessage?: string;
    reserved?: boolean;
    speechToTextProvider?: "Default" | "Gladia" | "Runpod";
    webhookUrl?: string;
    // Voice AI configuration
    systemPrompt?: string;
    ttsVoiceId?: string;
    llmModel?: string;
  }): Promise<{ botId: string }> {
    const apiKey = await this.getApiKey();

    // Retrieve API keys from TeamSettings for the speaking bot
    const settings = await this.prisma.teamSettings.findUnique({
      where: { id: "singleton" },
    });

    const payload: Record<string, any> = {
      meeting_url: opts.meetingUrl,
      bot_name: opts.botName || "Aria",
      reserved: opts.reserved ?? false,
      speech_to_text_provider: opts.speechToTextProvider || "Default",
      automatic_leave: {
        waiting_room_timeout: 600,
        noone_joined_timeout: 300,
        everyone_left_timeout: 10,
      },
      // Enable recording for transcript extraction
      recording_mode: "speaker_view",
      deduplication_key: `orivraa-${Date.now()}`,
    };

    if (opts.botImage) payload.bot_image = opts.botImage;
    if (opts.entryMessage) payload.entry_message = opts.entryMessage;
    if (opts.webhookUrl) payload.webhook_url = opts.webhookUrl;

    // Configure speaking bot if system prompt is provided
    if (opts.systemPrompt) {
      payload.speech = {
        system_prompt: opts.systemPrompt,
        ...(opts.llmModel && { model: opts.llmModel }),
        ...(opts.ttsVoiceId && { tts_voice_id: opts.ttsVoiceId }),
      };
    }

    // Pass through API keys for the bot's AI pipeline
    if (settings) {
      const extraHeaders: Record<string, string> = {};
      const geminiKey = process.env.GEMINI_API_KEY;
      const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
      if (geminiKey) extraHeaders["x-gemini-api-key"] = geminiKey;
      if (elevenLabsKey) extraHeaders["x-elevenlabs-api-key"] = elevenLabsKey;
      if (Object.keys(extraHeaders).length > 0) {
        payload.extra = { ...payload.extra, api_keys: extraHeaders };
      }
    }

    this.logger.log(`Deploying MeetingBaas bot to ${opts.meetingUrl}`);

    const res = await fetch(`${this.baseUrl}/bots`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-spoke-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`MeetingBaas joinMeeting failed: ${res.status} ${text}`);
      throw new Error(`MeetingBaas API error: ${res.status} — ${text}`);
    }

    const data = await res.json();
    this.logger.log(`MeetingBaas bot deployed: ${data.bot_id || data.id}`);

    return { botId: data.bot_id || data.id };
  }

  /**
   * Remove the bot from a meeting.
   */
  async leaveMeeting(botId: string): Promise<void> {
    const apiKey = await this.getApiKey();

    const res = await fetch(`${this.baseUrl}/bots/${botId}`, {
      method: "DELETE",
      headers: {
        "x-spoke-api-key": apiKey,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`MeetingBaas leaveMeeting failed: ${res.status} ${text}`);
    } else {
      this.logger.log(`MeetingBaas bot ${botId} removed`);
    }
  }

  /**
   * Check status of a deployed bot.
   */
  async getBotStatus(botId: string): Promise<any> {
    const apiKey = await this.getApiKey();

    const res = await fetch(`${this.baseUrl}/bots/meeting_data?bot_id=${botId}`, {
      method: "GET",
      headers: {
        "x-spoke-api-key": apiKey,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`MeetingBaas status error: ${res.status} — ${text}`);
    }

    return res.json();
  }
}
