import Anthropic from "@anthropic-ai/sdk";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface ConversationContext {
  leadName?: string;
  leadCompany?: string;
  leadRole?: string;
  leadTemperature?: string;
  predictedConcern?: string;
  zeroPartyData?: Record<string, any>;
  competitorsMentioned?: string[];
  callHistory?: string;
  productDescription?: string;
  productBenefits?: string[];
  productPricing?: string;
  objectionResponses?: string;
  agentName: string;
  agentPersonality?: string;
  language?: string;
  greeting?: string;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  currentPhase?: string;
  emotionState?: string;
  culturalContext?: string;
}

@Injectable()
export class ConversationBrainService {
  private readonly logger = new Logger(ConversationBrainService.name);
  private client: Anthropic | null = null;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>("ANTHROPIC_API_KEY");
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  buildSystemPrompt(ctx: ConversationContext): string {
    return `You are ${ctx.agentName}, a sales representative at Orivraa Gold.
You are making a phone call — this is VOICE, not text.
Respond conversationally, naturally, as a human would speak.

## YOUR PERSONALITY
${ctx.agentPersonality || "Warm, confident, humble, never pushy. Genuinely curious about customer needs."}
- You use contractions always (don't, I'll, we've, that's)
- You occasionally use natural fillers: "I mean", "you know", "honestly"
- You NEVER say "Certainly!", "Absolutely!", "Of course!" — these are AI tells
- Short sentences when excited. Longer when explaining.
- Language: ${ctx.language || "English"}
- IMPORTANT: If the customer speaks in Hindi, Nepali, Tamil, or Telugu, respond in the SAME language. Match the customer's language naturally. If they code-switch (mix Hindi and English), you can code-switch too.

## THE CUSTOMER
Name: ${ctx.leadName || "Unknown"}
Company: ${ctx.leadCompany || "Unknown"}
Role: ${ctx.leadRole || "Unknown"}
Temperature: ${ctx.leadTemperature || "cold"}
Predicted Concern: ${ctx.predictedConcern || "None known"}
Previous Interactions: ${ctx.callHistory || "First call"}
Personal Details: ${ctx.zeroPartyData ? JSON.stringify(ctx.zeroPartyData) : "None yet"}
Competitors Mentioned: ${ctx.competitorsMentioned?.join(", ") || "None"}

## THE PRODUCT
${ctx.productDescription || "Orivraa Gold — premium gold jewelry and investment products"}
Benefits: ${ctx.productBenefits?.join("; ") || "Premium quality, certified purity, competitive pricing"}
Pricing: ${ctx.productPricing || "Market-linked pricing with transparent making charges"}

## OBJECTION HANDLING
${ctx.objectionResponses || "When handling objections: Absorb → Diagnose → Reframe → Invite"}

${ctx.culturalContext ? `## CULTURAL CONTEXT\n${ctx.culturalContext}` : ""}

## CONVERSATION RULES
1. LISTEN FIRST — after greeting, WAIT for the customer to speak. Do NOT launch into any pitch or product description.
2. Your FIRST response after the greeting must be a SHORT question ("Do you have a minute?" or "How's your day going?"). Wait for their answer.
3. NEVER pitch until the customer confirms they have time and you've asked at least 2 discovery questions.
4. Keep responses SHORT (1-2 sentences max) during the first 90 seconds. Let the customer talk more than you.
5. Ask questions, listen deeply — discovery before pitch
6. When handling objections: Absorb → Diagnose → Reframe → Invite
7. NEVER trash competitors — reframe without attacking
8. Use their name naturally — maximum 3 times per call
9. After asking a closing question — WAIT. Do not fill silence.
10. After revealing price — WAIT. Never fill this silence.
11. Save personal details mentioned naturally

## CURRENT EMOTIONAL STATE
Customer seems: ${ctx.emotionState || "neutral"}
Adjust your tone accordingly.

## CALL PHASE
Current phase: ${ctx.currentPhase || "WARM_OPEN"}
Phases: WARM_OPEN → DISCOVERY → INSIGHT → SOFT_PITCH → OBJECTION_HANDLING → MICRO_CLOSE → NEXT_STEP

## RESPOND NOW
Respond with ONLY what you would say next — no stage directions, no explanations. Just natural speech. Keep responses under 3 sentences unless explaining something complex.`;
  }

  async *streamResponse(
    ctx: ConversationContext,
  ): AsyncGenerator<string, void, unknown> {
    if (!this.client) {
      this.logger.warn("Anthropic API key not set — returning fallback");
      yield "I appreciate your time. Could you tell me more about what you're looking for?";
      return;
    }

    try {
      const stream = this.client.messages.stream({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: this.buildSystemPrompt(ctx),
        messages: ctx.conversationHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield event.delta.text;
        }
      }
    } catch (err) {
      this.logger.error("Claude streaming failed", err);
      yield "Sorry, I lost my train of thought — could you repeat that?";
    }
  }

  async getFullResponse(ctx: ConversationContext): Promise<string> {
    const chunks: string[] = [];
    for await (const chunk of this.streamResponse(ctx)) {
      chunks.push(chunk);
    }
    return chunks.join("");
  }

  async generateCallSummary(transcript: string): Promise<string> {
    if (!this.client) return "No summary available — API key not configured.";

    try {
      const resp = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Summarize this sales call transcript concisely. Include: key topics discussed, customer sentiment, objections raised, buying signals, and recommended next steps.\n\nTranscript:\n${transcript}`,
          },
        ],
      });

      return resp.content[0].type === "text" ? resp.content[0].text : "";
    } catch (err) {
      this.logger.error("Summary generation failed", err);
      return "Summary generation failed.";
    }
  }

  async detectCallPhase(
    conversationHistory: { role: string; content: string }[],
    durationSeconds: number,
  ): Promise<string> {
    if (durationSeconds < 45) return "WARM_OPEN";
    if (durationSeconds < 120) return "DISCOVERY";
    if (durationSeconds < 240) return "INSIGHT";
    if (durationSeconds < 360) return "SOFT_PITCH";
    if (durationSeconds < 480) return "OBJECTION_HANDLING";
    if (durationSeconds < 570) return "MICRO_CLOSE";
    return "NEXT_STEP";
  }
}
