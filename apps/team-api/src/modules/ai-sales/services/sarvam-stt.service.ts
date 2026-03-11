import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface SarvamSTTResult {
  transcript: string;
  languageCode: string;
}

/**
 * SarvamSTTClient — Indian-language STT via Sarvam AI's Saaras v3 model.
 *
 * Supports: Hindi, Bengali, Tamil, Telugu, Kannada, Malayalam, Marathi,
 * Odia, Punjabi, Gujarati, and Indian English — plus code-switching (Hindi-English mix).
 *
 * Telephony audio: raw mulaw/8000 from Twilio, wrapped in WAV before sending.
 * Browser audio: WebM sent directly.
 *
 * Env var: SARVAM_API_KEY (api-subscription-key)
 */
@Injectable()
export class SarvamSTTClient {
  private readonly logger = new Logger(SarvamSTTClient.name);
  private readonly apiUrl = "https://api.sarvam.ai/speech-to-text";
  private readonly translateUrl = "https://api.sarvam.ai/speech-to-text-translate";

  constructor(private config: ConfigService) {}

  /** Transcribe browser audio (WebM) — sends directly without mulaw wrapping */
  async transcribeBrowserAudio(audioBuffer: Buffer, languageCode?: string): Promise<SarvamSTTResult> {
    const apiKey = this.config.get<string>("SARVAM_API_KEY");
    if (!apiKey) {
      return { transcript: "", languageCode: languageCode || "unknown" };
    }

    try {
      const formData = new FormData();
      formData.append("file", new Blob([new Uint8Array(audioBuffer)], { type: "audio/webm" }), "audio.webm");
      formData.append("model", "saaras:v3");
      formData.append("mode", "transcribe");
      if (languageCode) {
        formData.append("language_code", languageCode);
      }

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: { "api-subscription-key": apiKey },
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Sarvam STT (browser) failed: ${response.status} — ${errText}`);
        return { transcript: "", languageCode: languageCode || "unknown" };
      }

      const result = await response.json() as Record<string, string>;
      return {
        transcript: result.transcript || "",
        languageCode: result.language_code || languageCode || "unknown",
      };
    } catch (err: any) {
      this.logger.error(`Sarvam STT (browser) error: ${err.message}`);
      return { transcript: "", languageCode: languageCode || "unknown" };
    }
  }

  /** Transcribe audio — optionally pass languageCode for better accuracy, or omit for auto-detect */
  async transcribe(audioBuffer: Buffer, languageCode?: string): Promise<SarvamSTTResult> {
    const apiKey = this.config.get<string>("SARVAM_API_KEY");
    if (!apiKey) {
      this.logger.warn("SARVAM_API_KEY not set — cannot transcribe");
      return { transcript: "", languageCode: languageCode || "unknown" };
    }

    try {
      const wavBuffer = this.wrapMulawAsWav(audioBuffer);
      const formData = new FormData();
      formData.append("file", new Blob([new Uint8Array(wavBuffer)], { type: "audio/wav" }), "audio.wav");
      formData.append("model", "saaras:v3");
      formData.append("mode", "transcribe");
      if (languageCode) {
        formData.append("language_code", languageCode);
      }

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: { "api-subscription-key": apiKey },
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Sarvam STT failed: ${response.status} — ${errText}`);
        return { transcript: "", languageCode: languageCode || "unknown" };
      }

      const result = await response.json() as Record<string, string>;
      return {
        transcript: result.transcript || "",
        languageCode: result.language_code || languageCode || "unknown",
      };
    } catch (err: any) {
      this.logger.error(`Sarvam STT error: ${err.message}`);
      return { transcript: "", languageCode: languageCode || "unknown" };
    }
  }

  /** Transcribe + translate to English (customer speaks Hindi → LLM gets English) */
  async transcribeAndTranslate(
    audioBuffer: Buffer,
  ): Promise<SarvamSTTResult & { translatedText: string }> {
    const apiKey = this.config.get<string>("SARVAM_API_KEY");
    if (!apiKey) {
      return { transcript: "", languageCode: "unknown", translatedText: "" };
    }

    try {
      const wavBuffer = this.wrapMulawAsWav(audioBuffer);
      const formData = new FormData();
      formData.append("file", new Blob([new Uint8Array(wavBuffer)], { type: "audio/wav" }), "audio.wav");
      formData.append("model", "saaras:v3");
      formData.append("mode", "translate");

      const response = await fetch(this.translateUrl, {
        method: "POST",
        headers: { "api-subscription-key": apiKey },
        body: formData,
      });

      if (!response.ok) {
        return { transcript: "", languageCode: "unknown", translatedText: "" };
      }

      const result = await response.json() as Record<string, string>;
      return {
        transcript: result.transcript || "",
        languageCode: result.language_code || "unknown",
        translatedText: result.translated_text || result.transcript || "",
      };
    } catch (err: any) {
      this.logger.error(`Sarvam translate error: ${err.message}`);
      return { transcript: "", languageCode: "unknown", translatedText: "" };
    }
  }

  /**
   * Wrap raw mulaw bytes in a WAV container.
   * WAV format tag 7 = mu-law. This is universally accepted by STT APIs.
   */
  private wrapMulawAsWav(mulawData: Buffer, sampleRate = 8000, channels = 1): Buffer {
    const dataSize = mulawData.length;
    const header = Buffer.alloc(58);

    // RIFF header
    header.write("RIFF", 0);
    header.writeUInt32LE(dataSize + 50, 4);
    header.write("WAVE", 8);

    // fmt chunk (18 bytes for non-PCM)
    header.write("fmt ", 12);
    header.writeUInt32LE(18, 16);       // chunk size
    header.writeUInt16LE(7, 20);        // format: mu-law
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * channels, 28); // byte rate
    header.writeUInt16LE(channels, 32); // block align
    header.writeUInt16LE(8, 34);        // bits per sample
    header.writeUInt16LE(0, 36);        // extra format bytes

    // fact chunk
    header.write("fact", 38);
    header.writeUInt32LE(4, 42);
    header.writeUInt32LE(dataSize, 46); // sample count

    // data chunk
    header.write("data", 50);
    header.writeUInt32LE(dataSize, 54);

    return Buffer.concat([header, mulawData]);
  }

  /** Sarvam-supported language codes */
  static readonly SUPPORTED_LANGUAGES = [
    "hi-IN", // Hindi
    "bn-IN", // Bengali
    "kn-IN", // Kannada
    "ml-IN", // Malayalam
    "mr-IN", // Marathi
    "od-IN", // Odia
    "pa-IN", // Punjabi
    "ta-IN", // Tamil
    "te-IN", // Telugu
    "gu-IN", // Gujarati
    "en-IN", // Indian English
  ];

  static isLanguageSupported(code: string): boolean {
    return SarvamSTTClient.SUPPORTED_LANGUAGES.includes(code);
  }
}
