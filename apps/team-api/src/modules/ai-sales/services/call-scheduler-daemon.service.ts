import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../../prisma/prisma.service";
import { CallOrchestratorService } from "./call-orchestrator.service";

@Injectable()
export class CallSchedulerDaemonService {
  private readonly logger = new Logger(CallSchedulerDaemonService.name);
  private isProcessing = false;

  constructor(
    private prisma: PrismaService,
    private callOrchestrator: CallOrchestratorService,
    private config: ConfigService,
  ) {
    this.logger.log("Call scheduler daemon initialized");
  }

  /** Runs every minute — picks up pending CallSchedule records and dials */
  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingSchedules() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();

      const pendingSchedules = await this.prisma.callSchedule.findMany({
        where: {
          status: "pending",
          scheduledAt: { lte: now },
          OR: [
            { retryAfter: null },
            { retryAfter: { lte: now } },
          ],
        },
        orderBy: [
          { priority: "desc" },
          { scheduledAt: "asc" },
        ],
        take: 10,
        include: { lead: true },
      });

      if (pendingSchedules.length === 0) return;

      this.logger.log(`Processing ${pendingSchedules.length} pending scheduled call(s)`);

      const webhookBaseUrl =
        this.config.get("WEBHOOK_BASE_URL") || "https://team-api.orivraa.com";

      for (const schedule of pendingSchedules) {
        await this.processOne(schedule, webhookBaseUrl);
      }
    } catch (err: any) {
      this.logger.error(`Daemon error: ${err.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processOne(schedule: any, webhookBaseUrl: string) {
    try {
      // Mark as calling
      await this.prisma.callSchedule.update({
        where: { id: schedule.id },
        data: { status: "calling", attempts: { increment: 1 } },
      });

      if (!schedule.lead?.phone) {
        this.logger.warn(`Lead ${schedule.leadId} has no phone — marking failed`);
        await this.markFailed(schedule.id, schedule.notes, "No phone number");
        return;
      }

      if (schedule.lead.doNotCall) {
        this.logger.warn(`Lead ${schedule.leadId} is DNC — marking cancelled`);
        await this.prisma.callSchedule.update({
          where: { id: schedule.id },
          data: {
            status: "cancelled",
            notes: this.appendNote(schedule.notes, "Lead on DNC list"),
          },
        });
        return;
      }

      await this.callOrchestrator.initiateCall({
        agentId: schedule.agentId || "",
        leadId: schedule.leadId,
        campaignId: schedule.campaignId || undefined,
        webhookBaseUrl,
      });

      await this.prisma.callSchedule.update({
        where: { id: schedule.id },
        data: { status: "completed" },
      });

      this.logger.log(
        `Call initiated for lead ${schedule.leadId} (schedule ${schedule.id})`,
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to dial schedule ${schedule.id}: ${err.message}`,
      );

      const newAttempts = (schedule.attempts || 0) + 1;
      if (newAttempts >= schedule.maxAttempts) {
        await this.markFailed(schedule.id, schedule.notes, err.message);
      } else {
        // Retry after 5 minutes
        await this.prisma.callSchedule.update({
          where: { id: schedule.id },
          data: {
            status: "pending",
            retryAfter: new Date(Date.now() + 5 * 60 * 1000),
            notes: this.appendNote(
              schedule.notes,
              `Attempt ${newAttempts} failed: ${err.message}`,
            ),
          },
        });
      }
    }
  }

  private async markFailed(id: string, notes: string | null, reason: string) {
    await this.prisma.callSchedule.update({
      where: { id },
      data: {
        status: "failed",
        notes: this.appendNote(notes, reason),
      },
    });
  }

  private appendNote(existing: string | null, addition: string): string {
    return existing ? `${existing} | ${addition}` : addition;
  }
}
