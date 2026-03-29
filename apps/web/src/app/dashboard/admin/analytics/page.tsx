"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import api from "@/lib/api";
import {
  Activity,
  AlertCircle,
  Bug,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Monitor,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebStats {
  totalSessions: number;
  activeSessions: number;
  avgDurationSec: number;
  bounceRate: number;
  timeline: { date: string; sessions: number; avgDurationSec: number }[];
}

interface DesktopStats {
  totalSessions: number;
  activeSessions: number;
  avgDurationSec: number;
  byOs: { os: string; _count: { id: number } }[];
  byVersion: { appVersion: string; _count: { id: number } }[];
  recentSessions: {
    id: string;
    os: string;
    appVersion: string;
    arch: string | null;
    firstSeen: string;
    lastSeen: string;
    user?: { firstName: string; lastName: string; email: string } | null;
  }[];
}

interface CrashSummary {
  total: number;
  new: number;
  userTriggered: number;
  withScreenshot: number;
  byFrustration: Record<string, number>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(sec: number) {
  if (sec < 60) return `${Math.round(sec)}s`;
  return `${Math.round(sec / 60)}m ${Math.round(sec % 60)}s`;
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-5 flex gap-4 items-start">
      <div
        className="p-2.5 rounded-lg flex-shrink-0"
        style={{ background: "rgba(184,148,31,0.12)" }}
      >
        <span className="text-amber-500">{icon}</span>
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${color || "text-gray-900 dark:text-white"}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

function Tabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (t: string) => void;
}) {
  const tabs = [
    { key: "web", label: "🌐 Web Sessions", icon: <Globe className="h-4 w-4" /> },
    { key: "desktop", label: "🖥 Desktop Sessions", icon: <Monitor className="h-4 w-4" /> },
    { key: "crashes", label: "🐛 Crash Watch", icon: <Bug className="h-4 w-4" /> },
  ];
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/60 w-fit">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            active === t.key
              ? "bg-white dark:bg-gray-900 text-amber-500 shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Web Sessions Tab ─────────────────────────────────────────────────────────

function WebTab() {
  const [stats, setStats] = useState<WebStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/sessions/web/stats");
      setStats(res.data);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  if (!stats) return <Empty label="No web session data yet." />;

  const maxSessions = Math.max(...(stats.timeline?.map((d) => d.sessions) ?? [1]), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Total Sessions" value={stats.totalSessions.toLocaleString()} />
        <StatCard icon={<Activity className="h-5 w-5" />} label="Active Now" value={stats.activeSessions} color="text-green-500" />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Avg Duration" value={fmtDuration(stats.avgDurationSec)} />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Bounce Rate"
          value={`${stats.bounceRate?.toFixed(1) ?? 0}%`}
          sub="Sessions < 30s"
          color={stats.bounceRate > 50 ? "text-red-500" : "text-green-500"}
        />
      </div>

      {/* Timeline chart */}
      {stats.timeline && stats.timeline.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-6">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Daily Sessions (last 30 days)
          </p>
          <div className="flex items-end gap-1 h-32">
            {stats.timeline.map((d) => (
              <div
                key={d.date}
                className="flex-1 flex flex-col items-center gap-1 group"
                title={`${d.date}: ${d.sessions} sessions, avg ${fmtDuration(d.avgDurationSec)}`}
              >
                <div
                  className="w-full rounded-sm transition-all group-hover:opacity-80"
                  style={{
                    height: `${(d.sessions / maxSessions) * 100}%`,
                    background: "linear-gradient(180deg, #D4A829, #B8941F)",
                    minHeight: d.sessions > 0 ? 4 : 0,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>{stats.timeline[0]?.date?.slice(5)}</span>
            <span>{stats.timeline[stats.timeline.length - 1]?.date?.slice(5)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Desktop Sessions Tab ──────────────────────────────────────────────────────

function DesktopTab() {
  const [stats, setStats] = useState<DesktopStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/sessions/desktop/stats");
      setStats(res.data);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  if (!stats) return <Empty label="No desktop session data yet." />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={<Monitor className="h-5 w-5" />} label="Total Desktop Sessions" value={stats.totalSessions.toLocaleString()} />
        <StatCard icon={<Activity className="h-5 w-5" />} label="Active Now" value={stats.activeSessions} color="text-green-500" />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Avg Duration" value={fmtDuration(stats.avgDurationSec)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OS breakdown */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-5">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">By OS</p>
          <div className="space-y-3">
            {stats.byOs?.map((o) => {
              const total = stats.byOs.reduce((a, x) => a + x._count.id, 0) || 1;
              const pct = Math.round((o._count.id / total) * 100);
              return (
                <div key={o.os}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">{o.os || "Unknown"}</span>
                    <span className="text-amber-500 font-medium">{o._count.id} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Version breakdown */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-5">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">By App Version</p>
          <div className="space-y-3">
            {stats.byVersion?.map((v) => {
              const total = stats.byVersion.reduce((a, x) => a + x._count.id, 0) || 1;
              const pct = Math.round((v._count.id / total) * 100);
              return (
                <div key={v.appVersion}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">v{v.appVersion}</span>
                    <span className="text-amber-500 font-medium">{v._count.id} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent sessions */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Desktop Sessions</p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {stats.recentSessions?.slice(0, 10).map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {s.user ? `${s.user.firstName} ${s.user.lastName}` : "Anonymous"}
                </p>
                <p className="text-xs text-gray-400">
                  {s.os} · v{s.appVersion}{s.arch ? ` · ${s.arch}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{timeAgo(s.firstSeen)}</p>
                {s.user && (
                  <p className="text-[10px] text-gray-400">{s.user.email}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Crash Watch Tab ───────────────────────────────────────────────────────────

function CrashTab() {
  const [summary, setSummary] = useState<CrashSummary | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [userTriggeredOnly, setUserTriggeredOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, reportsRes] = await Promise.all([
        api.get("/crash-reports/stats"),
        api.get("/crash-reports", {
          params: {
            page,
            limit: 10,
            userTriggered: userTriggeredOnly ? true : undefined,
            status: "new",
          },
        }),
      ]);
      setSummary(sumRes.data);
      setReports(reportsRes.data.reports ?? []);
      setTotalPages(reportsRes.data.totalPages ?? 1);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, [page, userTriggeredOnly]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Bug className="h-5 w-5" />} label="Total Reports" value={summary.total} />
          <StatCard icon={<AlertCircle className="h-5 w-5" />} label="New (Unreviewed)" value={summary.new} color="text-red-500" />
          <StatCard icon={<Users className="h-5 w-5" />} label="User-Triggered" value={summary.userTriggered} color="text-amber-500" />
          <StatCard icon={<Monitor className="h-5 w-5" />} label="With Screenshot" value={summary.withScreenshot} color="text-blue-500" />
        </div>
      )}

      {/* Frustration type breakdown */}
      {summary?.byFrustration && Object.keys(summary.byFrustration).length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-5">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">By Trigger Type</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.byFrustration).map(([type, count]) => (
              <span
                key={type}
                className="px-3 py-1 rounded-full text-xs font-medium border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
              >
                {type.replace("_", " ")}: <strong>{count as number}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter toggle */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={userTriggeredOnly}
            onChange={(e) => { setUserTriggeredOnly(e.target.checked); setPage(1); }}
            className="rounded"
            style={{ accentColor: "#B8941F" }}
          />
          Show user-triggered reports only
        </label>
        <button onClick={load} className="ml-auto text-xs text-amber-500 hover:text-amber-600 flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* Reports list (compact) */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {reports.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No new crash reports 🎉</div>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${r.userTriggered ? "bg-amber-400" : "bg-red-400"}`} />
                    <span className="text-xs text-gray-400">
                      {r.platform} · {r.userRole || "guest"} · {timeAgo(r.createdAt)}
                    </span>
                    {r.userTriggered && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                        User reported
                      </span>
                    )}
                    {r.screenshotUrl && (
                      <a
                        href={r.screenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-500 hover:underline"
                      >
                        📷 Screenshot
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate">{r.errorMessage}</p>
                  {r.userDescription && (
                    <p className="text-xs text-gray-500 italic mt-0.5 truncate">"{r.userDescription}"</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-0.5">Page: {r.page}</p>
                </div>
              </div>
            ))
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Full crash report management →{" "}
        <a href="/dashboard/admin/crash-reports" className="text-amber-500 hover:underline">
          Crash Reports page
        </a>
      </p>
    </div>
  );
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <RefreshCw className="h-6 w-6 animate-spin text-amber-400" />
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="py-16 text-center text-gray-400 text-sm">{label}</div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [tab, setTab] = useState<"web" | "desktop" | "crashes">("web");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-amber-500" />
            Platform Analytics & Monitoring
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Real-time session tracking, desktop usage, and error reporting for admin@orivraa.com
          </p>
        </div>

        {/* Tab bar */}
        <Tabs active={tab} onChange={(t) => setTab(t as any)} />

        {/* Tab content */}
        {tab === "web" && <WebTab />}
        {tab === "desktop" && <DesktopTab />}
        {tab === "crashes" && <CrashTab />}
      </div>
    </DashboardLayout>
  );
}
