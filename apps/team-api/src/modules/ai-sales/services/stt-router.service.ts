import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AgentMemoryService } from "./agent-memory.service";
import { SarvamSTTClient } from "./sarvam-stt.service";

export interface STTResult {
  transcript: string;
  detectedLanguage: string;
  provider: "deepgram" | "sarvam";
}

/**
 * STT Router — intelligently routes audio to the best STT provider
 * based on detected language and admin configuration.
 *
 * Auto mode flow (per call):
 *   1. First audio chunk → Sarvam (auto-detect language)
 *   2. Sarvam returns detected language_code
 *   3. If English → switch to Deepgram for rest of call (better accuracy)
 *      If Hindi/regional → stay on Sarvam
 *
 * Configurable via Admin → Advanced Settings → STT Provider:
 *   "auto"     — language-based routing (recommended)
 *   "deepgram" — always Deepgram (English-only customers)
 *   "sarvam"   — always Sarvam (Indian-language customers)
 *
 * Also handles keyword boosting for Deepgram (gold/jewelry terms from Agent Memory).
 */
@Injectable()
export class STTRouterService {
  private readonly logger = new Logger(STTRouterService.name);
  private sessionLanguages = new Map<string, string>();

  constructor(
    private config: ConfigService,
    private memory: AgentMemoryService,
    private sarvam: SarvamSTTClient,
  ) {}

  /**
   * Transcribe audio buffer using the best provider for this session.
   * @param audioBuffer Raw mulaw/8000 audio from Twilio
   * @param sessionId   Call session ID (for per-session language tracking)
   * @param hintLanguage Agent's configured language (fallback hint)
   */
  async transcribe(
    audioBuffer: Buffer,
    sessionId: string,
    hintLanguage: string = "en",
  ): Promise<STTResult> {
    const provider = this.memory.get("advanced", "stt_provider") || "auto";
    const detectedLang = this.sessionLanguages.get(sessionId);

    // Fixed provider mode
    if (provider === "deepgram") {
      return this.transcribeWithDeepgram(audioBuffer, hintLanguage);
    }
    if (provider === "sarvam") {
      return this.transcribeWithSarvam(audioBuffer, detectedLang);
    }

    // ─── Auto mode ───

    // Already detected language for this session → route accordingly
    if (detectedLang) {
      if (detectedLang.startsWith("en")) {
        return this.transcribeWithDeepgram(audioBuffer, "en");
      }
      return this.transcribeWithSarvam(audioBuffer, detectedLang);
    }

    // First chunk of call → use Sarvam for language detection
    const hasSarvam = !!this.config.get<string>("SARVAM_API_KEY");
    if (hasSarvam) {
      const result = await this.sarvam.transcribe(audioBuffer);
      if (result.transcript && result.languageCode !== "unknown") {
        this.sessionLanguages.set(sessionId, result.languageCode);
        this.logger.log(
          `Session ${sessionId}: detected language ${result.languageCode} via Sarvam`,
        );
        return {
          transcript: result.transcript,
          detectedLanguage: result.languageCode,
          provider: "sarvam",
        };
      }
    }

    // Sarvam unavailable or returned empty → fall back to Deepgram
    return this.transcribeWithDeepgram(audioBuffer, hintLanguage);
  }

  /** Deepgram Nova-2 with keyword boosting */
  private async transcribeWithDeepgram(
    audioBuffer: Buffer,
    language: string,
  ): Promise<STTResult> {
    const deepgramKey = this.config.get("DEEPGRAM_API_KEY");
    if (!deepgramKey) {
      return { transcript: "", detectedLanguage: language, provider: "deepgram" };
    }

    try {
      const { createClient: createDeepgramClient } = await import(
        "@deepgram/sdk"
      ) as any;
      const deepgram = createDeepgramClient(deepgramKey);

      const keywords = this.getKeywords();
      const options: Record<string, unknown> = {
        model: "nova-2",
        language: language.split("-")[0] || "en",
        smart_format: true,
        encoding: "mulaw",
        sample_rate: 8000,
      };

      if (keywords.length > 0) {
        options.keywords = keywords;
      }

      const { result } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        options,
      );

      const transcript =
        result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
      const detected =
        result?.results?.channels?.[0]?.detected_language || language;

      return { transcript, detectedLanguage: detected, provider: "deepgram" };
    } catch (err: any) {
      this.logger.error(`Deepgram STT error: ${err.message}`);
      return { transcript: "", detectedLanguage: language, provider: "deepgram" };
    }
  }

  /** Sarvam AI (Hindi, Tamil, Telugu, Bengali, etc.) */
  private async transcribeWithSarvam(
    audioBuffer: Buffer,
    language?: string,
  ): Promise<STTResult> {
    const result = await this.sarvam.transcribe(audioBuffer, language);
    return {
      transcript: result.transcript,
      detectedLanguage: result.languageCode,
      provider: "sarvam",
    };
  }

  /**
   * Keyword boosting list from Agent Memory.
   * Format: "word:intensity" — Deepgram uses intensity -10 to 10.
   */
  private getKeywords(): string[] {
    const raw = this.memory.get("advanced", "stt_keywords");
    if (!raw) return [];
    return raw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
      .map((k) => (k.includes(":") ? k : `${k}:3`));
  }

  /** Get detected language for a session (used by gateway for multilingual prompts) */
  getSessionLanguage(sessionId: string): string | undefined {
    return this.sessionLanguages.get(sessionId);
  }

  /** Clean up when call ends */
  clearSession(sessionId: string) {
    this.sessionLanguages.delete(sessionId);
  }
}
