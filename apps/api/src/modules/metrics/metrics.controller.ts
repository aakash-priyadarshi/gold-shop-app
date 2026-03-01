import { Body, Controller, Get, Patch, Query, Res } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { MetricsSnapshotService } from "./metrics-snapshot.service";
import { MetricsService } from "./metrics.service";
import { SkipSecurity } from "../security/security.guard";

@ApiTags("Metrics")
@Controller("metrics")
@SkipSecurity()
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly snapshotService: MetricsSnapshotService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Prometheus scrape endpoint
   * Returns metrics in Prometheus text exposition format
   */
  @Get()
  @ApiOperation({
    summary: "Prometheus metrics endpoint",
    description:
      "Returns all application metrics in Prometheus text format for scraping",
  })
  async getMetrics(@Res({ passthrough: true }) res: Response): Promise<string> {
    res.set("Content-Type", this.metricsService.getContentType());
    res.set("Cache-Control", "no-store");
    return this.metricsService.getMetrics();
  }

  /**
   * Admin summary endpoint — returns structured JSON
   * for the admin performance dashboard
   */
  @Get("summary")
  @ApiOperation({
    summary: "Admin metrics summary",
    description:
      "Returns key performance metrics as JSON for the admin dashboard",
  })
  async getAdminSummary() {
    return this.metricsService.getAdminSummary();
  }

  /**
   * Full metrics as JSON (for debugging or dashboards)
   */
  @Get("json")
  @ApiOperation({
    summary: "Metrics as JSON",
    description: "Returns all raw Prometheus metrics in JSON format",
  })
  async getMetricsJson() {
    return this.metricsService.getMetricsJson();
  }

  /**
   * Historical metrics snapshots for trend charts
   */
  @Get("history")
  @ApiOperation({
    summary: "Historical metrics",
    description: "Returns metrics snapshots for the specified time range",
  })
  @ApiQuery({ name: "hours", required: false, type: Number })
  async getHistory(@Query("hours") hours?: string) {
    const h = hours ? parseInt(hours, 10) : 24;
    return this.snapshotService.getHistory(Math.min(h, 720)); // Max 30 days
  }

  /**
   * Get Grafana Pro settings
   */
  @Get("grafana-settings")
  @ApiOperation({
    summary: "Get Grafana Pro settings",
    description: "Returns whether Grafana Pro is enabled and its configuration",
  })
  async getGrafanaSettings() {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: "grafana_pro_settings" },
    });
    return (
      config?.value || {
        enabled: false,
        cloudUrl: "",
        orgSlug: "",
        dashboardUid: "",
      }
    );
  }

  /**
   * Update Grafana Pro settings
   */
  @Patch("grafana-settings")
  @ApiOperation({
    summary: "Update Grafana Pro settings",
    description: "Enable/disable Grafana Pro and configure connection details",
  })
  async updateGrafanaSettings(
    @Body()
    body: {
      enabled: boolean;
      cloudUrl?: string;
      orgSlug?: string;
      dashboardUid?: string;
    },
  ) {
    const result = await this.prisma.systemConfig.upsert({
      where: { key: "grafana_pro_settings" },
      update: { value: body as any },
      create: { key: "grafana_pro_settings", value: body as any },
    });
    return result.value;
  }

  /**
   * Database performance metrics
   * Returns query stats, slow queries, per-model breakdown
   */
  @Get("db-performance")
  @ApiOperation({
    summary: "Database performance metrics",
    description:
      "Returns DB query counts, slow queries, per-model breakdown, and connection health",
  })
  async getDbPerformance() {
    const [dbMetrics, dbHealth] = await Promise.all([
      this.metricsService.getDbPerformance(),
      this.checkDbHealth(),
    ]);
    return { ...dbMetrics, health: dbHealth };
  }

  /** Quick DB health check — measures a raw SELECT 1 round-trip */
  private async checkDbHealth(): Promise<{
    connected: boolean;
    latencyMs: number;
  }> {
    const start = performance.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        connected: true,
        latencyMs: Math.round((performance.now() - start) * 100) / 100,
      };
    } catch {
      return {
        connected: false,
        latencyMs: Math.round((performance.now() - start) * 100) / 100,
      };
    }
  }
}
