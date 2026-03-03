"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { crashReportApi } from "@/lib/api";
import {
  Bug,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
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
}

interface Stats {
  total: number;
  new: number;
  reviewed: number;
  resolved: number;
  byPlatform: Record<string, number>;
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
  const [reports, setReports] = useState<CrashReport[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const [reportsRes, statsRes] = await Promise.all([
        crashReportApi.getAll({
          page,
          limit: 25,
          status: statusFilter || undefined,
          platform: platformFilter || undefined,
        }),
        crashReportApi.getStats(),
      ]);
      setReports(reportsRes.data.reports);
      setTotalPages(reportsRes.data.totalPages);
      setTotal(reportsRes.data.total);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to fetch crash reports:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, platformFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

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
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gold-100 flex items-center gap-2">
              <Bug className="h-6 w-6 text-red-500" />
              Crash Reports
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Client-side errors reported from web and desktop apps
            </p>
          </div>
          <button
            onClick={fetchReports}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              {
                label: "Total",
                value: stats.total,
                color: "text-gray-700 dark:text-gray-300",
              },
              {
                label: "New",
                value: stats.new,
                color: "text-red-600 dark:text-red-400",
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
                label: "Desktop",
                value: stats.byPlatform?.desktop || 0,
                color: "text-blue-600 dark:text-blue-400",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-4"
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
        <div className="flex flex-wrap items-center gap-3">
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
          {(statusFilter || platformFilter) && (
            <button
              onClick={() => {
                setStatusFilter("");
                setPlatformFilter("");
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
        <div className="space-y-3">
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
                    <Eye className="h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* Expanded details */}
                {expandedId === report.id && (
                  <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 p-4 space-y-4">
                    {/* Error message */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                        Error Message
                      </p>
                      <pre className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap break-words">
                        {report.errorMessage}
                      </pre>
                    </div>

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
  );
}
