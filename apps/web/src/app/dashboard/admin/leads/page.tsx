"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { ticketsApi } from "@/lib/api";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Settings,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type LeadStatus = "NEW" | "CONTACTED" | "WON" | "LOST";

interface LeadLog {
  id: string;
  role: string;
  content: string;
  actionTaken?: string | null;
  createdAt: string;
}

interface LeadSession {
  id: string;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  contactCaptured: boolean;
  leadStatus?: LeadStatus | null;
  leadNotes?: string | null;
  leadContactedAt?: string | null;
  leadIntents: string[];
  messageCount: number;
  startedAt: string;
  lastMessageAt: string;
  logs: LeadLog[];
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  CONTACTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  WON: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  LOST: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

export default function AdminLeadsPage() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<LeadSession[]>([]);
  const [stats, setStats] = useState({
    newCount: 0,
    contactedCount: 0,
    wonThisWeek: 0,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<string>(
    searchParams.get("status") || "ALL",
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(
    searchParams.get("session"),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ticketsApi.getLeads({
        page,
        limit: 20,
        status: status === "ALL" ? "ALL" : status,
        search: search.trim() || undefined,
        session: searchParams.get("session") || undefined,
      });
      const data = res.data?.data ?? res.data;
      setLeads(data?.sessions || []);
      setTotalPages(data?.totalPages || 1);
      setStats(
        data?.stats || { newCount: 0, contactedCount: 0, wonThisWeek: 0 },
      );
      const drafts: Record<string, string> = {};
      for (const s of data?.sessions || []) {
        drafts[s.id] = s.leadNotes || "";
      }
      setNoteDrafts((prev) => ({ ...drafts, ...prev }));
    } catch (err: any) {
      toast({
        title: "Failed to load leads",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, status, search, searchParams]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const updateLead = async (
    sessionId: string,
    patch: { leadStatus?: LeadStatus; leadNotes?: string | null },
  ) => {
    setSavingId(sessionId);
    try {
      await ticketsApi.updateLead(sessionId, patch);
      toast({ title: "Lead updated" });
      await loadLeads();
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Target className="h-6 w-6" />
                <T>AI Chat Leads</T>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                <T>
                  Contacts captured by the website AI assistant — follow up
                  before they go cold.
                </T>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/admin/leads/settings">
                  <Settings className="h-4 w-4 mr-1" />
                  <T>Alert settings</T>
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => loadLeads()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                <T>Refresh</T>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <T>New</T>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-amber-600">
                  {stats.newCount}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <T>Contacted</T>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-blue-600">
                  {stats.contactedCount}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <T>Won this week</T>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-green-600">
                  {stats.wonThisWeek}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">
                <T>Search</T>
              </Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  placeholder="Name, email, phone…"
                />
              </div>
            </div>
            <div className="w-40">
              <Label className="text-xs">
                <T>Status</T>
              </Label>
              <Select
                value={status}
                onValueChange={(v) => {
                  setPage(1);
                  setStatus(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="CONTACTED">Contacted</SelectItem>
                  <SelectItem value="WON">Won</SelectItem>
                  <SelectItem value="LOST">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <T>No leads match this filter.</T>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {leads.map((lead) => {
                const open = expandedId === lead.id;
                const statusKey = (lead.leadStatus || "NEW") as LeadStatus;
                const displayName =
                  lead.guestName ||
                  lead.guestEmail ||
                  lead.guestPhone ||
                  "Anonymous visitor";
                return (
                  <Card key={lead.id} className="overflow-hidden">
                    <button
                      type="button"
                      className="w-full text-left p-4 flex items-start gap-3 hover:bg-muted/40"
                      onClick={() =>
                        setExpandedId(open ? null : lead.id)
                      }
                    >
                      {open ? (
                        <ChevronDown className="h-4 w-4 mt-1 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mt-1 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium truncate">
                            {displayName}
                          </span>
                          <Badge className={STATUS_COLORS[statusKey]}>
                            {statusKey}
                          </Badge>
                          {lead.leadIntents?.slice(0, 3).map((intent) => (
                            <Badge key={intent} variant="outline">
                              {intent}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          {lead.guestPhone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {lead.guestPhone}
                            </span>
                          )}
                          {lead.guestEmail && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {lead.guestEmail}
                            </span>
                          )}
                          <span>
                            {lead.messageCount} msgs ·{" "}
                            {new Date(lead.lastMessageAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </button>

                    {open && (
                      <div className="border-t px-4 pb-4 space-y-4">
                        <div className="flex flex-wrap gap-2 pt-3">
                          {lead.guestPhone && (
                            <>
                              <Button size="sm" variant="outline" asChild>
                                <a href={`tel:${lead.guestPhone}`}>
                                  <Phone className="h-3.5 w-3.5 mr-1" />
                                  Call
                                </a>
                              </Button>
                              <Button size="sm" variant="outline" asChild>
                                <a
                                  href={whatsappLink(lead.guestPhone)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                  WhatsApp
                                </a>
                              </Button>
                            </>
                          )}
                          {lead.guestEmail && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={`mailto:${lead.guestEmail}`}>
                                <Mail className="h-3.5 w-3.5 mr-1" />
                                Email
                              </a>
                            </Button>
                          )}
                          {(
                            ["NEW", "CONTACTED", "WON", "LOST"] as LeadStatus[]
                          ).map((s) => (
                            <Button
                              key={s}
                              size="sm"
                              variant={statusKey === s ? "default" : "outline"}
                              disabled={savingId === lead.id}
                              onClick={() =>
                                updateLead(lead.id, { leadStatus: s })
                              }
                            >
                              {s}
                            </Button>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">
                            <T>Notes</T>
                          </Label>
                          <Textarea
                            value={noteDrafts[lead.id] ?? ""}
                            onChange={(e) =>
                              setNoteDrafts((d) => ({
                                ...d,
                                [lead.id]: e.target.value,
                              }))
                            }
                            rows={2}
                            placeholder="Follow-up notes…"
                          />
                          <Button
                            size="sm"
                            disabled={savingId === lead.id}
                            onClick={() =>
                              updateLead(lead.id, {
                                leadNotes: noteDrafts[lead.id] ?? "",
                              })
                            }
                          >
                            <T>Save notes</T>
                          </Button>
                        </div>

                        <div className="rounded-lg border bg-muted/20 p-3 max-h-80 overflow-y-auto space-y-2">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            <T>Transcript</T>
                          </p>
                          {(lead.logs || []).map((log) => (
                            <div
                              key={log.id}
                              className={`text-sm ${
                                log.role === "user"
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <span className="font-medium capitalize">
                                {log.role}:
                              </span>{" "}
                              {log.content}
                              {log.actionTaken && (
                                <Badge variant="outline" className="ml-2 text-[10px]">
                                  {log.actionTaken}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Session{" "}
                          <Link
                            href={`/dashboard/admin/messages?view=ai`}
                            className="underline"
                          >
                            {lead.id.slice(0, 8)}…
                          </Link>
                        </p>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              <span className="text-sm self-center">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
