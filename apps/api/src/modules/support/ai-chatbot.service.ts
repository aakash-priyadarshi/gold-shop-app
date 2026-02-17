import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * AI-powered support chatbot using Gemini Flash.
 * Handles basic queries and returns structured responses.
 * Indicates when the user should escalate to a human support ticket.
 */

export interface AiChatResponse {
  reply: string;
  shouldEscalate: boolean;
  suggestedTicketType?: string;
  confidence: number;
}

@Injectable()
export class AiChatbotService {
  private readonly logger = new Logger(AiChatbotService.name);
  private readonly GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>("GEMINI_API_KEY") || "";
  }

  async chat(
    message: string,
    conversationHistory: Array<{
      role: "user" | "assistant";
      content: string;
    }> = [],
  ): Promise<AiChatResponse> {
    if (!this.apiKey) {
      return this.fallbackResponse(message);
    }

    try {
      const systemPrompt = this.buildSystemPrompt();
      const contents = this.buildContents(
        systemPrompt,
        conversationHistory,
        message,
      );

      const response = await fetch(
        `${this.GEMINI_API_URL}?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 500,
              topP: 0.8,
            },
          }),
        },
      );

      if (!response.ok) {
        this.logger.warn(`Gemini API error: ${response.status}`);
        return this.fallbackResponse(message);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      return this.parseAiResponse(text);
    } catch (error) {
      this.logger.error("AI chatbot error:", error);
      return this.fallbackResponse(message);
    }
  }

  private buildSystemPrompt(): string {
    return `You are a helpful support assistant for OriVraa, an Indian jewellery marketplace platform.
Your role is to answer common questions about:
- How the platform works (buying/selling jewellery online)
- Order tracking and delivery
- Payment methods and refund policies
- Account management (registration, login, KYC verification)
- Platform rules (no sharing personal contact info in chats)
- How to list products (for shopkeepers)
- RFQ (Request for Quote) system
- Custom jewellery orders

IMPORTANT RULES:
1. Be concise and helpful. Keep answers under 150 words.
2. Answer in the same language the user writes in (Hindi, English, or Hinglish).
3. If the user's question requires personal account investigation, account changes, refund processing, or involves a specific order/transaction issue, set shouldEscalate to true.
4. If the question is about a suspended/blocked account, set shouldEscalate to true with suggestedTicketType "ACCOUNT_SUSPENSION".
5. If it's about an order problem, set suggestedTicketType "ORDER_ISSUE".
6. If it's a payment/refund issue, set suggestedTicketType "REFUND_ISSUE".
7. If it's a login/security issue, set suggestedTicketType "LOGIN_ISSUE".
8. For questions you can answer directly (general info, how-to, policies), set shouldEscalate to false.

RESPONSE FORMAT (JSON):
{"reply": "your helpful answer here", "shouldEscalate": false, "suggestedTicketType": null, "confidence": 0.9}

Always respond with valid JSON only. No markdown, no extra text.`;
  }

  private buildContents(
    systemPrompt: string,
    history: Array<{ role: "user" | "assistant"; content: string }>,
    currentMessage: string,
  ) {
    const parts: any[] = [
      {
        role: "user",
        parts: [{ text: systemPrompt }],
      },
      {
        role: "model",
        parts: [
          {
            text: '{"reply": "Hello! I\'m the OriVraa support assistant. How can I help you today?", "shouldEscalate": false, "suggestedTicketType": null, "confidence": 1.0}',
          },
        ],
      },
    ];

    // Add conversation history
    for (const msg of history.slice(-6)) {
      parts.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    }

    // Current message
    parts.push({
      role: "user",
      parts: [{ text: currentMessage }],
    });

    return parts;
  }

  private parseAiResponse(text: string): AiChatResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          reply:
            parsed.reply || "I apologize, I could not process your request.",
          shouldEscalate: !!parsed.shouldEscalate,
          suggestedTicketType: parsed.suggestedTicketType || undefined,
          confidence: parsed.confidence || 0.5,
        };
      }
    } catch {
      // If parsing fails, use the raw text
    }

    return {
      reply:
        text ||
        "I apologize, I could not process your request. Please try again.",
      shouldEscalate: false,
      confidence: 0.3,
    };
  }

  private fallbackResponse(message: string): AiChatResponse {
    const lower = message.toLowerCase();

    if (
      lower.includes("order") ||
      lower.includes("delivery") ||
      lower.includes("track")
    ) {
      return {
        reply:
          "For order-related queries, please check your order status in Dashboard → My Orders. If you need further help, please create a support ticket and our team will assist you.",
        shouldEscalate: true,
        suggestedTicketType: "ORDER_ISSUE",
        confidence: 0.6,
      };
    }

    if (
      lower.includes("refund") ||
      lower.includes("return") ||
      lower.includes("money back")
    ) {
      return {
        reply:
          'For refund requests, go to your order details and click "Request Refund". If the option is not available or you need help, create a support ticket.',
        shouldEscalate: true,
        suggestedTicketType: "REFUND_ISSUE",
        confidence: 0.6,
      };
    }

    if (
      lower.includes("suspend") ||
      lower.includes("block") ||
      lower.includes("ban")
    ) {
      return {
        reply:
          "If your account has been suspended, it may be due to a policy violation. Please create a support ticket to appeal the suspension.",
        shouldEscalate: true,
        suggestedTicketType: "ACCOUNT_SUSPENSION",
        confidence: 0.7,
      };
    }

    if (
      lower.includes("login") ||
      lower.includes("password") ||
      lower.includes("sign in")
    ) {
      return {
        reply:
          "For login issues, try resetting your password on the login page. If you still cannot access your account, please create a support ticket.",
        shouldEscalate: true,
        suggestedTicketType: "LOGIN_ISSUE",
        confidence: 0.6,
      };
    }

    if (
      lower.includes("kyc") ||
      lower.includes("verification") ||
      lower.includes("verify")
    ) {
      return {
        reply:
          "KYC verification is required for shopkeepers. Upload your ID documents in Dashboard → Profile → KYC. Verification typically takes 24-48 hours.",
        shouldEscalate: false,
        confidence: 0.7,
      };
    }

    return {
      reply:
        "I can help with general questions about OriVraa — orders, payments, account management, and more. For specific issues, please create a support ticket and our team will assist you personally.",
      shouldEscalate: false,
      confidence: 0.4,
    };
  }
}
