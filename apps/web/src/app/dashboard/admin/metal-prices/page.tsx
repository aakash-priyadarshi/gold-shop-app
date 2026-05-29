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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import api from "@/lib/api";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Coins,
  Gauge,
  RefreshCw,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";

interface RecentFetch {
  id: string;
  success: boolean;
  source: string;
  trigger: string;
  goldUsdOz: number | null;
  errorMessage: string | null;
  fetchedAt: string;
}

interface MetalPriceMonitor {
  apiConfigured: boolean;
  fetchIntervalSeconds: number;
  lastFetchAt: string | null;
  nextFetchAt: string | null;
  lastSource: string | null;
  latestSpot: {
    goldUsdOz: number;
    silverUsdOz: number;
    platinumUsdOz: number;
    palladiumUsdOz: number;
    providerTimestamp: string;
  } | null;
  monthlyQuota: number;
  apiCallsToday: number;
  apiCallsThisMonth: number;
  recentFetches: RecentFetch[];
}

// Frequency presets the admin can choose from (value in seconds).
const FREQUENCY_PRESETS = [
  { label: "Every second", value: 1 },
  { label: "Every 30 seconds", value: 30 },
  { label: "Every minute", value: 60 },
  { label: "Every 5 minutes", value: 300 },
  { label: "Every 15 minutes", value: 900 },
  { label: "Every hour", value: 3600 },
  { label: "Every 6 hours", value: 21600 },
  { label: "Every 12 hours", value: 43200 },
  { label: "Once a day", value: 86400 },
];

