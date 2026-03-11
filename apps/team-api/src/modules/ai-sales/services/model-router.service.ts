import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import { AgentMemoryService } from "./agent-memory.service";

/**
 * ModelRouter — routes 99% of turns to Gemini Flash-Lite, escalates ~1% to Claude Sonnet.
 *
 * Escalation triggers:
 * - High buying intent + deal value above threshold
 * - Critical close moment (MICRO_CLOSE phase + strong buying signals)
 *
 * Escalation is STICKY: once Claude takes over, it stays for the rest of the call.
 */
@Injectable()
export class ModelRouter {
  private readonly logger = new Logger(ModelRouter.name);
  private claudeClient: Anthropic | null = null;
  private escalatedSessions = new Set<string>();

  constructor(
    private config: ConfigService,
    private memory: AgentMemoryService,
  ) {}

  /** Lazy init Claude client — only when escalation actually happens */
  private getClaudeClient(): Anthropic | null {
    if (!this.claudeClient) {
      const apiKey = this.config.get<string>("ANTHROPIC_API_KEY");
      if (apiKey) {
        this.claudeClient = new Anthropic({ apiKey });
      }
    }
    return this.claudeClient;
  }

  /** Check if session is already escalated (sticky) */
  isEscalated(sessionId: string): boolean {
    return this.escalatedSessions.has(sessionId);
  }

  /** Determine if this turn should escalate to Claude */
  shouldEscalateToClaude(
    sessionId: string,
    emotionState: string | undefined,
    buyingIntentScore: number,
    callPhase: string | undefined,
    estimatedDealValue?: number,
  ): boolean {
    // Already escalated — stay on Claude
    if (this.escalatedSessions.has(sessionId)) return true;

    const threshold = Number(this.memory.get("advanced", "claude_escalation_threshold")) || 500;

    // High-value deal at closing phase with strong buying signals
    const isHighValue = (estimatedDealValue || 0) >= threshold;
    const isClosingPhase = callPhase === "MICRO_CLOSE" || callPhase === "NEXT_STEP";
    const hasBuyingIntent = buyingIntentScore > 0.7;
    const isBuyingEmotion = emotionState === "buying" || emotionState === "excitement";

    if (isHighValue && isClosingPhase && (hasBuyingIntent || isBuyingEmotion)) {
      this.escalatedSessions.add(sessionId);
      this.logger.log(`Escalated session ${sessionId} to Claude Sonnet (deal: ${estimatedDealValue}, intent: ${buyingIntentScore})`);
      return true;
    }

    return false;
  }

  /** Stream response from Claude Sonnet — used only for escalated high-value closes */
  async *escalateToClaudeSonnet(
    transcript: string,
    systemPrompt: string,
    history: { role: "user" | "assistant"; content: string }[],
  ): AsyncGenerator<string, void, unknown> {
    const client = this.getClaudeClient();
    if (!client) {
      this.logger.warn("Claude escalation failed — no API key");
      yield "Let me pull up the best options for you...";
      return;
    }

    try {
      const stream = client.messages.stream({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        system: systemPrompt + "\n\n## CRITICAL CLOSE MOMENT\nThis is a high-value deal. Close carefully, confidently, and naturally. No pressure — guide them home.",
        messages: [
          ...history.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user" as const, content: transcript },
        ],
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield event.delta.text;
        }
      }
    } catch (err: any) {
      this.logger.error(`Claude escalation streaming failed: ${err.message}`);
      yield "I want to make sure we get this right for you — let me think about the best way to structure this...";
    }
  }

  /** Clean up session tracking when call ends */
  clearSession(sessionId: string) {
    this.escalatedSessions.delete(sessionId);
  }
}
