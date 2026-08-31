"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { T } from "@/components/ui/T";
import { useToast } from "@/hooks/use-toast";
import { crashReportApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import {
  BellRing,
  Bug,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eye,
  FileText,
  Filter,
  Monitor,
  RefreshCw,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ─── Types ──────────────────────────────────────────────
interface CrashReport {
  id: string;
  errorMessage: string;
  errorStack?: string;
  page: string;
  userAction?: string;
  platform: string;
  userRole?: string;
  userId?: string;
  userAgent?: string;
  appVersion?: string;
  ip?: string;
  status: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  userTriggered?: boolean;
  userDescription?: string;
  screenshotUrl?: string;
  frustrationType?: string;
}

interface Stats {
  total: number;
  new: number;
  reviewed: number;
  resolved: number;
  today?: number;
  userTriggered?: number;
  byPlatform: Record<string, number>;
}

interface IntegrationsStatus {
  slack: {
    configured: boolean;
    requested: boolean;
    mentionEnabled: boolean;
  };
}

function startOfLocalDayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function formatAdminCopy(report: CrashReport) {
  const source = report.userTriggered ? "User reported" : "Automatic";
  return [
    report.errorMessage,
    "",
    "---",
    `When: ${new Date(report.createdAt).toISOString()}`,
    `Platform: ${report.platform}${report.appVersion ? ` v${report.appVersion}` : ""}`,
    `Role: ${report.userRole || "guest"}`,
    report.userId ? `User: ${report.userId}` : null,
    `Source: ${source}`,
    `Type: ${report.frustrationType || "—"}`,
    report.userAction ? `Action: ${report.userAction}` : null,
    report.userDescription ? `User note: ${report.userDescription}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function CopyTextButton({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy error (same format as user toast)"
      aria-label="Copy error"
      className={`inline-flex items-center gap-1 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 ${className}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

// ─── Status badge ───────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    reviewed:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    resolved:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Platform badge ─────────────────────────────────────
function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      {platform === "desktop" ? (
        <Monitor className="h-3 w-3" />
      ) : (
        <Smartphone className="h-3 w-3" />
      )}
      {platform}
    </span>
  );
}

// ─── Main Page ──────────────────────────────────────────
export default function CrashReportsPage() {
  const { toast } = useToast();
  const t = useT();
  const [reports, setReports] = useState<CrashReport[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [integrations, setIntegrations] =
    useState<IntegrationsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportAction, setExportAction] = useState<
    "copy" | "download" | null
  >(null);
  const [testingSlack, setTestingSlack] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("new");
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [todayOnly, setTodayOnly] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const [reportsRes, statsRes, integrationsRes] = await Promise.all([
        crashReportApi.getAll({
          page,
          limit: 25,
          status: statusFilter || undefined,
          platform: platformFilter || undefined,
          userTriggered:
            sourceFilter === "user"
              ? true
              : sourceFilter === "auto"
                ? false
                : undefined,
          since: todayOnly ? startOfLocalDayIso() : undefined,
        }),
        crashReportApi.getStats(),
        crashReportApi.getIntegrations().catch(() => null),
      ]);
      setReports(reportsRes.data.reports);
      setTotalPages(reportsRes.data.totalPages);
      setTotal(reportsRes.data.total);
      setStats(statsRes.data);
      if (integrationsRes) setIntegrations(integrationsRes.data);
    } catch (err) {
      console.error("Failed to fetch crash reports:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, platformFilter, sourceFilter, todayOnly]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const exportFilters = () => ({
    status: statusFilter || undefined,
    platform: platformFilter || undefined,
    userTriggered:
      sourceFilter === "user"
        ? true
        : sourceFilter === "auto"
          ? false
          : undefined,
    since: todayOnly ? startOfLocalDayIso() : undefined,
  });

  const handleCopyAllMarkdown = async () => {
    setExportAction("copy");
    try {
      const response = await crashReportApi.exportMarkdown(exportFilters());
      await navigator.clipboard.writeText(String(response.data));
      toast({
        title: t("Crash reports copied"),
        description: t("Paste the Markdown directly into your AI coding agent."),
      });
    } catch (error) {
      console.error("Failed to copy crash report export:", error);
      toast({
        title: t("Copy failed"),
        description: t("Could not prepare the crash-report prompt."),
        variant: "destructive",
      });
    } finally {
      setExportAction(null);
    }
  };

  const handleDownloadMarkdown = async () => {
    setExportAction("download");
    try {
      const response = await crashReportApi.exportMarkdown(exportFilters());
      const blob = new Blob([String(response.data)], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `orivraa-crash-reports-${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast({ title: t("Crash-report Markdown downloaded") });
    } catch (error) {
      console.error("Failed to download crash report export:", error);
      toast({
        title: t("Download failed"),
        description: t("Could not prepare the crash-report file."),
        variant: "destructive",
      });
    } finally {
      setExportAction(null);
    }
  };

  const handleTestSlack = async () => {
    setTestingSlack(true);
    try {
      const response = await crashReportApi.testSlack();
      if (!response.data.delivered) {
        throw new Error(response.data.reason || "delivery_failed");
      }
      toast({
        title: t("Slack test delivered"),
        description: t("Check your configured incident channel."),
      });
    } catch (error) {
      console.error("Failed to send Slack test:", error);
      toast({
        title: t("Slack test failed"),
        description: t("Check the webhook URL in the Railway API variables."),
        variant: "destructive",
      });
    } finally {
      setTestingSlack(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await crashReportApi.update(id, { status: newStatus });
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)),
      );
      // Refresh stats
      const statsRes = await crashReportApi.getStats();
      setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleSaveNotes = async (id: string) => {
    try {
      await crashReportApi.update(id, { adminNotes: notesText });
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, adminNotes: notesText } : r)),
      );
      setEditingNotes(null);
    } catch (err) {
      console.error("Failed to save notes:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this crash report permanently?")) return;
    try {
      await crashReportApi.remove(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      setTotal((p) => p - 1);
      const statsRes = await crashReportApi.getStats();
      setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gold-100 flex items-center gap-2" data-tour="crash-reports-header">
              <Bug className="h-6 w-6 text-red-500" />
              Crash Reports
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Errors shown to shopkeepers and customers. Check this daily —
              copy matches the user toast.
            </p>
          </div>
          <div
            className="flex flex-wrap items-center gap-2"
            data-tour="crash-reports-export"
          >
            <button
              type="button"
              onClick={handleCopyAllMarkdown}
              disabled={Boolean(exportAction)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              <T>Copy all as AI prompt</T>
            </button>
            <button
              type="button"
              onClick={handleDownloadMarkdown}
              disabled={Boolean(exportAction)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <T>Download .md</T>
            </button>
            <button
              type="button"
              onClick={fetchReports}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <T>Refresh</T>
            </button>
          </div>
        </div>

        {/* Alert integration */}
        <div
          className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 ${
            integrations?.slack.configured
              ? "border-green-200 bg-green-50 dark:border-green-900/60 dark:bg-green-950/20"
              : "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/20"
          }`}
          data-tour="crash-reports-alerts"
        >
          <div className="flex items-start gap-3">
            <BellRing
              className={`mt-0.5 h-5 w-5 ${
                integrations?.slack.configured
                  ? "text-green-600"
                  : "text-amber-600"
              }`}
            />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {!integrations ? (
                  <T>Checking Slack alert configuration</T>
                ) : integrations.slack.configured ? (
                  <T>Slack crash alerts are active</T>
                ) : (
                  <T>Slack crash alerts need configuration</T>
                )}
              </p>
              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                {!integrations ? (
                  <T>The webhook status is loading from the API service.</T>
                ) : integrations.slack.configured ? (
                  <T>Every new incident is sent to your existing channel. Duplicate reports are grouped silently.</T>
                ) : (
                  <T>Add CRASH_REPORT_SLACK_WEBHOOK_URL to the Railway API service, then redeploy it.</T>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTestSlack}
            disabled={!integrations?.slack.configured || testingSlack}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${testingSlack ? "animate-spin" : ""}`}
            />
            <T>Send test alert</T>
          </button>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
            {[
              {
                label: "Today",
                value: stats.today ?? 0,
                color: "text-orange-600 dark:text-orange-400",
                onClick: () => {
                  setTodayOnly(true);
                  setPage(1);
                },
                active: todayOnly,
              },
              {
                label: "New",
                value: stats.new,
                color: "text-red-600 dark:text-red-400",
                onClick: () => {
                  setStatusFilter("new");
                  setPage(1);
                },
                active: statusFilter === "new",
              },
              {
                label: "Reviewed",
                value: stats.reviewed,
                color: "text-yellow-600 dark:text-yellow-400",
              },
              {
                label: "Resolved",
                value: stats.resolved,
                color: "text-green-600 dark:text-green-400",
              },
              {
                label: "Total",
                value: stats.total,
                color: "text-gray-700 dark:text-gray-300",
                onClick: () => {
                  setTodayOnly(false);
                  setStatusFilter("");
                  setPage(1);
                },
              },
              {
                label: "Desktop",
                value: stats.byPlatform?.desktop || 0,
                color: "text-blue-600 dark:text-blue-400",
              },
            ].map((s) => (
              <div
                key={s.label}
                role={s.onClick ? "button" : undefined}
                onClick={s.onClick}
                className={`rounded-xl border bg-white dark:bg-gray-900/50 p-4 ${
                  s.onClick ? "cursor-pointer hover:border-gold-400" : ""
                } ${
                  s.active
                    ? "border-gold-400 dark:border-gold-500"
                    : "border-gray-200 dark:border-gray-800"
                }`}
              >
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {s.label}
                </p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3" data-tour="crash-reports-filters">
          <Filter className="h-4 w-4 text-gray-400" />
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="appearance-none rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 pr-8 text-sm text-gray-700 dark:text-gray-300"
            >
              <option value="">All statuses</option>
              <option value="new">New</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
            </select>
            <ChevronDown className="absolute right-2 top-2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={platformFilter}
              onChange={(e) => {
                setPlatformFilter(e.target.value);
                setPage(1);
              }}
              className="appearance-none rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 pr-8 text-sm text-gray-700 dark:text-gray-300"
            >
              <option value="">All platforms</option>
              <option value="web">Web</option>
              <option value="desktop">Desktop</option>
            </select>
            <ChevronDown className="absolute right-2 top-2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="appearance-none rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 pr-8 text-sm text-gray-700 dark:text-gray-300"
            >
              <option value="">All sources</option>
              <option value="auto">Automatic</option>
              <option value="user">User reported</option>
            </select>
            <ChevronDown className="absolute right-2 top-2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <button
            type="button"
            onClick={() => {
              setTodayOnly((v) => !v);
              setPage(1);
            }}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              todayOnly
                ? "border-gold-400 bg-gold-50 text-gold-800 dark:bg-gold-900/20 dark:text-gold-300"
                : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            Today
          </button>
          {(statusFilter || platformFilter || sourceFilter || todayOnly) && (
            <button
              onClick={() => {
                setStatusFilter("");
                setPlatformFilter("");
                setSourceFilter("");
                setTodayOnly(false);
                setPage(1);
              }}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {total} report{total !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Reports list */}
        <div className="space-y-3" data-tour="crash-reports-list">
          {loading && reports.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <RefreshCw className="h-8 w-8 mx-auto animate-spin mb-3" />
              Loading crash reports...
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Bug className="h-8 w-8 mx-auto mb-3 opacity-40" />
              No crash reports found.
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden"
              >
                {/* Row summary */}
                <div
                  className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() =>
                    setExpandedId(expandedId === report.id ? null : report.id)
                  }
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={report.status} />
                      <PlatformBadge platform={report.platform} />
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          report.userTriggered
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {report.userTriggered ? "User" : "Auto"}
                      </span>
                      {report.frustrationType && (
                        <span className="text-xs text-gray-400">
                          {report.frustrationType}
                        </span>
                      )}
                      {report.userRole && report.userRole !== "guest" && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          {report.userRole}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(report.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {report.errorMessage}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      Page: {report.page}
                      {report.userAction && ` · ${report.userAction}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <CopyTextButton text={formatAdminCopy(report)} />
                    <Eye className="h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* Expanded details */}
                {expandedId === report.id && (
                  <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 p-4 space-y-4">
                    {/* Error message */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          Error Message
                        </p>
                        <CopyTextButton text={formatAdminCopy(report)} />
                      </div>
                      <pre className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap break-words">
                        {report.errorMessage}
                      </pre>
                    </div>

                    {report.userDescription && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                          User note
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg p-3">
                          {report.userDescription}
                        </p>
                      </div>
                    )}

                    {/* Stack trace */}
                    {report.errorStack && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                          Stack Trace
                        </p>
                        <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg p-3 overflow-auto max-h-60 whitespace-pre-wrap break-words font-mono">
                          {report.errorStack}
                        </pre>
                      </div>
                    )}

                    {/* Metadata grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-gray-400">Page</p>
                        <p className="text-gray-700 dark:text-gray-300 font-medium break-all">
                          {report.page}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">User Action</p>
                        <p className="text-gray-700 dark:text-gray-300 font-medium">
                          {report.userAction || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Platform</p>
                        <p className="text-gray-700 dark:text-gray-300 font-medium">
                          {report.platform}
                          {report.appVersion && ` v${report.appVersion}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">User</p>
                        <p className="text-gray-700 dark:text-gray-300 font-medium">
                          {report.userRole || "guest"}
                          {report.userId && (
                            <span className="text-gray-400 ml-1 text-[10px]">
                              ({report.userId.slice(0, 8)}…)
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">IP</p>
                        <p className="text-gray-700 dark:text-gray-300 font-medium font-mono">
                          {report.ip || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">User Agent</p>
                        <p
                          className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[200px]"
                          title={report.userAgent || ""}
                        >
                          {report.userAgent
                            ? report.userAgent.slice(0, 60) + "..."
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Reported At</p>
                        <p className="text-gray-700 dark:text-gray-300 font-medium">
                          {formatDate(report.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">ID</p>
                        <p className="text-gray-700 dark:text-gray-300 font-medium font-mono text-[10px]">
                          {report.id}
                        </p>
                      </div>
                    </div>

                    {/* Admin notes */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Admin Notes
                      </p>
                      {editingNotes === report.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm text-gray-700 dark:text-gray-300 min-h-[60px]"
                            placeholder="Add notes about this crash..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveNotes(report.id)}
                              className="px-3 py-1 text-xs font-medium rounded bg-gold-500 text-white hover:bg-gold-600"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingNotes(null)}
                              className="px-3 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg p-2 min-h-[40px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => {
                            setEditingNotes(report.id);
                            setNotesText(report.adminNotes || "");
                          }}
                        >
                          {report.adminNotes || (
                            <span className="italic text-gray-400">
                              Click to add notes...
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                      <span className="text-xs text-gray-400 mr-2">
                        Set status:
                      </span>
                      {["new", "reviewed", "resolved"].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(report.id, s)}
                          disabled={report.status === s}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                            report.status === s
                              ? "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-default"
                              : "border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                          }`}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="ml-auto p-1.5 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                        title="Delete report"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-40 disabled:cursor-default"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-40 disabled:cursor-default"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
