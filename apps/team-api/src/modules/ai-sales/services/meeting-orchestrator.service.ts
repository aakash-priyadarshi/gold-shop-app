import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../../prisma/prisma.service";
import { DailyRoomService } from "./daily-room.service";
import { MeetingNotificationService } from "./meeting-notification.service";
import { MeetingBaasService } from "./meetingbaas.service";
import { PipecatCloudService } from "./pipecat-cloud.service";

/**
 * Meeting Orchestrator Service
 *
 * Central coordinator for the meeting lifecycle:
 *   Schedule → Remind → Launch → Run → End → Summarize
 *
 * Handles both Scenario 1 (Daily.co) and Scenario 2 (MeetingBaas).
 */
@Injectable()
export class MeetingOrchestratorService {
  private readonly logger = new Logger(MeetingOrchestratorService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private dailyRoom: DailyRoomService,
    private pipecat: PipecatCloudService,
    private meetingBaas: MeetingBaasService,
    private notifications: MeetingNotificationService,
  ) {}

  // ── Schedule a new meeting (Scenario 1: Daily.co) ─────────────────────

  async scheduleDailyMeeting(opts: {
    leadId?: string;
    agentId: string;
    scheduledAt: Date;
    title?: string;
  }) {
    // 1. Create Daily.co room
    const room = await this.dailyRoom.createRoom({
      scheduledAt: opts.scheduledAt,
      title: opts.title,
    });

    // 2. Generate meeting token for the lead (if we know them)
    let token: string | null = null;
    let leadName = "Guest";
    if (opts.leadId) {
      const lead = await this.prisma.lead.findUnique({ where: { id: opts.leadId } });
      if (lead) {
        leadName = lead.name;
        token = await this.dailyRoom.createMeetingToken(room.name, lead.name);
      }
    }

    // 3. Store the meeting session
    const session = await this.prisma.meetingSession.create({
      data: {
        leadId: opts.leadId,
        agentId: opts.agentId,
        type: "daily",
        status: "scheduled",
        scheduledAt: opts.scheduledAt,
        title: opts.title || `Meeting with ${leadName}`,
        dailyRoomName: room.name,
        dailyRoomUrl: room.url,
        dailyRoomToken: token,
      },
    });

    this.logger.log(`Scheduled Daily.co meeting ${session.id} at ${opts.scheduledAt.toISOString()}`);

    // Send confirmation notification
    if (opts.leadId) {
      const lead = await this.prisma.lead.findUnique({ where: { id: opts.leadId } });
      const agent = await this.prisma.agentVoice.findUnique({ where: { id: opts.agentId } });
      if (lead) {
        await this.notifications.sendConfirmation({
          meetingSessionId: session.id,
          leadName: lead.preferredName || lead.name,
          leadEmail: lead.email || undefined,
          leadPhone: lead.phone || undefined,
          agentName: agent?.name || "Orivraa AI",
          meetLink: room.url,
          scheduledAt: opts.scheduledAt,
          title: opts.title,
        }).catch(err => this.logger.error(`Confirmation notification failed: ${err.message}`));
      }
    }

    return {
      meetingId: session.id,
      roomUrl: room.url,
      token,
      scheduledAt: opts.scheduledAt,
    };
  }

  // ── Schedule external meeting (Scenario 2: MeetingBaas) ───────────────

  async scheduleExternalMeeting(opts: {
    leadId?: string;
    agentId: string;
    scheduledAt: Date;
    externalMeetUrl: string;
    title?: string;
  }) {
    const session = await this.prisma.meetingSession.create({
      data: {
        leadId: opts.leadId,
        agentId: opts.agentId,
        type: "external",
        status: "scheduled",
        scheduledAt: opts.scheduledAt,
        title: opts.title || "External Meeting",
        externalMeetUrl: opts.externalMeetUrl,
      },
    });

    this.logger.log(`Scheduled external meeting ${session.id} for ${opts.externalMeetUrl}`);

    // Send confirmation notification
    if (opts.leadId) {
      const lead = await this.prisma.lead.findUnique({ where: { id: opts.leadId } });
      const agent = await this.prisma.agentVoice.findUnique({ where: { id: opts.agentId } });
      if (lead) {
        await this.notifications.sendConfirmation({
          meetingSessionId: session.id,
          leadName: lead.preferredName || lead.name,
          leadEmail: lead.email || undefined,
          leadPhone: lead.phone || undefined,
          agentName: agent?.name || "Orivraa AI",
          meetLink: opts.externalMeetUrl,
          scheduledAt: opts.scheduledAt,
          title: opts.title,
        }).catch(err => this.logger.error(`Confirmation notification failed: ${err.message}`));
      }
    }

    return { meetingId: session.id, scheduledAt: opts.scheduledAt };
  }

