import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    redis?: ComponentHealth;
    marketRates?: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  message?: string;
  lastChecked: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthStatus> {
    const checks = await this.runHealthChecks();
    
    // Determine overall status
    const statuses = Object.values(checks).map(c => c.status);
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (statuses.includes('down')) {
      overallStatus = 'unhealthy';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks,
    };
  }

  async getLiveness(): Promise<{ status: string }> {
    // Simple liveness check - is the process running?
    return { status: 'ok' };
  }

  async getReadiness(): Promise<{ status: string; ready: boolean }> {
    // Readiness check - can we serve traffic?
    try {
      await this.checkDatabase();
      return { status: 'ok', ready: true };
    } catch {
      return { status: 'not ready', ready: false };
    }
  }

  private async runHealthChecks(): Promise<HealthStatus['checks']> {
    const [database, marketRates] = await Promise.all([
      this.checkDatabase(),
      this.checkMarketRates(),
    ]);

    return {
      database,
      marketRates,
    };
  }

  private async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        latency: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'down',
        latency: Date.now() - start,
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private async checkMarketRates(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      // Check if we have recent market rate data (within last hour)
      const recentSnapshot = await this.prisma.marketRateSnapshot.findFirst({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // 1 hour
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (recentSnapshot) {
        return {
          status: 'up',
          latency: Date.now() - start,
          message: `Last update: ${recentSnapshot.updatedAt.toISOString()}`,
          lastChecked: new Date().toISOString(),
        };
      }

      // No recent data - degraded but not down
      const anySnapshot = await this.prisma.marketRateSnapshot.findFirst({
        orderBy: { updatedAt: 'desc' },
      });

      if (anySnapshot) {
        return {
          status: 'degraded',
          latency: Date.now() - start,
          message: `Stale data. Last update: ${anySnapshot.updatedAt.toISOString()}`,
          lastChecked: new Date().toISOString(),
        };
      }

      return {
        status: 'degraded',
        latency: Date.now() - start,
        message: 'No market rate data available',
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Market rates health check failed', error);
      return {
        status: 'down',
        latency: Date.now() - start,
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString(),
      };
    }
  }
}
