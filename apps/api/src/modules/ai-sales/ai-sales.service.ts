import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  CreateLeadDto,
  UpdateLeadDto,
  InitiateCallDto,
  EndCallDto,
  CreateAgentVoiceDto,
  SendEmailDto,
  DraftEmailDto,
  InboundEmailDto,
  ScheduleMeetDto,
  RecordInteractionDto,
} from "./dto/ai-sales.dto";

@Injectable()
export class AiSalesService {
  constructor(private prisma: PrismaService) {}

  // ── Leads ────────────────────────────────────────────────────

  async listLeads(shopId: string, params?: Record<string, string>) {
    const { stage, temperature, source, search } = params || {};

    const where: any = { shopId };
    if (stage) where.stage = stage;
    if (temperature) where.temperature = temperature;
    if (source) where.source = source;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
      ];
    }

    const leads = await this.prisma.lead.findMany({
      where,
      include: {
        _count: { select: { callSessions: true, interactions: true, emails: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return leads;
  }

  async getLead(shopId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, shopId },
      include: {
        callSessions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        interactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        emails: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
    if (!lead) throw new NotFoundException("Lead not found");
    return lead;
  }

  async createLead(shopId: string, dto: CreateLeadDto) {
    return this.prisma.lead.create({
      data: {
        shopId,
        ...dto,
        stage: (dto.stage as any) || "NEW",
        temperature: (dto.temperature as any) || "COLD",
      },
    });
  }

  async updateLead(shopId: string, id: string, dto: UpdateLeadDto) {
    await this.ensureLeadExists(shopId, id);
    return this.prisma.lead.update({
      where: { id },
      data: dto as any,
    });
  }

  async moveLeadStage(shopId: string, id: string, stage: string) {
    await this.ensureLeadExists(shopId, id);
    return this.prisma.lead.update({
      where: { id },
      data: { stage: stage as any },
    });
  }

  async getLeadPipeline(shopId: string) {
    const leads = await this.prisma.lead.findMany({
      where: { shopId },
      select: { id: true, name: true, stage: true, temperature: true, score: true, company: true },
    });

    const stages = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"];
    const pipeline: Record<string, typeof leads> = {};
    for (const stage of stages) pipeline[stage] = [];
    for (const lead of leads) pipeline[lead.stage]?.push(lead);
    return { pipeline };
  }

  async getLeadScore(shopId: string, id: string) {
    const lead = await this.ensureLeadExists(shopId, id);
    // Simple scoring: based on filled profile fields
    let score = 0;
    if (lead.email) score += 10;
    if (lead.phone) score += 10;
    if (lead.company) score += 10;
    if (lead.budgetRange) score += 15;
    if (lead.dealValue) score += 15;
    if (lead.communicationStyle) score += 10;
    if (lead.totalCalls > 0) score += Math.min(lead.totalCalls * 5, 20);
    score = Math.min(score, 100);
    await this.prisma.lead.update({ where: { id }, data: { score } });
    return { score, leadId: id };
  }

  async bulkScoreLeads(shopId: string) {
    const leads = await this.prisma.lead.findMany({ where: { shopId } });
    const updates = leads.map((lead) => {
      let score = 0;
      if (lead.email) score += 10;
      if (lead.phone) score += 10;
      if (lead.company) score += 10;
      if (lead.budgetRange) score += 15;
      if (lead.dealValue) score += 15;
      if (lead.communicationStyle) score += 10;
      if (lead.totalCalls > 0) score += Math.min(lead.totalCalls * 5, 20);
      return this.prisma.lead.update({ where: { id: lead.id }, data: { score: Math.min(score, 100) } });
    });
    await Promise.all(updates);
    return { updated: leads.length };
  }

  // ── Call Sessions ────────────────────────────────────────────

  async listCalls(shopId: string, params?: Record<string, string>) {
    const { leadId, status } = params || {};
    const where: any = { shopId };
    if (leadId) where.leadId = leadId;
    if (status) where.status = status;

    const calls = await this.prisma.callSession.findMany({
      where,
      include: { lead: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    });
    return calls;
  }

  async initiateCall(shopId: string, dto: InitiateCallDto) {
    const session = await this.prisma.callSession.create({
      data: {
        shopId,
        leadId: dto.leadId || null,
        agentId: dto.agentId || null,
        agentVoiceId: dto.agentVoiceId || null,
        status: "ACTIVE",
        direction: "OUTBOUND",
        goalForCall: dto.goal || null,
        startedAt: new Date(),
      },
    });
    return session;
  }

  async endCall(shopId: string, id: string, dto: EndCallDto) {
    const session = await this.prisma.callSession.findFirst({ where: { id, shopId } });
    if (!session) throw new NotFoundException("Call session not found");

    const updated = await this.prisma.callSession.update({
      where: { id },
      data: {
        status: "ENDED",
        endedAt: new Date(),
        transcript: dto.transcript,
        summary: dto.summary,
        sentiment: dto.sentiment,
        goalAchieved: dto.goalAchieved,
        goalNotes: dto.goalNotes,
        duration: dto.duration,
        buyingSignals: dto.buyingSignals || [],
        objectionsEncountered: dto.objectionsEncountered || [],
        keyTopics: dto.keyTopics || [],
        totalCost: dto.totalCost,
        costTwilio: dto.costTwilio,
        costLlm: dto.costLlm,
      },
    });

    // Auto-update lead profile after call
    if (session.leadId) {
      const leadUpdate: any = {
        totalCalls: { increment: 1 },
      };
      if (dto.lastCallSummary) leadUpdate.lastCallSummary = dto.lastCallSummary;
      if (dto.whatWorkedLastCall) leadUpdate.whatWorkedLastCall = dto.whatWorkedLastCall;
      if (dto.whatToAvoidNextCall) leadUpdate.whatToAvoidNextCall = dto.whatToAvoidNextCall;
      if (dto.nextCallStrategy) leadUpdate.nextCallStrategy = dto.nextCallStrategy;
      if (dto.openLoops) leadUpdate.openLoops = dto.openLoops;
      if (dto.communicationStyle) leadUpdate.communicationStyle = dto.communicationStyle;
      if (dto.decisionStyle) leadUpdate.decisionStyle = dto.decisionStyle;
      if (dto.pacePreference) leadUpdate.pacePreference = dto.pacePreference;
      if (dto.tonePreference) leadUpdate.tonePreference = dto.tonePreference;

      await this.prisma.lead.update({ where: { id: session.leadId }, data: leadUpdate });

      // Record interaction
      await this.prisma.leadInteraction.create({
        data: {
          shopId,
          leadId: session.leadId,
          callSessionId: id,
          type: "CALL",
          channel: "phone",
          summary: dto.summary || session.goalForCall,
          goalSet: session.goalForCall,
          goalAchieved: dto.goalAchieved,
          details: {
            duration: dto.duration,
            sentiment: dto.sentiment,
            buyingSignals: dto.buyingSignals,
          },
        },
      });

      // Re-score lead
      await this.getLeadScore(shopId, session.leadId).catch(() => null);
    }

    return updated;
  }

  async getCallStats(shopId: string) {
    const [total, ended, active, goalAchieved] = await Promise.all([
      this.prisma.callSession.count({ where: { shopId } }),
      this.prisma.callSession.count({ where: { shopId, status: "ENDED" } }),
      this.prisma.callSession.count({ where: { shopId, status: "ACTIVE" } }),
      this.prisma.callSession.count({ where: { shopId, goalAchieved: true } }),
    ]);
    return { total, ended, active, goalAchieved, goalAchievementRate: ended > 0 ? goalAchieved / ended : 0 };
  }

  async getDetailedCallStats(shopId: string, from?: string, to?: string) {
    const where: any = { shopId, status: "ENDED" };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const allCalls = await this.prisma.callSession.findMany({
      where: { shopId },
      select: { status: true, duration: true, totalCost: true, costTwilio: true, costLlm: true, costTts: true, costStt: true, goalAchieved: true, sentiment: true, createdAt: true },
    });

    const ended = allCalls.filter((c) => c.status === "ENDED");
    const totalDuration = ended.reduce((s, c) => s + (c.duration || 0), 0);
    const totalCost = ended.reduce((s, c) => s + (c.totalCost || 0), 0);
    const costTwilio = ended.reduce((s, c) => s + (c.costTwilio || 0), 0);
    const costLlm = ended.reduce((s, c) => s + (c.costLlm || 0), 0);
    const costTts = ended.reduce((s, c) => s + (c.costTts || 0), 0);
    const costStt = ended.reduce((s, c) => s + (c.costStt || 0), 0);
    const goalAchievedCount = ended.filter((c) => c.goalAchieved).length;

    return {
      total: allCalls.length,
      completed: ended.length,
      active: allCalls.filter((c) => c.status === "ACTIVE").length,
      answerRate: allCalls.length > 0 ? Math.round((ended.length / allCalls.length) * 100) : 0,
      avgDuration: ended.length > 0 ? Math.round(totalDuration / ended.length) : 0,
      totalDuration,
      goalAchievementRate: ended.length > 0 ? goalAchievedCount / ended.length : 0,
      costs: {
        total: totalCost.toFixed(4),
        twilio: costTwilio.toFixed(4),
        llm: costLlm.toFixed(4),
        tts: costTts.toFixed(4),
        stt: costStt.toFixed(4),
      },
      sentimentBreakdown: {
        positive: ended.filter((c) => c.sentiment === "POSITIVE").length,
        neutral: ended.filter((c) => c.sentiment === "NEUTRAL").length,
        negative: ended.filter((c) => c.sentiment === "NEGATIVE").length,
      },
    };
  }

  async getActiveCallsCount(shopId: string) {
    const count = await this.prisma.callSession.count({ where: { shopId, status: "ACTIVE" } });
    return { count };
  }

  // ── Agent Voices ─────────────────────────────────────────────

  async listVoices(shopId: string) {
    const voices = await this.prisma.agentVoice.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
    });
    return { voices };
  }

  async createVoice(shopId: string, dto: CreateAgentVoiceDto) {
    return this.prisma.agentVoice.create({
      data: { shopId, ...dto },
    });
  }

  async updateVoice(shopId: string, id: string, dto: Partial<CreateAgentVoiceDto>) {
    const voice = await this.prisma.agentVoice.findFirst({ where: { id, shopId } });
    if (!voice) throw new NotFoundException("Agent voice not found");
    return this.prisma.agentVoice.update({ where: { id }, data: dto as any });
  }

  async deleteVoice(shopId: string, id: string) {
    const voice = await this.prisma.agentVoice.findFirst({ where: { id, shopId } });
    if (!voice) throw new NotFoundException("Agent voice not found");
    await this.prisma.agentVoice.delete({ where: { id } });
    return { deleted: true };
  }

  async seedVoices(shopId: string) {
    const defaults = [
      { name: "Alex (Professional)", provider: "elevenlabs", voiceId: "alex-v1", language: "en", accent: "American", tone: "professional" },
      { name: "Sarah (Friendly)", provider: "elevenlabs", voiceId: "sarah-v1", language: "en", accent: "British", tone: "warm" },
      { name: "James (Authoritative)", provider: "elevenlabs", voiceId: "james-v1", language: "en", accent: "American", tone: "authoritative" },
    ];

    // Only seed voices that don't already exist for this shop+voiceId combo
    const existing = await this.prisma.agentVoice.findMany({
      where: { shopId },
      select: { voiceId: true },
    });
    const existingVoiceIds = new Set(existing.map((v) => v.voiceId));
    const toCreate = defaults.filter((d) => !existingVoiceIds.has(d.voiceId));

    if (toCreate.length > 0) {
      await this.prisma.agentVoice.createMany({
        data: toCreate.map((v) => ({ shopId, ...v })),
      });
    }

    return { seeded: toCreate.length };
  }

  // ── Emails ───────────────────────────────────────────────────

  async sendEmail(shopId: string, dto: SendEmailDto) {
    const lead = await this.ensureLeadExists(shopId, dto.leadId);

    const email = await this.prisma.leadEmail.create({
      data: {
        shopId,
        leadId: dto.leadId,
        subject: dto.subject,
        body: dto.body,
        htmlBody: dto.htmlBody,
        direction: "SENT",
        fromAddress: dto.fromEmail || "sales@ai-sales.app",
        toAddress: lead.email || "",
        goalForEmail: dto.goalForEmail,
        meetLink: dto.meetLink,
        meetScheduledAt: dto.meetScheduledAt ? new Date(dto.meetScheduledAt) : null,
        sentAt: new Date(),
      },
    });

    // Record interaction
    await this.prisma.leadInteraction.create({
      data: {
        shopId,
        leadId: dto.leadId,
        emailId: email.id,
        type: "EMAIL_SENT",
        channel: "email",
        summary: dto.subject,
        goalSet: dto.goalForEmail,
        details: { meetLink: dto.meetLink },
      },
    });

    return email;
  }

  async generateEmailDraft(shopId: string, dto: DraftEmailDto) {
    const lead = await this.ensureLeadExists(shopId, dto.leadId);
    // Return a template — real AI generation would call Gemini API here
    const subject = `Follow-up: ${dto.purpose}`;
    const body = `Hi ${lead.preferredName || lead.name},\n\nI wanted to reach out regarding ${dto.purpose}.\n\n${
      lead.lastCallSummary ? `Based on our last conversation: ${lead.lastCallSummary}\n\n` : ""
    }${dto.includeMeetLink ? "I'd like to schedule a Google Meet to discuss this further.\n\n" : ""}Best regards`;

    return { subject, body, aiGenerated: true };
  }

  async processInboundEmail(dto: InboundEmailDto) {
    // Find lead by email address
    const lead = await this.prisma.lead.findFirst({
      where: { email: dto.from },
    });

    if (!lead) {
      return { message: "Lead not found for this email", processed: false };
    }

    const email = await this.prisma.leadEmail.create({
      data: {
        shopId: lead.shopId,
        leadId: lead.id,
        subject: dto.subject,
        body: dto.body,
        htmlBody: dto.htmlBody,
        direction: "RECEIVED",
        fromAddress: dto.from,
        toAddress: dto.to,
        receivedAt: new Date(),
      },
    });

    await this.prisma.leadInteraction.create({
      data: {
        shopId: lead.shopId,
        leadId: lead.id,
        emailId: email.id,
        type: "EMAIL_RECEIVED",
        channel: "email",
        summary: dto.subject,
      },
    });

    return { processed: true, leadId: lead.id, emailId: email.id };
  }

  async getLeadEmails(shopId: string, leadId: string) {
    await this.ensureLeadExists(shopId, leadId);
    const emails = await this.prisma.leadEmail.findMany({
      where: { leadId, shopId },
      orderBy: { createdAt: "desc" },
    });
    return { emails };
  }

  async getEmailDetail(shopId: string, id: string) {
    const email = await this.prisma.leadEmail.findFirst({ where: { id, shopId } });
    if (!email) throw new NotFoundException("Email not found");
    return email;
  }

  // ── Interactions ─────────────────────────────────────────────

  async getLeadInteractions(shopId: string, leadId: string, limit = 20) {
    await this.ensureLeadExists(shopId, leadId);
    const interactions = await this.prisma.leadInteraction.findMany({
      where: { leadId, shopId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return { interactions };
  }

  async getLeadInteractionStats(shopId: string, leadId: string) {
    await this.ensureLeadExists(shopId, leadId);
    const [total, calls, emails, meets] = await Promise.all([
      this.prisma.leadInteraction.count({ where: { leadId } }),
      this.prisma.leadInteraction.count({ where: { leadId, type: "CALL" } }),
      this.prisma.leadInteraction.count({ where: { leadId, type: { in: ["EMAIL_SENT", "EMAIL_RECEIVED"] } } }),
      this.prisma.leadInteraction.count({ where: { leadId, type: "GMEET" } }),
    ]);
    return { total, calls, emails, meets };
  }

  async recordInteraction(shopId: string, leadId: string, dto: RecordInteractionDto) {
    await this.ensureLeadExists(shopId, leadId);
    return this.prisma.leadInteraction.create({
      data: {
        shopId,
        leadId,
        type: dto.type as any,
        channel: dto.channel,
        summary: dto.summary,
        details: dto.details as any,
        goalSet: dto.goalSet,
        goalAchieved: dto.goalAchieved,
      },
    });
  }

  // ── Google Meet ──────────────────────────────────────────────

  async scheduleMeet(shopId: string, dto: ScheduleMeetDto) {
    const lead = await this.ensureLeadExists(shopId, dto.leadId);

    // Create a meet link placeholder — real implementation would call Google Calendar API
    const meetLink = `https://meet.google.com/placeholder-${Date.now()}`;

    // Record as an interaction
    const interaction = await this.prisma.leadInteraction.create({
      data: {
        shopId,
        leadId: dto.leadId,
        type: "GMEET",
        channel: "video",
        summary: dto.subject || `Google Meet with ${lead.name}`,
        goalSet: dto.notes,
        details: {
          scheduledAt: dto.scheduledAt,
          agentId: dto.agentId,
          meetLink,
        },
      },
    });

    // Also send email invite if lead has email
    if (lead.email) {
      await this.prisma.leadEmail.create({
        data: {
          shopId,
          leadId: dto.leadId,
          subject: dto.subject || "Meeting Invitation",
          body: `You are invited to a Google Meet on ${new Date(dto.scheduledAt).toLocaleString()}. Join: ${meetLink}`,
          direction: "SENT",
          fromAddress: "meets@ai-sales.app",
          toAddress: lead.email,
          meetLink,
          meetScheduledAt: new Date(dto.scheduledAt),
          sentAt: new Date(),
        },
      });
    }

    return { meetLink, interactionId: interaction.id, scheduledAt: dto.scheduledAt };
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async ensureLeadExists(shopId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, shopId } });
    if (!lead) throw new NotFoundException("Lead not found");
    return lead;
  }
}
