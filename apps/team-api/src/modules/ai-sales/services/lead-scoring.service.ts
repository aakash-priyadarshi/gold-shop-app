import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

export interface LeadScore {
  total: number; // 0-100
  breakdown: {
    engagement: number;
    behavioral: number;
    demographic: number;
    callHistory: number;
  };
  tier: "hot" | "warm" | "cold" | "dead";
  suggestedAction: string;
}

@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  constructor(private prisma: PrismaService) {}

  /** Calculate a comprehensive lead score */
  async scoreLeead(leadId: string): Promise<LeadScore> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        callSessions: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
        meetingSessions: {
          where: { status: "completed" },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        interactions: {
          orderBy: { createdAt: "desc" },
          take: 15,
        },
        emails: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
    if (!lead) throw new Error("Lead not found");

    const engagement = this.scoreEngagement(lead);
    const behavioral = this.scoreBehavioral(lead);
    const demographic = this.scoreDemographic(lead);
    const callHistory = this.scoreCallHistory(lead.callSessions);
    const interactionBonus = this.scoreInteractions(lead);

    // Weighted: engagement 25%, behavioral 20%, demographic 15%, calls 20%, interactions 20%
    const total = Math.min(
      100,
      Math.round(
        engagement * 0.25 +
        behavioral * 0.20 +
        demographic * 0.15 +
        callHistory * 0.20 +
        interactionBonus * 0.20,
      ),
    );

    const tier = total >= 75 ? "hot" : total >= 45 ? "warm" : total >= 20 ? "cold" : "dead";
    const suggestedAction = this.getSuggestedAction(tier, lead, lead.callSessions);

    return {
      total,
      breakdown: { engagement, behavioral, demographic, callHistory },
      tier,
      suggestedAction,
    };
  }

  /** Bulk score all leads and update their temperature field */
  async bulkScoreLeads(): Promise<{ scored: number }> {
    const leads = await this.prisma.lead.findMany({
      where: { doNotCall: false },
      select: { id: true },
    });

    let scored = 0;
    for (const lead of leads) {
      try {
        const score = await this.scoreLeead(lead.id);
        await this.prisma.lead.update({
          where: { id: lead.id },
          data: {
            score: score.total,
            temperature: score.tier,
          },
        });
        scored++;
      } catch {
        // Skip leads that fail scoring
      }
    }

    return { scored };
  }

  private scoreEngagement(lead: any): number {
    let score = 0;

    // Email engagement
    if (lead.emailsOpened > 0) score += Math.min(lead.emailsOpened * 5, 25);

    // Demo watched
    if (lead.demoWatched) score += 20;

    // Pricing page views
    if (lead.pricingViews > 0) score += Math.min(lead.pricingViews * 8, 25);

    // Pages visited (behavioral breadcrumb)
    const pages = lead.pagesVisited as any[];
    if (pages && pages.length > 0) {
      score += Math.min(pages.length * 3, 15);
    }

    // Recency: contacted in last 7 days?
    if (lead.lastContactedAt) {
      const daysSince = (Date.now() - new Date(lead.lastContactedAt).getTime()) / 86400000;
      if (daysSince < 1) score += 15;
      else if (daysSince < 3) score += 10;
      else if (daysSince < 7) score += 5;
    }

    return Math.min(score, 100);
  }

  private scoreBehavioral(lead: any): number {
    let score = 0;

    // Zero-party data (forms filled, preferences shared)
    const zpd = lead.zeroPartyData as Record<string, any> | null;
    if (zpd && Object.keys(zpd).length > 0) {
      score += Math.min(Object.keys(zpd).length * 10, 30);
    }

    // Competitors mentioned = active evaluation
    const competitors = lead.competitorsMentioned as string[] | null;
    if (competitors && competitors.length > 0) {
      score += 20;
    }

    // Has email and phone (more reachable)
    if (lead.email) score += 10;
    if (lead.phone) score += 15;

    // Source quality
    const sourceScores: Record<string, number> = {
      REFERRAL: 25,
      INBOUND: 20,
      WEBSITE: 15,
      SOCIAL: 10,
      COLD_CALL: 5,
      PURCHASED_LIST: 0,
    };
    score += sourceScores[lead.source] || 5;

    return Math.min(score, 100);
  }

  private scoreDemographic(lead: any): number {
    let score = 30; // Base demographic score

    // Has role info (decision maker signals)
    if (lead.role) {
      const executiveTerms = ["ceo", "cto", "cfo", "vp", "director", "head", "chief", "owner", "founder"];
      if (executiveTerms.some((t) => lead.role.toLowerCase().includes(t))) {
        score += 40;
      } else if (lead.role.toLowerCase().includes("manager")) {
        score += 25;
      } else {
        score += 10;
      }
    }

    // Has company info
    if (lead.company) score += 15;

    // Has timezone/country (allows targeted calling)
    if (lead.timezone) score += 5;
    if (lead.countryCode) score += 5;

    return Math.min(score, 100);
  }

  private scoreCallHistory(calls: any[]): number {
    if (!calls || calls.length === 0) return 20; // New leads get a base score

    let score = 0;

    // Completed calls
    const completed = calls.filter((c) => c.status === "COMPLETED");
    score += Math.min(completed.length * 10, 30);

    // Positive sentiment
    const positive = completed.filter((c) => c.sentiment === "POSITIVE" || c.sentiment === "VERY_POSITIVE");
    score += positive.length * 15;

    // Buying signals detected
    const withBuyingSignals = completed.filter(
      (c) => c.buyingSignals && (c.buyingSignals as string[]).length > 0,
    );
    score += withBuyingSignals.length * 20;

    // Follow-up needed = still interested
    const needsFollowUp = completed.filter((c) => c.followUpNeeded);
    score += needsFollowUp.length * 10;

    // Negative: too many no-answers or failures
    const noAnswer = calls.filter((c) => c.status === "NO_ANSWER");
    score -= noAnswer.length * 5;

    return Math.max(0, Math.min(score, 100));
  }

  /** Score based on all interactions (meetings, emails, enrichment quality) */
  private scoreInteractions(lead: any): number {
    let score = 0;

    // Video meetings are high-value touchpoints
    const meetings = lead.meetingSessions || [];
    score += Math.min(meetings.length * 20, 40);

    // Email engagement (received emails = lead is responding)
    const emails = lead.emails || [];
    const receivedEmails = emails.filter((e: any) => e.direction === "RECEIVED");
    score += Math.min(receivedEmails.length * 10, 25);

    // Total interactions = engagement breadth
    const interactions = lead.interactions || [];
    score += Math.min(interactions.length * 3, 15);

    // Goal achievement from interactions
    const goalsAchieved = interactions.filter((i: any) => i.goalAchieved === true);
    score += goalsAchieved.length * 10;

    // Buying intelligence completeness (enrichment quality)
    if (lead.budgetRange) score += 10;
    if (lead.urgency && lead.urgency !== "none") score += 5;
    if (lead.communicationStyle) score += 5;
    if (lead.dealValue) score += 5;

    // Negative: goals not achieved repeatedly
    const goalsFailed = interactions.filter((i: any) => i.goalAchieved === false);
    if (goalsFailed.length > 3) score -= 10;

    return Math.max(0, Math.min(score, 100));
  }

  private getSuggestedAction(tier: string, lead: any, calls: any[]): string {
    if (tier === "hot") {
      return calls.some((c) => c.followUpNeeded)
        ? "Schedule follow-up call within 24 hours"
        : "Ready for conversion — send proposal or schedule demo";
    }
    if (tier === "warm") {
      if (!calls.length) return "Initial outreach — discovery call recommended";
      return "Continue nurturing — share relevant case study or content";
    }
    if (tier === "cold") {
      if (calls.length > 3) return "Move to nurture sequence — reduce call frequency";
      return "Try different approach or channel (email/social)";
    }
    return "Low priority — add to long-term nurture list";
  }
}
