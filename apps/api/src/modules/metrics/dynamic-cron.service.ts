import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Default cron job definitions — seeded on first startup.
 * intervalMinutes is the current running frequency.
 */
const DEFAULT_CONFIGS = [
  // ── team-api: AI Sales scheduling ──
  {
    jobName: "call-scheduler",
    app: "team-api",
    intervalMinutes: 1,
    recommended: 1,
    minInterval: 1,
    maxInterval: 30,
    description: "Dial pending CallSchedule records",
    impact: "Lower = faster outbound call pickup. Higher = saves CPU but calls may wait.",
    category: "scheduling",
  },
  {
    jobName: "meeting-auto-launch",
    app: "team-api",
    intervalMinutes: 1,
    recommended: 1,
    minInterval: 1,
    maxInterval: 15,
    description: "Launch Daily.co meetings at scheduled time",
    impact: "Lower = meetings start on time. Higher = meetings may start late.",
    category: "scheduling",
  },
  {
    jobName: "30m-reminders",
    app: "team-api",
    intervalMinutes: 1,
    recommended: 1,
    minInterval: 1,
    maxInterval: 10,
    description: "Send 30-minute meeting reminders",
    impact: "Lower = reminders sent precisely on time. Higher = may miss the window.",
    category: "scheduling",
  },
  {
    jobName: "external-meetings",
    app: "team-api",
    intervalMinutes: 1,
    recommended: 1,
    minInterval: 1,
    maxInterval: 15,
    description: "Auto-launch external meetings (GMeet/Zoom)",
    impact: "Lower = bot joins external meetings on time. Higher = may join late.",
    category: "scheduling",
  },
  {
    jobName: "24h-reminders",
    app: "team-api",
    intervalMinutes: 5,
    recommended: 5,
    minInterval: 5,
    maxInterval: 60,
    description: "Send 24-hour meeting reminders",
    impact: "Not time-critical. Lower = more DB queries. 5-15 min is ideal.",
    category: "scheduling",
  },
  {
    jobName: "mark-no-shows",
    app: "team-api",
    intervalMinutes: 5,
    recommended: 5,
    minInterval: 5,
    maxInterval: 60,
    description: "Mark meetings as no-show after 30+ min",
    impact: "Not time-critical. Higher intervals are fine — saves resources.",
    category: "cleanup",
  },
  // ── api: Monitoring & maintenance ──
  {
    jobName: "metrics-snapshot",
    app: "api",
    intervalMinutes: 5,
    recommended: 5,
    minInterval: 1,
    maxInterval: 60,
    description: "Save performance metrics to DB",
    impact: "Lower = finer-grained performance data. Higher = less DB writes.",
    category: "monitoring",
  },
  {
    jobName: "pos-expiry",
    app: "api",
    intervalMinutes: 5,
    recommended: 5,
    minInterval: 5,
    maxInterval: 60,
    description: "Expire overdue POS sessions and release stock",
    impact: "Lower = faster stock release. Higher = stock may stay reserved longer.",
    category: "cleanup",
  },
];

@Injectable()
export class DynamicCronService implements OnModuleInit {
  private readonly logger = new Logger(DynamicCronService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  /** Seed default configs for jobs that don't have a config yet */
  private async seedDefaults() {
    for (const cfg of DEFAULT_CONFIGS) {
      const existing = await this.prisma.cronJobConfig.findUnique({
        where: { jobName: cfg.jobName },
      });
      if (!existing) {
        await this.prisma.cronJobConfig.create({ data: cfg });
        this.logger.log(`Seeded cron config: ${cfg.jobName} @ ${cfg.intervalMinutes}min`);
      }
    }
  }

  /** Get all cron job configs */
  async getConfigs() {
    return this.prisma.cronJobConfig.findMany({
      orderBy: [{ category: "asc" }, { jobName: "asc" }],
    });
  }

  /** Get config for a specific job */
  async getConfig(jobName: string) {
    return this.prisma.cronJobConfig.findUnique({ where: { jobName } });
  }

  /** Get the interval for a job (returns minutes, defaults to provided fallback) */
  async getIntervalMinutes(jobName: string, fallback: number): Promise<number> {
    const cfg = await this.prisma.cronJobConfig.findUnique({ where: { jobName } });
    if (!cfg || !cfg.enabled) return fallback;
    return cfg.intervalMinutes;
  }

  /** Update a cron job config */
  async updateConfig(
    jobName: string,
    updates: { intervalMinutes?: number; enabled?: boolean },
  ) {
    const cfg = await this.prisma.cronJobConfig.findUnique({ where: { jobName } });
    if (!cfg) throw new Error(`Cron config '${jobName}' not found`);

    if (updates.intervalMinutes !== undefined) {
      if (updates.intervalMinutes < cfg.minInterval || updates.intervalMinutes > cfg.maxInterval) {
        throw new Error(
          `Interval must be between ${cfg.minInterval} and ${cfg.maxInterval} minutes`,
        );
      }
    }

    return this.prisma.cronJobConfig.update({
      where: { jobName },
      data: {
        ...(updates.intervalMinutes !== undefined && { intervalMinutes: updates.intervalMinutes }),
        ...(updates.enabled !== undefined && { enabled: updates.enabled }),
      },
    });
  }

  /** Bulk update multiple cron configs */
  async bulkUpdate(updates: Array<{ jobName: string; intervalMinutes?: number; enabled?: boolean }>) {
    const results = [];
    for (const u of updates) {
      results.push(await this.updateConfig(u.jobName, u));
    }
    return results;
  }

  /** Reset a job to recommended settings */
  async resetToRecommended(jobName: string) {
    const cfg = await this.prisma.cronJobConfig.findUnique({ where: { jobName } });
    if (!cfg) throw new Error(`Cron config '${jobName}' not found`);
    return this.updateConfig(jobName, { intervalMinutes: cfg.recommended, enabled: true });
  }

  /** Reset all jobs to recommended settings */
  async resetAllToRecommended() {
    const configs = await this.prisma.cronJobConfig.findMany();
    const results = [];
    for (const cfg of configs) {
      results.push(
        await this.updateConfig(cfg.jobName, { intervalMinutes: cfg.recommended, enabled: true }),
      );
    }
    return results;
  }

  /** Convert minutes to cron expression (used by services reading config) */
  static minutesToCron(minutes: number): string {
    if (minutes === 1) return "* * * * *";
    if (minutes < 60) return `*/${minutes} * * * *`;
    const hours = Math.floor(minutes / 60);
    return `0 */${hours} * * *`;
  }
}