function formatInterval(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function MetalPricesAdminPage() {
  const [monitor, setMonitor] = useState<MetalPriceMonitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [intervalInput, setIntervalInput] = useState<string>("86400");

  const fetchMonitor = async () => {
    try {
      const res = await api.get<MetalPriceMonitor>(
        "/market-rates/admin/metal-price-monitor",
      );
      setMonitor(res.data);
      setIntervalInput(String(res.data.fetchIntervalSeconds));
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Failed to load monitor",
        description: e?.response?.data?.message || "Could not fetch metal-price status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitor();
    const id = setInterval(fetchMonitor, 30000);
    return () => clearInterval(id);
  }, []);

  const saveInterval = async (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 1) {
      toast({
        title: "Invalid interval",
        description: "Interval must be at least 1 second",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await api.put("/market-rates/admin/metal-price-interval", {
        fetchIntervalSeconds: Math.floor(seconds),
      });
      toast({
        title: "Fetch frequency updated",
        description: `Now fetching at most once every ${formatInterval(Math.floor(seconds))}`,
      });
      await fetchMonitor();
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Update failed",
        description: e?.response?.data?.message || "Could not update interval",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const manualRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.post<MetalPriceMonitor>(
        "/market-rates/admin/metal-price-refresh",
      );
      setMonitor(res.data);
      setIntervalInput(String(res.data.fetchIntervalSeconds));
      toast({
        title: "Prices refreshed",
        description: "A fresh fetch was triggered and stored as the source of truth",
      });
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Refresh failed",
        description: e?.response?.data?.message || "Could not refresh prices",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const quotaPct = monitor
    ? Math.min(100, Math.round((monitor.apiCallsThisMonth / monitor.monthlyQuota) * 100))
    : 0;
  const quotaColor =
    quotaPct >= 90 ? "bg-red-500" : quotaPct >= 70 ? "bg-amber-500" : "bg-green-500";

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Coins className="h-6 w-6" /> Metal Price Monitor
              </h1>
              <p className="text-muted-foreground">
                Single source of truth for spot prices. The external API is called at
                most once per configured interval; everything else reads the stored data.
              </p>
            </div>
            <Button onClick={manualRefresh} disabled={refreshing} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh now"}
            </Button>
          </div>

          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : !monitor ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No data available.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Status cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      API Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {monitor.apiConfigured ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      )}
                      <span className="font-semibold">
                        {monitor.apiConfigured ? "Configured" : "Not configured"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last source:{" "}
                      <Badge variant="outline">{monitor.lastSource || "—"}</Badge>
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Fetch Frequency
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Gauge className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold">
                        {formatInterval(monitor.fetchIntervalSeconds)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {monitor.fetchIntervalSeconds.toLocaleString()} seconds
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Last Fetch
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-semibold">
                        {formatDateTime(monitor.lastFetchAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Next: {formatDateTime(monitor.nextFetchAt)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Monthly Quota
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-semibold">
                      {monitor.apiCallsThisMonth} / {monitor.monthlyQuota} calls
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${quotaColor}`}
                        style={{ width: `${quotaPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {monitor.apiCallsToday} today
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Frequency control */}
              <Card>
                <CardHeader>
                  <CardTitle>Fetch Frequency Control</CardTitle>
                  <CardDescription>
                    Controls how often the external metal-price API may be called. Keep
                    it at &ldquo;Once a day&rdquo; on the free tier to avoid hitting the
                    quota. Set it faster (per second) once you upgrade for production.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Preset</label>
                      <Select
                        value={
                          FREQUENCY_PRESETS.some(
                            (p) => p.value === monitor.fetchIntervalSeconds,
                          )
                            ? String(monitor.fetchIntervalSeconds)
                            : undefined
                        }
                        onValueChange={(v) => saveInterval(Number(v))}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Choose a preset" />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCY_PRESETS.map((p) => (
                            <SelectItem key={p.value} value={String(p.value)}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">Custom (seconds)</label>
                      <Input
                        type="number"
                        min={1}
                        className="w-40"
                        value={intervalInput}
                        onChange={(e) => setIntervalInput(e.target.value)}
                      />
                    </div>

                    <Button
                      onClick={() => saveInterval(Number(intervalInput))}
                      disabled={saving}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Latest spot prices */}
              {monitor.latestSpot && (
                <Card>
                  <CardHeader>
                    <CardTitle>Latest Spot Prices (USD / troy oz)</CardTitle>
                    <CardDescription>
                      Provider time: {formatDateTime(monitor.latestSpot.providerTimestamp)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        { label: "Gold", value: monitor.latestSpot.goldUsdOz },
                        { label: "Silver", value: monitor.latestSpot.silverUsdOz },
                        { label: "Platinum", value: monitor.latestSpot.platinumUsdOz },
                        { label: "Palladium", value: monitor.latestSpot.palladiumUsdOz },
                      ].map((m) => (
                        <div key={m.label} className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">{m.label}</p>
                          <p className="text-lg font-semibold">
                            ${m.value.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent fetches */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Fetch Attempts</CardTitle>
                  <CardDescription>Last 20 external fetch attempts</CardDescription>
                </CardHeader>
                <CardContent>
                  {monitor.recentFetches.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No fetches recorded yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 pr-4">Time</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2 pr-4">Source</th>
                            <th className="py-2 pr-4">Trigger</th>
                            <th className="py-2 pr-4">Gold $/oz</th>
                            <th className="py-2">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monitor.recentFetches.map((f) => (
                            <tr key={f.id} className="border-b last:border-0">
                              <td className="py-2 pr-4 whitespace-nowrap">
                                {formatDateTime(f.fetchedAt)}
                              </td>
                              <td className="py-2 pr-4">
                                <Badge
                                  variant={f.success ? "default" : "destructive"}
                                  className={f.success ? "bg-green-500" : ""}
                                >
                                  {f.success ? "OK" : "FAIL"}
                                </Badge>
                              </td>
                              <td className="py-2 pr-4">{f.source}</td>
                              <td className="py-2 pr-4">{f.trigger}</td>
                              <td className="py-2 pr-4">
                                {f.goldUsdOz ? `$${f.goldUsdOz.toFixed(2)}` : "—"}
                              </td>
                              <td className="py-2 text-red-600">
                                {f.errorMessage || ""}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
