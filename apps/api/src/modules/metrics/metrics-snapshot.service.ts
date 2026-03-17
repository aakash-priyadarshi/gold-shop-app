import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { CronMetricsService } from "./cron-metrics.service";
import { MetricsService } from "./metrics.service";

/**
 * Periodically snapshots Prometheus metrics to the database
 * for historical trend charts on the admin dashboard.
 *
 * - Takes a snapshot every 30 minutes
 * - Cleans up snapshots older than 30 days
 * - Provides query methods for the admin API
 */
@Injectable()
export class MetricsSnapshotService {
  private readonly logger = new Logger(MetricsSnapshotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
    private readonly cronMetrics: CronMetricsService,
  ) {}

  /**
   * Take a snapshot of current metrics every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async takeSnapshot(): Promise<void> {
    await this.cronMetrics.trackExecution(
      "metrics-snapshot",
      "api",
      "EVERY_5_MINUTES",
      async () => {
        const summary = await this.metricsService.getAdminSummary();

        await this.prisma.metricsSnapshot.create({
          data: {
            requests: summary.requests.total,
            errors: summary.requests.errors,
            errorRate: parseFloat(summary.requests.errorRate) || 0,
            avgLatency: summary.latency.avgMs,
            p95Latency: summary.latency.p95Ms,
            p99Latency: summary.latency.p99Ms,
            memoryMB: summary.memory.rssMB,
            cpuSeconds: summary.cpu.totalSeconds,
            rfqsCreated: summary.business.rfqsCreated,
            ordersCreated: summary.business.ordersCreated,
            wsConnections: summary.websockets.active,
            inFlight: summary.requests.inFlight,
            uptime: summary.uptime,
          },
        });

        this.logger.debug(
          `Metrics snapshot saved — ${summary.requests.total} requests, ${summary.memory.rssMB}MB memory`,
        );
        return 1;
      },
    );
  }

  /**
   * Clean up old snapshots (keep last 30 days)
   * Runs daily at 3 AM
   */
  @Cron("0 3 * * *")
  async cleanupOldSnapshots(): Promise<void> {
    await this.cronMetrics.trackExecution(
      "metrics-cleanup",
      "api",
      "DAILY_3AM",
      async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await this.prisma.metricsSnapshot.deleteMany({
          where: { createdAt: { lt: thirtyDaysAgo } },
        });

        // Also cleanup old cron logs
        await this.cronMetrics.cleanup();

        if (result.count > 0) {
          this.logger.log(`Cleaned up ${result.count} old metrics snapshots`);
        }
        return result.count;
      },
    );
  }

  /**
   * Get snapshots for the last N hours (for chart rendering)
   */
  async getHistory(hours: number = 24): Promise<any[]> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const snapshots = await this.prisma.metricsSnapshot.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        requests: true,
        errors: true,
        errorRate: true,
        avgLatency: true,
        p95Latency: true,
        p99Latency: true,
        memoryMB: true,
        cpuSeconds: true,
        rfqsCreated: true,
        ordersCreated: true,
        wsConnections: true,
        inFlight: true,
        uptime: true,
      },
    });

    return snapshots.map((s) => ({
      ...s,
      time: s.createdAt.toISOString(),
      label: s.createdAt.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    }));
  }

  /**
   * Get snapshot count (for dashboard stats)
   */
  async getSnapshotCount(): Promise<number> {
    return this.prisma.metricsSnapshot.count();
  }
}
