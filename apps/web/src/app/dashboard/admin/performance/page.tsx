"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { metricsApi } from "@/lib/api";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  FileText,
  Globe,
  HardDrive,
  RefreshCw,
  Server,
  Settings,
  ShoppingCart,
  Timer,
  TrendingUp,
  Wifi,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

// Lazy-load recharts component (admin-only, no public bundle impact)
const LazyCharts = dynamic(() => import("./performance-charts"), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-muted/30 rounded-lg animate-pulse flex items-center justify-center">
      <BarChart3 className="h-8 w-8 text-muted-foreground" />
    </div>
  ),
});

// ─── Types ───

interface MetricsSummary {
  timestamp: string;
  uptime: number;
  requests: {
    total: number;
    errors: number;
    errorRate: string;
    inFlight: number;
  };
  latency: { avgMs: number; p95Ms: number; p99Ms: number };
  memory: { rssBytes: number; rssMB: number };
  cpu: { totalSeconds: number };
  websockets: { active: number };
  business: { rfqsCreated: number; ordersCreated: number };
}

interface GrafanaSettings {
  enabled: boolean;
  cloudUrl: string;
  orgSlug: string;
  dashboardUid: string;
}

interface DbSlowQuery {
  model: string;
  action: string;
  durationMs: number;
  timestamp: string;
}

interface DbModelStat {
  model: string;
  action: string;
  count: number;
  avgMs: number;
  maxMs: number;
  totalMs: number;
  errors: number;
}

interface DbPerformance {
  timestamp: string;
  summary: {
    totalQueries: number;
    totalSlowQueries: number;
    totalErrors: number;
    avgQueryMs: number;
    slowQueryThresholdMs: number;
  };
  slowQueries: DbSlowQuery[];
  modelBreakdown: DbModelStat[];
  health: {
    connected: boolean;
    latencyMs: number;
  };
}

export interface HistoryPoint {
  time: string;
  label: string;
  requests: number;
  errors: number;
  errorRate: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  memoryMB: number;
  cpuSeconds: number;
  rfqsCreated: number;
  ordersCreated: number;
  wsConnections: number;
  inFlight: number;
  uptime: number;
}

// ─── Helpers ───

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
  if (rate < 1) return "bg-green-500";
  if (rate < 5) return "bg-yellow-500";
  return "bg-red-500";
}

function getStatusLabel(errorRate: string): string {
  const rate = parseFloat(errorRate);
  if (rate < 1) return "Healthy";
  if (rate < 5) return "Degraded";
  return "Unhealthy";
}

function getLatencyColor(ms: number): string {
  if (ms < 100) return "text-green-600";
  if (ms < 500) return "text-yellow-600";
  return "text-red-600";
}

// ─── Main Page ───

