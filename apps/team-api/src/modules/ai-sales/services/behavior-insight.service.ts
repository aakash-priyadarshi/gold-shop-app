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
    const seeds = [
      {
        category: "greeting_response",
        segment: "all",
        pattern: "Jewellers respond better when the opener sounds like a business conversation, not a generic software pitch.",
        response: "Lead with business context: ask how they currently manage inventory, billing, or enquiries before mentioning features.",
        confidence: 0.84,
        sampleSize: 90,
      },
      {
        category: "objection_handling",
        segment: "all",
        pattern: "Customer says they already manage things through Excel, WhatsApp, or manual registers.",
        response: "Position Orivraa as the system that unifies CRM, inventory, billing, catalogues, and RFQ so they stop switching between tools.",
        confidence: 0.88,
        sampleSize: 110,
      },
      {
        category: "objection_handling",
        segment: "all",
        pattern: "Customer compares Orivraa to Zoho, Marg ERP, Vyapar, or generic billing software.",
        response: "Emphasize that Orivraa is purpose-built for jewellers with weight/purity tracking, RFQ, digital catalogues, marketplace selling, and faster setup.",
        confidence: 0.86,
        sampleSize: 72,
      },
      {
        category: "buying_signal",
        segment: "country:91",
        pattern: "Customer asks about GST billing, making charges, purity, or old-gold exchange workflows.",
        response: "Go deep on billing and inventory capabilities. These questions usually indicate genuine evaluation intent for operations software.",
        confidence: 0.83,
        sampleSize: 64,
      },
      {
        category: "buying_signal",
        segment: "all",
        pattern: "Customer asks about setup time, onboarding, product upload, or whether they can start free.",
        response: "Use the under-5-minute onboarding story and free-plan entry point. Offer the seller guide or signup link immediately.",
        confidence: 0.9,
        sampleSize: 102,
      },
      {
        category: "preference",
        segment: "country:91",
        pattern: "Indian jewellers overwhelmingly prefer WhatsApp follow-up with catalogues or pricing details.",
        response: "Default to WhatsApp when possible, especially for catalogue sharing, seller guide, or pricing plan follow-up.",
        confidence: 0.9,
        sampleSize: 200,
      },
      {
        category: "cultural",
        segment: "region:asia",
        pattern: "Jewellery sellers in South Asia prefer relationship-building and proof before a hard software pitch.",
        response: "Start with rapport and current workflow questions, then introduce proof points like 2,000+ jewellers, 6+ countries, and no-install setup.",
        confidence: 0.78,
        sampleSize: 108,
      },
      {
        category: "pricing_reaction",
        segment: "all",
        pattern: "Customers question monthly pricing because they compare it to one-time software licenses.",
        response: "Reframe around zero IT overhead, automatic updates, cloud access, data backups, and the ability to start at ₹0 instead of paying ₹50,000 to ₹5,00,000 upfront.",
        confidence: 0.89,
        sampleSize: 94,
      },
      {
        category: "pricing_reaction",
        segment: "all",
        pattern: "Customer wants to know which plan fits their business.",
        response: "Qualify on listings, branches, AI usage, and integration needs. Free for early-stage, Pro for active shops, Pro+ for AI/API heavy use, Enterprise for large operations.",
        confidence: 0.87,
        sampleSize: 76,
      },
    ];

    const existing = await this.prisma.behaviorInsight.findMany({
      select: { category: true, segment: true, pattern: true },
    });
    const existingKeys = new Set(existing.map((entry) => `${entry.category}:${entry.segment}:${entry.pattern}`));

    const newSeeds = seeds.filter(
      (seed) => !existingKeys.has(`${seed.category}:${seed.segment}:${seed.pattern}`),
    );

    if (newSeeds.length > 0) {
      await this.prisma.behaviorInsight.createMany({ data: newSeeds });
    }

    return newSeeds.length;
  }
}
