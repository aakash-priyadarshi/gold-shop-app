"use client";

import { GitHubTokenManager } from "@/components/admin/GitHubTokenManager";
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
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { testingApi } from "@/lib/api";
import {
  Activity,
  AlertTriangle,
  Ban,
  CheckCircle,
  ChevronRight,
  Clock,
  ExternalLink,
  FlaskConical,
  GitBranch,
  GitCommit,
  Globe,
  History,
  Loader2,
  Monitor,
  Play,
  RefreshCw,
  Rocket,
  RotateCcw,
  Server,
  TestTube2,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/* ════════════════════════════════════════════════════════════
   Types
   ════════════════════════════════════════════════════════════ */

interface SmokeResult {
  name: string;
  category: string;
  status: "pass" | "fail" | "skip";
  duration: number;
  message?: string;
  expected?: string;
  actual?: string;
}

interface SmokeReport {
  timestamp: string;
  environment: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  categories: { name: string; passed: number; failed: number; total: number }[];
  results: SmokeResult[];
}

interface E2ETestCase {
  name: string;
  status: "passed" | "failed" | "skipped" | "timedOut";
  duration: number;
  error?: string;
  retries: number;
}

interface E2ESuite {
  name: string;
  file: string;
  tests: E2ETestCase[];
  duration: number;
}

interface E2EReport {
  timestamp: string;
  browser: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  suites: E2ESuite[];
  htmlReportPath?: string;
}

interface IntegrationSuite {
  name: string;
  tests: {
    name: string;
    status: "passed" | "failed";
    duration: number;
    error?: string;
  }[];
}

interface IntegrationReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  suites: IntegrationSuite[];
}

interface GitInfo {
  branch: string;
  commit: string;
  commitFull: string;
  message: string;
  author: string;
  date: string;
}

interface RuntimeInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  env: string;
  pid: number;
  cwd: string;
  cpuUsage: { user: number; system: number };
}

interface HistoryEntry {
  id: string;
  type: "smoke" | "e2e" | "integration" | "full" | "ci";
  timestamp: string;
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  trigger: string;
  branch: string;
  commit: string;
}

interface CIStep {
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "skipped" | null;
  number: number;
}

interface CIJob {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion:
    | "success"
    | "failure"
    | "cancelled"
    | "skipped"
    | "timed_out"
    | null;
  started_at: string | null;
  completed_at: string | null;
  html_url: string;
  steps: CIStep[];
}

interface CIWorkflowRun {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed" | "waiting";
  conclusion:
    | "success"
    | "failure"
    | "cancelled"
    | "skipped"
    | "timed_out"
    | "action_required"
    | null;
  html_url: string;
  run_number: number;
  event: string;
  branch: string;
  commit_sha: string;
  commit_message: string;
  actor: string;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  jobs: CIJob[];
  artifacts_url: string;
  duration?: number;
}

interface CIStatus {
  configured: boolean;
  repo: string;
  workflow: string;
  latest_run?: CIWorkflowRun;
  recent_runs: CIWorkflowRun[];
}

interface CITriggerResult {
  success: boolean;
  message: string;
  run_id?: number;
}

/* ════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════ */

function fmt(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(s % 60)}s`;
}

function passRate(p: number, t: number): number {
  return t === 0 ? 0 : Math.round((p / t) * 100);
}

function statusIcon(status: string) {
  switch (status) {
    case "pass":
    case "passed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "fail":
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "skip":
    case "skipped":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case "timedOut":
      return <Clock className="h-4 w-4 text-orange-500" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

function statusBadge(status: string) {
  const variant =
    status === "pass" || status === "passed"
      ? "default"
      : status === "fail" || status === "failed"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant}>{status.toUpperCase()}</Badge>;
}

function typeBadge(type: string) {
  const colors: Record<string, string> = {
    smoke: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    e2e: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    integration:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    full: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    ci: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[type] || ""}`}
    >
      {type.toUpperCase()}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════
   Page Component
   ════════════════════════════════════════════════════════════ */

