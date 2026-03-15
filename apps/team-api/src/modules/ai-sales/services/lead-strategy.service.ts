import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";

export type NextAction =
  | "CALL"
  | "EMAIL"
  | "INVITE_MEETING"
  | "JOIN_EXTERNAL_MEET"
  | "FOLLOW_UP_LATER"
  | "WAIT";

export interface StrategyRecommendation {
  action: NextAction;
  reason: string;
  priority: "high" | "medium" | "low";
  suggestedMessage?: string;
  suggestedGoal?: string;
  suggestedDelay?: string; // e.g. "2 hours", "1 day"
  meetingSubject?: string;
}

/**
 * Lead Strategy Service
 *
 * After each interaction (call, email, meeting), the AI brain analyzes the lead's
 * full context and recommends the optimal next action.
 *
 * Uses Gemini Flash-Lite for fast, cheap recommendations (~$0.001/call).
 */
@Injectable()
export class LeadStrategyService {
  private readonly logger = new Logger(LeadStrategyService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Get the recommended next action for a lead based on all interactions.
   */
  async suggestNextAction(leadId: string): Promise<StrategyRecommendation> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        callRemarks: { orderBy: { createdAt: "desc" }, take: 5 },
        interactions: { orderBy: { createdAt: "desc" }, take: 10 },
        emails: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    if (!lead) {
      return { action: "WAIT", reason: "Lead not found", priority: "low" };
    }

    const geminiKey = this.config.get<string>("GEMINI_API_KEY");
    if (!geminiKey) {
      return this.heuristicStrategy(lead);
    }

    try {
      return await this.aiStrategy(lead, geminiKey);
    } catch (err: any) {
      this.logger.warn(`AI strategy failed, using heuristic: ${err.message}`);
      return this.heuristicStrategy(lead);
    }
  }

