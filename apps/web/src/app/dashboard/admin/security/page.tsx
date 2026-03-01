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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { securityApi } from "@/lib/api";
import {
  Activity,
  AlertTriangle,
  Ban,
  Eye,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ─── Types ──────────────────────────────────────────────────
interface SecurityDashboard {
  summary: {
    totalEvents24h: number;
    criticalEvents24h: number;
    blockedIps: number;
    threatScore: number;
    topThreatType: string;
  };
  recentEvents: SecurityEvent[];
  blockedIps: BlockedIp[];
  threatsByType: Record<string, number>;
  threatsBySeverity: Record<string, number>;
  topAttackedRoutes: { route: string; count: number }[];
  topOffendingIps: { ip: string; score: number; events: number }[];
}

interface SecurityEvent {
  id: string;
  type: string;
  severity: string;
  ip: string;
  userId?: string;
  route: string;
  method: string;
  userAgent?: string;
  details?: Record<string, any>;
  blocked: boolean;
  createdAt: string;
}

interface BlockedIp {
  id: string;
  ip: string;
  reason: string;
  severity: string;
  autoBlock: boolean;
  expiresAt?: string;
  createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────
const severityColor = (s: string) => {
  switch (s) {
    case "CRITICAL":
      return "bg-red-600 text-white";
    case "HIGH":
      return "bg-orange-500 text-white";
    case "MEDIUM":
      return "bg-yellow-500 text-black";
    case "LOW":
      return "bg-blue-500 text-white";
    default:
      return "bg-gray-400 text-white";
  }
};

const threatTypeLabel = (t: string) =>
  t
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Auth /i, "🔐 ")
    .replace(/Input /i, "💉 ")
    .replace(/Api /i, "🔍 ")
    .replace(/Access /i, "🚫 ")
    .replace(/Enum /i, "📋 ")
    .replace(/Rate /i, "⏱️ ")
    .replace(/Price /i, "💰 ")
    .replace(/Suspicious /i, "🤖 ");

const timeAgo = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
};

