import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";

/**
 * CentralBrainService — the institutional intelligence layer.
 *
 * Two modes:
 * READ: Before every call, returns insights for a specific lead's segment.
 * WRITE: After every call, extracts patterns and updates all intelligence tables.
 *
 * The brain never modifies lead profiles directly — it only manages
 * aggregate intelligence across all leads.
 */
@Injectable()
export class CentralBrainService {
  private readonly logger = new Logger(CentralBrainService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Query brain for pre-call insights relevant to a specific lead.
   * Called by PreCallBrainService before every call.
   */
  async queryForLead(lead: {
    countryCode?: string | null;
    company?: string | null;
    role?: string | null;
    stage?: string;
    communicationStyle?: string | null;
    preferredPersona?: string | null;
  }) {
    const segmentKey = this.buildSegmentKey(lead);
    const results: Record<string, any> = { segmentKey };

    // 1. Best winning pattern for this segment
    try {
      const pattern = await this.prisma.winningPattern.findFirst({
        where: { segmentKey, isActive: true, sampleSize: { gte: 3 } },
        orderBy: { conversionRate: "desc" },
      });
      results.winningPattern = pattern;
    } catch { results.winningPattern = null; }

    // 2. Risk warnings from lost deal patterns
    try {
      const warnings = await this.prisma.lostDealPattern.findMany({
        where: { segmentKey, sampleSize: { gte: 3 } },
        orderBy: { confidence: "desc" },
        take: 3,
      });
      results.riskWarnings = warnings;
    } catch { results.riskWarnings = []; }

    // 3. Best conversation moments for this segment
    try {
      const moments = await this.prisma.conversationMoment.findMany({
        where: { segmentKey, timesUsed: { gte: 3 } },
        orderBy: { successRate: "desc" },
        take: 5,
      });
      results.topMoments = moments;
    } catch { results.topMoments = []; }

    // 4. Timing intelligence
    try {
      const timing = await this.prisma.timingIntelligence.findMany({
        where: { segmentKey, sampleSize: { gte: 5 } },
        orderBy: { conversionRate: "desc" },
        take: 5,
      });
      results.bestCallTimes = timing;
    } catch { results.bestCallTimes = []; }

    // 5. Persona performance for this segment
    try {
      const personaPerf = await this.prisma.personaSegmentPerformance.findMany({
        where: { segmentKey, totalCalls: { gte: 5 } },
        orderBy: { conversionRate: "desc" },
        take: 3,
      });
      results.personaRecommendations = personaPerf;
    } catch { results.personaRecommendations = []; }

    // 6. Competitor intelligence
    try {
      const competitors = await this.prisma.competitorMention.groupBy({
        by: ["competitorName"],
        where: { segmentKey },
        _count: true,
        orderBy: { _count: { competitorName: "desc" } },
        take: 5,
      });
      results.topCompetitors = competitors;
    } catch { results.topCompetitors = []; }

    // 7. Re-engagement pattern (if lead is dormant)
    try {
      const reEngage = await this.prisma.reEngagementPattern.findFirst({
        where: { segmentKey, sampleSize: { gte: 3 } },
        orderBy: { successRate: "desc" },
      });
      results.reEngagementAdvice = reEngage;
    } catch { results.reEngagementAdvice = null; }

    return results;
  }

  /**
   * Record call outcome — called by PostCallProcessor after every call.
   * Extracts patterns and updates all intelligence tables asynchronously.
   */
  async recordCallOutcome(payload: {
    leadId: string;
    callSessionId: string;
    lead: any;
    transcript?: string;
    outcome?: string;
    sentiment?: string;
    summary?: string;
    objectionsEncountered?: string[];
    buyingSignals?: string[];
    keyTopics?: string[];
    personaUsed?: string;
    personaId?: string;
    duration?: number;
    callNumber: number;
  }) {
    const segmentKey = this.buildSegmentKey(payload.lead);
    const isConversion = payload.outcome === "converted" || payload.outcome === "won";
    const isLost = payload.outcome === "lost" || payload.outcome === "not_interested";

    // 1. Create CallRemark
    try {
      await this.prisma.callRemark.create({
        data: {
          leadId: payload.leadId,
          callSessionId: payload.callSessionId,
          callNumber: payload.callNumber,
          personaUsed: payload.personaUsed,
          personaId: payload.personaId,
          summary: payload.summary || "Call processed",
          keyTopics: payload.keyTopics || [],
          objectionsRaised: payload.objectionsEncountered || [],
          buyingSignals: payload.buyingSignals || [],
          whatWorked: [],
          whatDidntWork: [],
          whatToAvoidNext: [],
          personalDetailsCaptured: [],
          notableQuotesThisCall: [],
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to create call remark: ${err.message}`);
    }

    // 2. Update timing intelligence
    try {
      const now = new Date();
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const dayOfWeek = days[now.getDay()];
      const hourSlot = now.getHours();

      await this.prisma.timingIntelligence.upsert({
        where: {
          segmentKey_dayOfWeek_hourSlot: { segmentKey, dayOfWeek, hourSlot },
        },
        create: {
          segmentKey,
          dayOfWeek,
          hourSlot,
          answerRate: payload.outcome !== "no_answer" ? 1 : 0,
          conversionRate: isConversion ? 1 : 0,
          avgCallDuration: payload.duration || 0,
          sampleSize: 1,
        },
        update: {
          sampleSize: { increment: 1 },
          answerRate: payload.outcome !== "no_answer"
            ? { increment: 0 } // will be recalculated
            : undefined,
          avgCallDuration: payload.duration || undefined,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Timing intelligence update failed: ${err.message}`);
    }

    // 3. Update persona segment performance
    if (payload.personaId) {
      try {
        const existing = await this.prisma.personaSegmentPerformance.findUnique({
          where: {
            personaId_segmentKey: { personaId: payload.personaId, segmentKey },
          },
        });

        if (existing) {
          const newTotal = existing.totalCalls + 1;
          const newConversions = existing.totalConversions + (isConversion ? 1 : 0);
          await this.prisma.personaSegmentPerformance.update({
            where: { id: existing.id },
            data: {
              totalCalls: newTotal,
              totalConversions: newConversions,
              conversionRate: newTotal > 0 ? newConversions / newTotal : 0,
              confidence: Math.min(newTotal / 50, 1),
            },
          });
        } else {
          await this.prisma.personaSegmentPerformance.create({
            data: {
              personaId: payload.personaId,
              personaName: payload.personaUsed || "Unknown",
              segmentKey,
              totalCalls: 1,
              totalConversions: isConversion ? 1 : 0,
              conversionRate: isConversion ? 1 : 0,
              confidence: 0.02,
            },
          });
        }
      } catch (err: any) {
        this.logger.warn(`Persona performance update failed: ${err.message}`);
      }
    }

    // 4. Log competitor mentions from key topics
    if (payload.keyTopics?.length) {
      const competitorKeywords = payload.keyTopics.filter((t) =>
        t.toLowerCase().includes("competitor") || t.toLowerCase().includes("alternative"),
      );
      for (const comp of competitorKeywords) {
        try {
          await this.prisma.competitorMention.create({
            data: {
              competitorName: comp,
              segmentKey,
              leadId: payload.leadId,
              callSessionId: payload.callSessionId,
              sentiment: "neutral",
            },
          });
        } catch {}
      }
    }

    // 5. If conversion, record winning pattern
    if (isConversion) {
      try {
        await this.prisma.winningPattern.create({
          data: {
            segmentKey,
            keyObjection: payload.objectionsEncountered?.[0],
            conversionRate: 1,
            sampleSize: 1,
            confidence: 0.1,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Winning pattern creation failed: ${err.message}`);
      }
    }

    // 6. If lost, record lost deal pattern
    if (isLost) {
      try {
        await this.prisma.lostDealPattern.create({
          data: {
            segmentKey,
            lostReason: payload.outcome,
            precedingSignals: payload.objectionsEncountered || [],
            sampleSize: 1,
            confidence: 0.1,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Lost deal pattern creation failed: ${err.message}`);
      }
    }

    this.logger.log(`Brain updated for call ${payload.callSessionId}, segment: ${segmentKey}`);
  }

  /**
   * Build a segment key from lead data.
   * Format: "countryCode:industry:size:role"
   * Falls back to broad segments when data is missing.
   */
  private buildSegmentKey(lead: any): string {
    const parts = [
      lead.countryCode || "unknown",
      lead.company ? "b2b" : "b2c",
      lead.role || "unknown",
    ];
    return parts.join(":").toLowerCase();
  }

  /* ─── READ ENDPOINTS ─── */

  /** Get all winning patterns, optionally filtered by segment */
  async getWinningPatterns(segmentKey?: string, limit = 20) {
    const where: any = { isActive: true };
    if (segmentKey) where.segmentKey = segmentKey;
    return this.prisma.winningPattern.findMany({
      where,
      orderBy: { conversionRate: "desc" },
      take: limit,
    });
  }

  /** Get lost deal patterns */
  async getLostDealPatterns(segmentKey?: string, limit = 20) {
    const where: any = {};
    if (segmentKey) where.segmentKey = segmentKey;
    return this.prisma.lostDealPattern.findMany({
      where,
      orderBy: { confidence: "desc" },
      take: limit,
    });
  }

  /** Get conversation moments */
  async getConversationMoments(type?: string, limit = 20) {
    const where: any = {};
    if (type) where.momentType = type;
    return this.prisma.conversationMoment.findMany({
      where,
      orderBy: { successRate: "desc" },
      take: limit,
    });
  }

  /** Get timing intelligence */
  async getTimingIntelligence(segmentKey?: string) {
    const where: any = {};
    if (segmentKey) where.segmentKey = segmentKey;
    return this.prisma.timingIntelligence.findMany({
      where,
      orderBy: [{ conversionRate: "desc" }, { answerRate: "desc" }],
    });
  }

  /** Get competitor trends */
  async getCompetitorTrends(limit = 20) {
    return this.prisma.competitorMention.groupBy({
      by: ["competitorName", "sentiment"],
      _count: true,
      orderBy: { _count: { competitorName: "desc" } },
      take: limit,
    });
  }

  /** Get persona performance across segments */
  async getPersonaPerformance(personaId?: string) {
    const where: any = {};
    if (personaId) where.personaId = personaId;
    return this.prisma.personaSegmentPerformance.findMany({
      where,
      orderBy: { conversionRate: "desc" },
    });
  }

  /** Get re-engagement patterns */
  async getReEngagementPatterns() {
    return this.prisma.reEngagementPattern.findMany({
      orderBy: { successRate: "desc" },
    });
  }

  /** Dashboard/overview stats for the brain */
  async getBrainDashboard() {
    const [
      winningPatternsCount,
      lostPatterns,
      momentCount,
      timingEntries,
      competitorMentions,
      personaPerfEntries,
      reEngagementEntries,
      totalRemarks,
    ] = await Promise.all([
      this.prisma.winningPattern.count({ where: { isActive: true } }),
      this.prisma.lostDealPattern.count(),
      this.prisma.conversationMoment.count(),
      this.prisma.timingIntelligence.count(),
      this.prisma.competitorMention.count(),
      this.prisma.personaSegmentPerformance.count(),
      this.prisma.reEngagementPattern.count(),
      this.prisma.callRemark.count(),
    ]);

    // Top segments
    const topSegments = await this.prisma.winningPattern.groupBy({
      by: ["segmentKey"],
      _count: true,
      _avg: { conversionRate: true },
      orderBy: { _count: { segmentKey: "desc" } },
      take: 10,
    });

    return {
      counts: {
        winningPatterns: winningPatternsCount,
        lostDealPatterns: lostPatterns,
        conversationMoments: momentCount,
        timingEntries,
        competitorMentions,
        personaPerformanceEntries: personaPerfEntries,
        reEngagementPatterns: reEngagementEntries,
        totalCallRemarks: totalRemarks,
      },
      topSegments,
    };
  }

  /** Get call remarks for a lead */
  async getCallRemarks(leadId: string) {
    return this.prisma.callRemark.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Record a conversation moment */
  async recordMoment(data: {
    momentType: string;
    segmentKey?: string;
    triggerPhrase?: string;
    aiResponse: string;
    sentimentBefore?: string;
    sentimentAfter?: string;
    outcome?: string;
  }) {
    return this.prisma.conversationMoment.create({ data });
  }
}