  // ── Launch the agent into a Daily.co meeting ──────────────────────────

  async launchDailyAgent(meetingSessionId: string) {
    const session = await this.prisma.meetingSession.findUnique({
      where: { id: meetingSessionId },
      include: { agent: true, lead: true },
    });

    if (!session) throw new Error("Meeting session not found");
    if (session.type !== "daily") throw new Error("Not a Daily.co meeting");
    if (!session.dailyRoomUrl) throw new Error("No Daily.co room URL");

    // Update status
    await this.prisma.meetingSession.update({
      where: { id: meetingSessionId },
      data: { status: "launching", startedAt: new Date() },
    });

    const agent = session.agent;
    if (!agent) throw new Error("No agent assigned to this meeting");

    // Build the system prompt from the agent's configuration
    const systemPrompt = agent.systemPromptTemplate ||
      `You are ${agent.name}, an AI sales representative from Orivraa. ${agent.personalityDescription || ""} ${agent.backstory || ""}`.trim();

    const webhookUrl = `${this.config.get<string>("WEBHOOK_BASE_URL") || "http://localhost:3002"}/api/ai-sales/meetings/webhook/pipecat`;

    try {
      const result = await this.pipecat.deployAgent({
        dailyRoomUrl: session.dailyRoomUrl,
        agentName: agent.name,
        systemPrompt,
        voiceId: agent.voiceId,
        greeting: agent.greeting || undefined,
        leadName: session.lead?.name || undefined,
        webhookUrl,
      });

      await this.prisma.meetingSession.update({
        where: { id: meetingSessionId },
        data: { status: "active", pipecatSessionId: result.sessionId },
      });

      this.logger.log(`Agent "${agent.name}" launched into room ${session.dailyRoomName}`);
      return { pipecatSessionId: result.sessionId };
    } catch (err: any) {
      await this.prisma.meetingSession.update({
        where: { id: meetingSessionId },
        data: { status: "error" },
      });
      throw err;
    }
  }

  // ── Handle meeting end ────────────────────────────────────────────────

