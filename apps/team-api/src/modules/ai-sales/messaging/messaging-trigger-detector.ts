import { Injectable } from "@nestjs/common";

export type MessageType =
  | "pricing"
  | "demo_booking"
  | "case_study"
  | "competitor_comparison"
  | "call_summary"
  | "contract_link";

/**
 * Detects when the AI's response should trigger a message send.
 * Runs on every AI response — synchronous pattern matching only.
 * Zero latency — never makes API calls.
 *
 * Trigger detection works on what the AI SAYS, not what the customer says.
 * When AI says "I'm sending you the pricing now" → trigger fires.
 */
@Injectable()
export class MessagingTriggerDetector {
  private readonly triggers: Array<{ pattern: RegExp; type: MessageType }> = [
    // Pricing triggers
    { pattern: /send.*pric|pric.*send|sending.*breakdown|breakdown.*send/i, type: "pricing" },
    // Demo booking triggers
    { pattern: /send.*calendar|send.*booking|send.*demo|book.*send|calendar.*link/i, type: "demo_booking" },
    // Case study triggers
    { pattern: /send.*case study|case study.*send|send.*example|send.*results/i, type: "case_study" },
    // Competitor comparison triggers
    { pattern: /send.*comparison|comparison.*send|send.*vs|send.*compare/i, type: "competitor_comparison" },
    // Call summary triggers
    { pattern: /send.*summary|summary.*send|send.*recap|sending.*next steps/i, type: "call_summary" },
    // Contract / agreement triggers
    { pattern: /send.*agreement|agreement.*send|send.*contract|contract.*send/i, type: "contract_link" },
  ];

  detect(aiResponse: string): MessageType | null {
    for (const trigger of this.triggers) {
      if (trigger.pattern.test(aiResponse)) {
        return trigger.type;
      }
    }
    return null;
  }
}