// ─── Main Page ──────────────────────────────────────────────
export default function SecurityDashboardPage() {
  const [dashboard, setDashboard] = useState<SecurityDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockIp, setBlockIp] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockDuration, setBlockDuration] = useState("15");
  const [filterType, setFilterType] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterIp, setFilterIp] = useState("");
  const { toast } = useToast();

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await securityApi.getDashboard();
      setDashboard(res.data);
    } catch (err) {
      console.error("Failed to fetch security dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const handleBlock = async () => {
    if (!blockIp.trim())
      return toast({ title: "Enter an IP address", variant: "destructive" });
    try {
      await securityApi.blockIp({
        ip: blockIp.trim(),
        reason: blockReason || "Manual admin block",
        durationMinutes: parseInt(blockDuration) || undefined,
      });
      toast({ title: `Blocked ${blockIp}` });
      setBlockIp("");
      setBlockReason("");
      fetchDashboard();
    } catch (err) {
      toast({ title: "Failed to block IP", variant: "destructive" });
    }
  };

  const handleUnblock = async (ip: string) => {
    try {
      await securityApi.unblockIp(ip);
      toast({ title: `Unblocked ${ip}` });
      fetchDashboard();
    } catch (err) {
      toast({ title: "Failed to unblock IP", variant: "destructive" });
    }
  };

  // Filter events
  const filteredEvents = (dashboard?.recentEvents || []).filter((e) => {
    if (filterType && e.type !== filterType) return false;
    if (filterSeverity && e.severity !== filterSeverity) return false;
    if (filterIp && !e.ip.includes(filterIp)) return false;
    return true;
  });

  const d = dashboard;

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6 p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ShieldCheck className="h-7 w-7 text-emerald-600" />
                Security Shield
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time threat detection, auto-defense & IP monitoring
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboard}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {/* Status Banner */}
          {d && (
            <div
              className={`rounded-lg p-4 flex items-center gap-3 ${
                d.summary.criticalEvents24h > 0
                  ? "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
                  : d.summary.totalEvents24h > 10
                    ? "bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800"
                    : "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
              }`}
            >
              {d.summary.criticalEvents24h > 0 ? (
                <ShieldAlert className="h-5 w-5 text-red-600" />
              ) : d.summary.totalEvents24h > 10 ? (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              )}
              <span className="font-medium">
                {d.summary.criticalEvents24h > 0
                  ? `⚠️ ${d.summary.criticalEvents24h} critical threats detected in last 24h`
                  : d.summary.totalEvents24h > 10
                    ? `${d.summary.totalEvents24h} security events in last 24h — elevated activity`
                    : "All clear — no significant threats detected"}
              </span>
            </div>
          )}

          {/* Summary Cards */}
          {d && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                    <Activity className="h-3.5 w-3.5" /> Events (24h)
                  </div>
                  <div className="text-2xl font-bold">
                    {d.summary.totalEvents24h}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                    <XCircle className="h-3.5 w-3.5 text-red-500" /> Critical
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {d.summary.criticalEvents24h}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                    <Ban className="h-3.5 w-3.5 text-orange-500" /> Blocked IPs
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {d.summary.blockedIps}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                    <Shield className="h-3.5 w-3.5" /> Threat Score
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      d.summary.threatScore > 50
                        ? "text-red-600"
                        : d.summary.threatScore > 20
                          ? "text-yellow-600"
                          : "text-green-600"
                    }`}
                  >
                    {d.summary.threatScore}/100
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                    <Eye className="h-3.5 w-3.5" /> Top Threat
                  </div>
                  <div className="text-sm font-bold truncate">
                    {d.summary.topThreatType === "NONE"
                      ? "None"
                      : d.summary.topThreatType.replace(/_/g, " ")}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="events" className="space-y-4">
            <TabsList>
              <TabsTrigger value="events">Threat Feed</TabsTrigger>
              <TabsTrigger value="blocked">Blocked IPs</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            {/* ─── Threat Feed ────────────────────────────────── */}
            <TabsContent value="events" className="space-y-4">
              {/* Filters */}
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Filter by IP"
                        value={filterIp}
                        onChange={(e) => setFilterIp(e.target.value)}
                        className="w-36 h-8"
                      />
                    </div>
                    <select
                      className="h-8 rounded-md border px-2 text-sm bg-background"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <option value="">All Types</option>
                      {[
                        "AUTH_BRUTE_FORCE",
                        "ACCESS_FORBIDDEN",
                        "INPUT_INJECTION",
                        "ENUM_SCRAPING",
                        "API_FUZZING",
                        "RATE_EXCEEDED",
                        "PRICE_TAMPERING",
                        "SUSPICIOUS_AGENT",
                      ].map((t) => (
                        <option key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-8 rounded-md border px-2 text-sm bg-background"
                      value={filterSeverity}
                      onChange={(e) => setFilterSeverity(e.target.value)}
                    >
                      <option value="">All Severities</option>
                      {["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].map(
                        (s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ),
                      )}
                    </select>
                    <Badge variant="secondary" className="ml-auto">
                      {filteredEvents.length} events
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Event List */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Recent Security Events
                  </CardTitle>
                  <CardDescription>
                    Last 50 events, auto-refreshes every 30s
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredEvents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShieldCheck className="h-10 w-10 mx-auto mb-2 text-green-500" />
                      <p>No security events to display</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {filteredEvents.map((event) => (
                        <div
                          key={event.id}
                          className={`rounded-lg border p-3 flex items-start gap-3 ${
                            event.blocked
                              ? "bg-red-50/50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                              : ""
                          }`}
                        >
                          <Badge
                            className={`${severityColor(event.severity)} text-xs shrink-0 mt-0.5`}
                          >
                            {event.severity}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">
                                {threatTypeLabel(event.type)}
                              </span>
                              {event.blocked && (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px] h-4"
                                >
                                  BLOCKED
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                              <span>
                                IP:{" "}
                                <code className="text-foreground">
                                  {event.ip}
                                </code>
                              </span>
                              <span>
                                {event.method}{" "}
                                <code className="text-foreground">
                                  {event.route}
                                </code>
                              </span>
                              {event.userId && (
                                <span>
                                  User:{" "}
                                  <code>{event.userId.slice(0, 8)}...</code>
                                </span>
                              )}
                              <span>{timeAgo(event.createdAt)}</span>
                            </div>
                            {event.details &&
                              Object.keys(event.details).length > 0 && (
                                <div className="mt-1 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 font-mono">
                                  {JSON.stringify(event.details).slice(0, 200)}
                                </div>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Blocked IPs ────────────────────────────────── */}
            <TabsContent value="blocked" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Currently Blocked IPs ({d?.blockedIps.length || 0})
                  </CardTitle>
                  <CardDescription>
                    Auto-blocked by threat detection or manually by admin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!d?.blockedIps || d.blockedIps.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShieldCheck className="h-10 w-10 mx-auto mb-2 text-green-500" />
                      <p>No IPs are currently blocked</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="pb-2 pr-4">IP Address</th>
                            <th className="pb-2 pr-4">Reason</th>
                            <th className="pb-2 pr-4">Severity</th>
                            <th className="pb-2 pr-4">Type</th>
                            <th className="pb-2 pr-4">Expires</th>
                            <th className="pb-2 pr-4">Blocked At</th>
                            <th className="pb-2">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.blockedIps.map((b) => (
                            <tr
                              key={b.id}
                              className="border-b hover:bg-muted/50"
                            >
                              <td className="py-2 pr-4 font-mono font-medium">
                                {b.ip}
                              </td>
                              <td className="py-2 pr-4 max-w-[200px] truncate">
                                {b.reason}
                              </td>
                              <td className="py-2 pr-4">
                                <Badge
                                  className={`${severityColor(b.severity)} text-xs`}
                                >
                                  {b.severity}
                                </Badge>
                              </td>
                              <td className="py-2 pr-4">
                                <Badge
                                  variant={
                                    b.autoBlock ? "secondary" : "outline"
                                  }
                                  className="text-xs"
                                >
                                  {b.autoBlock ? "Auto" : "Manual"}
                                </Badge>
                              </td>
                              <td className="py-2 pr-4 text-xs text-muted-foreground">
                                {b.expiresAt
                                  ? new Date(b.expiresAt).toLocaleString()
                                  : "Never"}
                              </td>
                              <td className="py-2 pr-4 text-xs text-muted-foreground">
                                {timeAgo(b.createdAt)}
                              </td>
                              <td className="py-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-blue-600 hover:text-blue-800"
                                  onClick={() => handleUnblock(b.ip)}
                                >
                                  <Unlock className="h-3 w-3 mr-1" />
                                  Unblock
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Analytics ──────────────────────────────────── */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Threats by Type */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Threats by Type (24h)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {d && Object.keys(d.threatsByType).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(d.threatsByType)
                          .sort((a, b) => b[1] - a[1])
                          .map(([type, count]) => (
                            <div key={type} className="flex items-center gap-2">
                              <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                  <span>{type.replace(/_/g, " ")}</span>
                                  <span className="font-medium">{count}</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full transition-all"
                                    style={{
                                      width: `${Math.min(100, (count / Math.max(1, d.summary.totalEvents24h)) * 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm py-4 text-center">
                        No data
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Threats by Severity */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Threats by Severity (24h)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {d && Object.keys(d.threatsBySeverity).length > 0 ? (
                      <div className="space-y-3">
                        {["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].map(
                          (sev) => {
                            const count = d.threatsBySeverity[sev] || 0;
                            if (count === 0) return null;
                            return (
                              <div
                                key={sev}
                                className="flex items-center gap-3"
                              >
                                <Badge
                                  className={`${severityColor(sev)} text-xs w-20 justify-center`}
                                >
                                  {sev}
                                </Badge>
                                <div className="flex-1">
                                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        sev === "CRITICAL"
                                          ? "bg-red-600"
                                          : sev === "HIGH"
                                            ? "bg-orange-500"
                                            : sev === "MEDIUM"
                                              ? "bg-yellow-500"
                                              : sev === "LOW"
                                                ? "bg-blue-500"
                                                : "bg-gray-400"
                                      }`}
                                      style={{
                                        width: `${Math.min(100, (count / Math.max(1, d.summary.totalEvents24h)) * 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                                <span className="text-sm font-medium w-8 text-right">
                                  {count}
                                </span>
                              </div>
                            );
                          },
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm py-4 text-center">
                        No data
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Top Attacked Routes */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Top Attacked Routes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {d && d.topAttackedRoutes.length > 0 ? (
                      <div className="space-y-2">
                        {d.topAttackedRoutes.map((r, i) => (
                          <div
                            key={r.route}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground w-5">
                                {i + 1}.
                              </span>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {r.route}
                              </code>
                            </div>
                            <Badge variant="secondary">{r.count}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm py-4 text-center">
                        No data
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Top Offending IPs */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Top Offending IPs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {d && d.topOffendingIps.length > 0 ? (
                      <div className="space-y-2">
                        {d.topOffendingIps.map((ip) => (
                          <div
                            key={ip.ip}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                {ip.ip}
                              </code>
                              <span className="text-muted-foreground text-xs">
                                {ip.events} events
                              </span>
                            </div>
                            <Badge
                              variant={
                                ip.score > 50
                                  ? "destructive"
                                  : ip.score > 20
                                    ? "default"
                                    : "secondary"
                              }
                            >
                              Score: {ip.score}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm py-4 text-center">
                        No active IP profiles
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─── Actions ────────────────────────────────────── */}
            <TabsContent value="actions" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Manual Block */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Ban className="h-4 w-4" />
                      Block IP Address
                    </CardTitle>
                    <CardDescription>
                      Manually block an IP from accessing the API
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        IP Address
                      </label>
                      <Input
                        placeholder="e.g. 192.168.1.100"
                        value={blockIp}
                        onChange={(e) => setBlockIp(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Reason
                      </label>
                      <Input
                        placeholder="Reason for blocking"
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Duration (minutes, 0 = permanent)
                      </label>
                      <Input
                        type="number"
                        placeholder="15"
                        value={blockDuration}
                        onChange={(e) => setBlockDuration(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleBlock}
                      className="w-full"
                      variant="destructive"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Block IP
                    </Button>
                  </CardContent>
                </Card>

                {/* Security Tips */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                      Auto-Defense Status
                    </CardTitle>
                    <CardDescription>
                      Active security measures and detection rules
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        {
                          label: "Brute Force Detection",
                          desc: "Blocks after 6 failed logins in 5 min",
                          active: true,
                        },
                        {
                          label: "SQL/XSS Injection Detection",
                          desc: "Scans request bodies for injection patterns",
                          active: true,
                        },
                        {
                          label: "API Fuzzing Detection",
                          desc: "Blocks after 20+ 404s per minute",
                          active: true,
                        },
                        {
                          label: "Suspicious Agent Blocking",
                          desc: "Blocks known pen-test tools (sqlmap, nikto, etc.)",
                          active: true,
                        },
                        {
                          label: "Forbidden Access Tracking",
                          desc: "Blocks after 10+ forbidden attempts",
                          active: true,
                        },
                        {
                          label: "IP Score Decay",
                          desc: "Threat scores decay over time for clean IPs",
                          active: true,
                        },
                        {
                          label: "Auto Block Expiry",
                          desc: "Temp blocks expire after 15 min (brute) / 1 hr (fuzzing)",
                          active: true,
                        },
                        {
                          label: "Event Retention",
                          desc: "Security events retained 90 days, auto-purged",
                          active: true,
                        },
                      ].map((rule) => (
                        <div
                          key={rule.label}
                          className="flex items-start gap-3 p-2 rounded-lg bg-muted/50"
                        >
                          <div
                            className={`h-2 w-2 rounded-full mt-1.5 ${
                              rule.active ? "bg-green-500" : "bg-gray-400"
                            }`}
                          />
                          <div>
                            <div className="text-sm font-medium">
                              {rule.label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {rule.desc}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
