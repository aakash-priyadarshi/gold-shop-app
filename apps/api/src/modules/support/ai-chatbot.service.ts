import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth/auth.service";
import { TicketsService } from "./tickets.service";
import { SupportService } from "./support.service";

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

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    @Inject(forwardRef(() => TicketsService))
    private ticketsService: TicketsService,
    private supportService: SupportService
  ) {
    this.apiKey = this.configService.get<string>("GEMINI_API_KEY") || "";
  }

  async chat(
    message: string,
    conversationHistory: Array<{
      role: "user" | "assistant";
      content: string;
    }> = [],
    ipAddress?: string
  ): Promise<AiChatResponse> {
    if (!this.apiKey) {
      return this.fallbackResponse(message);
    }

    try {
      // Log the incoming message
      await this.supportService.logAiChat(null, "user", message, undefined, undefined, ipAddress);

      const systemPrompt = this.buildSystemPrompt();
      const contents = this.buildContents(
        systemPrompt,
        conversationHistory,
        message,
      );

      const tools = [
        {
          functionDeclarations: [
            {
              name: "sendPasswordReset",
              description: "Sends a secure password reset link to the user's email address if they forgot their password.",
              parameters: {
                type: "OBJECT",
                properties: {
                  email: { type: "STRING", description: "The email address of the user who needs the reset link." }
                },
                required: ["email"]
              }
            },
            {
              name: "autoEscalateTicket",
              description: "Automatically creates a high-priority support ticket when a user appeals suspension, gets locked out, or has a complex issue that requires human intervention.",
              parameters: {
                type: "OBJECT",
                properties: {
                  guestName: { type: "STRING", description: "The user's full name. Ask for this if not provided." },
                  guestEmail: { type: "STRING", description: "The user's email address. Ask for this if not provided." },
                  issueType: { type: "STRING", description: "Must be exactly one of: LOGIN_ISSUE, ACCOUNT_SUSPENSION, ORDER_ISSUE, REFUND_ISSUE, OTHER" },
                  summary: { type: "STRING", description: "A detailed summary of the issue to attach to the ticket for human review." }
                },
                required: ["guestName", "guestEmail", "issueType", "summary"]
              }
            }
          ]
        }
      ];

      const response = await fetch(
        `${this.GEMINI_API_URL}?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            tools,
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
      const firstPart = data?.candidates?.[0]?.content?.parts?.[0];

      // Check if Gemini invoked a function
      if (firstPart && firstPart.functionCall) {
         return this.handleFunctionCall(firstPart.functionCall, ipAddress);
      }

      const text = firstPart?.text || "";

      // Fallback manual parsing if Gemini responded as JSON string instead of function structure
      const parsed = this.parseAiResponse(text);
      await this.supportService.logAiChat(null, "assistant", parsed.reply, undefined, parsed.confidence, ipAddress);
      return parsed;
    } catch (error) {
      this.logger.error("AI chatbot error:", error);
      return this.fallbackResponse(message);
    }
  }

  private async handleFunctionCall(functionCall: any, ipAddress?: string): Promise<AiChatResponse> {
     try {
       const { name, args } = functionCall;
       
       if (name === "sendPasswordReset") {
          await this.authService.forgotPassword(args.email, ipAddress || "");
          const reply = `I have successfully sent a password reset link to ${args.email}. Please check your inbox and spam folder.`;
          await this.supportService.logAiChat(null, "assistant", reply, "sendPasswordReset", 1.0, ipAddress);
          return {
             reply,
             shouldEscalate: false,
             confidence: 1.0
          };
       }

       if (name === "autoEscalateTicket") {
          const ticket = await this.ticketsService.createTicket({
             type: args.issueType as any,
             subject: `AI Escalated: ${args.issueType}`,
             description: args.summary,
             guestEmail: args.guestEmail,
             guestName: args.guestName,
             priority: "URGENT" as any,
          } as any);

          const reply = `I have escalated this issue and a high-priority ticket (#${ticket.ticketNumber}) has been created for your account. Our human support team has been notified and will email you at ${args.guestEmail} shortly.`;
          await this.supportService.logAiChat(null, "assistant", reply, "autoEscalateTicket", 1.0, ipAddress);
          return {
             reply,
             shouldEscalate: false, 
             confidence: 1.0
          };
       }

       return {
          reply: "I tried to perform an action but it seems I do not have the right permissions.",
          shouldEscalate: true,
          confidence: 0.5
       };

     } catch (err: any) {
        this.logger.error("Function call error", err);
        return {
           reply: "I encountered an error while trying to process your request. Please manually log a support ticket via the 'Raise a Ticket' tab.",
           shouldEscalate: true,
           confidence: 0.5
        };
     }
  }

  private buildSystemPrompt(): string {
    return `You are Gemini Support Core, an advanced AI support agent for OriVraa, an Indian jewellery marketplace.
Your role is to answer questions AND take actions on behalf of the user using the tools provided to you.

AVAILABLE TOOLS & INSTRUCTIONS:
1. sendPasswordReset: Call this if the user says they forgot their password and provides an email. If they ask to reset password but don't give an email, nicely ask for their email address first.
2. autoEscalateTicket: Call this to create a ticket urgently if the user is locked out, suspended, or has a complex issue (like missing refund, fraud, technical bug). You must ask for their name and email first if you don't have it in the chat history.

GENERAL RULES:
- Be concise and polite.
- Always ask for required information (like email) before attempting a tool call.
- For basic info (policies, tracking), respond normally without tools.
- Never output markdown JSON like the old model did, just output normal readable text unless making a function call.`;
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
            text: "Hello! I'm Gemini Support Core. How can I assist you today?",
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
      // Try to extract JSON from the response if it still hallucinates JSON format
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          reply:
            parsed.reply || text,
          shouldEscalate: !!parsed.shouldEscalate,
          suggestedTicketType: parsed.suggestedTicketType || undefined,
          confidence: parsed.confidence || 0.8,
        };
      }
    } catch {
      // ignore
    }

    return {
      reply: text || "I apologize, I could not process your request. Please try again or create a ticket.",
      shouldEscalate: false,
      confidence: 0.8,
    };
  }

  private fallbackResponse(message: string): AiChatResponse {
    return {
      reply: "I can help with general questions about OriVraa. For specific issues, please create a support ticket and our team will assist you.",
      shouldEscalate: false,
      confidence: 0.4,
    };
  }
}