export default function AdminPerformancePage() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [historyHours, setHistoryHours] = useState(24);

  // Grafana Pro
  const [grafanaSettings, setGrafanaSettings] = useState<GrafanaSettings>({
    enabled: false,
    cloudUrl: "",
    orgSlug: "",
    dashboardUid: "",
  });
  const [grafanaLoading, setGrafanaLoading] = useState(false);
  const [showGrafanaConfirm, setShowGrafanaConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [grafanaDraft, setGrafanaDraft] = useState<GrafanaSettings>({
    enabled: false,
    cloudUrl: "",
    orgSlug: "",
    dashboardUid: "",
  });

  // Database Performance
  const [dbPerf, setDbPerf] = useState<DbPerformance | null>(null);
  const [dbLoading, setDbLoading] = useState(false);

  // ── Data Fetching ──

  const loadMetrics = useCallback(async () => {
    try {
      const res = await metricsApi.getSummary();
      setMetrics(res.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await metricsApi.getHistory(historyHours);
      setHistory(res.data || []);
    } catch {
      // History may not have data yet — snapshots start after 5 min
    }
  }, [historyHours]);

  const loadGrafanaSettings = useCallback(async () => {
    try {
      const res = await metricsApi.getGrafanaSettings();
      const s = res.data || {
        enabled: false,
        cloudUrl: "",
        orgSlug: "",
        dashboardUid: "",
      };
      setGrafanaSettings(s);
      setGrafanaDraft(s);
    } catch {
      // No settings saved yet
    }
  }, []);

  const loadDbPerformance = useCallback(async () => {
    setDbLoading(true);
    try {
      const res = await metricsApi.getDbPerformance();
      setDbPerf(res.data);
    } catch {
      // DB metrics may not be available yet
    } finally {
      setDbLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
    loadHistory();
    loadGrafanaSettings();
    loadDbPerformance();
  }, [loadMetrics, loadHistory, loadGrafanaSettings, loadDbPerformance]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadMetrics();
      loadHistory();
      loadDbPerformance();
    }, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadMetrics, loadHistory, loadDbPerformance]);

  // ── Grafana Pro Toggle ──

  const handleGrafanaToggle = () => {
    if (!grafanaDraft.enabled) {
      // Turning ON → require typed confirmation
      setShowGrafanaConfirm(true);
      setConfirmText("");
    } else {
      // Turning OFF → instant
      saveGrafanaSettings({ ...grafanaDraft, enabled: false });
    }
  };

  const confirmEnablePro = async () => {
    if (confirmText !== "i confirm enable pro plan") return;
    setShowGrafanaConfirm(false);
    setConfirmText("");
    await saveGrafanaSettings({ ...grafanaDraft, enabled: true });
  };

  const saveGrafanaSettings = async (settings: GrafanaSettings) => {
    setGrafanaLoading(true);
    try {
      const res = await metricsApi.updateGrafanaSettings(settings);
      setGrafanaSettings(res.data);
      setGrafanaDraft(res.data);
    } catch (e: any) {
      console.error("Failed to save Grafana settings", e);
    } finally {
      setGrafanaLoading(false);
    }
  };

  const saveGrafanaConfig = async () => {
    await saveGrafanaSettings(grafanaDraft);
  };

  // ── Render ──

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Performance Monitoring
              </h1>
              <p className="text-muted-foreground">
                Real-time + historical API metrics
                {grafanaSettings.enabled && (
                  <Badge variant="default" className="ml-2 text-xs">
                    Grafana Pro
                  </Badge>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 ${autoRefresh ? "animate-spin" : ""}`}
                  style={autoRefresh ? { animationDuration: "3s" } : undefined}
                />
                {autoRefresh ? "Live" : "Paused"}
              </Button>
              <Button variant="outline" size="sm" onClick={loadMetrics}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Error */}
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

          {/* Loading skeleton */}
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

          {/* ── Main Content ── */}
          {metrics && (
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="database">
                  <Database className="h-3.5 w-3.5 mr-1" />
                  Database
                </TabsTrigger>
                <TabsTrigger value="trends">Trend Charts</TabsTrigger>
                <TabsTrigger value="grafana">
                  <Settings className="h-3.5 w-3.5 mr-1" />
                  Grafana Pro
                </TabsTrigger>
              </TabsList>

              {/* ════════ Tab 1: Overview (real-time cards) ════════ */}
              <TabsContent value="overview" className="space-y-4">
                {/* System Status */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-3 w-3 rounded-full ${getStatusColor(metrics.requests.errorRate)}`}
                        />
                        <span className="text-lg font-semibold">
                          API Status:{" "}
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
                        p95: {metrics.latency.p95Ms}ms · p99:{" "}
                        {metrics.latency.p99Ms}ms
                      </p>
                    </CardContent>
                  </Card>

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
              </TabsContent>

              {/* ════════ Tab 2: Database Performance ════════ */}
              <TabsContent value="database" className="space-y-4">
                {dbLoading && !dbPerf ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
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
                ) : dbPerf ? (
                  <>
                    {/* DB Health Banner */}
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-3 w-3 rounded-full ${dbPerf.health.connected ? "bg-green-500" : "bg-red-500"}`}
                            />
                            <span className="text-lg font-semibold">
                              Database:{" "}
                              {dbPerf.health.connected
                                ? "Connected"
                                : "Disconnected"}
                            </span>
                            <Badge variant="outline">
                              <Timer className="h-3 w-3 mr-1" />
                              Ping: {dbPerf.health.latencyMs}ms
                            </Badge>
                          </div>
                          <Badge variant="secondary">
                            <Database className="h-3 w-3 mr-1" />
                            Neon PostgreSQL
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium">
                            Total Queries
                          </CardTitle>
                          <Database className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {dbPerf.summary.totalQueries.toLocaleString()}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Since last restart
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium">
                            Avg Query Time
                          </CardTitle>
                          <Zap className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div
                            className={`text-2xl font-bold ${
                              dbPerf.summary.avgQueryMs < 20
                                ? "text-green-600"
                                : dbPerf.summary.avgQueryMs < 100
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }`}
                          >
                            {dbPerf.summary.avgQueryMs}ms
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Average across all models
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium">
                            Slow Queries
                          </CardTitle>
                          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div
                            className={`text-2xl font-bold ${
                              dbPerf.summary.totalSlowQueries === 0
                                ? "text-green-600"
                                : "text-amber-600"
                            }`}
                          >
                            {dbPerf.summary.totalSlowQueries}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Queries &gt; {dbPerf.summary.slowQueryThresholdMs}ms
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium">
                            DB Errors
                          </CardTitle>
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                          <div
                            className={`text-2xl font-bold ${
                              dbPerf.summary.totalErrors === 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {dbPerf.summary.totalErrors}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Connection or query errors
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Model Breakdown Table */}
                    {dbPerf.modelBreakdown.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Query Breakdown by Model
                          </CardTitle>
                          <CardDescription>
                            Heaviest database operations, sorted by total time
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b text-left">
                                  <th className="pb-2 font-medium">Model</th>
                                  <th className="pb-2 font-medium">Action</th>
                                  <th className="pb-2 font-medium text-right">
                                    Count
                                  </th>
                                  <th className="pb-2 font-medium text-right">
                                    Avg
                                  </th>
                                  <th className="pb-2 font-medium text-right">
                                    Max
                                  </th>
                                  <th className="pb-2 font-medium text-right">
                                    Total
                                  </th>
                                  <th className="pb-2 font-medium text-right">
                                    Errors
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {dbPerf.modelBreakdown.map((row, i) => (
                                  <tr
                                    key={`${row.model}-${row.action}`}
                                    className={
                                      i % 2 === 0 ? "bg-muted/30" : ""
                                    }
                                  >
                                    <td className="py-1.5 font-mono text-xs">
                                      {row.model}
                                    </td>
                                    <td className="py-1.5">
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {row.action}
                                      </Badge>
                                    </td>
                                    <td className="py-1.5 text-right tabular-nums">
                                      {row.count.toLocaleString()}
                                    </td>
                                    <td
                                      className={`py-1.5 text-right tabular-nums ${
                                        row.avgMs < 20
                                          ? "text-green-600"
                                          : row.avgMs < 100
                                            ? "text-yellow-600"
                                            : "text-red-600"
                                      }`}
                                    >
                                      {row.avgMs}ms
                                    </td>
                                    <td
                                      className={`py-1.5 text-right tabular-nums ${
                                        row.maxMs < 100
                                          ? "text-green-600"
                                          : row.maxMs < 500
                                            ? "text-yellow-600"
                                            : "text-red-600"
                                      }`}
                                    >
                                      {row.maxMs}ms
                                    </td>
                                    <td className="py-1.5 text-right tabular-nums">
                                      {row.totalMs > 1000
                                        ? `${(row.totalMs / 1000).toFixed(1)}s`
                                        : `${row.totalMs}ms`}
                                    </td>
                                    <td className="py-1.5 text-right tabular-nums">
                                      {row.errors > 0 ? (
                                        <span className="text-red-600 font-medium">
                                          {row.errors}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">
                                          0
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Slow Query Log */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Slow Query Log
                          <Badge variant="outline" className="text-xs">
                            Last {dbPerf.slowQueries.length} of max 50
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Queries that took longer than{" "}
                          {dbPerf.summary.slowQueryThresholdMs}ms (newest first)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {dbPerf.slowQueries.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <Zap className="h-8 w-8 mx-auto mb-2 text-green-500" />
                            <p className="font-medium">
                              No slow queries detected!
                            </p>
                            <p className="text-xs mt-1">
                              All queries are executing under{" "}
                              {dbPerf.summary.slowQueryThresholdMs}ms
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-80 overflow-y-auto">
                            {dbPerf.slowQueries.map((q, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-muted-foreground w-32 shrink-0">
                                    {new Date(q.timestamp).toLocaleTimeString()}
                                  </span>
                                  <span className="font-mono font-medium">
                                    {q.model}.{q.action}
                                  </span>
                                </div>
                                <Badge
                                  variant={
                                    q.durationMs > 500
                                      ? "destructive"
                                      : "secondary"
                                  }
                                  className="text-xs tabular-nums"
                                >
                                  {q.durationMs}ms
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Tips Card */}
                    <Card className="border-blue-200 bg-blue-50/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          How to Read This Data
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <p>
                          <strong>DB Ping</strong> — Raw round-trip time to
                          Neon PostgreSQL. Under 50ms is excellent.
                        </p>
                        <p>
                          <strong>Avg Query Time</strong> — Average time for
                          Prisma operations. Under 20ms = fast, 20-100ms =
                          normal, &gt;100ms = investigate.
                        </p>
                        <p>
                          <strong>Model Breakdown</strong> — Shows which tables
                          are hit most and which queries are slowest. Focus
                          optimization on high-Total operations.
                        </p>
                        <p>
                          <strong>Server-Timing</strong> — Open your browser
                          DevTools → Network → click any API request → Timing
                          tab. You'll see &quot;API Processing&quot; time that
                          includes DB queries.
                        </p>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card>
                    <CardContent className="pt-8 pb-8 text-center">
                      <Database className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-lg font-medium">
                        No database metrics yet
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        DB query tracking starts after the first request hits
                        the API.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ════════ Tab 3: Trend Charts ════════ */}
              <TabsContent value="trends" className="space-y-4">
                {/* Time Range Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Show last:
                  </span>
                  {[1, 6, 12, 24, 48, 168].map((h) => (
                    <Button
                      key={h}
                      size="sm"
                      variant={historyHours === h ? "default" : "outline"}
                      onClick={() => setHistoryHours(h)}
                    >
                      {h < 24
                        ? `${h}h`
                        : h === 24
                          ? "24h"
                          : h === 48
                            ? "2d"
                            : "7d"}
                    </Button>
                  ))}
                </div>

                {history.length === 0 ? (
                  <Card>
                    <CardContent className="pt-8 pb-8 text-center">
                      <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-lg font-medium">
                        No historical data yet
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Metrics snapshots are taken every 5 minutes. Charts will
                        appear once data accumulates.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Grafana Pro: Embedded Panels (shown only when Pro enabled) */}
                    {grafanaSettings.enabled && grafanaSettings.cloudUrl && (
                      <Card className="border-blue-200 bg-blue-50/30">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Grafana Cloud Dashboards
                            <Badge variant="default" className="text-xs">
                              Pro
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {grafanaSettings.dashboardUid ? (
                              <>
                                <iframe
                                  src={`${grafanaSettings.cloudUrl}/d-solo/${grafanaSettings.dashboardUid}?orgId=1&panelId=1&theme=light`}
                                  className="w-full h-64 rounded-lg border"
                                  title="Grafana Request Rate"
                                />
                                <iframe
                                  src={`${grafanaSettings.cloudUrl}/d-solo/${grafanaSettings.dashboardUid}?orgId=1&panelId=2&theme=light`}
                                  className="w-full h-64 rounded-lg border"
                                  title="Grafana Latency"
                                />
                              </>
                            ) : (
                              <div className="col-span-2 text-center py-4 text-sm text-muted-foreground">
                                Set a Dashboard UID in the Grafana Pro tab to
                                embed panels here.
                                <a
                                  href={grafanaSettings.cloudUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-1"
                                >
                                  Open Grafana
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Self-contained charts (always shown) */}
                    <LazyCharts data={history} />
                  </>
                )}
              </TabsContent>

              {/* ════════ Tab 3: Grafana Pro Settings ════════ */}
              <TabsContent value="grafana" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Grafana Cloud Pro
                    </CardTitle>
                    <CardDescription>
                      Enable Grafana Cloud integration for advanced dashboards,
                      13-month retention, and multi-channel alerting.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Toggle */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Grafana Pro Features</p>
                        <p className="text-sm text-muted-foreground">
                          {grafanaSettings.enabled
                            ? "Embedded panels and advanced alerting are active"
                            : "Currently using self-contained metrics only"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            grafanaSettings.enabled ? "default" : "outline"
                          }
                        >
                          {grafanaSettings.enabled ? "Pro" : "Free"}
                        </Badge>
                        <Switch
                          checked={grafanaSettings.enabled}
                          onCheckedChange={handleGrafanaToggle}
                          disabled={grafanaLoading}
                        />
                      </div>
                    </div>

                    {/* Confirmation Dialog (inline) */}
                    {showGrafanaConfirm && (
                      <Card className="border-amber-300 bg-amber-50">
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-start gap-2 text-amber-800">
                            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium">
                                Enable Grafana Pro Plan?
                              </p>
                              <p className="text-sm mt-1">
                                This will activate embedded Grafana Cloud panels
                                on your dashboard. Make sure you have a Grafana
                                Cloud Pro subscription (Pay-as-you-go:
                                ~&#8377;0.09/Grafana Unit).
                              </p>
                              <p className="text-sm mt-2 font-medium">
                                Type{" "}
                                <code className="bg-amber-200 px-1.5 py-0.5 rounded text-xs">
                                  i confirm enable pro plan
                                </code>{" "}
                                to proceed:
                              </p>
                              <Input
                                className="mt-2 max-w-sm bg-white"
                                placeholder="Type confirmation text here..."
                                value={confirmText}
                                onChange={(e) =>
                                  setConfirmText(e.target.value.toLowerCase())
                                }
                                autoFocus
                              />
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  variant="default"
                                  disabled={
                                    confirmText !== "i confirm enable pro plan"
                                  }
                                  onClick={confirmEnablePro}
                                >
                                  Enable Pro
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setShowGrafanaConfirm(false);
                                    setConfirmText("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Connection Settings (shown when Pro enabled) */}
                    {grafanaSettings.enabled && (
                      <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-medium text-sm">
                          Connection Settings
                        </h3>
                        <div className="grid gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="cloudUrl">Grafana Cloud URL</Label>
                            <Input
                              id="cloudUrl"
                              placeholder="https://your-org.grafana.net"
                              value={grafanaDraft.cloudUrl}
                              onChange={(e) =>
                                setGrafanaDraft({
                                  ...grafanaDraft,
                                  cloudUrl: e.target.value,
                                })
                              }
                            />
                            <p className="text-xs text-muted-foreground">
                              Your Grafana Cloud instance URL (found in My
                              Account &rarr; Grafana)
                            </p>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="orgSlug">Organization Slug</Label>
                            <Input
                              id="orgSlug"
                              placeholder="your-org"
                              value={grafanaDraft.orgSlug}
                              onChange={(e) =>
                                setGrafanaDraft({
                                  ...grafanaDraft,
                                  orgSlug: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="dashboardUid">Dashboard UID</Label>
                            <Input
                              id="dashboardUid"
                              placeholder="abcdef123"
                              value={grafanaDraft.dashboardUid}
                              onChange={(e) =>
                                setGrafanaDraft({
                                  ...grafanaDraft,
                                  dashboardUid: e.target.value,
                                })
                              }
                            />
                            <p className="text-xs text-muted-foreground">
                              Dashboard UID to embed (from URL: /d/[UID]/...)
                            </p>
                          </div>

                          <Button
                            onClick={saveGrafanaConfig}
                            disabled={grafanaLoading}
                          >
                            {grafanaLoading
                              ? "Saving..."
                              : "Save Configuration"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Setup Guide */}
                    <div className="space-y-3 text-sm border-t pt-4">
                      <h3 className="font-medium">Setup Guide</h3>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">
                          1
                        </Badge>
                        <span>
                          Sign up at{" "}
                          <a
                            href="https://grafana.com/products/cloud/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Grafana Cloud
                          </a>{" "}
                          (free tier available, Pro ~&#8377;50-100/month
                          pay-as-you-go)
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">
                          2
                        </Badge>
                        <span>
                          Add Prometheus data source &rarr; set scrape URL to{" "}
                          <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                            https://api.orivraa.com/api/metrics
                          </code>
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">
                          3
                        </Badge>
                        <span>
                          Import dashboard ID{" "}
                          <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                            11159
                          </code>{" "}
                          (Node.js Application Dashboard)
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">
                          4
                        </Badge>
                        <span>
                          Copy your dashboard UID &amp; Grafana URL above, then
                          enable Pro
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
