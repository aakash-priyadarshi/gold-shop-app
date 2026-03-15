import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Tracks cron job execution metrics.
 * Each cron job calls logExecution() after running.
 * Provides query methods for the admin dashboard.
 */
@Injectable()
export class CronMetricsService {
  private readonly logger = new Logger(CronMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a cron job execution
   */
  async logExecution(params: {
    jobName: string;
    app: string;
    frequency: string;
    status: "success" | "error" | "skipped";
    durationMs: number;
    recordsProcessed?: number;
    errorMessage?: string;
  }): Promise<void> {
    try {
      await this.prisma.cronJobLog.create({
        data: {
          jobName: params.jobName,
          app: params.app,
          frequency: params.frequency,
          status: params.status,
          durationMs: params.durationMs,
          recordsProcessed: params.recordsProcessed || 0,
          errorMessage: params.errorMessage,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to log cron execution: ${err.message}`);
    }
  }

  /**
   * Helper: wrap a cron job function with automatic logging
   */
  async trackExecution(
    jobName: string,
    app: string,
    frequency: string,
    fn: () => Promise<number>,
  ): Promise<void> {
    const start = Date.now();
    try {
      const count = await fn();
      await this.logExecution({
        jobName,
        app,
        frequency,
        status: count === -1 ? "skipped" : "success",
        durationMs: Date.now() - start,
        recordsProcessed: Math.max(count, 0),
      });
    } catch (err: any) {
      await this.logExecution({
        jobName,
        app,
        frequency,
        status: "error",
        durationMs: Date.now() - start,
        errorMessage: err.message,
      });
      throw err;
    }
  }

  /**
   * Get cron job logs for a specific date range
   */
  async getLogs(params: {
    date?: string; // YYYY-MM-DD
    app?: string;
    jobName?: string;
    limit?: number;
  }) {
    const where: any = {};

    if (params.date) {
      const dayStart = new Date(params.date + "T00:00:00Z");
      const dayEnd = new Date(params.date + "T23:59:59.999Z");
      where.createdAt = { gte: dayStart, lte: dayEnd };
    }
    if (params.app) where.app = params.app;
    if (params.jobName) where.jobName = params.jobName;

    const logs = await this.prisma.cronJobLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params.limit || 200,
    });

    return logs;
  }

  /**
   * Get summary of all cron jobs with their latest execution stats
   */
  async getSummary() {
    // Get distinct job names
    const jobs = await this.prisma.cronJobLog.groupBy({
      by: ["jobName", "app", "frequency"],
      _count: { id: true },
      _avg: { durationMs: true },
      _max: { createdAt: true },
    });

    // Get error counts per job in last 24h
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const errors = await this.prisma.cronJobLog.groupBy({
      by: ["jobName"],
      where: { status: "error", createdAt: { gte: since24h } },
      _count: { id: true },
    });
    const errorMap = new Map(errors.map((e) => [e.jobName, e._count.id]));

    // Get runs in last 24h per job
    const runs24h = await this.prisma.cronJobLog.groupBy({
      by: ["jobName"],
      where: { createdAt: { gte: since24h } },
      _count: { id: true },
      _sum: { recordsProcessed: true },
    });
    const runsMap = new Map(
      runs24h.map((r) => [
        r.jobName,
        { count: r._count.id, records: r._sum.recordsProcessed || 0 },
      ]),
    );

    return jobs.map((j) => ({
      jobName: j.jobName,
      app: j.app,
      frequency: j.frequency,
      totalRuns: j._count.id,
      avgDurationMs: Math.round(j._avg.durationMs || 0),
      lastRun: j._max.createdAt,
      errors24h: errorMap.get(j.jobName) || 0,
      runs24h: runsMap.get(j.jobName)?.count || 0,
      records24h: runsMap.get(j.jobName)?.records || 0,
    }));
  }

  /**
   * Get date-wise aggregation for a job or all jobs
   */
  async getDateWiseLogs(params: { days?: number; jobName?: string }) {
    const days = params.days || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where: any = { createdAt: { gte: since } };
    if (params.jobName) where.jobName = params.jobName;

    const logs = await this.prisma.cronJobLog.findMany({
      where,
      orderBy: { createdAt: "asc" },
      select: {
        jobName: true,
        app: true,
        status: true,
        durationMs: true,
        recordsProcessed: true,
        createdAt: true,
      },
    });

    // Group by date
    const byDate: Record<
      string,
      {
        date: string;
        totalRuns: number;
        successes: number;
        errors: number;
        skipped: number;
        avgDurationMs: number;
        totalRecords: number;
        jobs: Record<string, number>;
      }
    > = {};

    for (const log of logs) {
      const date = log.createdAt.toISOString().split("T")[0];
      if (!byDate[date]) {
        byDate[date] = {
          date,
          totalRuns: 0,
          successes: 0,
          errors: 0,
          skipped: 0,
          avgDurationMs: 0,
          totalRecords: 0,
          jobs: {},
        };
      }
      const d = byDate[date];
      d.totalRuns++;
      if (log.status === "success") d.successes++;
      else if (log.status === "error") d.errors++;
      else d.skipped++;
      d.avgDurationMs += log.durationMs;
      d.totalRecords += log.recordsProcessed;
      d.jobs[log.jobName] = (d.jobs[log.jobName] || 0) + 1;
    }

    // Finalize averages
    return Object.values(byDate).map((d) => ({
      ...d,
      avgDurationMs: d.totalRuns ? Math.round(d.avgDurationMs / d.totalRuns) : 0,
    }));
  }

  /**
   * Cleanup old logs (keep last 30 days)
   */
  async cleanup(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.cronJobLog.deleteMany({
      where: { createdAt: { lt: thirtyDaysAgo } },
    });
    return result.count;
  }
}
