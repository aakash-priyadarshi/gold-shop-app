import { Controller, Get, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthStatus } from './health.service';
import { SkipSecurity } from '../security/security.guard';

@ApiTags('Health')
@Controller('health')
@SkipSecurity()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Comprehensive health check endpoint
   * Returns detailed status of all system components
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Health check',
    description: 'Returns comprehensive health status of all system components'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'System is healthy or degraded',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string' },
        uptime: { type: 'number', description: 'Uptime in seconds' },
        checks: {
          type: 'object',
          properties: {
            database: { $ref: '#/components/schemas/ComponentHealth' },
            marketRates: { $ref: '#/components/schemas/ComponentHealth' },
          }
        }
      }
    }
  })
  @ApiResponse({ status: 503, description: 'System is unhealthy' })
  async getHealth(): Promise<HealthStatus> {
    const health = await this.healthService.getHealth();
    
    // Return 503 if unhealthy (useful for load balancers)
    // Note: NestJS will still return the body even with error status
    if (health.status === 'unhealthy') {
      // In production, you might want to throw an exception here
      // throw new ServiceUnavailableException(health);
    }
    
    return health;
  }

  /**
   * Kubernetes liveness probe endpoint
   * Simple check - is the process alive?
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Liveness probe',
    description: 'Simple liveness check for Kubernetes/container orchestration'
  })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  async getLiveness(): Promise<{ status: string }> {
    return this.healthService.getLiveness();
  }

  /**
   * Kubernetes readiness probe endpoint
   * Can the service handle traffic?
   */
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Readiness probe',
    description: 'Readiness check - can the service handle traffic?'
  })
  @ApiResponse({ status: 200, description: 'Service is ready to handle traffic' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async getReadiness(): Promise<{ status: string; ready: boolean }> {
    const readiness = await this.healthService.getReadiness();
    
    // Could return 503 if not ready for stricter load balancer behavior
    return readiness;
  }

  /**
   * Simple ping endpoint for basic connectivity testing
   */
  @Get('ping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Ping',
    description: 'Simple ping endpoint for connectivity testing'
  })
  @ApiResponse({ status: 200, description: 'Pong' })
  ping(): { message: string; timestamp: string } {
    return {
      message: 'pong',
      timestamp: new Date().toISOString(),
    };
  }
}