export default function TestingDashboardPage() {
  // State
  const [smokeReport, setSmokeReport] = useState<SmokeReport | null>(null);
  const [e2eReport, setE2EReport] = useState<E2EReport | null>(null);
  const [integrationReport, setIntegrationReport] =
    useState<IntegrationReport | null>(null);
  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null);
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [loadingSmoke, setLoadingSmoke] = useState(false);
  const [loadingE2E, setLoadingE2E] = useState(false);
  const [loadingIntegration, setLoadingIntegration] = useState(false);
  const [ciStatus, setCIStatus] = useState<CIStatus | null>(null);
  const [ciRuns, setCIRuns] = useState<CIWorkflowRun[]>([]);
  const [ciRunDetail, setCIRunDetail] = useState<CIWorkflowRun | null>(null);
  const [loadingCI, setLoadingCI] = useState(false);
  const [loadingCITrigger, setLoadingCITrigger] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetchers ───────────────────────────────────────────

  const fetchGitInfo = useCallback(async () => {
    try {
      const { data } = await testingApi.getGitInfo();
      setGitInfo(data);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchRuntimeInfo = useCallback(async () => {
    try {
      const { data } = await testingApi.getRuntimeInfo();
      setRuntimeInfo(data);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const { data } = await testingApi.getTestHistory();
      setHistory(data);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchExistingReports = useCallback(async () => {
    try {
      const [e2eRes, intRes] = await Promise.allSettled([
        testingApi.getLatestE2EReport(),
        testingApi.getLatestIntegrationReport(),
      ]);
      if (e2eRes.status === "fulfilled" && e2eRes.value.data) {
        setE2EReport(e2eRes.value.data);
      }
      if (intRes.status === "fulfilled" && intRes.value.data) {
        setIntegrationReport(intRes.value.data);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchCIStatus = useCallback(async () => {
    try {
      const { data } = await testingApi.getCIStatus();
      setCIStatus(data);
      if (data.recent_runs) setCIRuns(data.recent_runs);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchCIRuns = useCallback(async () => {
    setLoadingCI(true);
    try {
      const { data } = await testingApi.getCIRuns(15);
      setCIRuns(data);
    } catch {
      /* ignore */
    } finally {
      setLoadingCI(false);
    }
  }, []);

  const viewCIRunDetail = useCallback(async (runId: number) => {
    try {
      const { data } = await testingApi.getCIRunDetail(runId);
      setCIRunDetail(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load run details",
      );
    }
  }, []);

  const triggerCI = useCallback(
    async (branch?: string) => {
      setLoadingCITrigger(true);
      setError(null);
      try {
        const { data } = await testingApi.triggerCI(branch);
        if (data.success) {
          // Wait a moment, then refresh runs
          setTimeout(() => fetchCIRuns(), 3000);
        } else {
          setError(data.message);
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to trigger CI",
        );
      } finally {
        setLoadingCITrigger(false);
      }
    },
    [fetchCIRuns],
  );

  const rerunCI = useCallback(
    async (runId: number) => {
      try {
        await testingApi.rerunCI(runId);
        setTimeout(() => fetchCIRuns(), 3000);
      } catch (err: any) {
        setError(
          err?.response?.data?.message || err?.message || "Failed to re-run",
        );
      }
    },
    [fetchCIRuns],
  );

  const cancelCI = useCallback(
    async (runId: number) => {
      try {
        await testingApi.cancelCI(runId);
        setTimeout(() => fetchCIRuns(), 2000);
      } catch (err: any) {
        setError(
          err?.response?.data?.message || err?.message || "Failed to cancel",
        );
      }
    },
    [fetchCIRuns],
  );

  // ── Runners ────────────────────────────────────────────

  const runSmoke = useCallback(async () => {
    setLoadingSmoke(true);
    setError(null);
    try {
      const { data } = await testingApi.runSmokeTests();
      setSmokeReport(data);
      fetchHistory();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Smoke test failed — is the API server running?",
      );
    } finally {
      setLoadingSmoke(false);
    }
  }, [fetchHistory]);

  const runE2E = useCallback(async () => {
    setLoadingE2E(true);
    setError(null);
    try {
      const { data } = await testingApi.runE2ETests();
      setE2EReport(data);
      fetchHistory();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "E2E test failed",
      );
    } finally {
      setLoadingE2E(false);
    }
  }, [fetchHistory]);

  const runIntegration = useCallback(async () => {
    setLoadingIntegration(true);
    setError(null);
    try {
      const { data } = await testingApi.runIntegrationTests();
      setIntegrationReport(data);
      fetchHistory();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Integration test failed",
      );
    } finally {
      setLoadingIntegration(false);
    }
  }, [fetchHistory]);

  const clearHistory = useCallback(async () => {
    try {
      await testingApi.clearTestHistory();
      setHistory([]);
    } catch {
      /* ignore */
    }
  }, []);

  // ── Boot ───────────────────────────────────────────────

  useEffect(() => {
    fetchGitInfo();
    fetchRuntimeInfo();
    fetchHistory();
    fetchExistingReports();
    fetchCIStatus();
  }, [
    fetchGitInfo,
    fetchRuntimeInfo,
    fetchHistory,
    fetchExistingReports,
    fetchCIStatus,
  ]);

  // ── Aggregate stats ────────────────────────────────────

  const totalPassed =
    (smokeReport?.passed || 0) +
    (e2eReport?.passed || 0) +
    (integrationReport?.passed || 0);
  const totalFailed =
    (smokeReport?.failed || 0) +
    (e2eReport?.failed || 0) +
    (integrationReport?.failed || 0);
  const totalSkipped = (smokeReport?.skipped || 0) + (e2eReport?.skipped || 0);
  const totalAll = totalPassed + totalFailed + totalSkipped;
  const overallRate = passRate(totalPassed, totalAll);

  return (
    <AdminGuard>
      <DashboardLayout>
        <TooltipProvider>
          <div className="space-y-6">
            {/* ── Header ─────────────────────────────────── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold">
                  <FlaskConical className="h-6 w-6" /> Testing Dashboard
                </h1>
                <p className="text-muted-foreground">
                  Run and monitor tests against your production servers
                  (api.orivraa.com).
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={runSmoke} disabled={loadingSmoke} size="sm">
                  {loadingSmoke ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  Smoke
                </Button>
                <Button
                  onClick={runE2E}
                  disabled={loadingE2E}
                  size="sm"
                  variant="outline"
                >
                  {loadingE2E ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="mr-2 h-4 w-4" />
                  )}
                  E2E Browser
                </Button>
                <Button
                  onClick={runIntegration}
                  disabled={loadingIntegration}
                  size="sm"
                  variant="outline"
                >
                  {loadingIntegration ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube2 className="mr-2 h-4 w-4" />
                  )}
                  Integration
                </Button>
                <Button
                  onClick={() => triggerCI()}
                  disabled={loadingCITrigger}
                  size="sm"
                  variant="outline"
                  className="border-cyan-300 text-cyan-700 hover:bg-cyan-50 dark:border-cyan-700 dark:text-cyan-300 dark:hover:bg-cyan-950"
                >
                  {loadingCITrigger ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Rocket className="mr-2 h-4 w-4" />
                  )}
                  Run CI
                </Button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-6 px-2"
                  onClick={() => setError(null)}
                >
                  Dismiss
                </Button>
              </div>
            )}

            {/* ── Overview Cards ─────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-4">
              {/* Aggregate */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Activity className="h-4 w-4" /> Overall
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {totalAll > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">
                          {overallRate}%
                        </span>
                        <span className="text-sm text-muted-foreground">
                          pass rate
                        </span>
                      </div>
                      <Progress value={overallRate} className="h-2" />
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className="text-green-600">
                          {totalPassed} passed
                        </span>
                        <span className="text-red-600">
                          {totalFailed} failed
                        </span>
                        {totalSkipped > 0 && (
                          <span className="text-yellow-600">
                            {totalSkipped} skipped
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Run tests to see results
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Git */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <GitBranch className="h-4 w-4" /> Git
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {gitInfo ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          {gitInfo.branch}
                        </Badge>
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {gitInfo.commit} &middot; {gitInfo.author}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {gitInfo.message}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  )}
                </CardContent>
              </Card>

              {/* Runtime */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Server className="h-4 w-4" /> Runtime
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {runtimeInfo ? (
                    <div className="space-y-1 text-sm">
                      <div>Node {runtimeInfo.nodeVersion}</div>
                      <div className="text-muted-foreground">
                        Up {formatUptime(runtimeInfo.uptime)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Heap: {formatBytes(runtimeInfo.memoryUsage.heapUsed)} /{" "}
                        {formatBytes(runtimeInfo.memoryUsage.heapTotal)}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <History className="h-4 w-4" /> Runs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <div className="text-3xl font-bold">{history.length}</div>
                    <p className="text-xs text-muted-foreground">
                      test runs this session
                    </p>
                    {history.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Last:{" "}
                        {new Date(history[0]?.timestamp).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Tabs ───────────────────────────────────── */}
            <Tabs defaultValue="smoke" className="space-y-4">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="smoke" className="gap-1">
                  <Zap className="h-3.5 w-3.5" /> Smoke
                </TabsTrigger>
                <TabsTrigger value="e2e" className="gap-1">
                  <Globe className="h-3.5 w-3.5" /> E2E
                </TabsTrigger>
                <TabsTrigger value="integration" className="gap-1">
                  <TestTube2 className="h-3.5 w-3.5" /> Integration
                </TabsTrigger>
                <TabsTrigger value="ci" className="gap-1">
                  <Rocket className="h-3.5 w-3.5" /> CI/CD
                  {ciStatus?.latest_run?.status === "in_progress" && (
                    <span className="ml-1 h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-1">
                  <History className="h-3.5 w-3.5" /> History
                </TabsTrigger>
                <TabsTrigger value="system" className="gap-1">
                  <Monitor className="h-3.5 w-3.5" /> System
                </TabsTrigger>
              </TabsList>

              {/* ════ SMOKE TAB ════ */}
              <TabsContent value="smoke">
                <div className="grid gap-4 lg:grid-cols-3">
                  {/* Left: results */}
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                          <CardTitle>Smoke Test Results</CardTitle>
                          <CardDescription>
                            {smokeReport
                              ? `${smokeReport.totalTests} tests in ${fmt(smokeReport.duration)} — ${smokeReport.environment} — ${new Date(smokeReport.timestamp).toLocaleString()}`
                              : "Tests against your production API at api.orivraa.com."}
                          </CardDescription>
                        </div>
                        <Button
                          size="sm"
                          onClick={runSmoke}
                          disabled={loadingSmoke}
                        >
                          {loadingSmoke ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {smokeReport ? (
                          <ScrollArea className="h-[400px]">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-8"></TableHead>
                                  <TableHead>Test</TableHead>
                                  <TableHead>Category</TableHead>
                                  <TableHead className="text-right">
                                    Duration
                                  </TableHead>
                                  <TableHead>Expected</TableHead>
                                  <TableHead>Actual</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {smokeReport.results.map((r, i) => (
                                  <TableRow
                                    key={i}
                                    className={
                                      r.status === "fail"
                                        ? "bg-red-50/50 dark:bg-red-950/20"
                                        : ""
                                    }
                                  >
                                    <TableCell>
                                      {statusIcon(r.status)}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      {r.name}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {r.category}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs">
                                      {fmt(r.duration)}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                      {r.expected || "—"}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                      {r.actual || r.message || "—"}
                                    </TableCell>
                                    <TableCell>
                                      {statusBadge(r.status)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Zap className="mb-3 h-12 w-12 opacity-20" />
                            <p className="text-sm font-medium">
                              No smoke test results yet
                            </p>
                            <p className="mt-1 text-xs">
                              Click Run to test your production API.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right: category breakdown */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          Category Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {smokeReport?.categories.length ? (
                          <div className="space-y-3">
                            {smokeReport.categories.map((cat) => (
                              <div key={cat.name}>
                                <div className="mb-1 flex items-center justify-between text-sm">
                                  <span className="capitalize">{cat.name}</span>
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {cat.passed}/{cat.total}
                                  </span>
                                </div>
                                <Progress
                                  value={passRate(cat.passed, cat.total)}
                                  className="h-1.5"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Run smoke tests to see categories
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          How Smoke Tests Work
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground space-y-2">
                        <p>
                          Smoke tests make HTTP calls to your{" "}
                          <strong>production API</strong> at api.orivraa.com.
                        </p>
                        <p>
                          They check: health endpoints, auth guards, public
                          routes, error handling, and response times.
                        </p>
                        <p className="font-medium text-foreground">
                          These run against production by default. Set{" "}
                          <code className="rounded bg-muted px-1">
                            SMOKE_TEST_URL
                          </code>{" "}
                          env var to test locally.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* ════ E2E BROWSER TAB ════ */}
              <TabsContent value="e2e">
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                          <CardTitle>E2E Browser Test Results</CardTitle>
                          <CardDescription>
                            {e2eReport
                              ? `${e2eReport.totalTests} tests on ${e2eReport.browser} in ${fmt(e2eReport.duration)} — ${new Date(e2eReport.timestamp).toLocaleString()}`
                              : "Playwright runs a real browser against www.orivraa.com."}
                          </CardDescription>
                        </div>
                        <Button
                          size="sm"
                          onClick={runE2E}
                          disabled={loadingE2E}
                        >
                          {loadingE2E ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {e2eReport && e2eReport.suites.length > 0 ? (
                          <ScrollArea className="h-[400px]">
                            <div className="space-y-4">
                              {e2eReport.suites.map((suite, si) => (
                                <div key={si}>
                                  <div className="mb-2 flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-purple-500" />
                                    <span className="text-sm font-semibold">
                                      {suite.name || suite.file}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {fmt(suite.duration)}
                                    </Badge>
                                  </div>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-8"></TableHead>
                                        <TableHead>Test Name</TableHead>
                                        <TableHead className="text-right">
                                          Duration
                                        </TableHead>
                                        <TableHead>Retries</TableHead>
                                        <TableHead>Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {suite.tests.map((t, ti) => (
                                        <TableRow
                                          key={ti}
                                          className={
                                            t.status === "failed"
                                              ? "bg-red-50/50 dark:bg-red-950/20"
                                              : ""
                                          }
                                        >
                                          <TableCell>
                                            {statusIcon(t.status)}
                                          </TableCell>
                                          <TableCell>
                                            <div>
                                              <span className="text-sm font-medium">
                                                {t.name}
                                              </span>
                                              {t.error && (
                                                <p className="mt-1 max-w-md truncate text-xs text-red-600">
                                                  {t.error}
                                                </p>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-xs">
                                            {fmt(t.duration)}
                                          </TableCell>
                                          <TableCell className="font-mono text-xs">
                                            {t.retries}
                                          </TableCell>
                                          <TableCell>
                                            {statusBadge(t.status)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                  {si < e2eReport.suites.length - 1 && (
                                    <Separator className="mt-4" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Globe className="mb-3 h-12 w-12 opacity-20" />
                            <p className="text-sm font-medium">
                              No E2E results yet
                            </p>
                            <p className="mt-1 text-xs">
                              Click Run to launch Playwright browser tests, or
                              run them via terminal.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right: E2E info */}
                  <div className="space-y-4">
                    {e2eReport && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">
                            E2E Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold">
                              {passRate(e2eReport.passed, e2eReport.totalTests)}
                              %
                            </span>
                            <span className="text-sm text-muted-foreground">
                              pass rate
                            </span>
                          </div>
                          <Progress
                            value={passRate(
                              e2eReport.passed,
                              e2eReport.totalTests,
                            )}
                            className="h-2"
                          />
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="rounded bg-green-50 p-2 dark:bg-green-950">
                              <div className="text-lg font-bold text-green-700 dark:text-green-400">
                                {e2eReport.passed}
                              </div>
                              Passed
                            </div>
                            <div className="rounded bg-red-50 p-2 dark:bg-red-950">
                              <div className="text-lg font-bold text-red-700 dark:text-red-400">
                                {e2eReport.failed}
                              </div>
                              Failed
                            </div>
                            <div className="rounded bg-yellow-50 p-2 dark:bg-yellow-950">
                              <div className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
                                {e2eReport.skipped}
                              </div>
                              Skipped
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          How E2E Tests Work
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground space-y-2">
                        <p>
                          <strong>Playwright</strong> launches a real browser
                          (Chromium, Firefox, or Mobile Chrome) and visits your
                          pages.
                        </p>
                        <p>
                          It tests: page loads, login forms, navigation, search,
                          visual regressions, and performance.
                        </p>
                        <Separator className="my-2" />
                        <p className="font-medium text-foreground">
                          Run from terminal:
                        </p>
                        <code className="block rounded bg-muted p-2 text-xs">
                          pnpm e2e
                        </code>
                        <p className="font-medium text-foreground">
                          Interactive UI mode:
                        </p>
                        <code className="block rounded bg-muted p-2 text-xs">
                          pnpm e2e:ui
                        </code>
                        <p className="font-medium text-foreground">
                          Watch with headed browser:
                        </p>
                        <code className="block rounded bg-muted p-2 text-xs">
                          pnpm e2e:headed
                        </code>
                        <Separator className="my-2" />
                        <p>
                          Playwright generates an <strong>HTML report</strong>{" "}
                          at{" "}
                          <code className="rounded bg-muted px-1">
                            playwright-report/
                          </code>
                          .
                        </p>
                        <p>
                          Open it:{" "}
                          <code className="rounded bg-muted px-1">
                            cd e2e && npx playwright show-report
                          </code>
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* ════ INTEGRATION TAB ════ */}
              <TabsContent value="integration">
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                          <CardTitle>API Integration Test Results</CardTitle>
                          <CardDescription>
                            {integrationReport
                              ? `${integrationReport.totalTests} tests in ${fmt(integrationReport.duration)} — ${new Date(integrationReport.timestamp).toLocaleString()}`
                              : "Jest + Supertest tests against the NestJS app module."}
                          </CardDescription>
                        </div>
                        <Button
                          size="sm"
                          onClick={runIntegration}
                          disabled={loadingIntegration}
                        >
                          {loadingIntegration ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {integrationReport &&
                        integrationReport.suites.length > 0 ? (
                          <ScrollArea className="h-[400px]">
                            <div className="space-y-4">
                              {integrationReport.suites.map((suite, si) => (
                                <div key={si}>
                                  <div className="mb-2 flex items-center gap-2">
                                    <TestTube2 className="h-4 w-4 text-orange-500" />
                                    <span className="text-sm font-semibold">
                                      {suite.name.split("/").pop()}
                                    </span>
                                  </div>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-8"></TableHead>
                                        <TableHead>Test</TableHead>
                                        <TableHead className="text-right">
                                          Duration
                                        </TableHead>
                                        <TableHead>Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {suite.tests.map((t, ti) => (
                                        <TableRow
                                          key={ti}
                                          className={
                                            t.status === "failed"
                                              ? "bg-red-50/50 dark:bg-red-950/20"
                                              : ""
                                          }
                                        >
                                          <TableCell>
                                            {statusIcon(t.status)}
                                          </TableCell>
                                          <TableCell>
                                            <div>
                                              <span className="text-sm">
                                                {t.name}
                                              </span>
                                              {t.error && (
                                                <pre className="mt-1 max-w-md overflow-hidden truncate text-xs text-red-600">
                                                  {t.error.slice(0, 200)}
                                                </pre>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-xs">
                                            {fmt(t.duration)}
                                          </TableCell>
                                          <TableCell>
                                            {statusBadge(t.status)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                  {si < integrationReport.suites.length - 1 && (
                                    <Separator className="mt-4" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <TestTube2 className="mb-3 h-12 w-12 opacity-20" />
                            <p className="text-sm font-medium">
                              No integration test results yet
                            </p>
                            <p className="mt-1 text-xs">
                              Click Run to execute Jest API tests.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    {integrationReport && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">
                            Integration Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold">
                              {passRate(
                                integrationReport.passed,
                                integrationReport.totalTests,
                              )}
                              %
                            </span>
                            <span className="text-sm text-muted-foreground">
                              pass rate
                            </span>
                          </div>
                          <Progress
                            value={passRate(
                              integrationReport.passed,
                              integrationReport.totalTests,
                            )}
                            className="h-2"
                          />
                          <div className="grid grid-cols-2 gap-2 text-center text-xs">
                            <div className="rounded bg-green-50 p-2 dark:bg-green-950">
                              <div className="text-lg font-bold text-green-700 dark:text-green-400">
                                {integrationReport.passed}
                              </div>
                              Passed
                            </div>
                            <div className="rounded bg-red-50 p-2 dark:bg-red-950">
                              <div className="text-lg font-bold text-red-700 dark:text-red-400">
                                {integrationReport.failed}
                              </div>
                              Failed
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          How Integration Tests Work
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground space-y-2">
                        <p>
                          <strong>Jest + Supertest</strong> boot your full
                          NestJS app in-memory and send real HTTP requests.
                        </p>
                        <p>
                          Tests: health, metrics, auth validation, protected
                          route guards, 404 handling.
                        </p>
                        <Separator className="my-2" />
                        <p className="font-medium text-foreground">
                          Run from terminal:
                        </p>
                        <code className="block rounded bg-muted p-2 text-xs">
                          pnpm test:api:e2e
                        </code>
                        <p>
                          Requires a running database. Uses the same DB as your
                          local dev environment.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* ════ CI/CD TAB ════ */}
              <TabsContent value="ci">
                <div className="grid gap-4 lg:grid-cols-3">
                  {/* Left: CI Runs */}
                  <div className="lg:col-span-2 space-y-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Rocket className="h-5 w-5 text-cyan-500" />
                            GitHub Actions CI
                          </CardTitle>
                          <CardDescription>
                            {ciStatus?.configured
                              ? `Workflow: ${ciStatus.workflow} · Repo: ${ciStatus.repo}`
                              : "GitHub token not configured — add GITHUB_TOKEN env var to enable CI integration."}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={fetchCIRuns}
                            disabled={loadingCI}
                          >
                            {loadingCI ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => triggerCI()}
                            disabled={loadingCITrigger || !ciStatus?.configured}
                          >
                            {loadingCITrigger ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="mr-2 h-4 w-4" />
                            )}
                            Trigger Run
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {ciRuns.length > 0 ? (
                          <ScrollArea className="h-[480px]">
                            <div className="space-y-2">
                              {ciRuns.map((run) => (
                                <div
                                  key={run.id}
                                  className={`rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                                    ciRunDetail?.id === run.id
                                      ? "border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20"
                                      : ""
                                  }`}
                                  onClick={() => viewCIRunDetail(run.id)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {run.status === "completed" ? (
                                        run.conclusion === "success" ? (
                                          <CheckCircle className="h-5 w-5 text-green-500" />
                                        ) : run.conclusion === "cancelled" ? (
                                          <Ban className="h-5 w-5 text-gray-400" />
                                        ) : (
                                          <XCircle className="h-5 w-5 text-red-500" />
                                        )
                                      ) : run.status === "in_progress" ? (
                                        <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
                                      ) : (
                                        <Clock className="h-5 w-5 text-gray-400" />
                                      )}
                                      <div>
                                        <span className="text-sm font-medium">
                                          Run #{run.run_number}
                                        </span>
                                        <span className="mx-2 text-xs text-muted-foreground">
                                          {run.event === "workflow_dispatch"
                                            ? "manual"
                                            : run.event === "schedule"
                                              ? "scheduled"
                                              : run.event}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {run.status === "in_progress" && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            cancelCI(run.id);
                                          }}
                                        >
                                          <Ban className="mr-1 h-3 w-3" />{" "}
                                          Cancel
                                        </Button>
                                      )}
                                      {run.status === "completed" &&
                                        run.conclusion === "failure" && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2 text-xs"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              rerunCI(run.id);
                                            }}
                                          >
                                            <RotateCcw className="mr-1 h-3 w-3" />{" "}
                                            Re-run
                                          </Button>
                                        )}
                                      <a
                                        href={run.html_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground hover:text-foreground"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    </div>
                                  </div>
                                  <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <GitBranch className="h-3 w-3" />
                                      {run.branch}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <GitCommit className="h-3 w-3" />
                                      {run.commit_sha}
                                    </span>
                                    <span>{run.actor}</span>
                                    {run.duration && (
                                      <span>{fmt(run.duration)}</span>
                                    )}
                                    <span>
                                      {new Date(
                                        run.created_at,
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {run.commit_message}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        ) : ciStatus?.configured ? (
                          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Rocket className="mb-3 h-12 w-12 opacity-20" />
                            <p className="text-sm font-medium">
                              No CI runs found
                            </p>
                            <p className="mt-1 text-xs">
                              Click &quot;Trigger Run&quot; to start a CI
                              workflow.
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <AlertTriangle className="mb-3 h-12 w-12 text-yellow-500 opacity-40" />
                            <p className="text-sm font-medium">
                              CI not configured
                            </p>
                            <p className="mt-1 max-w-xs text-center text-xs">
                              Add{" "}
                              <code className="rounded bg-muted px-1">
                                GITHUB_TOKEN
                              </code>{" "}
                              env var to your Railway deployment with{" "}
                              <code className="rounded bg-muted px-1">
                                actions:read
                              </code>{" "}
                              and{" "}
                              <code className="rounded bg-muted px-1">
                                actions:write
                              </code>{" "}
                              scopes.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right: Run detail + info */}
                  <div className="space-y-4">
                    {ciRunDetail && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between text-sm font-medium">
                            <span>Run #{ciRunDetail.run_number} Jobs</span>
                            <Badge
                              variant={
                                ciRunDetail.conclusion === "success"
                                  ? "default"
                                  : ciRunDetail.conclusion === "failure"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {ciRunDetail.conclusion?.toUpperCase() ||
                                ciRunDetail.status.toUpperCase()}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[300px]">
                            <div className="space-y-3">
                              {ciRunDetail.jobs.map((job) => (
                                <div
                                  key={job.id}
                                  className="rounded border p-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {job.conclusion === "success" ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      ) : job.conclusion === "failure" ? (
                                        <XCircle className="h-4 w-4 text-red-500" />
                                      ) : job.status === "in_progress" ? (
                                        <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
                                      ) : job.conclusion === "skipped" ? (
                                        <AlertTriangle className="h-4 w-4 text-gray-400" />
                                      ) : (
                                        <Clock className="h-4 w-4 text-gray-400" />
                                      )}
                                      <span className="text-sm font-medium">
                                        {job.name}
                                      </span>
                                    </div>
                                    <a
                                      href={job.html_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </div>
                                  {job.steps.length > 0 && (
                                    <div className="mt-2 space-y-1 pl-6">
                                      {job.steps.map((step) => (
                                        <div
                                          key={step.number}
                                          className="flex items-center justify-between text-xs"
                                        >
                                          <div className="flex items-center gap-1.5">
                                            {step.conclusion === "success" ? (
                                              <CheckCircle className="h-3 w-3 text-green-500" />
                                            ) : step.conclusion ===
                                              "failure" ? (
                                              <XCircle className="h-3 w-3 text-red-500" />
                                            ) : step.conclusion ===
                                              "skipped" ? (
                                              <AlertTriangle className="h-3 w-3 text-gray-400" />
                                            ) : step.status ===
                                              "in_progress" ? (
                                              <Loader2 className="h-3 w-3 text-yellow-500 animate-spin" />
                                            ) : (
                                              <Clock className="h-3 w-3 text-gray-400" />
                                            )}
                                            <span className="text-muted-foreground">
                                              {step.name}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          CI/CD Overview
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground space-y-2">
                        <p>
                          <strong>GitHub Actions</strong> runs your full test
                          suite (smoke tests, Playwright E2E, and integration
                          tests) in the cloud.
                        </p>
                        <Separator className="my-2" />
                        <p className="font-medium text-foreground">Triggers:</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>Every push to master/develop</li>
                          <li>Pull requests</li>
                          <li>Daily at 6:00 UTC (health monitoring)</li>
                          <li>Manual from this dashboard</li>
                        </ul>
                        <Separator className="my-2" />
                        <a
                          href="/dashboard/admin/testing/github-token-guide"
                          className="inline-flex items-center gap-1 text-cyan-600 underline hover:text-cyan-700 font-medium"
                        >
                          📖 Token setup guide →
                        </a>
                      </CardContent>
                    </Card>

                    {/* GitHub Token Expiry Tracker */}
                    <GitHubTokenManager />
                  </div>
                </div>
              </TabsContent>

              {/* ════ HISTORY TAB ════ */}
              <TabsContent value="history">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle>Test Run History</CardTitle>
                      <CardDescription>
                        {history.length} runs recorded this session
                      </CardDescription>
                    </div>
                    {history.length > 0 && (
                      <Button size="sm" variant="ghost" onClick={clearHistory}>
                        <Trash2 className="mr-2 h-4 w-4" /> Clear
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {history.length > 0 ? (
                      <ScrollArea className="h-[500px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead>Branch</TableHead>
                              <TableHead>Commit</TableHead>
                              <TableHead className="text-right">
                                Duration
                              </TableHead>
                              <TableHead className="text-center">
                                Passed
                              </TableHead>
                              <TableHead className="text-center">
                                Failed
                              </TableHead>
                              <TableHead className="text-center">
                                Total
                              </TableHead>
                              <TableHead>Rate</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {history.map((h) => {
                              const rate = passRate(h.passed, h.total);
                              return (
                                <TableRow key={h.id}>
                                  <TableCell>{typeBadge(h.type)}</TableCell>
                                  <TableCell className="text-xs">
                                    {new Date(h.timestamp).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {h.branch}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {h.commit}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-xs">
                                    {fmt(h.duration)}
                                  </TableCell>
                                  <TableCell className="text-center text-green-600">
                                    {h.passed}
                                  </TableCell>
                                  <TableCell className="text-center text-red-600">
                                    {h.failed}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {h.total}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Progress
                                        value={rate}
                                        className="h-1.5 w-16"
                                      />
                                      <span className="text-xs font-medium">
                                        {rate}%
                                      </span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <History className="mb-3 h-12 w-12 opacity-20" />
                        <p className="text-sm font-medium">
                          No test runs recorded yet
                        </p>
                        <p className="mt-1 text-xs">
                          Run any test type to start building history.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ════ SYSTEM TAB ════ */}
              <TabsContent value="system">
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Runtime details */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle>Runtime Diagnostics</CardTitle>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={fetchRuntimeInfo}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {runtimeInfo ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Stat
                            label="Node Version"
                            value={runtimeInfo.nodeVersion}
                          />
                          <Stat
                            label="Platform"
                            value={`${runtimeInfo.platform} / ${runtimeInfo.arch}`}
                          />
                          <Stat label="Environment" value={runtimeInfo.env} />
                          <Stat label="PID" value={String(runtimeInfo.pid)} />
                          <Stat
                            label="Uptime"
                            value={formatUptime(runtimeInfo.uptime)}
                          />
                          <Stat
                            label="RSS Memory"
                            value={formatBytes(runtimeInfo.memoryUsage.rss)}
                          />
                          <Stat
                            label="Heap Used"
                            value={formatBytes(
                              runtimeInfo.memoryUsage.heapUsed,
                            )}
                          />
                          <Stat
                            label="Heap Total"
                            value={formatBytes(
                              runtimeInfo.memoryUsage.heapTotal,
                            )}
                          />
                          <Stat
                            label="External Memory"
                            value={formatBytes(
                              runtimeInfo.memoryUsage.external,
                            )}
                          />
                          <Stat
                            label="Working Directory"
                            value={runtimeInfo.cwd}
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Loading…
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Automation guide */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Automation & CI/CD</CardTitle>
                      <CardDescription>
                        How to automate all tests
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-4">
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground flex items-center gap-1">
                          <ChevronRight className="h-3 w-3" /> GitHub Actions
                          (CI)
                        </h4>
                        <p className="text-xs">
                          A workflow at{" "}
                          <code className="rounded bg-muted px-1">
                            .github/workflows/test.yml
                          </code>{" "}
                          runs all tests on every push & PR automatically.
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground flex items-center gap-1">
                          <ChevronRight className="h-3 w-3" /> One-command full
                          suite
                        </h4>
                        <code className="block rounded bg-muted p-2 text-xs">
                          pnpm test:all
                        </code>
                        <p className="mt-1 text-xs">
                          Runs unit tests + smoke tests sequentially.
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground flex items-center gap-1">
                          <ChevronRight className="h-3 w-3" /> Pre-commit hooks
                        </h4>
                        <p className="text-xs">
                          Husky runs{" "}
                          <code className="rounded bg-muted px-1">
                            lint-staged
                          </code>{" "}
                          on every commit to lint/format changed files
                          automatically.
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="mb-2 font-semibold text-foreground">
                          Available Scripts
                        </h4>
                        <div className="space-y-1.5 text-xs">
                          <CmdRow
                            cmd="pnpm smoke-test"
                            desc="Basic smoke test"
                          />
                          <CmdRow
                            cmd="pnpm smoke-test:full"
                            desc="Enhanced smoke suite"
                          />
                          <CmdRow cmd="pnpm e2e" desc="Playwright headless" />
                          <CmdRow
                            cmd="pnpm e2e:ui"
                            desc="Playwright interactive UI"
                          />
                          <CmdRow
                            cmd="pnpm e2e:headed"
                            desc="Playwright with visible browser"
                          />
                          <CmdRow cmd="pnpm test:api" desc="Jest unit tests" />
                          <CmdRow
                            cmd="pnpm test:api:e2e"
                            desc="Jest integration tests"
                          />
                          <CmdRow
                            cmd="pnpm test:all"
                            desc="All tests together"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </TooltipProvider>
      </DashboardLayout>
    </AdminGuard>
  );
}

/* ════════════════════════════════════════════════════════════
   Sub-components
   ════════════════════════════════════════════════════════════ */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-medium truncate">{value}</p>
    </div>
  );
}

function CmdRow({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <div className="flex items-center justify-between rounded bg-muted/50 px-2 py-1">
      <code className="font-mono">{cmd}</code>
      <span className="text-muted-foreground">{desc}</span>
    </div>
  );
}
