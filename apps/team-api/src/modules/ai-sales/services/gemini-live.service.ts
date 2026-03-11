import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import WebSocket from "ws";
import { AgentMemoryService } from "./agent-memory.service";

/**
 * GeminiLiveClient — optional mode using Gemini Live API for native audio-to-audio.
 *
 * When AUDIO_MODE=gemini_live:
 * - Replaces both Deepgram STT and ElevenLabs TTS
 * - Audio flows: Twilio → Gemini Live → Twilio (direct audio-to-audio)
 * - Lowest possible latency but less control over voice
 *
 * Default mode (AUDIO_MODE=deepgram) keeps the standard pipeline:
 * Twilio → Deepgram STT → Gemini text → ElevenLabs TTS → Twilio
 */
@Injectable()
export class GeminiLiveClient {
  private readonly logger = new Logger(GeminiLiveClient.name);
  private ws: WebSocket | null = null;
  private responseCallback: ((audio: Buffer) => void) | null = null;
  private isSessionOpen = false;

  constructor(
    private config: ConfigService,
    private memory: AgentMemoryService,
  ) {}

  isEnabled(): boolean {
    return this.memory.get("advanced", "audio_mode") === "gemini_live";
  }

  async openSession(systemPrompt: string, language: string = "en"): Promise<boolean> {
    if (!this.isEnabled()) return false;

    const apiKey = this.config.get<string>("GEMINI_API_KEY");
    if (!apiKey) {
      this.logger.warn("GEMINI_API_KEY not set — cannot open Gemini Live session");
      return false;
    }

    try {
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(apiKey)}`;

      this.ws = new WebSocket(wsUrl);

      return new Promise((resolve) => {
        this.ws!.on("open", () => {
          // Send setup message
          this.ws!.send(JSON.stringify({
            setup: {
              model: "models/gemini-2.5-flash-lite",
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: "Aoede" },
                  },
                },
              },
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
            },
          }));
          this.isSessionOpen = true;
          this.logger.log("Gemini Live session opened");
          resolve(true);
        });

        this.ws!.on("message", (data: Buffer) => {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.serverContent?.modelTurn?.parts) {
              for (const part of msg.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  const audioBuffer = Buffer.from(part.inlineData.data, "base64");
                  this.responseCallback?.(audioBuffer);
                }
              }
            }
          } catch {
            // Binary audio data
            if (this.responseCallback) {
              this.responseCallback(Buffer.from(data));
            }
          }
        });

        this.ws!.on("error", (err) => {
          this.logger.error(`Gemini Live WebSocket error: ${err.message}`);
          this.isSessionOpen = false;
          resolve(false);
        });

        this.ws!.on("close", () => {
          this.isSessionOpen = false;
          this.logger.log("Gemini Live session closed");
        });
      });
    } catch (err: any) {
      this.logger.error(`Failed to open Gemini Live session: ${err.message}`);
      return false;
    }
  }

  /** Feed raw audio chunk from Twilio directly to Gemini */
  feedAudio(chunk: Buffer) {
    if (!this.isSessionOpen || !this.ws) return;

    try {
      this.ws.send(JSON.stringify({
        realtimeInput: {
          mediaChunks: [{
            mimeType: "audio/pcm;rate=8000",
            data: chunk.toString("base64"),
          }],
        },
      }));
    } catch (err: any) {
      this.logger.error(`Failed to feed audio to Gemini Live: ${err.message}`);
    }
  }

  /** Register callback for response audio from Gemini */
  onResponseAudio(callback: (audio: Buffer) => void) {
    this.responseCallback = callback;
  }

  async closeSession() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isSessionOpen = false;
      this.responseCallback = null;
    }
  }
}
