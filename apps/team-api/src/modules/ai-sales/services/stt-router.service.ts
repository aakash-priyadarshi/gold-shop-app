import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AgentMemoryService } from "./agent-memory.service";
import { SarvamSTTClient } from "./sarvam-stt.service";
import { GoogleSTTClient } from "./google-stt.service";

export interface STTResult {
  transcript: string;
  detectedLanguage: string;
  provider: "google" | "sarvam" | "deepgram";
}

/**
 * STT Router — intelligently routes audio to the best STT provider
 * based on detected language and admin configuration.
 *
 * Priority order:
 *   1. Sarvam AI — best for Hindi, Tamil, Telugu, Bengali and Indian dialects
 *   2. Google Cloud STT — best for Indian English (en-IN model), also supports
 *      Hindi/regional with auto language detection
 *   3. Deepgram — last resort fallback (poor Indian accent recognition)
 *
 * Auto mode flow (per call):
 *   1. First audio chunk → Sarvam (auto-detect language)
 *   2. If Hindi/regional detected → stay on Sarvam for rest of call
 *      If English detected → switch to Google STT (en-IN model)
 *   3. If both unavailable → fall back to Deepgram
 *
 * Configurable via Admin → Advanced Settings → STT Provider:
 *   "auto"     — language-based routing (recommended)
 *   "google"   — always Google STT (good for Indian English + multilingual)
 *   "sarvam"   — always Sarvam AI (best for Hindi/regional languages)
 *   "deepgram" — always Deepgram (last resort, poor Indian accent support)
 */
@Injectable()
export class STTRouterService {
  private readonly logger = new Logger(STTRouterService.name);
  private sessionLanguages = new Map<string, string>();

  constructor(
    private config: ConfigService,
    private memory: AgentMemoryService,
    private sarvam: SarvamSTTClient,
    private googleSTT: GoogleSTTClient,
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
    if (provider === "google") {
      return this.transcribeWithGoogle(audioBuffer, hintLanguage);
    }
    if (provider === "sarvam") {
      return this.transcribeWithSarvam(audioBuffer, detectedLang);
    }
    if (provider === "deepgram") {
      return this.transcribeWithDeepgram(audioBuffer, hintLanguage);
    }

    // ─── Auto mode ───

    // Always try Sarvam first — it handles Hindi, English, and all Indian languages well
    const hasSarvam = !!this.config.get<string>("SARVAM_API_KEY");
    if (hasSarvam) {
      const result = await this.sarvam.transcribe(audioBuffer, detectedLang);
      if (result.transcript) {
        if (result.languageCode && result.languageCode !== "unknown") {
          this.sessionLanguages.set(sessionId, result.languageCode);
          if (!detectedLang) {
            this.logger.log(
              `Session ${sessionId}: detected language ${result.languageCode} via Sarvam`,
            );
          }
        }
        return {
          transcript: result.transcript,
          detectedLanguage: result.languageCode || detectedLang || hintLanguage,
          provider: "sarvam",
        };
      }
    }

    // Sarvam returned empty or unavailable → try Google with hint language
    const hasGoogle = !!this.config.get<string>("GOOGLE_STT_API_KEY");
    if (hasGoogle) {
      const langHint = detectedLang || hintLanguage;
      const gResult = detectedLang
        ? await this.googleSTT.transcribe(audioBuffer, langHint.includes("-") ? langHint : `${langHint}-IN`)
        : await this.googleSTT.transcribeWithAutoDetect(audioBuffer);
      if (gResult.transcript) {
        if (gResult.detectedLanguage) {
          this.sessionLanguages.set(sessionId, gResult.detectedLanguage);
        }
        this.logger.log(
          `Session ${sessionId}: transcribed via Google STT (lang: ${gResult.detectedLanguage})`,
        );
        return {
          transcript: gResult.transcript,
          detectedLanguage: gResult.detectedLanguage,
          provider: "google",
        };
      }
      this.logger.warn(`Google STT returned empty for session ${sessionId}`);
    }

    // Last resort → Deepgram (may not be available)
    return this.transcribeWithDeepgram(audioBuffer, detectedLang || hintLanguage);
  }

