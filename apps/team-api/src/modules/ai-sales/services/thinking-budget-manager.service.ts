import { Injectable } from "@nestjs/common";

/**
 * ThinkingBudgetManager — dynamically adjusts Gemini's reasoning depth per turn.
 *
 * Budget levels:
 *   0    → Instant (~350ms) — small talk, acknowledgements
 *   2000 → Standard objection handling
 *   5000 → Technical questions, competitor comparisons
 *   8000 → High-stakes objections, budget negotiations
 *
 * When budget > 0, filler audio MUST play to cover thinking latency.
 */
@Injectable()
export class ThinkingBudgetManager {
  calculate(
    transcript: string,
    emotionState: string | undefined,
    callPhase: string | undefined,
    conversationHistory: { role: string; content: string }[],
  ): number {
    // Instant response for simple utterances
    if (this.isSmallTalk(transcript) || this.isSimpleAcknowledgement(transcript)) {
      return 0;
    }

    // High-stakes scenarios get maximum budget
    if (this.isHighStakesObjection(transcript) || this.isBudgetNegotiation(transcript)) {
      return 8000;
    }

    // Technical & competitor questions need deep reasoning
    if (this.isTechnicalQuestion(transcript) || this.isCompetitorComparison(transcript)) {
      return 5000;
    }

    // Standard objections
    if (this.isObjection(transcript)) {
      return 2000;
    }

    // Phase-based defaults
    if (callPhase === "OBJECTION_HANDLING" || callPhase === "MICRO_CLOSE") {
      return 2000;
    }

    return 0;
  }

  /** Returns filler type to play while model thinks */
  getFillerContext(budget: number): "none" | "short" | "medium" | "long" {
    if (budget === 0) return "none";
    if (budget <= 2000) return "short";   // "Hmm, let me think about that..."
    if (budget <= 5000) return "medium";  // "That's a great question, let me..."
    return "long";                         // "You know, that's really important..."
  }

  private isObjection(text: string): boolean {
    return /too expensive|can't afford|not in.*budget|not the right time|too busy|maybe later|already using|happy with current|need to think|not sure|need to discuss|don't trust|never heard of/i.test(text);
  }

  private isTechnicalQuestion(text: string): boolean {
    return /how does it work|technical|specifications|api|integration|compatible|architecture|performance|uptime|sla|guarantee/i.test(text);
  }

  private isCompetitorComparison(text: string): boolean {
    return /competitor|alternative|compared to|difference between|why not use|better than|versus|vs\b/i.test(text);
  }

  private isHighStakesObjection(text: string): boolean {
    return /cancel|legal|contract|lawsuit|refund|escalate|manager|supervisor|regulator|compliance/i.test(text);
  }

  private isBudgetNegotiation(text: string): boolean {
    return /discount|negotiate|lower.*price|best.*price|bulk.*deal|volume.*pricing|match.*price/i.test(text);
  }

  private isSmallTalk(text: string): boolean {
    return /^(hi|hello|hey|good morning|good afternoon|good evening|how are you|nice to meet|thanks for calling|yeah|yes|no|ok|okay|sure|right|got it|I see|uh huh|mm hmm)\b/i.test(text) && text.length < 50;
  }

  private isSimpleAcknowledgement(text: string): boolean {
    return /^(yes|no|yeah|nah|sure|ok|okay|right|got it|I see|uh huh|mm hmm|sounds good|alright|go ahead|please continue|tell me more)$/i.test(text.trim());
  }
}
