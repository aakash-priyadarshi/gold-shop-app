import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class ABTestingService {
  private readonly logger = new Logger(ABTestingService.name);

  constructor(private prisma: PrismaService) {}

  /* ─── EXPERIMENT CRUD ─── */

  async createExperiment(data: {
    name: string;
    experimentType: string;
    variantA: any;
    variantB: any;
    segmentFilter?: any;
    segmentKey?: string;
    description?: string;
    autoPromote?: boolean;
  }) {
    return this.prisma.aBExperiment.create({ data: data as any });
  }

  async listExperiments(status?: string) {
    const where: any = {};
    if (status) where.status = status;
    return this.prisma.aBExperiment.findMany({
      where,
      include: { _count: { select: { assignments: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getExperiment(id: string) {
    return this.prisma.aBExperiment.findUnique({
      where: { id },
      include: {
        assignments: { orderBy: { createdAt: "desc" }, take: 50 },
        _count: { select: { assignments: true } },
      },
    });
  }

  async updateExperiment(id: string, data: Record<string, any>) {
    return this.prisma.aBExperiment.update({ where: { id }, data });
  }

  async startExperiment(id: string) {
    return this.prisma.aBExperiment.update({
      where: { id },
      data: { status: "active", startedAt: new Date() },
    });
  }

  async pauseExperiment(id: string) {
    return this.prisma.aBExperiment.update({
      where: { id },
      data: { status: "paused" },
    });
  }

  async deleteExperiment(id: string) {
    await this.prisma.aBAssignment.deleteMany({ where: { experimentId: id } });
    return this.prisma.aBExperiment.delete({ where: { id } });
  }

  /* ─── ASSIGNMENT & ROUTING ─── */

  /**
   * Assign a lead to a variant for an active experiment.
   * Uses deterministic hashing to ensure the same lead always gets the same variant.
   */
  async assignLeadToVariant(leadId: string, experimentId: string): Promise<"A" | "B"> {
    // Check existing assignment
    const existing = await this.prisma.aBAssignment.findFirst({
      where: { experimentId, leadId },
    });
    if (existing) return existing.variant as "A" | "B";

    // Simple hash-based assignment for 50/50 split
    const hash = this.simpleHash(leadId + experimentId);
    const variant = hash % 2 === 0 ? "A" : "B";

    await this.prisma.aBAssignment.create({
      data: { experimentId, leadId, variant },
    });

    return variant;
  }

  /**
   * Get the active experiment variant for a lead + experiment type.
   * Called by CallOrchestrator before each call.
   */
  async getActiveVariantForLead(leadId: string, experimentType: string): Promise<{
    experiment: any;
    variant: "A" | "B";
    variantConfig: any;
  } | null> {
    const experiment = await this.prisma.aBExperiment.findFirst({
      where: { status: "active", experimentType },
    });
    if (!experiment) return null;

    const variant = await this.assignLeadToVariant(leadId, experiment.id);
    const variantConfig = variant === "A" ? experiment.variantA : experiment.variantB;

    return { experiment, variant, variantConfig };
  }

  /**
   * Record the outcome of a call in an experiment.
   * Called by PostCallProcessor after each call.
   */
  async recordOutcome(data: {
    experimentId: string;
    leadId: string;
    callSessionId: string;
    variant: string;
    outcome: string;
    callDuration?: number;
  }) {
    // Update or create assignment with outcome
    const existing = await this.prisma.aBAssignment.findFirst({
      where: { experimentId: data.experimentId, leadId: data.leadId },
    });

    if (existing) {
      await this.prisma.aBAssignment.update({
        where: { id: existing.id },
        data: {
          callSessionId: data.callSessionId,
          outcome: data.outcome,
          callDuration: data.callDuration,
        },
      });
    } else {
      await this.prisma.aBAssignment.create({ data: data as any });
    }

    // Recalculate experiment stats
    await this.recalculateStats(data.experimentId);
  }

  /**
   * Recalculate stats and check for statistical significance.
   */
  private async recalculateStats(experimentId: string) {
    const assignments = await this.prisma.aBAssignment.findMany({
      where: { experimentId, outcome: { not: null } },
    });

    const aAssignments = assignments.filter((a) => a.variant === "A");
    const bAssignments = assignments.filter((a) => a.variant === "B");

    const aCalls = aAssignments.length;
    const bCalls = bAssignments.length;
    const aConversions = aAssignments.filter((a) => a.outcome === "converted" || a.outcome === "won").length;
    const bConversions = bAssignments.filter((a) => a.outcome === "converted" || a.outcome === "won").length;
    const aRate = aCalls > 0 ? aConversions / aCalls : 0;
    const bRate = bCalls > 0 ? bConversions / bCalls : 0;

    // Simple z-test for proportions
    const confidence = this.calculateConfidence(aRate, bRate, aCalls, bCalls);
    const minSampleSize = 30; // minimum per variant for significance
    let winner: string | null = null;

    if (confidence >= 0.95 && aCalls >= minSampleSize && bCalls >= minSampleSize) {
      winner = aRate > bRate ? "A" : "B";
    }

    const experiment = await this.prisma.aBExperiment.update({
      where: { id: experimentId },
      data: {
        variantACalls: aCalls,
        variantAConversions: aConversions,
        variantARate: aRate,
        variantBCalls: bCalls,
        variantBConversions: bConversions,
        variantBRate: bRate,
        confidenceLevel: confidence,
        winner,
        ...(winner ? { status: "completed", completedAt: new Date() } : {}),
      },
    });

    if (winner && experiment.autoPromote) {
      this.logger.log(`Experiment ${experimentId} auto-completed. Winner: Variant ${winner}`);
    }
  }

  /**
   * Z-test for comparing two proportions.
   */
  private calculateConfidence(p1: number, p2: number, n1: number, n2: number): number {
    if (n1 < 5 || n2 < 5) return 0;
    const p = (p1 * n1 + p2 * n2) / (n1 + n2);
    if (p === 0 || p === 1) return 0;
    const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
    if (se === 0) return 0;
    const z = Math.abs(p1 - p2) / se;
    // Approximate normal CDF for |z|
    return 1 - 2 * (1 - this.normalCDF(z));
  }

  private normalCDF(z: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * z);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
    return 0.5 * (1.0 + sign * y);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}
