import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AIAgentService {
  private readonly logger = new Logger(AIAgentService.name);

  constructor(private prisma: PrismaService) {}

  /* ─── AI AGENTS ─── */

  async createAgent(data: {
    name: string;
    voiceId: string;
    language?: string;
    personality?: string;
    greeting?: string;
  }) {
    return this.prisma.aIAgent.create({ data });
  }

  async listAgents() {
    return this.prisma.aIAgent.findMany({
      where: { isActive: true },
      include: { _count: { select: { callSessions: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getAgent(id: string) {
    const agent = await this.prisma.aIAgent.findUnique({
      where: { id },
      include: {
        scripts: { orderBy: { createdAt: "desc" } },
        _count: { select: { callSessions: true } },
      },
    });
    if (!agent) throw new NotFoundException("AI agent not found");
    return agent;
  }

  async updateAgent(id: string, data: Record<string, any>) {
    return this.prisma.aIAgent.update({ where: { id }, data });
  }

  async toggleAgent(id: string, isActive: boolean) {
    return this.prisma.aIAgent.update({ where: { id }, data: { isActive } });
  }

  /* ─── SCRIPTS ─── */

  async createScript(data: {
    agentId: string;
    name: string;
    category: string;
    content: string;
    variables?: string[];
  }) {
    return this.prisma.aIScript.create({ data });
  }

  async listScripts(agentId: string) {
    return this.prisma.aIScript.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateScript(id: string, data: Record<string, any>) {
    return this.prisma.aIScript.update({ where: { id }, data });
  }

  async deleteScript(id: string) {
    return this.prisma.aIScript.delete({ where: { id } });
  }

  /* ─── LEADS ─── */

  async createLead(data: {
    assignedToId?: string;
    name: string;
    phone?: string;
    email?: string;
    source?: any;
    notes?: string;
  }) {
    return this.prisma.lead.create({ data });
  }

  async listLeads(filters?: {
    stage?: string;
    source?: string;
    assignedToId?: string;
    search?: string;
  }) {
    const where: any = {};
    if (filters?.stage) where.stage = filters.stage;
    if (filters?.source) where.source = filters.source;
    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return this.prisma.lead.findMany({
      where,
      orderBy: { lastContactedAt: "desc" },
    });
  }

  async updateLead(id: string, data: Record<string, any>) {
    return this.prisma.lead.update({ where: { id }, data });
  }

  async moveLeadStage(id: string, stage: string) {
    const data: any = { stage };
    return this.prisma.lead.update({ where: { id }, data });
  }

  async getLeadPipeline() {
    const leads = await this.prisma.lead.findMany({
      orderBy: { lastContactedAt: "desc" },
    });

    return {
      NEW: leads.filter((l) => l.stage === "NEW"),
      CONTACTED: leads.filter((l) => l.stage === "CONTACTED"),
      QUALIFIED: leads.filter((l) => l.stage === "QUALIFIED"),
      NEGOTIATION: leads.filter((l) => l.stage === "NEGOTIATION"),
      WON: leads.filter((l) => l.stage === "WON"),
      LOST: leads.filter((l) => l.stage === "LOST"),
    };
  }

  /* ─── CALLS ─── */

  async createCall(data: {
    agentId: string;
    leadId?: string;
    employeeId?: string;
    direction: any;
  }) {
    return this.prisma.callSession.create({ data });
  }

  async updateCall(id: string, data: Record<string, any>) {
    return this.prisma.callSession.update({ where: { id }, data });
  }

  async endCall(id: string, data: {
    status: any;
    duration?: number;
    recordingUrl?: string;
    transcript?: string;
    sentiment?: any;
    summary?: string;
  }) {
    return this.prisma.callSession.update({
      where: { id },
      data: { ...data, endedAt: new Date() },
    });
  }

  async listCalls(filters?: { agentId?: string; leadId?: string; status?: string }) {
    const where: any = {};
    if (filters?.agentId) where.agentId = filters.agentId;
    if (filters?.leadId) where.leadId = filters.leadId;
    if (filters?.status) where.status = filters.status;

    return this.prisma.callSession.findMany({
      where,
      include: {
        agent: { select: { name: true } },
        lead: { select: { name: true, phone: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 100,
    });
  }

  async getCallStats() {
    const [total, completed, noAnswer] = await Promise.all([
      this.prisma.callSession.count(),
      this.prisma.callSession.count({ where: { status: "COMPLETED" } }),
      this.prisma.callSession.count({ where: { status: "NO_ANSWER" } }),
    ]);

    const avgDuration = await this.prisma.callSession.aggregate({
      _avg: { duration: true },
      where: { status: "COMPLETED" },
    });

    return {
      total,
      completed,
      noAnswer,
      avgDuration: Math.round(avgDuration._avg.duration || 0),
      answerRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }
}
