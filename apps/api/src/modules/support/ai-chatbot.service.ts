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

interface SellerSnapshot {
  sellerName: string;
  sellerEmail?: string;
  preferredLanguage?: string;
  shopId: string;
  shopName: string;
  country: string;
  currency: string;
  currentMonthLabel: string;
  currentPath?: string;
  monthlyInvoiceCount: number;
  monthlySales: number;
  pendingInvoiceCount: number;
  pendingInvoiceAmount: number;
  walkInCustomerCount: number;
  openOrderCount: number;
  recentOrders: Array<{ orderNumber: string; status: string }>;
  yearlySales: number;
  nepalAuditRequired: boolean;
  nepalAuditThresholdUsedPct: number;
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
      const { functionCall, text } = this.extractGeminiResponseParts(data);

      // Check if Gemini invoked a function
      if (functionCall) {
        return this.handleFunctionCall(functionCall, ipAddress, sessionId);
      }

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

DEMO & TUTORIAL VIDEOS (recommend these proactively when users ask "how do I…", "show me…", or seem unfamiliar):
- Quick 30-second visual demo (homepage tour): https://orivraa.com/demo
- Full 24-minute walkthrough tutorial available in 12 languages:
  · English: https://orivraa.com/tutorial
  · Hindi (हिन्दी): https://orivraa.com/tutorial/hi
  · Nepali (नेपाली): https://orivraa.com/tutorial/ne
  · Gujarati (ગુજરાતી): https://orivraa.com/tutorial/gu
  · Marathi (मराठी): https://orivraa.com/tutorial/mr
  · Tamil (தமிழ்): https://orivraa.com/tutorial/ta
  · Telugu (తెలుగు): https://orivraa.com/tutorial/te
  · Kannada (ಕನ್ನಡ): https://orivraa.com/tutorial/kn
  · French (Français): https://orivraa.com/tutorial/fr
  · German (Deutsch): https://orivraa.com/tutorial/de
  · Spanish (Español): https://orivraa.com/tutorial/es
  · Arabic (العربية): https://orivraa.com/tutorial/ar
- For logged-in shop owners, the full tutorial is also inside the app: /dashboard/shop/help
- The tutorial covers, with timestamps you can cite directly:
  · 1:12 — Dashboard with live gold/silver rates
  · 3:24 — Inventory by weight & purity (with HUID)
  · 5:45 — POS / counter sale walkthrough
  · 7:30 — GST invoice generation & printing
  · 9:00 — Digital catalogue builder (WhatsApp share)
  · 11:10 — Customer CRM
  · 13:20 — Karigar (artisan) job tracking
  · 15:40 — Tax engine (GST / VAT / CGST / SGST)
  · 17:50 — Reports & analytics (GSTR1, daily closing)
  · 19:30 — AI business insights
  · 21:30 — Mobile app & multi-branch
  · 23:00 — Pricing & free trial
- When a user asks "how do I do X", reply briefly AND link the tutorial chapter, e.g. "POS is shown at 5:45 in our tutorial — https://orivraa.com/tutorial".
- Prefer the 30-second demo for first-time visitors who say "show me what it looks like" or "give me an overview"; prefer the full tutorial for "how do I…" or feature-specific questions.

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

