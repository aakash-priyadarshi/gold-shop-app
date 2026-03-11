import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface TTSClient {
  streamFromText(text: string, voiceId: string): AsyncGenerator<Buffer, void, unknown>;
}

/**
 * InworldTTSClient — drop-in alternative to ElevenLabs for A/B benchmarking.
 * Activated via TTS_PROVIDER=inworld env var.
 *
 * Falls back gracefully if INWORLD_API_KEY is not set.
 */
@Injectable()
export class InworldTTSClient implements TTSClient {
  private readonly logger = new Logger(InworldTTSClient.name);

  constructor(private config: ConfigService) {}

  async *streamFromText(text: string, voiceId: string): AsyncGenerator<Buffer, void, unknown> {
    const apiKey = this.config.get("INWORLD_API_KEY");
    if (!apiKey) {
      this.logger.debug(`[Inworld TTS stub] ${text}`);
      return;
    }

    try {
      const response = await fetch("https://studio.inworld.ai/v1/tts/stream", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voice: voiceId || "default",
          output_format: "mulaw_8000",
        }),
      });

      if (!response.ok || !response.body) {
        this.logger.error(`Inworld TTS failed: ${response.status}`);
        return;
      }

      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield Buffer.from(value);
      }
    } catch (err: any) {
      this.logger.error(`Inworld TTS error: ${err.message}`);
    }
  }
}

/** Factory function to select TTS provider based on environment variable */
export function getTTSProvider(config: ConfigService): "elevenlabs" | "inworld" {
  const provider = config.get("TTS_PROVIDER") || "elevenlabs";
  return provider === "inworld" ? "inworld" : "elevenlabs";
}
