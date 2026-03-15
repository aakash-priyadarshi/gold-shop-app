import { GoogleGenerativeAI } from "@google/generative-ai";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { VectorMemoryService } from "./vector-memory.service";

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

  constructor(
    private config: ConfigService,
    private vectorMemory: VectorMemoryService,
  ) {
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
    sessionId?: string;
  }): Promise<CallReport> {
    if (!this.genAI) {
      this.logger.warn("GEMINI_API_KEY not set — returning minimal report");
      return this.buildMinimalReport(call.transcript);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
          maxOutputTokens: 800,
          thinkingConfig: { thinkingBudget: 1024 },
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
      // Clean up common LLM JSON issues (trailing commas, markdown fences)
      const cleaned = text
        .replace(/```json?\n?/g, "")
        .replace(/```/g, "")
        .replace(/,\s*([}\]])/g, "$1") // trailing commas
        .trim();
      const parsed = JSON.parse(cleaned) as CallReport;

      // Async push to Qdrant Vector Memory
      if (call.sessionId) {
        this.vectorMemory.upsertTranscript(call.sessionId, parsed.summary, {
          outcome: parsed.outcome,
          agentName: call.agentName,
          leadName: call.leadName,
          objections: parsed.objectionsRaised,
          quality: parsed.callQualityScore,
          duration: call.durationSeconds,
        });
      }

      return parsed;
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
        model: "gemini-2.5-flash-lite",
        generationConfig: { temperature: 0.3, maxOutputTokens: 300, thinkingConfig: { thinkingBudget: 0 } },
      } as any);

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

  /**
   * Evaluate whether a call goal was achieved based on transcript.
   */
  async evaluateGoal(transcript: string, goal: string): Promise<{ achieved: boolean; notes: string }> {
    if (!this.genAI || !goal) return { achieved: false, notes: "No goal set or API unavailable" };

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 300,
          thinkingConfig: { thinkingBudget: 512 },
        } as any,
      });

      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{
            text: `Evaluate whether the following call goal was achieved based on the transcript.

Goal: ${goal}

Transcript:
${transcript}

Return JSON: { "achieved": true/false, "notes": "brief explanation of why" }`,
          }],
        }],
      });

      const text = result.response.text()
        .replace(/```json?\n?/g, "").replace(/```/g, "")
        .replace(/,\s*([}\]])/g, "$1").trim();
      return JSON.parse(text);
    } catch (err: any) {
      this.logger.error(`Goal evaluation failed: ${err.message}`);
      return { achieved: false, notes: "Evaluation failed" };
    }
  }

  /**
   * Extract personality insights from transcript to update lead profile.
   */
  async extractPersonalityInsights(transcript: string, leadName?: string): Promise<Record<string, any>> {
    if (!this.genAI) return {};

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
          maxOutputTokens: 500,
          thinkingConfig: { thinkingBudget: 512 },
        } as any,
      });

      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{
            text: `Analyze the customer's personality from this sales call transcript.
Customer name: ${leadName || "Customer"}

Transcript:
${transcript}

Return JSON with ONLY fields you are confident about (omit uncertain ones):
{
  "communicationStyle": "analytical|expressive|driver|amiable",
  "decisionStyle": "impulsive|deliberate|consensus|data-driven|authority",
  "pacePreference": "fast|moderate|slow",
  "tonePreference": "formal|casual|humorous|direct",
  "respondsWellTo": ["array of things they respond well to"],
  "getsFrustratedBy": ["array of things that frustrate them"],
  "familyDetails": "any family info mentioned",
  "hobbies": "any hobbies mentioned",
  "recentLifeEvents": "any life events mentioned",
  "notableQuotes": "memorable exact phrases they said",
  "budgetRange": "budget info if mentioned",
  "urgency": "none|low|medium|high|urgent"
}`,
          }],
        }],
      });

      const text = result.response.text()
        .replace(/```json?\n?/g, "").replace(/```/g, "")
        .replace(/,\s*([}\]])/g, "$1").trim();
      return JSON.parse(text);
    } catch (err: any) {
      this.logger.error(`Personality extraction failed: ${err.message}`);
      return {};
    }
  }
}
