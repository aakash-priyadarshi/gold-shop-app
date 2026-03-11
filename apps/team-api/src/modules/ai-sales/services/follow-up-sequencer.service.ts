import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * FollowUpSequencerService — Auto-schedules optimal follow-up calls.
 *
 * After each call with outcome "follow_up" or "callback", the sequencer:
 * 1. Looks up TimingIntelligence for the lead's segment → picks best day/hour
 * 2. Looks up PersonaSegmentPerformance → picks the best persona
 * 3. Reads CallRemark open loops → builds approach notes
 * 4. Creates a FollowUpSequence record with scheduledAt
 *
 * A separate cron job (or campaign scheduler) picks up pending follow-ups
 * and initiates calls at the scheduled time.
 */
@Injectable()
export class FollowUpSequencerService {
  private readonly logger = new Logger(FollowUpSequencerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Schedule a follow-up call for a lead after a call ends.
   */
  async scheduleFollowUp(params: {
    leadId: string;
    callSessionId: string;
    lead: any;
    callRemark?: any;
    segmentKey: string;
  }) {
    const { leadId, callSessionId, lead, callRemark, segmentKey } = params;

    // 1. Best timing
    const timing = await this.prisma.timingIntelligence.findFirst({
      where: { segmentKey, sampleSize: { gte: 3 } },
      orderBy: { conversionRate: "desc" },
    });

    // 2. Best persona
    const persona = await this.prisma.personaSegmentPerformance.findFirst({
      where: { segmentKey, totalCalls: { gte: 3 } },
      orderBy: { conversionRate: "desc" },
    });

    // 3. Calculate scheduledAt
    const scheduledAt = this.calculateNextCallTime(timing, lead);

    // 4. Build strategy from open loops + call remark
    const openLoops = callRemark?.openLoops || lead.openLoops || [];
    const strategyNotes = callRemark?.nextCallStrategy || lead.nextCallStrategy || "Standard follow-up";

    const followUp = await this.prisma.followUpSequence.create({
      data: {
        leadId,
        callSessionId,
        status: "scheduled",
        scheduledAt,
        scheduledDay: timing?.dayOfWeek,
        scheduledHour: timing?.hourSlot,
        personaId: persona?.personaId,
        personaName: persona?.personaName,
        openLoopsToAddress: openLoops,
        strategyNotes,
      },
    });

    this.logger.log(`Follow-up scheduled for lead ${leadId} at ${scheduledAt.toISOString()}`);
    return followUp;
  }

  /**
   * Get all pending follow-ups ready to be executed.
   */
  async getPendingFollowUps(limit = 50) {
    return this.prisma.followUpSequence.findMany({
      where: {
        status: "scheduled",
        scheduledAt: { lte: new Date() },
      },
      orderBy: { scheduledAt: "asc" },
      take: limit,
    });
  }

  /**
   * List follow-ups for a specific lead.
   */
  async getLeadFollowUps(leadId: string) {
    return this.prisma.followUpSequence.findMany({
      where: { leadId },
      orderBy: { scheduledAt: "desc" },
    });
  }

  /**
   * List all follow-ups with filters.
   */
  async listFollowUps(status?: string, limit = 100) {
    const where: any = {};
    if (status) where.status = status;
    return this.prisma.followUpSequence.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      take: limit,
    });
  }

  /**
   * Mark a follow-up as completed with result session.
   */
  async completeFollowUp(id: string, resultSessionId: string, outcome: string) {
    return this.prisma.followUpSequence.update({
      where: { id },
      data: {
        status: "completed",
        executedAt: new Date(),
        resultSessionId,
        outcome,
      },
    });
  }

  /**
   * Cancel a pending follow-up.
   */
  async cancelFollowUp(id: string) {
    return this.prisma.followUpSequence.update({
      where: { id },
      data: { status: "cancelled" },
    });
  }

  /**
   * Get sequencer dashboard stats.
   */
  async getStats() {
    const [pending, scheduled, completed, cancelled] = await Promise.all([
      this.prisma.followUpSequence.count({ where: { status: "pending" } }),
      this.prisma.followUpSequence.count({ where: { status: "scheduled" } }),
      this.prisma.followUpSequence.count({ where: { status: "completed" } }),
      this.prisma.followUpSequence.count({ where: { status: "cancelled" } }),
    ]);

    const upcoming = await this.prisma.followUpSequence.findMany({
      where: { status: "scheduled", scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
      take: 10,
    });

    return { pending, scheduled, completed, cancelled, upcoming };
  }

  /**
   * Schedule re-engagement for dormant leads.
   */
  async scheduleReEngagement(leadId: string, dormantDays: number, segmentKey: string) {
    const pattern = await this.prisma.reEngagementPattern.findFirst({
      where: { segmentKey, sampleSize: { gte: 3 } },
      orderBy: { successRate: "desc" },
    });

    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 1); // schedule for tomorrow
    scheduledAt.setHours(10, 0, 0, 0); // default 10 AM

    return this.prisma.followUpSequence.create({
      data: {
        leadId,
        status: "scheduled",
        scheduledAt,
        dormantDays,
        reEngageMethod: pattern?.reEngageMethod || "call",
        strategyNotes: pattern?.reEngageMessage || "Re-engagement call for dormant lead",
      },
    });
  }

  /* ─── Helpers ─── */

  private calculateNextCallTime(timing: any, lead: any): Date {
    const now = new Date();
    const target = new Date(now);

    if (timing) {
      // Find the next occurrence of the best day/hour
      const dayMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6,
      };
      const targetDay = dayMap[timing.dayOfWeek] ?? now.getDay();
      const targetHour = timing.hourSlot ?? 10;

      let daysUntil = targetDay - now.getDay();
      if (daysUntil <= 0) daysUntil += 7; // next week
      if (daysUntil === 0 && now.getHours() >= targetHour) daysUntil = 7;

      target.setDate(now.getDate() + daysUntil);
      target.setHours(targetHour, 0, 0, 0);
    } else {
      // Default: next business day at 10 AM
      let daysToAdd = 1;
      const nextDay = new Date(now);
      nextDay.setDate(now.getDate() + daysToAdd);
      while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
        daysToAdd++;
        nextDay.setDate(now.getDate() + daysToAdd);
      }
      target.setDate(now.getDate() + daysToAdd);
      target.setHours(10, 0, 0, 0);
    }

    return target;
  }
}
