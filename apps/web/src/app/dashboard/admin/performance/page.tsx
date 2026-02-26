'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminGuard } from '@/components/auth/RouteGuard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Cpu,
  HardDrive,
  Globe,
  Clock,
  AlertTriangle,
  RefreshCw,
  Zap,
  Server,
  Wifi,
  ShoppingCart,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { metricsApi } from '@/lib/api';

interface MetricsSummary {
  timestamp: string;
  uptime: number;
  requests: {
    total: number;
    errors: number;
    errorRate: string;
    inFlight: number;
  };
  latency: {
    avgMs: number;
    p95Ms: number;
    p99Ms: number;
  };
  memory: {
    rssBytes: number;
    rssMB: number;
  };
  cpu: {
    totalSeconds: number;
  };
  websockets: {
    active: number;
  };
  business: {
    rfqsCreated: number;
    ordersCreated: number;
  };
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getStatusColor(errorRate: string): string {
  const rate = parseFloat(errorRate);
  if (rate < 1) return 'bg-green-500';
  if (rate < 5) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getStatusLabel(errorRate: string): string {
  const rate = parseFloat(errorRate);
  if (rate < 1) return 'Healthy';
  if (rate < 5) return 'Degraded';
  return 'Unhealthy';
}

function getLatencyColor(ms: number): string {
  if (ms < 100) return 'text-green-600';
  if (ms < 500) return 'text-yellow-600';
  return 'text-red-600';
}

export default function AdminPerformancePage() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadMetrics = useCallback(async () => {
    try {
      const res = await metricsApi.getSummary();
      setMetrics(res.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load metrics');
      console.error('Failed to load metrics', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadMetrics, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadMetrics]);

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Performance Monitoring
              </h1>
              <p className="text-muted-foreground">
                Real-time API metrics powered by Prometheus
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`}
                  style={autoRefresh ? { animationDuration: '3s' } : undefined}
                />
                {autoRefresh ? 'Live' : 'Paused'}
              </Button>
              <Button variant="outline" size="sm" onClick={loadMetrics}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Failed to load metrics:</span>
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {loading && !metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-4 bg-muted rounded w-20" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-muted rounded w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Metrics Dashboard */}
          {metrics && (
            <>
              {/* System Status Banner */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-3 w-3 rounded-full ${getStatusColor(metrics.requests.errorRate)}`}
                      />
                      <span className="text-lg font-semibold">
                        API Status:{' '}
                        {getStatusLabel(metrics.requests.errorRate)}
                      </span>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Uptime: {formatUptime(metrics.uptime)}
                      </Badge>
                    </div>
                    <Badge variant="secondary">
                      <Server className="h-3 w-3 mr-1" />
                      Railway Pro
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Primary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Requests */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Requests
                    </CardTitle>
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metrics.requests.total.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Since last restart
                    </p>
                  </CardContent>
                </Card>

                {/* Error Rate */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Error Rate
                    </CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metrics.requests.errorRate}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {metrics.requests.errors.toLocaleString()} errors
                    </p>
                  </CardContent>
                </Card>

                {/* Avg Latency */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Avg Latency
                    </CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${getLatencyColor(metrics.latency.avgMs)}`}
                    >
                      {metrics.latency.avgMs}ms
                    </div>
                    <p className="text-xs text-muted-foreground">
                      p95: {metrics.latency.p95Ms}ms · p99:{' '}
                      {metrics.latency.p99Ms}ms
                    </p>
                  </CardContent>
                </Card>

                {/* In-Flight */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      In-Flight Requests
                    </CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metrics.requests.inFlight}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Currently processing
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* System Resources */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Memory Usage */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Memory (RSS)
                    </CardTitle>
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metrics.memory.rssMB} MB
                    </div>
                    <Progress
                      value={Math.min(
                        (metrics.memory.rssMB / 512) * 100,
                        100,
                      )}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      of ~512 MB Railway allocation
                    </p>
                  </CardContent>
                </Card>

                {/* CPU Usage */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      CPU Time
                    </CardTitle>
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metrics.cpu.totalSeconds.toFixed(1)}s
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total CPU seconds consumed
                    </p>
                  </CardContent>
                </Card>

                {/* WebSocket Connections */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      WebSocket Connections
                    </CardTitle>
                    <Wifi className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metrics.websockets.active}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Active real-time connections
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Business Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      RFQs Created
                    </CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metrics.business.rfqsCreated.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Since last restart
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Orders Created
                    </CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metrics.business.ordersCreated.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Since last restart
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Grafana Integration Guide */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Grafana Cloud Integration
                  </CardTitle>
                  <CardDescription>
                    Connect your Grafana Cloud account for historical charts, alerts, and advanced dashboards
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Badge className="mt-0.5">1</Badge>
                      <span>
                        In Grafana Cloud → Connections → Add new connection → search{' '}
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                          Prometheus
                        </code>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge className="mt-0.5">2</Badge>
                      <span>
                        Set scrape URL to your Railway API:{' '}
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                          https://your-api.railway.app/api/metrics
                        </code>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge className="mt-0.5">3</Badge>
                      <span>
                        Import dashboard ID{' '}
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                          11159
                        </code>{' '}
                        (Node.js Application Dashboard) for auto-configured panels
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge className="mt-0.5">4</Badge>
                      <span>
                        Create alerts for: error rate {'>'}5%, p95 latency {'>'} 2s, memory {'>'} 400MB
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
