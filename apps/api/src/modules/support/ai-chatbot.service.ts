import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { SupportService } from "./support.service";
import { TicketsService } from "./tickets.service";

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
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
  private readonly GEMINI_EMBED_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";
  private readonly apiKey: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private authService: AuthService,
    @Inject(forwardRef(() => TicketsService))
    private ticketsService: TicketsService,
    private supportService: SupportService
  ) {
    this.apiKey = this.configService.get<string>("GEMINI_API_KEY") || "";
  }

  /**
   * Detects lead intent signals from a user message.
   * Used to tag BotSession.leadIntents for analytics / investor reporting.
   */
  private detectLeadIntents(message: string): string[] {
    const msg = message.toLowerCase();
    const intents: string[] = [];
    if (/price|cost|how much|kitna|₹|rs\.|rupee|subscription|plan/.test(msg)) intents.push('pricing');
    if (/trial|free|demo|test|try/.test(msg)) intents.push('trial');
    if (/tally|marg|vs\s|compare|better than|difference/.test(msg)) intents.push('comparison');
    if (/setup|install|start|getting started|onboard/.test(msg)) intents.push('onboarding');
    if (/not working|broken|issue|problem|bug|error|crash/.test(msg)) intents.push('complaint');
    if (/offline|pos|without internet|no internet/.test(msg)) intents.push('offline_pos');
    if (/gst|tax|hallmark|bis|huid/.test(msg)) intents.push('compliance');
    return intents;
  }

  async chat(
    message: string,
    conversationHistory: Array<{
      role: "user" | "assistant";
      content: string;
    }> = [],
    ipAddress?: string,
    sessionId?: string,
    userAgent?: string,
  ): Promise<AiChatResponse> {
    if (!this.apiKey) {
      return this.fallbackResponse(message);
    }

    try {
      // Upsert the session record (creates on first message, increments count after)
      if (sessionId) {
        const intents = this.detectLeadIntents(message);
        await this.supportService.upsertBotSession(sessionId, {
          ipAddress,
          userAgent,
          newIntents: intents,
        });
      }

      // Log the incoming user message
      await this.supportService.logAiChat(sessionId ?? null, "user", message, undefined, undefined, ipAddress);

      // Enrich context with pgvector RAG (gracefully skipped if not configured)
      const knowledgeContext = await this.searchKnowledge(message);

      const systemPrompt = this.buildSystemPrompt(knowledgeContext || undefined);
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
         return this.handleFunctionCall(firstPart.functionCall, ipAddress, sessionId);
      }

      const text = firstPart?.text || "";

      // Fallback manual parsing if Gemini responded as JSON string instead of function structure
      const parsed = this.parseAiResponse(text);
      await this.supportService.logAiChat(sessionId ?? null, "assistant", parsed.reply, undefined, parsed.confidence, ipAddress);
      return parsed;
    } catch (error) {
      this.logger.error("AI chatbot error:", error);
      return this.fallbackResponse(message);
    }
  }

  private async handleFunctionCall(
    functionCall: any,
    ipAddress?: string,
    sessionId?: string,
  ): Promise<AiChatResponse> {
     try {
       const { name, args } = functionCall;
       
       if (name === "sendPasswordReset") {
          await this.authService.forgotPassword(args.email, ipAddress || "");
          const reply = `I have successfully sent a password reset link to ${args.email}. Please check your inbox and spam folder.`;
          await this.supportService.logAiChat(sessionId ?? null, "assistant", reply, "sendPasswordReset", 1.0, ipAddress);
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
          await this.supportService.logAiChat(sessionId ?? null, "assistant", reply, "autoEscalateTicket", 1.0, ipAddress);
          // Tag session as escalated with guest contact details
          if (sessionId) {
            await this.supportService.markSessionEscalated(sessionId, args.guestName, args.guestEmail);
          }
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

  /**
   * Embeds the query with Gemini embedding-001, then searches the
   * KnowledgeChunk table (pgvector) for the top-3 nearest chunks by
   * cosine similarity. Returns "" gracefully if the table is empty or
   * the API key is missing.
   */
  private async searchKnowledge(query: string): Promise<string> {
    if (!this.apiKey) return "";
    try {
      // 1. Embed the query
      const embedRes = await fetch(
        `${this.GEMINI_EMBED_URL}?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: { parts: [{ text: query }] },
            taskType: "RETRIEVAL_QUERY",
          }),
        }
      );
      if (!embedRes.ok) return "";
      const embedData = await embedRes.json() as any;
      const vector: number[] | undefined = embedData?.embedding?.values;
      if (!Array.isArray(vector) || vector.length === 0) return "";

      // 2. Cosine similarity search via pgvector
      // Cast the JS array to a Postgres vector literal
      const vectorLiteral = `[${vector.join(",")}]`;
      const rows = await this.prisma.$queryRawUnsafe<{ content: string }[]>(
        `SELECT content FROM "KnowledgeChunk"
         ORDER BY embedding <=> $1::vector
         LIMIT 3`,
        vectorLiteral,
      );
      if (!rows.length) return "";

      return rows.map((r) => r.content).join("\n\n---\n\n");
    } catch (err) {
      this.logger.warn("pgvector search skipped:", (err as Error).message);
      return "";
    }
  }

  private buildSystemPrompt(knowledgeContext?: string): string {
    const base = `You are the Orivraa AI assistant — a friendly, knowledgeable sales and support agent for Orivraa, an all-in-one jewellery shop management platform.

ABOUT ORIVRAA:
Orivraa is a purpose-built CRM, POS and ERP for jewellery shops. It handles billing, inventory, GST/VAT tax compliance, customer management, WhatsApp catalogues, and AI-powered sales agents. Used by jewellers across India, Nepal, UAE, UK and Europe.

PRICING & PLANS:
- Free 30-day trial — full features, no credit card
- Plans: FREE (trial), PRO (single shop), PRO_PLUS (multi-country tax + CA share links), ENTERPRISE (multi-branch)
- Exact prices shown in local currency at /pricing
- Cancel anytime, no lock-in, data export always free

KEY FEATURES:
1. Live gold & silver rates — auto-updated from market
2. GST/VAT billing — 3 % on gold value + 5 % on making charges (India, HSN 7113); VAT for UAE/GCC; MTD for UK; OSS for EU; US state filings
3. Tax filing exports — GSTR1, GSTR3B, HSN summary, Tally XML, UAE VAT201, UK MTD, EU OSS
4. Hallmark & HUID invoices — BIS-compliant, purity (24K/22K/18K/14K), gross/net/stone weight
5. Offline desktop POS — fully offline at counter, auto-syncs on reconnect
6. Multi-store management — branch transfers, consolidated reports, per-branch pricing and staff permissions
7. Customer CRM — purchase history, WhatsApp catalogue, custom RFQ orders
8. Barcode scanning — fast POS checkout
9. AI sales agents (beta) — 24/7 voice agents in 42 languages, follow-up automation
10. CA / accountant share links — securely share tax documents (PRO_PLUS+)
11. Old-gold exchange — correct GST treatment on exchange transactions

GST DETAILS (INDIA):
- 3 % GST on gold value + 5 % GST on making charges
- HSN code: 7113 (articles of jewellery and parts thereof)
- Orivraa auto-splits and prints compliant invoices; old-gold deduction handled

HALLMARKING (INDIA):
- HUID (Hallmark Unique ID) printed on every invoice
- Purity tiers: 24K, 22K, 18K, 14K, 9K
- BIS compliance checklist: /blog/hallmarking-compliance-checklist-jewellers-india

ONBOARDING:
- 3 steps: sign up → import (CSV/Excel/Tally/Marg) → go live
- Most shops are live the same day; free onboarding call included
- /contact?interest=Onboarding to book a call

COMPARISONS:
- vs Tally: Orivraa has live gold rates, HUID billing, mobile POS, free plan — Tally has none of these
- vs Marg ERP: same gaps — Marg wasn't built for jewellery; no AI, no cloud, no mobile POS
- Side-by-side: /compare/orivraa-vs-tally and /compare/orivraa-vs-marg-erp

SECURITY:
- TLS 1.3 in transit, AES-256 encrypted backups at rest
- Data stored in your region (India / UAE / EU)
- Full data export anytime at no cost

CONTACT (FOUNDER — AAKASH):
- Email: aakashm301@gmail.com
- WhatsApp / Call: +91 62039 65557
- Replies personally within a few hours

RESPONSE RULES:
- Be concise and warm; aim for 2–4 sentences per reply
- For pre-sales questions, guide the user toward the free trial at /auth/register
- For password/account issues, use the sendPasswordReset tool
- For locked accounts, suspensions, or complex billing issues, use the autoEscalateTicket tool
- Never fabricate prices or percentages not stated here
- If unsure, offer to connect the user with Aakash directly

AVAILABLE TOOLS:
1. sendPasswordReset — call when user forgot password AND has given their email; otherwise ask for email first
2. autoEscalateTicket — call for locked accounts, suspensions, missing refunds, technical bugs; ask for name and email first if not provided`;

    if (knowledgeContext) {
      return `${base}\n\nADDITIONAL CONTEXT FROM KNOWLEDGE BASE:\n${knowledgeContext}`;
    }
    return base;
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
            text: "Hi! I'm the Orivraa AI assistant. Ask me anything about pricing, GST, hallmarking, offline POS, or how Orivraa compares to Tally — I'm here to help.",
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
