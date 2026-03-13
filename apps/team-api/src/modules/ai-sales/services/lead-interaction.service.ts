import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class LeadInteractionService {
  private readonly logger = new Logger(LeadInteractionService.name);

  constructor(private prisma: PrismaService) {}

  /** Record a new interaction on a lead's timeline */
  async recordInteraction(data: {
    leadId: string;
    type: "CALL" | "EMAIL_SENT" | "EMAIL_RECEIVED" | "GMEET" | "FOLLOW_UP" | "NOTE" | "SMS" | "WHATSAPP";
    channel?: string;
    direction?: string;
    referenceId?: string;
    referenceType?: string;
    summary?: string;
    details?: string;
    goalSet?: string;
    goalAchieved?: boolean;
    goalNotes?: string;
    metadata?: Record<string, any>;
    durationSeconds?: number;
    sentiment?: string;
    agentName?: string;
  }) {
    return this.prisma.leadInteraction.create({ data });
  }

  /** Get all interactions for a lead (chronological timeline) */
  async getTimeline(leadId: string, limit = 50) {
    return this.prisma.leadInteraction.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /** Record a call interaction after a call ends */
  async recordCallInteraction(params: {
    leadId: string;
    callSessionId: string;
    summary?: string;
    durationSeconds?: number;
    sentiment?: string;
    agentName?: string;
    goalSet?: string;
    goalAchieved?: boolean;
    goalNotes?: string;
  }) {
    return this.recordInteraction({
      leadId: params.leadId,
      type: "CALL",
      channel: "phone",
      direction: "outbound",
      referenceId: params.callSessionId,
      referenceType: "CallSession",
      summary: params.summary,
      durationSeconds: params.durationSeconds,
      sentiment: params.sentiment,
      agentName: params.agentName,
      goalSet: params.goalSet,
      goalAchieved: params.goalAchieved,
      goalNotes: params.goalNotes,
    });
  }

  /** Record an email interaction */
  async recordEmailInteraction(params: {
    leadId: string;
    emailId: string;
    direction: "SENT" | "RECEIVED";
    subject: string;
    goalSet?: string;
    meetLink?: string;
  }) {
    return this.recordInteraction({
      leadId: params.leadId,
      type: params.direction === "SENT" ? "EMAIL_SENT" : "EMAIL_RECEIVED",
      channel: "email",
      direction: params.direction === "SENT" ? "outbound" : "inbound",
      referenceId: params.emailId,
      referenceType: "LeadEmail",
      summary: `Email: ${params.subject}`,
      goalSet: params.goalSet,
      metadata: params.meetLink ? { meetLink: params.meetLink } : undefined,
    });
  }

  /** Record a Google Meet interaction */
  async recordMeetInteraction(params: {
    leadId: string;
    meetSessionId: string;
    summary?: string;
    durationSeconds?: number;
    agentName?: string;
    meetUrl?: string;
  }) {
    return this.recordInteraction({
      leadId: params.leadId,
      type: "GMEET",
      channel: "gmeet",
      direction: "outbound",
      referenceId: params.meetSessionId,
      referenceType: "MeetSession",
      summary: params.summary,
      durationSeconds: params.durationSeconds,
      agentName: params.agentName,
      metadata: params.meetUrl ? { meetUrl: params.meetUrl } : undefined,
    });
  }

  /** Get interaction stats for a lead */
  async getLeadInteractionStats(leadId: string) {
    const [total, calls, emails, meets] = await Promise.all([
      this.prisma.leadInteraction.count({ where: { leadId } }),
      this.prisma.leadInteraction.count({ where: { leadId, type: "CALL" } }),
      this.prisma.leadInteraction.count({ where: { leadId, type: { in: ["EMAIL_SENT", "EMAIL_RECEIVED"] } } }),
      this.prisma.leadInteraction.count({ where: { leadId, type: "GMEET" } }),
    ]);
    return { total, calls, emails, meets };
  }
}
