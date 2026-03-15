import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";
import { AiEmailService } from "./ai-email.service";
import { CallOrchestratorService } from "./call-orchestrator.service";
import { DailyRoomService } from "./daily-room.service";
import { GoogleMeetBotService } from "./google-meet-bot.service";
import { LeadInteractionService } from "./lead-interaction.service";
import { LeadStrategyService, StrategyRecommendation } from "./lead-strategy.service";
import { MeetingNotificationService } from "./meeting-notification.service";
import { MeetingOrchestratorService } from "./meeting-orchestrator.service";
import { PipecatCloudService } from "./pipecat-cloud.service";

export interface ExecutionResult {
  executed: boolean;
  action: string;
  details: string;
  meetingId?: string;
  roomUrl?: string;
  emailId?: string;
}

/**
 * Strategy Executor Service
 *
 * Bridges the gap between AI recommendations (LeadStrategyService) and actions.
 * Can auto-execute strategies OR return results for human approval.
 *
 * Two modes:
 *   - `executeStrategy(leadId)` — get AI suggestion + auto-execute it
 *   - `executeRecommendation(leadId, rec)` — execute a specific recommendation
 *
 * Also handles auto-join for inbound meeting links from emails.
 */
@Injectable()
export class StrategyExecutorService {
  private readonly logger = new Logger(StrategyExecutorService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private strategy: LeadStrategyService,
    private meetings: MeetingOrchestratorService,
    private dailyRoom: DailyRoomService,
    private pipecat: PipecatCloudService,
    private aiEmail: AiEmailService,
    private calls: CallOrchestratorService,
    private meetBot: GoogleMeetBotService,
    private interactions: LeadInteractionService,
    private notifications: MeetingNotificationService,
  ) {}

  /**
   * Full autonomous cycle: get AI recommendation → execute it.
   * Returns what was done.
   */
  async executeStrategy(leadId: string): Promise<ExecutionResult> {
    const recommendation = await this.strategy.suggestNextAction(leadId);
    this.logger.log(
      `Strategy for lead ${leadId}: ${recommendation.action} (${recommendation.priority}) — ${recommendation.reason}`,
    );
    return this.executeRecommendation(leadId, recommendation);
  }

  /**
   * Execute a specific strategy recommendation for a lead.
   */
  async executeRecommendation(
    leadId: string,
    rec: StrategyRecommendation,
  ): Promise<ExecutionResult> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { executed: false, action: rec.action, details: "Lead not found" };