  private async aiStrategy(lead: any, geminiKey: string): Promise<StrategyRecommendation> {
    const recentInteractions = (lead.interactions || []).slice(0, 10).map((i: any) => ({
      type: i.type,
      channel: i.channel,
      summary: i.summary?.substring(0, 200),
      sentiment: i.sentiment,
      goalSet: i.goalSet,
      goalAchieved: i.goalAchieved,
      createdAt: i.createdAt,
    }));

    const recentEmails = (lead.emails || []).slice(0, 5).map((e: any) => ({
      direction: e.direction,
      subject: e.subject,
      body: e.body?.substring(0, 200),
      sentAt: e.sentAt,
      receivedAt: e.receivedAt,
    }));

    const recentCalls = (lead.callRemarks || []).slice(0, 5).map((c: any) => ({
      summary: c.summary?.substring(0, 200),
      outcome: c.outcome,
      sentiment: c.sentiment,
      createdAt: c.createdAt,
    }));

    const prompt = `You are an AI sales strategy advisor. Analyze this lead and recommend the SINGLE best next action.

LEAD PROFILE:
- Name: ${lead.name}
- Company: ${lead.company || "unknown"}
- Role: ${lead.role || "unknown"}
- Score: ${lead.score || 0}/100
- Temperature: ${lead.temperature || "unknown"}
- Stage: ${lead.stage || "unknown"}
- Total Calls: ${lead.totalCalls || 0}
- Last Contacted: ${lead.lastContactedAt || "never"}
- Phone: ${lead.phone ? "available" : "none"}
- Email: ${lead.email ? "available" : "none"}
- Communication Style: ${lead.communicationStyle || "unknown"}
- Decision Style: ${lead.decisionStyle || "unknown"}
- Pace Preference: ${lead.pacePreference || "unknown"}
- Budget: ${lead.budgetRange || "unknown"}
- Urgency: ${lead.urgency || "unknown"}
- Predicted Concern: ${lead.predictedConcern || "none"}
- Last Call Summary: ${lead.lastCallSummary?.substring(0, 200) || "none"}
- Next Call Strategy: ${lead.nextCallStrategy?.substring(0, 200) || "none"}
- Open Loops: ${JSON.stringify(lead.openLoops || []).substring(0, 200)}
- Notes: ${lead.notes || "none"}

RECENT INTERACTIONS (newest first):
${JSON.stringify(recentInteractions, null, 2)}

RECENT EMAILS:
${JSON.stringify(recentEmails, null, 2)}

RECENT CALLS:
${JSON.stringify(recentCalls, null, 2)}

AVAILABLE ACTIONS:
- CALL: Make an AI phone call to the lead
- EMAIL: Send a personalized email
- INVITE_MEETING: Create a branded video meeting and send invite (good for demos, detailed discussions)
- FOLLOW_UP_LATER: Set a reminder to follow up later
- WAIT: No action needed right now

RULES:
- If lead has had 3+ calls without progress, try EMAIL or INVITE_MEETING
- If lead responded positively to last email, CALL or INVITE_MEETING
- If lead hasn't been contacted in 7+ days, prioritize contact
- INVITE_MEETING is great for high-score leads or when a demo/detailed discussion is needed
- Use previous interaction data, open loops, and lead enrichment to personalize the approach
- If budget/urgency info is available, factor it into priority
- If communication style is known, tailor the suggested message accordingly
- Don't suggest CALL if lead has no phone number
- Don't suggest EMAIL if lead has no email
- Set higher priority for leads with high urgency or high score

Respond with JSON only:
{
  "action": "CALL|EMAIL|INVITE_MEETING|FOLLOW_UP_LATER|WAIT",
  "reason": "Brief explanation",
  "priority": "high|medium|low",
  "suggestedMessage": "Draft message/opening for the chosen action",
  "suggestedGoal": "Goal for this interaction",
  "suggestedDelay": "Only if FOLLOW_UP_LATER, e.g. '2 hours', '1 day'",
  "meetingSubject": "Only if INVITE_MEETING"
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );

    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty Gemini response");

    const parsed = JSON.parse(text);
    return {
      action: parsed.action || "WAIT",
      reason: parsed.reason || "",
      priority: parsed.priority || "medium",
      suggestedMessage: parsed.suggestedMessage,
      suggestedGoal: parsed.suggestedGoal,
      suggestedDelay: parsed.suggestedDelay,
      meetingSubject: parsed.meetingSubject,
    };
  }

  /**
   * Fallback: rule-based strategy when AI is unavailable.
   */
  private heuristicStrategy(lead: any): StrategyRecommendation {
    const daysSinceContact = lead.lastContactedAt
      ? (Date.now() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    const totalCalls = lead.totalCalls || 0;
    const score = lead.score || 0;
    const hasPhone = !!lead.phone;
    const hasEmail = !!lead.email;

    // High-score lead that hasn't been contacted recently → meeting invite
    if (score >= 70 && daysSinceContact > 3 && hasEmail) {
      return {
        action: "INVITE_MEETING",
        reason: "High-value lead — video meeting for detailed discussion",
        priority: "high",
        suggestedGoal: "Product demo and closing discussion",
        meetingSubject: `Orivraa Product Demo for ${lead.name}`,
      };
    }

    // Many calls without progress → try email
    if (totalCalls >= 3 && score < 50 && hasEmail) {
      return {
        action: "EMAIL",
        reason: "Multiple calls without much progress — try email approach",
        priority: "medium",
        suggestedGoal: "Re-engage via email with value proposition",
      };
    }

    // Not contacted in 7+ days → call
    if (daysSinceContact > 7 && hasPhone) {
      return {
        action: "CALL",
        reason: `Not contacted in ${Math.floor(daysSinceContact)} days`,
        priority: "high",
        suggestedGoal: "Re-establish connection and assess interest",
      };
    }

    // Default: follow up later
    if (daysSinceContact < 2) {
      return {
        action: "FOLLOW_UP_LATER",
        reason: "Recently contacted — give them space",
        priority: "low",
        suggestedDelay: "2 days",
      };
    }

    // Default: call if phone available, otherwise email
    if (hasPhone) {
      return {
        action: "CALL",
        reason: "Standard follow-up",
        priority: "medium",
        suggestedGoal: "Progress the conversation",
      };
    }

    if (hasEmail) {
      return {
        action: "EMAIL",
        reason: "No phone — use email",
        priority: "medium",
        suggestedGoal: "Initiate conversation and get phone number",
      };
    }

    return { action: "WAIT", reason: "No contact info available", priority: "low" };
  }
}
