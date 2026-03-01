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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { testingApi } from "@/lib/api";
import {
  Activity,
  CheckCircle,
  FlaskConical,
  GitBranch,
  Loader2,
  Play,
  Server,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/* ── Types ──────────────────────────────────────────────── */

interface SmokeResult {
  name: string;
  status: "pass" | "fail" | "skip";
  duration: number;
  message?: string;
}

interface SmokeReport {
  timestamp: string;
  environment: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: SmokeResult[];
}

interface GitInfo {
  branch: string;
  commit: string;
  message: string;
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
}

/* ── Helper ─────────────────────────────────────────────── */

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

/* ── Page Component ─────────────────────────────────────── */

export default function TestingDashboardPage() {
  const [smokeReport, setSmokeReport] = useState<SmokeReport | null>(null);
  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null);
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null);
  const [loading, setLoading] = useState(false);

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

  const runSmoke = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await testingApi.runSmokeTests();
      setSmokeReport(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGitInfo();
    fetchRuntimeInfo();
  }, [fetchGitInfo, fetchRuntimeInfo]);

  const passRate = smokeReport
    ? Math.round((smokeReport.passed / smokeReport.totalTests) * 100)
    : 0;

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                <FlaskConical className="h-6 w-6" />
                Testing Dashboard
              </h1>
              <p className="text-muted-foreground">
                Run smoke tests, view git info, and inspect runtime diagnostics.
              </p>
            </div>
            <Button onClick={runSmoke} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Run Smoke Tests
            </Button>
          </div>

          {/* Top cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Git Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <GitBranch className="h-4 w-4" /> Git
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gitInfo ? (
                  <div className="space-y-1 text-sm">
                    <div>
                      Branch: <Badge variant="outline">{gitInfo.branch}</Badge>
                    </div>
                    <div>
                      Commit:{" "}
                      <code className="rounded bg-muted px-1">{gitInfo.commit}</code>
                    </div>
                    <div className="truncate text-muted-foreground">
                      {gitInfo.message}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                )}
              </CardContent>
            </Card>

            {/* Runtime Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Server className="h-4 w-4" /> Runtime
                </CardTitle>
              </CardHeader>
              <CardContent>
                {runtimeInfo ? (
                  <div className="space-y-1 text-sm">
                    <div>Node: {runtimeInfo.nodeVersion}</div>
                    <div>
                      Uptime: {formatUptime(runtimeInfo.uptime)}
                    </div>
                    <div>
                      Heap:{" "}
                      {formatBytes(runtimeInfo.memoryUsage.heapUsed)} /{" "}
                      {formatBytes(runtimeInfo.memoryUsage.heapTotal)}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                )}
              </CardContent>
            </Card>

            {/* Smoke Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Activity className="h-4 w-4" /> Smoke Tests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {smokeReport ? (
                  <div className="space-y-2">
                    <div className="flex gap-2 text-sm">
                      <Badge variant="default">
                        {smokeReport.passed} passed
                      </Badge>
                      {smokeReport.failed > 0 && (
                        <Badge variant="destructive">
                          {smokeReport.failed} failed
                        </Badge>
                      )}
                    </div>
                    <Progress value={passRate} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {smokeReport.totalTests} tests in{" "}
                      {smokeReport.duration}ms
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Click &quot;Run Smoke Tests&quot; to start.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="results">
            <TabsList>
              <TabsTrigger value="results">Test Results</TabsTrigger>
              <TabsTrigger value="runtime">Runtime Details</TabsTrigger>
            </TabsList>

            {/* ── Results Tab ───────────────────────────── */}
            <TabsContent value="results">
              <Card>
                <CardHeader>
                  <CardTitle>Smoke-test Results</CardTitle>
                  <CardDescription>
                    {smokeReport
                      ? `Ran at ${new Date(smokeReport.timestamp).toLocaleString()}`
                      : "No results yet."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {smokeReport ? (
                    <div className="space-y-2">
                      {smokeReport.results.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded border px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            {r.status === "pass" ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm font-medium">{r.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {r.message && <span>{r.message}</span>}
                            <Badge variant="outline">{r.duration}ms</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Run tests to see results here.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Runtime Tab ───────────────────────────── */}
            <TabsContent value="runtime">
              <Card>
                <CardHeader>
                  <CardTitle>Runtime Diagnostics</CardTitle>
                  <CardDescription>
                    Live process information from the API server.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {runtimeInfo ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Stat label="Node Version" value={runtimeInfo.nodeVersion} />
                      <Stat label="Platform" value={`${runtimeInfo.platform} / ${runtimeInfo.arch}`} />
                      <Stat label="Environment" value={runtimeInfo.env} />
                      <Stat label="PID" value={String(runtimeInfo.pid)} />
                      <Stat label="Uptime" value={formatUptime(runtimeInfo.uptime)} />
                      <Stat
                        label="RSS Memory"
                        value={formatBytes(runtimeInfo.memoryUsage.rss)}
                      />
                      <Stat
                        label="Heap Used"
                        value={formatBytes(runtimeInfo.memoryUsage.heapUsed)}
                      />
                      <Stat
                        label="Heap Total"
                        value={formatBytes(runtimeInfo.memoryUsage.heapTotal)}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  )}
                  <Button
                    className="mt-4"
                    variant="outline"
                    size="sm"
                    onClick={fetchRuntimeInfo}
                  >
                    Refresh
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}

/* ── Stat component ─────────────────────────────────────── */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-medium">{value}</p>
    </div>
  );
}