  private extractGeminiResponseParts(data: any): {
    functionCall?: any;
    text: string;
  } {
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts) || parts.length === 0) {
      return { text: "" };
    }

    const functionCall = parts.find((part) => part?.functionCall)?.functionCall;
    const text = parts
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();

    return { functionCall, text };
  }

  private fallbackResponse(_message?: string): AiChatResponse {
    return {
      reply: "I can help with general questions about OriVraa. For specific issues, please create a support ticket and our team will assist you.",
      shouldEscalate: false,
      confidence: 0.4,
    };
  }

  private fallbackSellerResponse(snapshot: SellerSnapshot): AiChatResponse {
    return {
      reply: `I could not generate a full AI reply right now, but I still have your seller context for ${snapshot.shopName}. You can ask me about monthly sales, pending invoices, open orders, invoice creation, customer CRM, or tax reports for your shop.`,
      shouldEscalate: false,
      confidence: 0.55,
    };
  }

  private getCurrencyCode(country?: string | null): string {
    switch (country) {
      case "NP":
        return "NPR";
      case "AE":
        return "AED";
      case "GB":
        return "GBP";
      case "EU":
      case "DE":
      case "FR":
      case "IT":
      case "ES":
      case "NL":
        return "EUR";
      case "US":
        return "USD";
      default:
        return "INR";
    }
  }

  private getCountryLabel(country?: string | null): string {
    switch (country) {
      case "NP":
        return "Nepal";
      case "IN":
        return "India";
      case "AE":
        return "UAE";
      case "GB":
        return "United Kingdom";
      case "EU":
        return "European Union";
      case "US":
        return "United States";
      default:
        return country || "your country";
    }
  }

  private formatCurrency(amount: number, currency: string): string {
    return `${currency} ${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  }

  private pickSettledValue<T>(
    result: PromiseSettledResult<T>,
    label: string,
  ): T | null {
    if (result.status === "fulfilled") {
      return result.value;
    }

    const reason = result.reason instanceof Error
      ? result.reason.message
      : String(result.reason);
    this.logger.warn(`sellerChat: failed to load ${label}: ${reason}`);
    return null;
  }

  private getSellerTaxGuidance(snapshot: SellerSnapshot): string {
    const taxRoute = "/dashboard/shop/tax-reports";

    switch (snapshot.country) {
      case "NP":
        return [
          `Tax Reports route: ${taxRoute}#NP`,
          "In the left sidebar, open Tax Reports and use the Nepal tab.",
          "For monthly filing, open the Monthly Return tab for Nepal VAT and luxury tax.",
          "For yearly audit, open the Yearly Audit tab to see IRD audit status and the yearly table.",
          "Use the Share with CA button in the Nepal card header when the seller asks how to share reports with their accountant.",
        ].join(" ");
      case "IN":
        return [
          `Tax Reports route: ${taxRoute}#IN`,
          "Use Tax Reports in the left sidebar, then stay on the India tab.",
          "The India panel supports GSTR-1, GSTR-3B, HSN, Tally XML, and Share with CA.",
        ].join(" ");
      case "AE":
        return [
          `Tax Reports route: ${taxRoute}#AE`,
          "Use Tax Reports in the left sidebar, then open the UAE tab for VAT 201 and Share with CA.",
        ].join(" ");
      case "GB":
        return [
          `Tax Reports route: ${taxRoute}#GB`,
          "Use Tax Reports in the left sidebar, then open the UK tab for MTD guidance and Share with CA.",
        ].join(" ");
      case "EU":
      case "DE":
      case "FR":
      case "IT":
      case "ES":
      case "NL":
        return [
          `Tax Reports route: ${taxRoute}#EU`,
          "Use Tax Reports in the left sidebar, then open the EU tab for OSS and Share with CA.",
        ].join(" ");
      case "US":
        return [
          `Tax Reports route: ${taxRoute}#US`,
          "Use Tax Reports in the left sidebar, then open the US tab for state summaries and Share with CA.",
        ].join(" ");
      default:
        return `Tax Reports route: ${taxRoute}. Direct the seller to Tax Reports in the left sidebar and use the country tab that matches their shop.`;
    }
  }

  private buildSellerContext(snapshot: SellerSnapshot): string {
    const recentOrders = snapshot.recentOrders.length > 0
      ? snapshot.recentOrders.map((order) => `${order.orderNumber} (${order.status})`).join(", ")
      : "No recent orders found.";

    const auditStatus = snapshot.country === "NP"
      ? snapshot.nepalAuditRequired
        ? `IRD audit is currently required. Threshold usage is ${snapshot.nepalAuditThresholdUsedPct}% of the NPR 1 crore limit.`
        : `IRD audit is not currently required. Threshold usage is ${snapshot.nepalAuditThresholdUsedPct}% of the NPR 1 crore limit.`
      : "Nepal IRD audit is not applicable for this shop country.";

    return `
SELLER PRIVATE CONTEXT (FOR THIS LOGGED-IN SELLER ONLY):
Seller name: ${snapshot.sellerName}
Seller email: ${snapshot.sellerEmail ?? "Unavailable"}
Preferred language: ${snapshot.preferredLanguage ?? "Unavailable"}
Shop id: ${snapshot.shopId}
Shop name: ${snapshot.shopName}
Shop country: ${snapshot.country}
Current dashboard route: ${snapshot.currentPath ?? "Unavailable"}
Reporting period: ${snapshot.currentMonthLabel}
Invoices this month: ${snapshot.monthlyInvoiceCount}
Total sales this month: ${this.formatCurrency(snapshot.monthlySales, snapshot.currency)}
Pending invoice count: ${snapshot.pendingInvoiceCount}
Pending invoice amount: ${this.formatCurrency(snapshot.pendingInvoiceAmount, snapshot.currency)}
Open order count: ${snapshot.openOrderCount}
Walk-in customer count: ${snapshot.walkInCustomerCount}
Recent orders: ${recentOrders}
Year-to-date sales: ${this.formatCurrency(snapshot.yearlySales, snapshot.currency)}
Tax audit status: ${auditStatus}

CRM FEATURE MAP (DESKTOP — left sidebar navigation):
- Dashboard overview: /dashboard/shop
- Orders: /dashboard/shop/orders
- Customers CRM: /dashboard/shop/customers
- Inventory: /dashboard/shop/inventory
- Invoices: /dashboard/shop/invoices
- Create invoice: /dashboard/shop/invoices/create
- Tax Reports: /dashboard/shop/tax-reports
- POS: /dashboard/shop/pos
- Support: /dashboard/shop/support

MOBILE FEATURE MAP (bottom tabs + More menu):
- Quick Bill / POS: /m/pos
- Quotes: /m/quotes
- Orders: /m/orders
- Customers: /m/customers
- Daily Summary: /m/summary
- Old Gold Exchange: /m/exchange
- Pending Payments: /m/pending
- Repairs: /m/repairs
- Rate Card: /m/rate-card
- WhatsApp Broadcast: /m/broadcast
- Tax Audit: /m/tax
- Purity Calculator: /m/purity
- Catalogue Share: /m/catalogue
- Custom RFQ: /m/rfq
- Savings Schemes: /m/savings
- Occasions: /m/occasions
- Store Settings: /m/settings
- All gold/silver rates are shown at the top of the mobile screen (24K, 22K, 18K, Silver)
- Extra tools are under the "More" tab at the bottom right

COUNTRY-SPECIFIC TAX GUIDANCE:
${this.getSellerTaxGuidance(snapshot)}

SELLER RESPONSE RULES:
- Answer with this seller's data only. Never mention or infer another seller's data.
- If the seller is currently on a mobile path (starts with /m/), guide them using the MOBILE FEATURE MAP and mobile UI language ("tap the More tab", "open Tax Audit from the More menu"). Do NOT mention the desktop left sidebar.
- If the seller is on a desktop path (/dashboard/), guide them using the DESKTOP CRM FEATURE MAP and desktop UI language ("open Tax Reports from the left sidebar").
- If a requested metric is unavailable, say it is unavailable instead of inventing it.
- Prefer direct, operational instructions for CRM navigation and tax-report workflows.`;
  }

  private maybeAnswerSellerQuestion(snapshot: SellerSnapshot, message: string): AiChatResponse | null {
    const normalized = message.toLowerCase();
    const invoiceRoute = "/dashboard/shop/invoices";
    const createInvoiceRoute = "/dashboard/shop/invoices/create";
    const customersRoute = "/dashboard/shop/customers";
    const taxRoute = "/dashboard/shop/tax-reports";

    if (/tell me about my account|about my account|account details|account info|my shop details|shop details|who am i|what is my account/.test(normalized)) {
      const countryLabel = this.getCountryLabel(snapshot.country);
      const sellerEmail = snapshot.sellerEmail ? ` Your login email is ${snapshot.sellerEmail}.` : "";
      return {
        reply: `Certainly, ${snapshot.sellerName}. Your shop is ${snapshot.shopName}, based in ${countryLabel}.${sellerEmail} This month you have ${snapshot.monthlyInvoiceCount} invoice${snapshot.monthlyInvoiceCount === 1 ? "" : "s"}, ${snapshot.openOrderCount} open order${snapshot.openOrderCount === 1 ? "" : "s"}, and ${snapshot.pendingInvoiceCount} pending invoice${snapshot.pendingInvoiceCount === 1 ? "" : "s"}. You can review your shop details from the dashboard and use Tax Reports, Orders, Invoices, and Customers from the left sidebar for more detail.`,
        shouldEscalate: false,
        confidence: 0.96,
      };
    }

    if (/sales.*this month|this month.*sales|revenue.*this month/.test(normalized)) {
      return {
        reply: `${snapshot.shopName} has ${snapshot.monthlyInvoiceCount} invoice${snapshot.monthlyInvoiceCount === 1 ? "" : "s"} this month for total sales of ${this.formatCurrency(snapshot.monthlySales, snapshot.currency)}.`,
        shouldEscalate: false,
        confidence: 0.96,
      };
    }

    if (/pending invoice amount|pending invoices|unpaid invoice|outstanding invoice|invoice due/.test(normalized)) {
      return {
        reply: `You currently have ${snapshot.pendingInvoiceCount} pending invoice${snapshot.pendingInvoiceCount === 1 ? "" : "s"} with ${this.formatCurrency(snapshot.pendingInvoiceAmount, snapshot.currency)} still due. Open Invoices in the left sidebar if you want to review them: ${invoiceRoute}.`,
        shouldEscalate: false,
        confidence: 0.95,
      };
    }

    if (/create an invoice|make an invoice|new invoice|invoice for a customer/.test(normalized)) {
      return {
        reply: `To create an invoice, open Invoices from the left sidebar and use the create flow at ${createInvoiceRoute}. If you are already in Invoices, choose the create option and fill in customer, line items, tax details, and totals there.`,
        shouldEscalate: false,
        confidence: 0.93,
      };
    }

    if (/share.*tax report.*ca|share.*tax report.*accountant|share.*report.*ca|share.*report.*accountant/.test(normalized)) {
      return {
        reply: `Open Tax Reports from the left sidebar at ${taxRoute}. ${this.getSellerTaxGuidance(snapshot)}`,
        shouldEscalate: false,
        confidence: 0.93,
      };
    }

    if (/ird audit status|nepal audit|nepal ird|yearly audit/.test(normalized)) {
      if (snapshot.country !== "NP") {
        const countryLabel = this.getCountryLabel(snapshot.country);
        return {
          reply: `Your shop country is ${countryLabel}, so Nepal IRD audit status does not apply. For tax work, open Tax Reports in the left sidebar at ${taxRoute} and use the tab for your country.`,
          shouldEscalate: false,
          confidence: 0.9,
        };
      }

      return {
        reply: snapshot.nepalAuditRequired
          ? `Your Nepal yearly sales are ${this.formatCurrency(snapshot.yearlySales, snapshot.currency)}, which is ${snapshot.nepalAuditThresholdUsedPct}% of the NPR 1 crore threshold. IRD audit is currently required. Open Tax Reports in the left sidebar, switch to the Nepal tab, then open Yearly Audit at ${taxRoute}#NP.`
          : `Your Nepal yearly sales are ${this.formatCurrency(snapshot.yearlySales, snapshot.currency)}, which is ${snapshot.nepalAuditThresholdUsedPct}% of the NPR 1 crore threshold. IRD audit is not currently required. Open Tax Reports in the left sidebar, switch to the Nepal tab, then open Yearly Audit at ${taxRoute}#NP if you want to review it.`,
        shouldEscalate: false,
        confidence: 0.95,
      };
    }

    if (/tax audit|audit my tax|tax filing|tax report help|help me with tax|tax help/.test(normalized)) {
      switch (snapshot.country) {
        case "IN":
          return {
            reply: `For India, use Tax Reports from the left sidebar at ${taxRoute}#IN. You can generate GSTR-1, GSTR-3B, HSN summary, Tally XML, and use Share with CA there. If you want, I can also guide you on which India report fits your exact filing task.`,
            shouldEscalate: false,
            confidence: 0.94,
          };
        case "NP":
          return {
            reply: `For Nepal, open Tax Reports from the left sidebar at ${taxRoute}#NP. Use the Monthly Return tab for VAT and luxury tax filings, and the Yearly Audit tab if you want to review IRD audit status.`,
            shouldEscalate: false,
            confidence: 0.94,
          };
        case "AE":
          return {
            reply: `For UAE tax work, open Tax Reports from the left sidebar at ${taxRoute}#AE. The UAE tab covers VAT 201 and Share with CA for accountant handoff.`,
            shouldEscalate: false,
            confidence: 0.93,
          };
        case "GB":
          return {
            reply: `For UK tax work, open Tax Reports from the left sidebar at ${taxRoute}#GB. The UK tab covers MTD guidance and Share with CA.`,
            shouldEscalate: false,
            confidence: 0.93,
          };
        case "EU":
        case "DE":
        case "FR":
        case "IT":
        case "ES":
        case "NL":
          return {
            reply: `For EU tax work, open Tax Reports from the left sidebar at ${taxRoute}#EU. The EU tab covers OSS workflows and Share with CA.`,
            shouldEscalate: false,
            confidence: 0.93,
          };
        case "US":
          return {
            reply: `For US tax work, open Tax Reports from the left sidebar at ${taxRoute}#US. The US tab covers state summaries and Share with CA.`,
            shouldEscalate: false,
            confidence: 0.93,
          };
        default:
          const countryLabel = this.getCountryLabel(snapshot.country);
          return {
            reply: `Open Tax Reports from the left sidebar at ${taxRoute} and use the tab for ${countryLabel}. If you tell me the specific filing or audit task, I can point you to the right report.`,
            shouldEscalate: false,
            confidence: 0.9,
          };
      }
    }

    if (/current order|open orders|pending orders|order status/.test(normalized)) {
      const recentOrders = snapshot.recentOrders.length > 0
        ? snapshot.recentOrders.map((order) => `${order.orderNumber} (${order.status})`).join(", ")
        : "No recent orders found.";
      return {
        reply: `You currently have ${snapshot.openOrderCount} open order${snapshot.openOrderCount === 1 ? "" : "s"}. Recent orders: ${recentOrders} Open Orders from the left sidebar at /dashboard/shop/orders to review the full list.`,
        shouldEscalate: false,
        confidence: 0.92,
      };
    }

    if (/(crm|customer).*(where|open|find)|where.*crm|where.*customer/.test(normalized)) {
      return {
        reply: `Your customer CRM is under Customers in the left sidebar at ${customersRoute}. That is the place to review customer records, notes, and history for your own shop.`,
        shouldEscalate: false,
        confidence: 0.9,
      };
    }

    return null;
  }

  private async buildSellerSnapshot(
    shopId: string,
    userId: string,
    currentPath?: string,
  ): Promise<SellerSnapshot> {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

    const [
      userResult,
      shopResult,
      monthlyInvoicesResult,
      pendingInvoicesResult,
      customersResult,
      openOrdersResult,
      recentOrdersResult,
      yearlyInvoicesResult,
    ] = await Promise.allSettled([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          preferredLanguage: true,
        },
      }),
      this.prisma.shop.findUnique({
        where: { id: shopId },
        select: { shopName: true, country: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          shopId,
          issuedAt: { gte: monthStart },
          status: { in: ["ISSUED", "PAID", "PARTIALLY_PAID"] },
        },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          shopId,
          balanceDue: { gt: 0 },
          status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
        },
        _count: { id: true },
        _sum: { balanceDue: true },
      }),
      this.prisma.walkInCustomer.count({ where: { createdByShopId: shopId } }),
      this.prisma.order.count({
        where: {
          shopId,
          status: { notIn: ["DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED", "EXPIRED"] },
        },
      }),
      this.prisma.order.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { orderNumber: true, status: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          shopId,
          issuedAt: { gte: yearStart },
          status: { in: ["ISSUED", "PAID", "PARTIALLY_PAID"] },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const user = this.pickSettledValue(userResult, "seller user");
    const shop = this.pickSettledValue(shopResult, "seller shop");
    const monthlyInvoices = this.pickSettledValue(monthlyInvoicesResult, "monthly invoices");
    const pendingInvoices = this.pickSettledValue(pendingInvoicesResult, "pending invoices");
    const walkInCustomerCount = this.pickSettledValue(customersResult, "walk-in customers") ?? 0;
    const openOrderCount = this.pickSettledValue(openOrdersResult, "open orders") ?? 0;
    const recentOrders = this.pickSettledValue(recentOrdersResult, "recent orders") ?? [];
    const yearlyInvoices = this.pickSettledValue(yearlyInvoicesResult, "yearly invoices");

    const sellerName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Seller";
    const country = shop?.country ?? "IN";
    const currency = this.getCurrencyCode(country);
    const monthlySales = monthlyInvoices?._sum.totalAmount ?? 0;
    const monthlyInvoiceCount = monthlyInvoices?._count.id ?? 0;
    const pendingInvoiceAmount = pendingInvoices?._sum.balanceDue ?? 0;
    const pendingInvoiceCount = pendingInvoices?._count.id ?? 0;
    const yearlySales = yearlyInvoices?._sum.totalAmount ?? 0;
    const nepalThreshold = 10_000_000;
    const nepalAuditRequired = country === "NP" && yearlySales >= nepalThreshold;
    const nepalAuditThresholdUsedPct = country === "NP"
      ? Math.min(999, Math.round((yearlySales / nepalThreshold) * 100))
      : 0;

    return {
      sellerName,
      sellerEmail: user?.email ?? undefined,
      preferredLanguage: user?.preferredLanguage ?? undefined,
      shopId,
      shopName: shop?.shopName ?? "Unknown shop",
      country,
      currency,
      currentMonthLabel: new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(now),
      currentPath,
      monthlyInvoiceCount,
      monthlySales,
      pendingInvoiceCount,
      pendingInvoiceAmount,
      walkInCustomerCount,
      openOrderCount,
      recentOrders,
      yearlySales,
      nepalAuditRequired,
      nepalAuditThresholdUsedPct,
    };
  }

  /**
   * Seller-aware chat — same as chat() but enriched with the logged-in
   * shop's live metrics so the AI can answer "how are my sales this month?"
   */
  async sellerChat(
    shopId: string | undefined,
    userId: string,
    message: string,
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [],
    ipAddress?: string,
    sessionId?: string,
    userAgent?: string,
    currentPath?: string,
  ): Promise<AiChatResponse> {
    let snapshot: SellerSnapshot | null = null;

    try {
      // Resolve shopId — may be absent from JWT if user.activeShopId is unset
      let resolvedShopId = shopId;
      if (!resolvedShopId) {
        const userRecord = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { activeShopId: true, shops: { select: { id: true }, take: 1 } },
        });
        resolvedShopId = userRecord?.activeShopId ?? userRecord?.shops?.[0]?.id;
        if (!resolvedShopId) {
          this.logger.warn(`sellerChat: no shop found for userId=${userId}`);
          return this.fallbackResponse(message);
        }
      }

      if (sessionId) {
        const intents = this.detectLeadIntents(message);
        await this.supportService.upsertBotSession(sessionId, {
          ipAddress,
          userAgent,
          newIntents: intents,
        });
      }

      await this.supportService.logAiChat(sessionId ?? null, "user", message, undefined, undefined, ipAddress);

      snapshot = await this.buildSellerSnapshot(resolvedShopId, userId, currentPath);
      const directAnswer = this.maybeAnswerSellerQuestion(snapshot, message);
      if (directAnswer) {
        await this.supportService.logAiChat(sessionId ?? null, "assistant", directAnswer.reply, undefined, directAnswer.confidence, ipAddress);
        return directAnswer;
      }

      if (!this.apiKey) {
        this.logger.error("sellerChat: GEMINI_API_KEY is not set — returning seller fallback");
        return this.fallbackSellerResponse(snapshot);
      }

      const knowledgeContext = await this.searchKnowledge(message);
      const systemPrompt = `${this.buildSystemPrompt(knowledgeContext || undefined)}\n\n${this.buildSellerContext(snapshot)}`;

      const contents = this.buildContents(systemPrompt, conversationHistory, message);

      const tools = [
        {
          functionDeclarations: [
            {
              name: "sendPasswordReset",
              description: "Sends a secure password reset link to the user's email address if they forgot their password.",
              parameters: {
                type: "OBJECT",
                properties: {
                  email: { type: "STRING", description: "The email address of the user who needs the reset link." },
                },
                required: ["email"],
              },
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
                  summary: { type: "STRING", description: "A detailed summary of the issue to attach to the ticket for human review." },
                },
                required: ["guestName", "guestEmail", "issueType", "summary"],
              },
            },
          ],
        },
      ];

      const response = await fetch(
        `${this.GEMINI_API_URL}?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            tools,
            generationConfig: { temperature: 0.3, maxOutputTokens: 600, topP: 0.8 },
          }),
        },
      );

      if (!response.ok) {
        this.logger.warn(`Gemini API error (sellerChat): ${response.status}`);
        return this.fallbackSellerResponse(snapshot);
      }

      const data = await response.json();
      const { functionCall, text } = this.extractGeminiResponseParts(data);

      if (functionCall) {
        return this.handleFunctionCall(functionCall, ipAddress, sessionId);
      }
      const parsed = this.parseAiResponse(text);
      await this.supportService.logAiChat(sessionId ?? null, "assistant", parsed.reply, undefined, parsed.confidence, ipAddress);
      return parsed;
    } catch (error) {
      this.logger.error("sellerChat error:", error);
      return snapshot ? this.fallbackSellerResponse(snapshot) : this.fallbackResponse(message);
    }
  }
}