    switch (rec.action) {
      case "INVITE_MEETING":
        return this.autoInviteMeeting(lead, rec);
      case "EMAIL":
        return this.autoSendEmail(lead, rec);
      case "CALL":
        return this.autoInitiateCall(lead, rec);
      case "FOLLOW_UP_LATER":
        return this.scheduleFollowUp(lead, rec);
      case "WAIT":
        return { executed: false, action: "WAIT", details: rec.reason };
      default:
        return { executed: false, action: rec.action, details: `Unknown action: ${rec.action}` };
    }
  }

  /**
   * Auto-create a branded Orivraa meeting and send invite to lead.
   * Tries Google Calendar first (adds to lead's calendar with GMeet link),
   * falls back to Daily.co room if Calendar API unavailable.
   */
  private async autoInviteMeeting(lead: any, rec: StrategyRecommendation): Promise<ExecutionResult> {
    if (!lead.email) {
      return { executed: false, action: "INVITE_MEETING", details: "Lead has no email — cannot send invite" };
    }

    const agent = await this.pickAgent(lead);
    if (!agent) {
      return { executed: false, action: "INVITE_MEETING", details: "No AI agents configured" };
    }

    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const subject = rec.meetingSubject || `Orivraa Meeting with ${lead.preferredName || lead.name}`;

    try {
      // Try Google Calendar first — creates a GMeet link and adds to calendar
      let meetLink: string;
      let meetingId: string;
      let meetingType: string;

      try {
        const gcalResult = await this.meetBot.createMeeting(
          agent.id,
          `${subject} — Orivraa AI`,
        );
        meetLink = gcalResult.meetUrl;
        meetingType = "google_calendar";

        // Store as meeting session
        const session = await this.prisma.meetingSession.create({
          data: {
            leadId: lead.id,
            agentId: agent.id,
            type: "external",
            status: "scheduled",
            scheduledAt,
            title: `${subject} [gcal:${gcalResult.eventId}]`,
            externalMeetUrl: meetLink,
          },
        });
        meetingId = session.id;
        this.logger.log(`Created Google Calendar meeting for ${lead.name}: ${meetLink}`);
      } catch (gcalErr: any) {
        // Fallback to Daily.co branded room
        this.logger.warn(`Google Calendar unavailable (${gcalErr.message}), using Daily.co`);
        const result = await this.meetings.scheduleDailyMeeting({
          leadId: lead.id,
          agentId: agent.id,
          scheduledAt,
          title: subject,
        });
        meetLink = result.roomUrl;
        meetingId = result.meetingId;
        meetingType = "daily";
      }

      // Send branded email invite
      await this.aiEmail.sendEmail({
        leadId: lead.id,
        subject: `${agent.name} has invited you to a meeting — Orivraa`,
        body: rec.suggestedMessage ||
          `Hi ${lead.preferredName || lead.name},\n\nI'd love to have a quick video call to discuss how Orivraa can help you.\n\n📅 When: ${scheduledAt.toLocaleString()}\n🔗 Join: ${meetLink}\n\nLooking forward to connecting!\n\nBest,\n${agent.name}\nOrivraa Sales Team`,
        meetLink,
        meetScheduledAt: scheduledAt,
        goalForEmail: rec.suggestedGoal || "Video meeting invitation",
        fromEmail: agent.agentEmail || undefined,
      });

      // Record interaction
      await this.interactions.recordInteraction({
        leadId: lead.id,
        type: "GMEET",
        channel: meetingType,
        direction: "outbound",
        referenceId: meetingId,
        referenceType: "MeetingSession",
        summary: `AI auto-invited to meeting: ${subject}`,
        goalSet: rec.suggestedGoal,
        agentName: agent.name,
        metadata: {
          autoExecuted: true,
          meetingId,
          meetLink,
          meetingType,
          scheduledAt: scheduledAt.toISOString(),
          strategyReason: rec.reason,
        },
      });

      this.logger.log(`✅ Auto-created ${meetingType} meeting for lead ${lead.name}: ${meetLink}`);
      return {
        executed: true,
        action: "INVITE_MEETING",
        details: `${meetingType === "google_calendar" ? "Google Calendar" : "Orivraa"} meeting scheduled, invite sent to ${lead.email}`,
        meetingId,
        roomUrl: meetLink,
      };
    } catch (err: any) {
      this.logger.error(`Failed to auto-invite: ${err.message}`);
      return { executed: false, action: "INVITE_MEETING", details: `Error: ${err.message}` };
    }
  }

  /**
   * Auto-send an AI-drafted email to the lead.
   */
  private async autoSendEmail(lead: any, rec: StrategyRecommendation): Promise<ExecutionResult> {
    if (!lead.email) {
      return { executed: false, action: "EMAIL", details: "Lead has no email" };
    }

    const agent = await this.pickAgent(lead);

    try {
      // Generate AI draft if no message suggested
      let subject = "Following up — Orivraa";
      let body = rec.suggestedMessage || "";

      if (!body) {
        const draft = await this.aiEmail.generateDraft({
          leadId: lead.id,
          purpose: rec.suggestedGoal || "Follow up and progress the relationship",
        });
        subject = draft.subject || subject;
        body = draft.body || "Would love to connect. Let me know a good time to chat!";
      }

      const email = await this.aiEmail.sendEmail({
        leadId: lead.id,
        subject,
        body,
        goalForEmail: rec.suggestedGoal,
        fromEmail: agent?.agentEmail || undefined,
      });

      this.logger.log(`✅ Auto-sent email to ${lead.email}: "${subject}"`);
      return {
        executed: true,
        action: "EMAIL",
        details: `Email sent to ${lead.email}: "${subject}"`,
        emailId: email.id,
      };
    } catch (err: any) {
      this.logger.error(`Failed to auto-email: ${err.message}`);
      return { executed: false, action: "EMAIL", details: `Error: ${err.message}` };
    }
  }

  /**
   * Auto-initiate a phone call via Twilio.
   */
  private async autoInitiateCall(lead: any, rec: StrategyRecommendation): Promise<ExecutionResult> {
    if (!lead.phone) {
      return { executed: false, action: "CALL", details: "Lead has no phone number" };
    }

    const agent = await this.pickAgent(lead);
    if (!agent) {
      return { executed: false, action: "CALL", details: "No AI agents configured" };
    }

    try {
      const webhookBaseUrl = this.config.get<string>("WEBHOOK_BASE_URL") || "http://localhost:3002";
      const result = await this.calls.initiateCall({
        agentId: agent.id,
        leadId: lead.id,
        goal: rec.suggestedGoal,
        webhookBaseUrl,
      });

      this.logger.log(`✅ Auto-initiated call to ${lead.phone}`);
      return {
        executed: true,
        action: "CALL",
        details: `Call initiated to ${lead.phone} with goal: ${rec.suggestedGoal || "general follow-up"}`,
      };
    } catch (err: any) {
      this.logger.error(`Failed to auto-call: ${err.message}`);
      return { executed: false, action: "CALL", details: `Error: ${err.message}` };
    }
  }

  /**
   * Schedule a follow-up interaction for later.
   */
  private async scheduleFollowUp(lead: any, rec: StrategyRecommendation): Promise<ExecutionResult> {
    const delayMs = this.parseDelay(rec.suggestedDelay || "1 day");
    const followUpAt = new Date(Date.now() + delayMs);

    await this.interactions.recordInteraction({
      leadId: lead.id,
      type: "FOLLOW_UP",
      channel: "system",
      direction: "outbound",
      summary: `Follow-up scheduled: ${rec.reason}`,
      goalSet: rec.suggestedGoal,
      metadata: {
        autoExecuted: true,
        followUpAt: followUpAt.toISOString(),
        strategyReason: rec.reason,
        suggestedDelay: rec.suggestedDelay,
      },
    });

    // Store follow-up info in the lead's strategy notes
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { nextCallStrategy: `Follow-up scheduled for ${followUpAt.toISOString()}: ${rec.reason}` },
    });

    this.logger.log(`✅ Follow-up scheduled for ${lead.name} at ${followUpAt.toLocaleString()}`);
    return {
      executed: true,
      action: "FOLLOW_UP_LATER",
      details: `Follow-up scheduled for ${followUpAt.toLocaleString()}: ${rec.reason}`,
    };
  }

  /**
   * Auto-join a meeting detected from an inbound email.
   * Called by the email processor when a meet link is found.
   */
  async autoJoinDetectedMeeting(params: {
    leadId: string;
    meetUrl: string;
    emailSubject: string;
  }): Promise<ExecutionResult> {
    const lead = await this.prisma.lead.findUnique({ where: { id: params.leadId } });
    if (!lead) return { executed: false, action: "JOIN_EXTERNAL_MEET", details: "Lead not found" };

    const agent = await this.pickAgent(lead);
    if (!agent) {
      return { executed: false, action: "JOIN_EXTERNAL_MEET", details: "No AI agents configured" };
    }

    const isGoogleMeet = params.meetUrl.includes("meet.google.com");

    try {
      if (isGoogleMeet) {
        // Use Puppeteer-based Google Meet bot
        const session = await this.meetBot.startSession(params.meetUrl, agent.id, params.leadId);

        await this.interactions.recordInteraction({
          leadId: params.leadId,
          type: "GMEET",
          channel: "google_meet",
          direction: "inbound",
          summary: `AI auto-joined meeting from email: "${params.emailSubject}"`,
          agentName: agent.name,
          metadata: {
            autoExecuted: true,
            autoJoinedFromEmail: true,
            meetUrl: params.meetUrl,
            sessionId: session.id,
          },
        });

        this.logger.log(`✅ Auto-joined Google Meet ${params.meetUrl} for lead ${lead.name}`);
        return {
          executed: true,
          action: "JOIN_EXTERNAL_MEET",
          details: `AI agent "${agent.name}" joining Google Meet for "${params.emailSubject}"`,
        };
      }

      // Non-Google Meet: just record it (MeetingBaas could handle Zoom/Teams)
      this.logger.log(`📋 Non-GMeet link detected: ${params.meetUrl} — recorded for manual join`);
      return {
        executed: false,
        action: "JOIN_EXTERNAL_MEET",
        details: `Non-Google Meet link detected: ${params.meetUrl}. Manual join required.`,
      };
    } catch (err: any) {
      this.logger.error(`Failed to auto-join meeting: ${err.message}`);
      return { executed: false, action: "JOIN_EXTERNAL_MEET", details: `Error: ${err.message}` };
    }
  }

  /**
   * Pick the best AI agent for a lead.
   * Prefers the agent who last interacted with this lead.
   */
  private async pickAgent(lead: any) {
    // Check if there's an agent who previously called this lead
    const lastInteraction = await this.prisma.leadInteraction.findFirst({
      where: { leadId: lead.id, agentName: { not: null } },
      orderBy: { createdAt: "desc" },
    });

    if (lastInteraction?.agentName) {
      const agent = await this.prisma.agentVoice.findFirst({
        where: { name: lastInteraction.agentName, isActive: true },
      });
      if (agent) return agent;
    }

    // Fallback: first active agent
    return this.prisma.agentVoice.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
  }

  private parseDelay(delay: string): number {
    const match = delay.match(/(\d+)\s*(hour|day|minute|week)/i);
    if (!match) return 24 * 60 * 60 * 1000; // default: 1 day

    const num = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    };
    return num * (multipliers[unit] || multipliers.day);
  }
}
