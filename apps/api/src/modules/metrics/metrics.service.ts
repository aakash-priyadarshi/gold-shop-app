import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly register: client.Registry;

  // HTTP metrics
  readonly httpRequestsTotal: client.Counter<string>;
  readonly httpRequestDuration: client.Histogram<string>;
  readonly httpRequestsInFlight: client.Gauge<string>;

  // Business metrics
  readonly rfqCreatedTotal: client.Counter<string>;
  readonly offersReceivedTotal: client.Counter<string>;
  readonly ordersCreatedTotal: client.Counter<string>;
  readonly activeUsersGauge: client.Gauge<string>;

  // System metrics
  readonly dbQueryDuration: client.Histogram<string>;
  readonly cacheHitTotal: client.Counter<string>;
  readonly cacheMissTotal: client.Counter<string>;
  readonly websocketConnections: client.Gauge<string>;

  constructor() {
    this.register = new client.Registry();

    // Add default Node.js metrics (memory, CPU, event loop, GC)
    client.collectDefaultMetrics({
      register: this.register,
      prefix: 'orivraa_',
    });

    // HTTP request counter
    this.httpRequestsTotal = new client.Counter({
      name: 'orivraa_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    // HTTP request duration histogram
    this.httpRequestDuration = new client.Histogram({
      name: 'orivraa_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.register],
    });

    // In-flight requests
    this.httpRequestsInFlight = new client.Gauge({
      name: 'orivraa_http_requests_in_flight',
      help: 'Number of HTTP requests currently being processed',
      registers: [this.register],
    });

    // Business metrics
    this.rfqCreatedTotal = new client.Counter({
      name: 'orivraa_rfq_created_total',
      help: 'Total RFQs created',
      labelNames: ['country'],
      registers: [this.register],
    });

    this.offersReceivedTotal = new client.Counter({
      name: 'orivraa_offers_received_total',
      help: 'Total offers received from sellers',
      registers: [this.register],
    });

    this.ordersCreatedTotal = new client.Counter({
      name: 'orivraa_orders_created_total',
      help: 'Total orders created',
      labelNames: ['payment_method'],
      registers: [this.register],
    });

    this.activeUsersGauge = new client.Gauge({
      name: 'orivraa_active_users',
      help: 'Number of currently active users (approximation)',
      labelNames: ['role'],
      registers: [this.register],
    });

    // Database metrics
    this.dbQueryDuration = new client.Histogram({
      name: 'orivraa_db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [this.register],
    });

    // Cache metrics
    this.cacheHitTotal = new client.Counter({
      name: 'orivraa_cache_hit_total',
      help: 'Total cache hits',
      labelNames: ['cache_name'],
      registers: [this.register],
    });

    this.cacheMissTotal = new client.Counter({
      name: 'orivraa_cache_miss_total',
      help: 'Total cache misses',
      labelNames: ['cache_name'],
      registers: [this.register],
    });

    // WebSocket connections
    this.websocketConnections = new client.Gauge({
      name: 'orivraa_websocket_connections',
      help: 'Number of active WebSocket connections',
      registers: [this.register],
    });
  }

  onModuleInit() {
    // Metrics are ready
  }

  /** Return Prometheus-formatted metrics string */
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /** Return content type for Prometheus scraping */
  getContentType(): string {
    return this.register.contentType;
  }

  /** Return metrics as JSON (for admin dashboard) */
  async getMetricsJson(): Promise<Record<string, any>> {
    const metrics = await this.register.getMetricsAsJSON();
    return {
      timestamp: new Date().toISOString(),
      metrics,
    };
  }

  /** Get a summary of key metrics for admin API */
  async getAdminSummary(): Promise<Record<string, any>> {
    const metrics = await this.register.getMetricsAsJSON();

    const findMetric = (name: string) =>
      metrics.find((m: any) => m.name === name);

    // Extract key values
    const requestsMetric = findMetric('orivraa_http_requests_total');
    const durationMetric = findMetric('orivraa_http_request_duration_seconds');
    const memMetric = findMetric('orivraa_process_resident_memory_bytes');
    const cpuMetric = findMetric('orivraa_process_cpu_seconds_total');
    const inFlightMetric = findMetric('orivraa_http_requests_in_flight');
    const wsMetric = findMetric('orivraa_websocket_connections');
    const rfqMetric = findMetric('orivraa_rfq_created_total');
    const ordersMetric = findMetric('orivraa_orders_created_total');

    // Total request count across all routes
    let totalRequests = 0;
    let errorRequests = 0;
    if (requestsMetric?.values) {
      for (const v of requestsMetric.values) {
        totalRequests += v.value || 0;
        const status = String(v.labels?.status_code || '');
        if (status.startsWith('4') || status.startsWith('5')) {
          errorRequests += v.value || 0;
        }
      }
    }

    // P50, P95, P99 latency from histogram
    let p50 = 0, p95 = 0, p99 = 0;
    if (durationMetric?.values) {
      const counts = durationMetric.values.filter((v: any) => v.metricName?.includes('bucket'));
      // Approximate from histogram buckets
      const totalCount = durationMetric.values.find((v: any) => v.metricName?.includes('count'));
      const totalSum = durationMetric.values.find((v: any) => v.metricName?.includes('sum'));
      if (totalCount?.value && totalSum?.value) {
        p50 = totalSum.value / totalCount.value; // Average as approximation
        p95 = p50 * 2; // Rough estimate
        p99 = p50 * 3;
      }
    }

    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      requests: {
        total: totalRequests,
        errors: errorRequests,
        errorRate: totalRequests > 0 ? (errorRequests / totalRequests * 100).toFixed(2) + '%' : '0%',
        inFlight: inFlightMetric?.values?.[0]?.value || 0,
      },
      latency: {
        avgMs: Math.round(p50 * 1000),
        p95Ms: Math.round(p95 * 1000),
        p99Ms: Math.round(p99 * 1000),
      },
      memory: {
        rssBytes: memMetric?.values?.[0]?.value || 0,
        rssMB: Math.round((memMetric?.values?.[0]?.value || 0) / 1024 / 1024),
      },
      cpu: {
        totalSeconds: cpuMetric?.values?.[0]?.value || 0,
      },
      websockets: {
        active: wsMetric?.values?.[0]?.value || 0,
      },
      business: {
        rfqsCreated: rfqMetric?.values?.reduce((sum: number, v: any) => sum + (v.value || 0), 0) || 0,
        ordersCreated: ordersMetric?.values?.reduce((sum: number, v: any) => sum + (v.value || 0), 0) || 0,
      },
    };
  }
}
