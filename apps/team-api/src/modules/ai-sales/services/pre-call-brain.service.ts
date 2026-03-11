import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import { AgentMemoryService } from "./agent-memory.service";

export interface PreCallBrief {
  openingStrategy: string;
  predictedObjections: string[];
  recommendedResponses: Record<string, string>;
  toneGuidance: string;
  culturalNotes: string;
  keySellingPoints: string[];
  questionsToAsk: string[];
  closingStrategy: string;
  riskFactors: string[];
  competitorIntel: string;
  personalizedGreeting: string;
  estimatedCallDuration: number;
  priorityLevel: "high" | "medium" | "low";
  dealPotential: number;
  conversationAnchors: string[];
  avoidTopics: string[];
}

/**
 * PreCallBrainService — uses Claude Sonnet for strategic pre-call brief generation.
 *
 * Claude thinks deeply ONCE before the call, then Gemini executes live.
 * Cost: ~$0.008 per call (single Claude request with ~2K input / ~1K output tokens).
 */
@Injectable()
export class PreCallBrainService {
  private readonly logger = new Logger(PreCallBrainService.name);
  private client: Anthropic | null = null;

  constructor(
    private config: ConfigService,
    private memory: AgentMemoryService,
  ) {
    const apiKey = this.config.get<string>("ANTHROPIC_API_KEY");
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  async generateBrief(
    lead: { name?: string; company?: string; role?: string; temperature?: string; notes?: string; phone?: string },
    product: { name?: string; description?: string; benefits?: string[]; pricing?: string },
    campaign?: { name?: string; objective?: string; targetAudience?: string },
    previousCalls?: { summary?: string; outcome?: string; date?: Date }[],
  ): Promise<PreCallBrief> {
    if (!this.client) {
      this.logger.warn("ANTHROPIC_API_KEY not set — returning minimal brief");
      return this.buildMinimalBrief(lead, product);
    }

    try {
      const resp = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages: [
          {
            role: "user",
            content: `You are a sales strategist preparing a call brief. Analyze the lead data and return a JSON object.

## LEAD
Name: ${lead.name || "Unknown"}
Company: ${lead.company || "Unknown"}
Role: ${lead.role || "Unknown"}
Temperature: ${lead.temperature || "cold"}
Notes: ${lead.notes || "None"}
${previousCalls?.length ? `\n## PREVIOUS CALLS\n${previousCalls.map((c) => `- ${c.date}: ${c.outcome} — ${c.summary}`).join("\n")}` : ""}

## PRODUCT
${product.name || "Orivraa Gold Products"}
${product.description || "Premium gold jewelry and investment products"}
Benefits: ${product.benefits?.join("; ") || "Premium quality, certified purity, competitive pricing"}
Pricing: ${product.pricing || "Market-linked pricing"}
${campaign ? `\n## CAMPAIGN\n${campaign.name}: ${campaign.objective}\nTarget: ${campaign.targetAudience}` : ""}

Return ONLY valid JSON matching this schema (no markdown):
{
  "openingStrategy": "string — first 30 seconds approach",
  "predictedObjections": ["array of likely objections"],
  "recommendedResponses": {"objection": "response"},
  "toneGuidance": "string — recommended tone",
  "culturalNotes": "string — cultural considerations",
  "keySellingPoints": ["top 3 selling points for this specific lead"],
  "questionsToAsk": ["discovery questions tailored to this lead"],
  "closingStrategy": "string — recommended close technique",
  "riskFactors": ["potential call risks"],
  "competitorIntel": "string — competitor context if any",
  "personalizedGreeting": "string — exact opening line",
  "estimatedCallDuration": 300,
  "priorityLevel": "high|medium|low",
  "dealPotential": 0.0 to 1.0,
  "conversationAnchors": ["topics to steer toward"],
  "avoidTopics": ["topics to avoid"]
}`,
          },
        ],
      });

      const rawText = resp.content[0].type === "text" ? resp.content[0].text : "";
      return JSON.parse(rawText) as PreCallBrief;
    } catch (err: any) {
      this.logger.error(`Pre-call brief generation failed: ${err.message}`);
      return this.buildMinimalBrief(lead, product);
    }
  }

  buildGeminiSystemPrompt(
    brief: PreCallBrief,
    product: { name?: string; description?: string; benefits?: string[]; pricing?: string },
    culturalProfile?: string,
  ): string {
    const agentName = this.memory.get("persona", "agent_name") || "Sales Agent";
    const companyName = this.memory.get("company", "name") || "Orivraa Gold";

    return `You are ${agentName}, a sales representative at ${companyName}.
You are making a phone call — this is VOICE, not text.
Respond conversationally, naturally, as a human would speak.

## YOUR PERSONALITY
Warm, confident, humble, never pushy. Genuinely curious about customer needs.
- You use contractions always (don't, I'll, we've, that's)
- You occasionally use natural fillers: "I mean", "you know", "honestly"
- You NEVER say "Certainly!", "Absolutely!", "Of course!" — these are AI tells
- Short sentences when excited. Longer when explaining.

## PRE-CALL STRATEGY
Opening: ${brief.openingStrategy}
Tone: ${brief.toneGuidance}
Priority: ${brief.priorityLevel} | Deal Potential: ${Math.round(brief.dealPotential * 100)}%

## PREDICTED OBJECTIONS & RESPONSES
${brief.predictedObjections.map((o, i) => `${i + 1}. "${o}" → ${brief.recommendedResponses[o] || "Absorb → Diagnose → Reframe → Invite"}`).join("\n")}

## KEY SELLING POINTS
${brief.keySellingPoints.map((p) => `- ${p}`).join("\n")}

## DISCOVERY QUESTIONS
${brief.questionsToAsk.map((q) => `- ${q}`).join("\n")}

## THE PRODUCT
${product.description || `${companyName} — premium gold jewelry and investment products`}
Benefits: ${product.benefits?.join("; ") || "Premium quality, certified purity, competitive pricing"}
Pricing: ${product.pricing || "Market-linked pricing with transparent making charges"}

${culturalProfile ? `## CULTURAL CONTEXT\n${culturalProfile}` : ""}
${brief.culturalNotes ? `Cultural Notes: ${brief.culturalNotes}` : ""}

## CLOSING STRATEGY
${brief.closingStrategy}

## CONVERSATION ANCHORS
Steer toward: ${brief.conversationAnchors.join(", ")}
${brief.avoidTopics.length ? `AVOID: ${brief.avoidTopics.join(", ")}` : ""}

## CONVERSATION RULES
1. NEVER pitch in the first 60 seconds — build rapport first
2. Ask questions, listen deeply — discovery before pitch
3. When handling objections: Absorb → Diagnose → Reframe → Invite
4. NEVER trash competitors — reframe without attacking
5. Use their name naturally — maximum 3 times per call
6. After asking a closing question — WAIT. Do not fill silence.
7. After revealing price — WAIT. Never fill this silence.

## RESPOND NOW
Respond with ONLY what you would say next — no stage directions. Just natural speech. Keep responses under 3 sentences unless explaining something complex.`;
  }

  buildMinimalBrief(
    lead: { name?: string; company?: string; role?: string; temperature?: string },
    product: { name?: string; description?: string; benefits?: string[]; pricing?: string },
  ): PreCallBrief {
    return {
      openingStrategy: `Warm introduction to ${lead.name || "the customer"}, ask about their day`,
      predictedObjections: ["pricing concern", "timing"],
      recommendedResponses: {
        "pricing concern": "Focus on value and long-term investment returns",
        timing: "Acknowledge their schedule, offer a brief overview now",
      },
      toneGuidance: lead.temperature === "hot" ? "Confident, direct" : "Warm, exploratory",
      culturalNotes: "",
      keySellingPoints: product.benefits?.slice(0, 3) || ["Premium quality", "Certified purity", "Competitive pricing"],
      questionsToAsk: ["What brings you to explore gold investments?", "What's your timeline looking like?"],
      closingStrategy: "Soft close with next step",
      riskFactors: [],
      competitorIntel: "",
      personalizedGreeting: `Hi ${lead.name || "there"}, this is calling from Orivraa Gold — how are you today?`,
      estimatedCallDuration: 300,
      priorityLevel: lead.temperature === "hot" ? "high" : "medium",
      dealPotential: lead.temperature === "hot" ? 0.7 : 0.3,
      conversationAnchors: ["investment value", "quality assurance"],
      avoidTopics: [],
    };
  }
}
