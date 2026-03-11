import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * Manages customer behavior insights — what customers respond to,
 * how they react, segmented by region, gender, age, etc.
 *
 * These insights feed into the AI agent's conversation strategy.
 * Can be:
 *   - Manually entered by sales team
 *   - Auto-detected from call analysis (future)
 *
 * Categories:
 *   objection_handling — what works when customers object
 *   greeting_response  — how different segments respond to openers
 *   buying_signal      — phrases/patterns that indicate intent
 *   preference         — channel, time, tone preferences
 *   cultural           — cultural nuances by region
 *   pricing_reaction   — how segments respond to pricing
 */
@Injectable()
export class BehaviorInsightService {
  private readonly logger = new Logger(BehaviorInsightService.name);

  constructor(private prisma: PrismaService) {}

  /** Get all active insights, optionally filtered by category/segment */
  async list(filters?: {
    category?: string;
    segment?: string;
    isActive?: boolean;
  }) {
    return this.prisma.behaviorInsight.findMany({
      where: {
        ...(filters?.category && { category: filters.category }),
        ...(filters?.segment && { segment: filters.segment }),
        isActive: filters?.isActive ?? true,
      },
      orderBy: [{ category: "asc" }, { confidence: "desc" }],
    });
  }

  /** Get insights relevant to a specific lead context */
  async getForLead(lead: {
    countryCode?: string | null;
    timezone?: string | null;
    languagePrimary?: string | null;
  }): Promise<Array<{ category: string; pattern: string; response: string }>> {
    const segments = this.buildSegments(lead);

    const insights = await this.prisma.behaviorInsight.findMany({
      where: {
        isActive: true,
        segment: { in: segments },
      },
      orderBy: { confidence: "desc" },
      select: { category: true, pattern: true, response: true, segment: true },
    });

    return insights;
  }

  /** Build segment identifiers from lead data */
  private buildSegments(lead: {
    countryCode?: string | null;
    timezone?: string | null;
    languagePrimary?: string | null;
  }): string[] {
    const segments = ["all"];

    if (lead.countryCode) {
      segments.push(`country:${lead.countryCode.replace("+", "")}`);
    }
    if (lead.languagePrimary) {
      segments.push(`language:${lead.languagePrimary}`);
    }
    // Derive region from timezone
    if (lead.timezone) {
      const region = lead.timezone.split("/")[0]?.toLowerCase();
      if (region) segments.push(`region:${region}`);
    }

    return segments;
  }

  async create(data: {
    category: string;
    segment?: string;
    pattern: string;
    response: string;
    confidence?: number;
    sampleSize?: number;
  }) {
    return this.prisma.behaviorInsight.create({
      data: {
        category: data.category,
        segment: data.segment || "all",
        pattern: data.pattern,
        response: data.response,
        confidence: data.confidence ?? 0.5,
        sampleSize: data.sampleSize ?? 0,
      },
    });
  }

  async update(
    id: string,
    data: {
      pattern?: string;
      response?: string;
      confidence?: number;
      sampleSize?: number;
      isActive?: boolean;
      segment?: string;
      category?: string;
    },
  ) {
    return this.prisma.behaviorInsight.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.behaviorInsight.delete({ where: { id } });
  }

  /** Seed initial behavior insights — run once */
  async seedDefaults(): Promise<number> {
    const existing = await this.prisma.behaviorInsight.count();
    if (existing > 0) return 0;

    const seeds = [
      {
        category: "greeting_response",
        segment: "country:91",
        pattern: "Indian customers respond well to warm, personal greetings that reference family or festivals",
        response: "Use 'Namaste' or seasonal greetings. Ask about family. Reference upcoming festivals.",
        confidence: 0.75,
        sampleSize: 50,
      },
      {
        category: "objection_handling",
        segment: "all",
        pattern: "Customer says 'too expensive' or 'price is high'",
        response: "Acknowledge, then frame as investment. Compare to bank FD returns. Highlight purity certification.",
        confidence: 0.8,
        sampleSize: 120,
      },
      {
        category: "buying_signal",
        segment: "all",
        pattern: "Customer asks about delivery timeline or payment options",
        response: "Provide specific timeline, immediately offer booking link. Time-sensitive framing works.",
        confidence: 0.85,
        sampleSize: 80,
      },
      {
        category: "preference",
        segment: "country:91",
        pattern: "Indian customers overwhelmingly prefer WhatsApp over SMS",
        response: "Default to WhatsApp for Indian numbers. Ask only if unsure.",
        confidence: 0.9,
        sampleSize: 200,
      },
      {
        category: "cultural",
        segment: "region:asia",
        pattern: "Customers in Asia prefer relationship-building before hard pitch",
        response: "Spend first 2-3 minutes on rapport. Ask about their needs before presenting product.",
        confidence: 0.7,
        sampleSize: 100,
      },
      {
        category: "pricing_reaction",
        segment: "all",
        pattern: "Customers respond better to per-gram pricing than total cost",
        response: "Break down pricing per gram first. Show making charges separately. Be transparent.",
        confidence: 0.8,
        sampleSize: 90,
      },
    ];

    await this.prisma.behaviorInsight.createMany({ data: seeds });
    return seeds.length;
  }
}
