import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface GoogleSTTResult {
  transcript: string;
  confidence: number;
  detectedLanguage: string;
}

/**
 * GoogleSTTClient — Google Cloud Speech-to-Text v1 via REST API.
 *
 * Advantages over Deepgram for Indian users:
 * - Dedicated en-IN model (Indian English accent)
 * - 15+ Indian language models (Hindi, Tamil, Telugu, etc.)
 * - Excellent code-switching support (Hindi-English mix)
 * - Better accent recognition for non-American speakers
 *
 * Uses the REST API with API key — no service account needed.
 * Env var: GOOGLE_STT_API_KEY
 *
 * Audio: receives raw mulaw/8000 from Twilio, sends base64 to Google.
 */
@Injectable()
export class GoogleSTTClient {
  private readonly logger = new Logger(GoogleSTTClient.name);
  private readonly apiUrl = "https://speech.googleapis.com/v1/speech:recognize";

  constructor(private config: ConfigService) {}

  /**
   * Transcribe audio using Google Cloud STT.
   * @param audioBuffer Raw mulaw/8000 bytes from Twilio
   * @param languageCode BCP-47 language code (default: "en-IN")
   * @param alternativeLanguages Additional languages to detect (for code-switching)
   */
  async transcribe(
    audioBuffer: Buffer,
    languageCode: string = "en-IN",
    alternativeLanguages?: string[],
  ): Promise<GoogleSTTResult> {
    const apiKey = this.config.get<string>("GOOGLE_STT_API_KEY");
    if (!apiKey) {
      this.logger.warn("GOOGLE_STT_API_KEY not set — cannot transcribe");
      return { transcript: "", confidence: 0, detectedLanguage: languageCode };
    }

    try {
      const audioContent = audioBuffer.toString("base64");

      const requestBody: Record<string, unknown> = {
        config: {
          encoding: "MULAW",
          sampleRateHertz: 8000,
          languageCode,
          ...(alternativeLanguages?.length && {
            alternativeLanguageCodes: alternativeLanguages,
          }),
          model: "telephony",
          useEnhanced: true,
          enableAutomaticPunctuation: true,
        },
        audio: { content: audioContent },
      };

      const url = `${this.apiUrl}?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Google STT failed: ${response.status} — ${errText}`);
        return { transcript: "", confidence: 0, detectedLanguage: languageCode };
      }

      const result = (await response.json()) as {
        results?: Array<{
          alternatives?: Array<{ transcript?: string; confidence?: number }>;
          languageCode?: string;
        }>;
      };

      const topResult = result.results?.[0]?.alternatives?.[0];
      const detected = result.results?.[0]?.languageCode || languageCode;

      return {
        transcript: topResult?.transcript || "",
        confidence: topResult?.confidence || 0,
        detectedLanguage: detected,
      };
    } catch (err: any) {
      this.logger.error(`Google STT error: ${err.message}`);
      return { transcript: "", confidence: 0, detectedLanguage: languageCode };
    }
  }

  /**
   * Transcribe browser-recorded audio (WebM OPUS).
   * Unlike telephony audio, browser recordings use WEBM_OPUS at 48kHz.
   */
  async transcribeBrowserAudio(
    audioBuffer: Buffer,
    languageCode: string = "en-IN",
    alternativeLanguages?: string[],
  ): Promise<GoogleSTTResult> {
    const apiKey = this.config.get<string>("GOOGLE_STT_API_KEY");
    if (!apiKey) {
      this.logger.warn("GOOGLE_STT_API_KEY not set — cannot transcribe");
      return { transcript: "", confidence: 0, detectedLanguage: languageCode };
    }

    try {
      const audioContent = audioBuffer.toString("base64");

      const requestBody: Record<string, unknown> = {
        config: {
          encoding: "WEBM_OPUS",
          languageCode,
          ...(alternativeLanguages?.length && {
            alternativeLanguageCodes: alternativeLanguages,
          }),
          model: "default",
          useEnhanced: true,
          enableAutomaticPunctuation: true,
        },
        audio: { content: audioContent },
      };

      const url = `${this.apiUrl}?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Google STT (browser) failed: ${response.status} — ${errText}`);
        return { transcript: "", confidence: 0, detectedLanguage: languageCode };
      }

      const result = (await response.json()) as {
        results?: Array<{
          alternatives?: Array<{ transcript?: string; confidence?: number }>;
          languageCode?: string;
        }>;
      };
      const topResult = result.results?.[0]?.alternatives?.[0];
      const detected = result.results?.[0]?.languageCode || languageCode;

      return {
        transcript: topResult?.transcript || "",
        confidence: topResult?.confidence || 0,
        detectedLanguage: detected,
      };
    } catch (err: any) {
      this.logger.error(`Google STT (browser) error: ${err.message}`);
      return { transcript: "", confidence: 0, detectedLanguage: languageCode };
    }
  }

  /**
   * Transcribe with auto language detection.
   * Uses en-IN as primary with Hindi + common Indian languages as alternatives.
   */
  async transcribeWithAutoDetect(audioBuffer: Buffer): Promise<GoogleSTTResult> {
    return this.transcribe(audioBuffer, "en-IN", [
      "hi-IN",
      "ta-IN",
      "te-IN",
      "bn-IN",
      "mr-IN",
      "gu-IN",
      "kn-IN",
      "ml-IN",
      "ne-NP",
    ]);
  }

  /** Google-supported Indian languages */
  static readonly INDIAN_LANGUAGES = [
    "en-IN", // Indian English
    "hi-IN", // Hindi
    "ta-IN", // Tamil
    "te-IN", // Telugu
    "bn-IN", // Bengali
    "mr-IN", // Marathi
    "gu-IN", // Gujarati
    "kn-IN", // Kannada
    "ml-IN", // Malayalam
    "pa-IN", // Punjabi (Gurmukhi)
    "ur-IN", // Urdu
    "ne-NP", // Nepali
    "as-IN", // Assamese
  ];
}
