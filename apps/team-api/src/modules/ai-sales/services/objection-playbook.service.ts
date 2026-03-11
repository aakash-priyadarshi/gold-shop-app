import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * ObjectionPlaybookService — Admin-curated objection responses.
 *
 * Instead of the AI improvising, it references approved responses
 * for common objections, ranked by win rate per segment.
 * Admins can add, edit, approve/reject entries.
 * The brain auto-populates new entries when it detects novel objections.
 */
@Injectable()
export class ObjectionPlaybookService {
  private readonly logger = new Logger(ObjectionPlaybookService.name);

  constructor(private prisma: PrismaService) {}

  /* ─── CRUD ─── */

  async create(data: {
    category: string;
    objectionPhrase: string;
    segmentKey?: string;
    bestResponse?: string;
    bestTechnique?: string;
    responses?: any[];
  }) {
    return this.prisma.objectionPlaybook.create({
      data: { ...data, responses: data.responses || [] } as any,
    });
  }

  async list(filters?: { category?: string; segmentKey?: string; isApproved?: boolean }) {
    const where: any = { isActive: true };
    if (filters?.category) where.category = filters.category;
    if (filters?.segmentKey) where.segmentKey = filters.segmentKey;
    if (filters?.isApproved !== undefined) where.isApproved = filters.isApproved;
    return this.prisma.objectionPlaybook.findMany({
      where,
      orderBy: { bestWinRate: "desc" },
    });
  }

  async get(id: string) {
    return this.prisma.objectionPlaybook.findUnique({ where: { id } });
  }

  async update(id: string, data: Record<string, any>) {
    return this.prisma.objectionPlaybook.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.objectionPlaybook.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async approve(id: string) {
    return this.prisma.objectionPlaybook.update({
      where: { id },
      data: { isApproved: true },
    });
  }

  async reject(id: string) {
    return this.prisma.objectionPlaybook.update({
      where: { id },
      data: { isApproved: false },
    });
  }

  /* ─── QUERY (used during calls) ─── */

  /**
   * Find the best response for an objection, optionally for a segment.
   */
  async findBestResponse(objectionText: string, segmentKey?: string): Promise<{
    response: string;
    technique: string;
    winRate: number;
  } | null> {
    // Search for matching playbook entries
    const entries = await this.prisma.objectionPlaybook.findMany({
      where: {
        isActive: true,
        isApproved: true,
        ...(segmentKey ? {
          OR: [{ segmentKey }, { segmentKey: null }],
        } : {}),
      },
      orderBy: { bestWinRate: "desc" },
    });

    // Find best match by checking if objection text contains the trigger phrase
    const normalizedInput = objectionText.toLowerCase();
    for (const entry of entries) {
      const phrase = entry.objectionPhrase.toLowerCase();
      if (normalizedInput.includes(phrase) || phrase.includes(normalizedInput)) {
        // Increment usage counter (fire-and-forget)
        this.prisma.objectionPlaybook.update({
          where: { id: entry.id },
          data: { totalTimesRaised: { increment: 1 } },
        }).catch(() => {});

        return {
          response: entry.bestResponse || "Acknowledge and address the concern",
          technique: entry.bestTechnique || "active_listening",
          winRate: entry.bestWinRate,
        };
      }
    }

    return null;
  }

  /**
   * Record outcome when an objection response was used.
   */
  async recordOutcome(playbookId: string, won: boolean) {
    const update: any = { totalTimesRaised: { increment: 1 } };
    if (won) update.totalTimesWon = { increment: 1 };

    const entry = await this.prisma.objectionPlaybook.update({
      where: { id: playbookId },
      data: update,
    });

    // Recalculate win rate
    if (entry.totalTimesRaised > 0) {
      await this.prisma.objectionPlaybook.update({
        where: { id: playbookId },
        data: { bestWinRate: entry.totalTimesWon / entry.totalTimesRaised },
      });
    }
  }

  /**
   * Get playbook stats.
   */
  async getStats() {
    const [total, approved, pending, totalUsed] = await Promise.all([
      this.prisma.objectionPlaybook.count({ where: { isActive: true } }),
      this.prisma.objectionPlaybook.count({ where: { isActive: true, isApproved: true } }),
      this.prisma.objectionPlaybook.count({ where: { isActive: true, isApproved: false } }),
      this.prisma.objectionPlaybook.aggregate({
        _sum: { totalTimesRaised: true },
        where: { isActive: true },
      }),
    ]);

    const topByWinRate = await this.prisma.objectionPlaybook.findMany({
      where: { isActive: true, isApproved: true, totalTimesRaised: { gte: 5 } },
      orderBy: { bestWinRate: "desc" },
      take: 5,
    });

    const byCategory = await this.prisma.objectionPlaybook.groupBy({
      by: ["category"],
      where: { isActive: true },
      _count: true,
      _avg: { bestWinRate: true },
    });

    return {
      total,
      approved,
      pending,
      totalTimesUsed: totalUsed._sum.totalTimesRaised || 0,
      topByWinRate,
      byCategory,
    };
  }

  /**
   * Seed default playbook entries.
   */
  async seedDefaults() {
    const defaults = [
      {
        category: "price",
        objectionPhrase: "too expensive",
        bestResponse: "I completely understand — value for money is important. Let me show you how our clients typically see 3-5x return on this investment within the first month alone.",
        bestTechnique: "value_reframe",
        bestWinRate: 0.42,
      },
      {
        category: "timing",
        objectionPhrase: "not the right time",
        bestResponse: "Totally fair. When would be better? In the meantime, I can share some insights that will help you prepare — no commitment needed.",
        bestTechnique: "soft_close_with_value",
        bestWinRate: 0.35,
      },
      {
        category: "competitor",
        objectionPhrase: "using another solution",
        bestResponse: "That makes sense — it shows you value this area. What I hear from customers who switched is that our approach to [specific differentiator] saves them significant time. Would you be open to a quick comparison?",
        bestTechnique: "acknowledge_and_differentiate",
        bestWinRate: 0.28,
      },
      {
        category: "trust",
        objectionPhrase: "need to think about it",
        bestResponse: "Of course — this is an important decision. What specific aspect would you like to think through? I might be able to address it right now.",
        bestTechnique: "isolate_concern",
        bestWinRate: 0.38,
      },
      {
        category: "authority",
        objectionPhrase: "need to check with my boss",
        bestResponse: "That makes total sense. Would it help if I prepared a quick summary of the key benefits you can share with them? Or better yet, should we loop them in for a brief 10-minute call?",
        bestTechnique: "empower_champion",
        bestWinRate: 0.31,
      },
      {
        category: "need",
        objectionPhrase: "we don't need this",
        bestResponse: "I appreciate your honesty. Can I ask — what's your current approach to [pain point]? Most companies we work with didn't realize the gap until they saw the data.",
        bestTechnique: "problem_awareness",
        bestWinRate: 0.25,
      },
    ];

    let created = 0;
    for (const d of defaults) {
      const exists = await this.prisma.objectionPlaybook.findFirst({
        where: { objectionPhrase: d.objectionPhrase },
      });
      if (!exists) {
        await this.prisma.objectionPlaybook.create({ data: { ...d, responses: [] } as any });
        created++;
      }
    }
    return { seeded: created };
  }
}