  /**
   * Transcribe browser-recorded audio (WebM OPUS format).
   * Used by the playground voice endpoint — NOT Twilio telephony.
   */
  async transcribeBrowserAudio(
    audioBuffer: Buffer,
    sessionId: string,
    hintLanguage: string = "en",
  ): Promise<STTResult> {
    // Try Sarvam first (handles WebM natively)
    const hasSarvam = !!this.config.get<string>("SARVAM_API_KEY");
    if (hasSarvam) {
      try {
        const result = await this.sarvam.transcribeBrowserAudio(audioBuffer, hintLanguage.includes("-") ? hintLanguage : undefined);
        if (result.transcript) {
          return {
            transcript: result.transcript,
            detectedLanguage: result.languageCode,
            provider: "sarvam",
          };
        }
      } catch (err: any) {
        this.logger.warn(`Sarvam browser STT failed: ${err.message}`);
      }
    }

    // Try Google STT with WEBM_OPUS encoding
    const hasGoogle = !!this.config.get<string>("GOOGLE_STT_API_KEY");
    if (hasGoogle) {
      try {
        const langCode = hintLanguage.includes("-") ? hintLanguage : `${hintLanguage}-IN`;
        const result = await this.googleSTT.transcribeBrowserAudio(audioBuffer, langCode, [
          "hi-IN", "ta-IN", "te-IN", "bn-IN", "ne-NP",
        ]);
        if (result.transcript) {
          return {
            transcript: result.transcript,
            detectedLanguage: result.detectedLanguage,
            provider: "google",
          };
        }
      } catch (err: any) {
        this.logger.warn(`Google browser STT failed: ${err.message}`);
      }
    }

    // Deepgram fallback (handles WebM natively)
    return this.transcribeWithDeepgramBrowser(audioBuffer, hintLanguage);
  }

  private async transcribeWithDeepgramBrowser(
    audioBuffer: Buffer,
    language: string,
  ): Promise<STTResult> {
    const deepgramKey = this.config.get("DEEPGRAM_API_KEY");
    if (!deepgramKey) {
      return { transcript: "", detectedLanguage: language, provider: "deepgram" };
    }

    try {
      const sdk = await import("@deepgram/sdk") as any;
      const createFn = sdk.createClient || sdk.createDeepgramClient || sdk.default?.createClient;
      if (!createFn) throw new Error("Could not find Deepgram createClient export");
      const deepgram = createFn(deepgramKey);

      const { result } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: "nova-2",
          language: language.split("-")[0] || "en",
          smart_format: true,
        },
      );

      const transcript =
        result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
      return { transcript, detectedLanguage: language, provider: "deepgram" };
    } catch (err: any) {
      this.logger.error(`Deepgram browser STT error: ${err.message}`);
      return { transcript: "", detectedLanguage: language, provider: "deepgram" };
    }
  }

  /** Google Cloud STT — primary for English (en-IN), also supports Indian languages */
  private async transcribeWithGoogle(
    audioBuffer: Buffer,
    language: string,
  ): Promise<STTResult> {
    const langCode = language.includes("-") ? language : `${language}-IN`;
    const result = await this.googleSTT.transcribe(audioBuffer, langCode);
    if (result.transcript) {
      return {
        transcript: result.transcript,
        detectedLanguage: result.detectedLanguage,
        provider: "google",
      };
    }
    // Google failed → fallback to Deepgram
    this.logger.warn("Google STT returned empty, falling back to Deepgram");
    return this.transcribeWithDeepgram(audioBuffer, language);
  }

  /** Sarvam first, Google as fallback for Indian languages */
  private async transcribeWithSarvamOrGoogle(
    audioBuffer: Buffer,
    language: string,
  ): Promise<STTResult> {
    const sarvamResult = await this.sarvam.transcribe(audioBuffer, language);
    if (sarvamResult.transcript) {
      return {
        transcript: sarvamResult.transcript,
        detectedLanguage: sarvamResult.languageCode,
        provider: "sarvam",
      };
    }
    // Sarvam returned empty → try Google
    return this.transcribeWithGoogle(audioBuffer, language);
  }

  /** Sarvam AI (Hindi, Tamil, Telugu, Bengali, etc.) */
  private async transcribeWithSarvam(
    audioBuffer: Buffer,
    language?: string,
  ): Promise<STTResult> {
    const result = await this.sarvam.transcribe(audioBuffer, language);
    if (result.transcript) {
      return {
        transcript: result.transcript,
        detectedLanguage: result.languageCode,
        provider: "sarvam",
      };
    }
    // Sarvam failed → fallback to Google
    return this.transcribeWithGoogle(audioBuffer, language || "en-IN");
  }

  /** Deepgram Nova-2 — last resort fallback */
  private async transcribeWithDeepgram(
    audioBuffer: Buffer,
    language: string,
  ): Promise<STTResult> {
    const deepgramKey = this.config.get("DEEPGRAM_API_KEY");
    if (!deepgramKey) {
      return { transcript: "", detectedLanguage: language, provider: "deepgram" };
    }

    try {
      const sdk = await import("@deepgram/sdk") as any;
      const createFn = sdk.createClient || sdk.createDeepgramClient || sdk.default?.createClient;
      if (!createFn) throw new Error("Could not find Deepgram createClient export");
      const deepgram = createFn(deepgramKey);

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

  /**
   * Keyword boosting list from Agent Memory (used by Deepgram only).
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

  /** Get detected language for a session */
  getSessionLanguage(sessionId: string): string | undefined {
    return this.sessionLanguages.get(sessionId);
  }

  /** Clean up when call ends */
  clearSession(sessionId: string) {
    this.sessionLanguages.delete(sessionId);
  }
}