  async onMeetingEnd(meetingSessionId: string, transcript?: string) {
    const session = await this.prisma.meetingSession.findUnique({
      where: { id: meetingSessionId },
      include: { lead: true, agent: true },
    });

    if (!session) return;

    const now = new Date();
    const duration = session.startedAt
      ? Math.round((now.getTime() - session.startedAt.getTime()) / 1000)
      : null;

    // Generate AI summary if we have a transcript
    let summary: string | undefined;
    let actionItems: string[] = [];
    let leadScoreChange: number | undefined;

    if (transcript) {
      try {
        const geminiKey = this.config.get<string>("GEMINI_API_KEY");
        if (geminiKey) {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: `Analyze this sales meeting transcript and provide a JSON response with:\n- "summary": a 2-3 paragraph summary of the meeting\n- "actionItems": array of next steps/action items\n- "leadScoreChange": number from -20 to +20 indicating how the lead's score should change based on the meeting outcome (positive = good meeting, negative = bad)\n- "sentiment": "positive" | "neutral" | "negative"\n\nTranscript:\n${transcript.substring(0, 10000)}`,
                  }],
                }],
                generationConfig: { responseMimeType: "application/json" },
              }),
            },
          );
          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const parsed = JSON.parse(text);
              summary = parsed.summary;
              actionItems = parsed.actionItems || [];
              leadScoreChange = parsed.leadScoreChange;
            }
          }
        }
      } catch (err: any) {
        this.logger.error(`AI summary generation failed: ${err.message}`);
        summary = transcript.substring(0, 500);
      }
    }

    // Update session with results
    await this.prisma.meetingSession.update({
      where: { id: meetingSessionId },
      data: {
        status: "completed",
        endedAt: now,
        transcript,
        summary,
        actionItems: actionItems.length > 0 ? actionItems : undefined,
        duration,
        leadScoreChange,
      },
    });

    this.logger.log(`Meeting ${meetingSessionId} ended — duration: ${duration}s`);

    // Update lead score if applicable
    if (session.leadId && leadScoreChange) {
      const lead = await this.prisma.lead.findUnique({ where: { id: session.leadId } });
      if (lead) {
        const newScore = Math.max(0, Math.min(100, (lead.score || 50) + leadScoreChange));
        await this.prisma.lead.update({
          where: { id: session.leadId },
          data: { score: newScore },
        });
      }
    }

    // Record as lead interaction if we have a lead
    if (session.leadId) {
      await this.prisma.leadInteraction.create({
        data: {
          leadId: session.leadId,
          type: "VIDEO_MEETING",
          channel: session.type === "daily" ? "daily" : "external",
          direction: "OUTBOUND",
          summary: summary || (transcript ? transcript.substring(0, 500) : "Video meeting completed"),
          referenceId: meetingSessionId,
          referenceType: "MeetingSession",
          agentName: session.agent?.name || undefined,
          durationSeconds: duration,
          metadata: {
            meetingSessionId,
            duration,
            type: session.type,
            actionItems,
            leadScoreChange,
          },
        },
      });
    }

    // Send post-meeting summary notification
    if (session.lead && summary) {
      await this.notifications.sendPostMeetingSummary({
        meetingSessionId,
        leadName: session.lead.preferredName || session.lead.name,
        leadEmail: session.lead.email || undefined,
        leadPhone: session.lead.phone || undefined,
        agentName: session.agent?.name || "Orivraa AI",
        summary,
        actionItems,
        duration: duration || undefined,
      }).catch(err => this.logger.error(`Post-meeting notification failed: ${err.message}`));
    }

    // Clean up Daily.co room
    if (session.dailyRoomName) {
      await this.dailyRoom.deleteRoom(session.dailyRoomName).catch(() => {});
    }

    // Stop Pipecat agent if still running
    if (session.pipecatSessionId) {
      await this.pipecat.stopAgent(session.pipecatSessionId).catch(() => {});
    }

    // Stop MeetingBaas bot if applicable
    if (session.meetingBaasBotId) {
      await this.meetingBaas.leaveMeeting(session.meetingBaasBotId).catch(() => {});
    }
  }

  // ── Cancel a meeting ──────────────────────────────────────────────────

  async cancelMeeting(meetingSessionId: string) {
    const session = await this.prisma.meetingSession.findUnique({
      where: { id: meetingSessionId },
    });
    if (!session) throw new Error("Meeting not found");

    await this.prisma.meetingSession.update({
      where: { id: meetingSessionId },
      data: { status: "cancelled" },
    });

    // Cleanup resources
    if (session.dailyRoomName) {
      await this.dailyRoom.deleteRoom(session.dailyRoomName).catch(() => {});
    }
    if (session.pipecatSessionId) {
      await this.pipecat.stopAgent(session.pipecatSessionId).catch(() => {});
    }

    this.logger.log(`Meeting ${meetingSessionId} cancelled`);
  }

  // ── Get meeting details ───────────────────────────────────────────────

  async getMeeting(id: string) {
    return this.prisma.meetingSession.findUnique({
      where: { id },
      include: { lead: true, agent: true },
    });
  }

  async listMeetings(opts?: { status?: string; leadId?: string; limit?: number }) {
    return this.prisma.meetingSession.findMany({
      where: {
        ...(opts?.status && { status: opts.status }),
        ...(opts?.leadId && { leadId: opts.leadId }),
      },
      include: { lead: true, agent: true },
      orderBy: { scheduledAt: "desc" },
      take: opts?.limit || 50,
    });
  }

  // ── Cron: Auto-launch agents at scheduled time ────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async autoLaunchScheduledMeetings() {
    const now = new Date();
    // Find meetings scheduled in the next 60 seconds that haven't been launched
    const upcoming = await this.prisma.meetingSession.findMany({
      where: {
        status: "scheduled",
        scheduledAt: {
          lte: new Date(now.getTime() + 60 * 1000), // within 1 minute
          gte: new Date(now.getTime() - 5 * 60 * 1000), // not more than 5 min late
        },
      },
    });

    for (const session of upcoming) {
      try {
        if (session.type === "daily") {
          this.logger.log(`Auto-launching Daily.co meeting ${session.id}`);
          await this.launchDailyAgent(session.id);
        }
        // MeetingBaas launch will be added in Phase 3
      } catch (err: any) {
        this.logger.error(`Failed to auto-launch meeting ${session.id}: ${err.message}`);
      }
    }
  }

  // ── Cron: Mark no-shows (meeting scheduled 30+ min ago, never started) ──

  @Cron(CronExpression.EVERY_5_MINUTES)
  async markNoShows() {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    await this.prisma.meetingSession.updateMany({
      where: {
        status: { in: ["scheduled", "launching"] },
        scheduledAt: { lte: thirtyMinAgo },
      },
      data: { status: "no_show" },
    });
  }
}
