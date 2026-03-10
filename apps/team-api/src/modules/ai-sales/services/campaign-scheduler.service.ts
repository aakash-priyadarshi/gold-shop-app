import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { CallOrchestratorService } from "./call-orchestrator.service";

@Injectable()
export class CampaignSchedulerService {
  private readonly logger = new Logger(CampaignSchedulerService.name);
  private runningCampaigns: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private prisma: PrismaService,
    private callOrchestrator: CallOrchestratorService,
  ) {}

  /* ─── CAMPAIGN CRUD ─── */

  async createCampaign(data: {
    name: string;
    description?: string;
    type?: string;
    agentId: string;
    scriptId?: string;
    productId?: string;
    startDate?: Date;
    endDate?: Date;
    callWindowStart?: number;
    callWindowEnd?: number;
    maxCallsPerDay?: number;
    callsPerMinute?: number;
  }) {
    return this.prisma.campaign.create({ data: { ...data, status: "DRAFT" } });
  }

  async listCampaigns(status?: string) {
    const where: any = {};
    if (status) where.status = status;
    return this.prisma.campaign.findMany({
      where,
      include: {
        agent: { select: { name: true } },
        _count: { select: { campaignLeads: true, callSessions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getCampaign(id: string) {
    return this.prisma.campaign.findUnique({
      where: { id },
      include: {
        agent: true,
        campaignLeads: { include: { lead: true }, orderBy: { createdAt: "desc" } },
        callSessions: { orderBy: { startedAt: "desc" }, take: 20 },
      },
    });
  }

  async updateCampaign(id: string, data: Record<string, any>) {
    return this.prisma.campaign.update({ where: { id }, data });
  }

  /* ─── CAMPAIGN LEAD MANAGEMENT ─── */

  async addLeadsToCampaign(campaignId: string, leadIds: string[]) {
    const data = leadIds.map((leadId) => ({ campaignId, leadId, status: "pending" }));
    const result = await this.prisma.campaignLead.createMany({
      data,
      skipDuplicates: true,
    });

    // Update campaign total
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { totalLeads: { increment: result.count } },
    });

    return { added: result.count };
  }

  async removeLeadFromCampaign(campaignId: string, leadId: string) {
    await this.prisma.campaignLead.delete({
      where: { campaignId_leadId: { campaignId, leadId } },
    });
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { totalLeads: { decrement: 1 } },
    });
  }

  /* ─── CAMPAIGN EXECUTION ─── */

  async startCampaign(campaignId: string, webhookBaseUrl: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { agent: true },
    });
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.status === "ACTIVE") throw new Error("Campaign is already running");

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "ACTIVE" },
    });

    // Start the dial loop
    this.scheduleCampaignDialing(campaignId, webhookBaseUrl, campaign.callsPerMinute || 1);
    this.logger.log(`Campaign ${campaign.name} started`);
    return { status: "started" };
  }

  async pauseCampaign(campaignId: string) {
    const timer = this.runningCampaigns.get(campaignId);
    if (timer) {
      clearInterval(timer);
      this.runningCampaigns.delete(campaignId);
    }
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "PAUSED" },
    });
    return { status: "paused" };
  }

  /** Internal: schedule dialing at a controlled rate */
  private scheduleCampaignDialing(campaignId: string, webhookBaseUrl: string, callsPerMinute: number) {
    const intervalMs = Math.max(60000 / callsPerMinute, 5000); // minimum 5s between calls

    const timer = setInterval(async () => {
      try {
        const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
        if (!campaign || campaign.status !== "ACTIVE") {
          clearInterval(timer);
          this.runningCampaigns.delete(campaignId);
          return;
        }

        // Check daily call limit
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const callsToday = await this.prisma.callSession.count({
          where: { campaignId, startedAt: { gte: today } },
        });
        if (campaign.maxCallsPerDay && callsToday >= campaign.maxCallsPerDay) {
          this.logger.log(`Campaign ${campaignId}: Daily limit reached (${callsToday})`);
          return;
        }

        // Check call window (timezone-aware)
        if (campaign.callWindowStart != null && campaign.callWindowEnd != null) {
          const currentHour = new Date().getHours();
          if (currentHour < campaign.callWindowStart || currentHour > campaign.callWindowEnd) {
            return; // Outside call window
          }
        }

        // Get next lead to call
        const nextLead = await this.prisma.campaignLead.findFirst({
          where: {
            campaignId,
            status: "pending",
            lead: { doNotCall: false },
          },
          include: { lead: true },
          orderBy: { createdAt: "asc" },
        });

        if (!nextLead) {
          this.logger.log(`Campaign ${campaignId}: All leads processed`);
          await this.prisma.campaign.update({
            where: { id: campaignId },
            data: { status: "COMPLETED" },
          });
          clearInterval(timer);
          this.runningCampaigns.delete(campaignId);
          return;
        }

        // Update campaign lead status
        await this.prisma.campaignLead.update({
          where: { id: nextLead.id },
          data: { status: "called", attempts: { increment: 1 }, lastCalledAt: new Date() },
        });

        // Initiate the call
        if (!campaign.agentId) {
          this.logger.warn(`Campaign ${campaignId}: No agent assigned`);
          return;
        }
        await this.callOrchestrator.initiateCall({
          agentId: campaign.agentId,
          leadId: nextLead.leadId,
          campaignId,
          webhookBaseUrl,
        });

        // Update campaign stats
        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: { totalCalled: { increment: 1 } },
        });
      } catch (err: any) {
        this.logger.error(`Campaign dialing error: ${err.message}`);
      }
    }, intervalMs);

    this.runningCampaigns.set(campaignId, timer);
  }

  /** Get campaign analytics */
  async getCampaignStats(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new Error("Campaign not found");

    const [leadStats, callStats] = await Promise.all([
      this.prisma.campaignLead.groupBy({
        by: ["status"],
        where: { campaignId },
        _count: true,
      }),
      this.prisma.callSession.aggregate({
        where: { campaignId },
        _count: true,
        _avg: { duration: true, totalCost: true },
        _sum: { totalCost: true },
      }),
    ]);

    return {
      campaign: {
        name: campaign.name,
        status: campaign.status,
        totalLeads: campaign.totalLeads,
        totalCalled: campaign.totalCalled,
        totalConnected: campaign.totalConnected,
        totalConverted: campaign.totalConverted,
      },
      leadBreakdown: leadStats.reduce(
        (acc, s) => ({ ...acc, [s.status]: s._count }),
        {} as Record<string, number>,
      ),
      calls: {
        total: callStats._count,
        avgDuration: Math.round(callStats._avg.duration || 0),
        totalCost: +(callStats._sum.totalCost || 0).toFixed(4),
        avgCostPerCall: +(callStats._avg.totalCost || 0).toFixed(4),
      },
    };
  }
}
