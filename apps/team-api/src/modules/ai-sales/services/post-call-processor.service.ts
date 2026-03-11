import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface CallReport {
  summary: string;
  outcome: "positive" | "neutral" | "negative";
  keyTopics: string[];
  objectionsRaised: string[];
  buyingSignals: string[];
  sentimentArc: string;
  recommendedNextSteps: string[];
  followUpDate: string | null;
  dealProbability: number;
  callQualityScore: number;
}

/**
 * PostCallProcessor — uses Gemini Flash-Lite for cheap post-call analysis.
 *
 * Replaces Claude for post-call summary generation.
 * Cost: ~$0.002/call (cheapest model for structured output).
 * Uses responseMimeType: 'application/json' for guaranteed JSON output.
 */
@Injectable()
export class PostCallProcessor {
  private readonly logger = new Logger(PostCallProcessor.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>("GEMINI_API_KEY");
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async generateCallReport(call: {
    transcript: string;
    durationSeconds: number;
    leadName?: string;
    agentName?: string;
    campaignName?: string;
  }): Promise<CallReport> {
    if (!this.genAI) {
      this.logger.warn("GEMINI_API_KEY not set — returning minimal report");
      return this.buildMinimalReport(call.transcript);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite-preview-06-17",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
          maxOutputTokens: 800,
        } as any,
      });

      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{
            text: `Analyze this sales call transcript and return a structured JSON report.

Transcript (${call.durationSeconds}s, Agent: ${call.agentName || "Agent"}, Lead: ${call.leadName || "Customer"}):
${call.transcript}

Return JSON matching this schema:
{
  "summary": "2-3 sentence call summary",
  "outcome": "positive|neutral|negative",
  "keyTopics": ["topics discussed"],
  "objectionsRaised": ["specific objections from customer"],
  "buyingSignals": ["buying intent signals detected"],
  "sentimentArc": "brief description of how customer sentiment changed",
  "recommendedNextSteps": ["actionable next steps"],
  "followUpDate": "ISO date string or null",
  "dealProbability": 0.0 to 1.0,
  "callQualityScore": 1 to 10
}`,
          }],
        }],
      });

      const text = result.response.text();
      return JSON.parse(text) as CallReport;
    } catch (err: any) {
      this.logger.error(`Post-call report generation failed: ${err.message}`);
      return this.buildMinimalReport(call.transcript);
    }
  }

  /** Simple text summary fallback (no LLM needed) */
  async generateSimpleSummary(transcript: string): Promise<string> {
    if (!this.genAI) return "Summary unavailable — API key not configured.";

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite-preview-06-17",
        generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
      });

      const result = await model.generateContent(
        `Summarize this sales call concisely (2-3 sentences). Include: key topics, customer sentiment, and recommended next steps.\n\n${transcript}`,
      );

      return result.response.text();
    } catch (err: any) {
      this.logger.error(`Summary generation failed: ${err.message}`);
      return "Summary generation failed.";
    }
  }

  private buildMinimalReport(transcript: string): CallReport {
    return {
      summary: `Call completed. ${transcript.length > 0 ? "Transcript recorded." : "No transcript available."}`,
      outcome: "neutral",
      keyTopics: [],
      objectionsRaised: [],
      buyingSignals: [],
      sentimentArc: "unknown",
      recommendedNextSteps: ["Follow up within 48 hours"],
      followUpDate: null,
      dealProbability: 0.5,
      callQualityScore: 5,
    };
  }
}
