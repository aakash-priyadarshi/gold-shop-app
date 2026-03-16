import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Job, Queue } from "bullmq";
import { PrismaService } from "../../../prisma/prisma.service";
import { MeetingNotificationService } from "./meeting-notification.service";
import { MeetingBaasService } from "./meetingbaas.service";

/**
 * Meeting Scheduler Service
 *
 * Uses BullMQ for exact-time job scheduling when REDIS_URL is available.
 * Falls back to cron-based polling otherwise.
 *
 * Jobs:
 *  - reminder-24h: fires exactly 24h before meeting
 *  - reminder-30m: fires exactly 30m before meeting
 *  - launch-agent: fires at scheduled meeting time
 */
@Injectable()
export class MeetingSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(MeetingSchedulerService.name);
  private bullAvailable = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private notifications: MeetingNotificationService,
    private meetingBaas: MeetingBaasService,
    @InjectQueue("meeting-reminders") private reminderQueue: Queue,
    @InjectQueue("meeting-launch") private launchQueue: Queue,
  ) {}

  async onModuleInit() {
    try {
      await this.reminderQueue.client;
      this.bullAvailable = true;
      this.logger.log("BullMQ connected — using exact-time job scheduling");
    } catch {
      this.bullAvailable = false;
      this.logger.warn("BullMQ not available — falling back to cron-based polling");
    }
  }

  // ── Schedule BullMQ jobs for a meeting ──────────────────────────────────

  async scheduleJobs(meetingSessionId: string, scheduledAt: Date) {
    if (!this.bullAvailable) {
      this.logger.log(`BullMQ unavailable — cron will handle meeting ${meetingSessionId}`);
      return;
    }

    const now = Date.now();
    const meetTime = scheduledAt.getTime();

    // 24h reminder
    const delay24h = meetTime - 24 * 60 * 60 * 1000 - now;
    if (delay24h > 0) {
      await this.reminderQueue.add(
        "reminder-24h",
        { meetingSessionId },
        { delay: delay24h, jobId: `24h-${meetingSessionId}`, removeOnComplete: true },
      );
      this.logger.log(`Scheduled 24h reminder for ${meetingSessionId} (${Math.round(delay24h / 60000)}min)`);
    }

    // 30m reminder
    const delay30m = meetTime - 30 * 60 * 1000 - now;
    if (delay30m > 0) {
      await this.reminderQueue.add(
        "reminder-30m",
        { meetingSessionId },
        { delay: delay30m, jobId: `30m-${meetingSessionId}`, removeOnComplete: true },
      );
      this.logger.log(`Scheduled 30m reminder for ${meetingSessionId} (${Math.round(delay30m / 60000)}min)`);
    }

    // Launch agent at meeting time
    const delayLaunch = meetTime - now;
    if (delayLaunch > 0) {
      await this.launchQueue.add(
        "launch-agent",
        { meetingSessionId },
        { delay: delayLaunch, jobId: `launch-${meetingSessionId}`, removeOnComplete: true },
      );
      this.logger.log(`Scheduled agent launch for ${meetingSessionId} (${Math.round(delayLaunch / 60000)}min)`);
    }
  }

  /**
   * Cancel all scheduled BullMQ jobs for a meeting.
   */
  async cancelJobs(meetingSessionId: string) {
    if (!this.bullAvailable) return;
    try {
      const job24h = await this.reminderQueue.getJob(`24h-${meetingSessionId}`);
      if (job24h) await job24h.remove();
      const job30m = await this.reminderQueue.getJob(`30m-${meetingSessionId}`);
      if (job30m) await job30m.remove();
      const jobLaunch = await this.launchQueue.getJob(`launch-${meetingSessionId}`);
      if (jobLaunch) await jobLaunch.remove();
    } catch (err: any) {
      this.logger.warn(`Failed to cancel jobs for ${meetingSessionId}: ${err.message}`);
    }
  }

  // ── Process BullMQ jobs ─────────────────────────────────────────────────

  async processReminderJob(job: Job) {
    const { meetingSessionId } = job.data;
    const session = await this.prisma.meetingSession.findUnique({
      where: { id: meetingSessionId },
      include: { lead: true, agent: true },
    });
    if (!session || !session.lead || ["cancelled", "completed"].includes(session.status)) return;

    const meetLink = session.dailyRoomUrl || session.externalMeetUrl || "";

    if (job.name === "reminder-24h") {
      await this.notifications.sendReminder24h({
        meetingSessionId,
        leadName: session.lead.preferredName || session.lead.name,
        leadEmail: session.lead.email || undefined,
        leadPhone: session.lead.phone || undefined,
        agentName: session.agent?.name || "Orivraa AI",
        meetLink,
        scheduledAt: session.scheduledAt,
      });
      this.logger.log(`[BullMQ] 24h reminder sent for ${meetingSessionId}`);
    } else if (job.name === "reminder-30m") {
      await this.notifications.sendReminder30m({
        meetingSessionId,
        leadName: session.lead.preferredName || session.lead.name,
        leadEmail: session.lead.email || undefined,
        leadPhone: session.lead.phone || undefined,
        agentName: session.agent?.name || "Orivraa AI",
        meetLink,
        scheduledAt: session.scheduledAt,
      });
      this.logger.log(`[BullMQ] 30m reminder sent for ${meetingSessionId}`);
    }
  }

  async processLaunchJob(job: Job) {
    const { meetingSessionId } = job.data;
    const session = await this.prisma.meetingSession.findUnique({
      where: { id: meetingSessionId },
      include: { agent: true, lead: true },
    });
    if (!session || ["cancelled", "completed", "active"].includes(session.status)) return;

    if (session.type === "external" && session.externalMeetUrl) {
      await this.launchExternalMeeting(session);
    }
    // Daily.co meetings are launched by MeetingOrchestratorService.autoLaunchScheduledMeetings
  }

  // ── Cron fallback (runs when BullMQ is unavailable) ─────────────────────

  @Cron(CronExpression.EVERY_30_MINUTES)
  async cronSend24hReminders() {
    if (this.bullAvailable) return; // BullMQ handles this
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in24hMinus5 = new Date(now.getTime() + (24 * 60 - 5) * 60 * 1000);

    const meetings = await this.prisma.meetingSession.findMany({
      where: {
        status: { in: ["scheduled"] },
        reminder24hSentAt: null,
        scheduledAt: { gte: in24hMinus5, lte: in24h },
      },
      include: { lead: true, agent: true },
    });

    for (const m of meetings) {
      if (!m.lead) continue;
      const meetLink = m.dailyRoomUrl || m.externalMeetUrl || "";
      try {
        await this.notifications.sendReminder24h({
          meetingSessionId: m.id,
          leadName: m.lead.preferredName || m.lead.name,
          leadEmail: m.lead.email || undefined,
          leadPhone: m.lead.phone || undefined,
          agentName: m.agent?.name || "Orivraa AI",
          meetLink,
          scheduledAt: m.scheduledAt,
        });
      } catch (err: any) {
        this.logger.error(`[Cron] Failed 24h reminder for ${m.id}: ${err.message}`);
      }
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cronSend30mReminders() {
    if (this.bullAvailable) return;
    const now = new Date();
    const in30m = new Date(now.getTime() + 30 * 60 * 1000);
    const in29m = new Date(now.getTime() + 29 * 60 * 1000);

    const meetings = await this.prisma.meetingSession.findMany({
      where: {
        status: { in: ["scheduled", "reminder_sent"] },
        reminder30mSentAt: null,
        scheduledAt: { gte: in29m, lte: in30m },
      },
      include: { lead: true, agent: true },
    });

    for (const m of meetings) {
      if (!m.lead) continue;
      const meetLink = m.dailyRoomUrl || m.externalMeetUrl || "";
      try {
        await this.notifications.sendReminder30m({
          meetingSessionId: m.id,
          leadName: m.lead.preferredName || m.lead.name,
          leadEmail: m.lead.email || undefined,
          leadPhone: m.lead.phone || undefined,
          agentName: m.agent?.name || "Orivraa AI",
          meetLink,
          scheduledAt: m.scheduledAt,
        });
      } catch (err: any) {
        this.logger.error(`[Cron] Failed 30m reminder for ${m.id}: ${err.message}`);
      }
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cronAutoLaunchExternalMeetings() {
    if (this.bullAvailable) return;
    const now = new Date();

    const meetings = await this.prisma.meetingSession.findMany({
      where: {
        type: "external",
        status: { in: ["scheduled", "reminder_sent"] },
        scheduledAt: {
          lte: new Date(now.getTime() + 60 * 1000),
          gte: new Date(now.getTime() - 5 * 60 * 1000),
        },
      },
      include: { agent: true, lead: true },
    });

    for (const m of meetings) {
      await this.launchExternalMeeting(m);
    }
  }

  // ── Shared launch logic for external meetings ───────────────────────────

  private async launchExternalMeeting(session: any) {
    if (!session.externalMeetUrl) return;
    try {
      this.logger.log(`Launching MeetingBaas bot for meeting ${session.id}`);

      await this.prisma.meetingSession.update({
        where: { id: session.id },
        data: { status: "launching", startedAt: new Date() },
      });

      const webhookUrl = `${this.config.get<string>("WEBHOOK_BASE_URL") || "http://localhost:3002"}/api/ai-sales/meetings/webhook/meetingbaas`;

      const agent = session.agent;
      const systemPrompt = agent?.systemPromptTemplate ||
        `You are ${agent?.name || "Aria"}, an AI sales representative from Orivraa. ${agent?.personalityDescription || ""} ${agent?.backstory || ""}`.trim();

      const result = await this.meetingBaas.joinMeeting({
        meetingUrl: session.externalMeetUrl,
        botName: agent?.name || "Aria",
        entryMessage: `Hi! I'm ${agent?.name || "Aria"} from Orivraa. Thanks for having me!`,
        webhookUrl,
        systemPrompt,
        ttsVoiceId: agent?.voiceId || undefined,
      });

      await this.prisma.meetingSession.update({
        where: { id: session.id },
        data: { status: "active", meetingBaasBotId: result.botId },
      });

      this.logger.log(`MeetingBaas bot ${result.botId} deployed for meeting ${session.id}`);
    } catch (err: any) {
      this.logger.error(`Failed to launch MeetingBaas for ${session.id}: ${err.message}`);
      await this.prisma.meetingSession.update({
        where: { id: session.id },
        data: { status: "error" },
      }).catch(() => {});
    }
  }
}

/**
 * BullMQ Worker: processes meeting-reminders queue.
 */
@Processor("meeting-reminders")
export class MeetingReminderProcessor extends WorkerHost {
  constructor(private scheduler: MeetingSchedulerService) {
    super();
  }

  async process(job: Job) {
    return this.scheduler.processReminderJob(job);
  }
}

/**
 * BullMQ Worker: processes meeting-launch queue.
 */
@Processor("meeting-launch")
export class MeetingLaunchProcessor extends WorkerHost {
  constructor(private scheduler: MeetingSchedulerService) {
    super();
  }

  async process(job: Job) {
    return this.scheduler.processLaunchJob(job);
  }
}
