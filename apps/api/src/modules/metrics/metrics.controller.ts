import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Prometheus scrape endpoint
   * Returns metrics in Prometheus text exposition format
   */
  @Get()
  @ApiOperation({
    summary: 'Prometheus metrics endpoint',
    description:
      'Returns all application metrics in Prometheus text format for scraping',
  })
  async getMetrics(@Res({ passthrough: true }) res: Response): Promise<string> {
    res.set('Content-Type', this.metricsService.getContentType());
    res.set('Cache-Control', 'no-store');
    return this.metricsService.getMetrics();
  }

  /**
   * Admin summary endpoint — returns structured JSON
   * for the admin performance dashboard
   */
  @Get('summary')
  @ApiOperation({
    summary: 'Admin metrics summary',
    description:
      'Returns key performance metrics as JSON for the admin dashboard',
  })
  async getAdminSummary() {
    return this.metricsService.getAdminSummary();
  }

  /**
   * Full metrics as JSON (for debugging or dashboards)
   */
  @Get('json')
  @ApiOperation({
    summary: 'Metrics as JSON',
    description: 'Returns all raw Prometheus metrics in JSON format',
  })
  async getMetricsJson() {
    return this.metricsService.getMetricsJson();
  }
}
