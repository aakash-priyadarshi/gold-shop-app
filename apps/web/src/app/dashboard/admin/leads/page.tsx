"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { LeadItem, leadsAdminApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import {
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Star,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { OutreachCampaignModal } from "./OutreachCampaignModal";
import { LeadChatDrawer } from "./LeadChatDrawer";
import { WhatsAppCampaignModal } from "./WhatsAppCampaignModal";

type LeadStatus = "NEW" | "CONTACTED" | "WON" | "LOST";

const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300",
  CONTACTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border-blue-300",
  WON: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border-green-300",
  LOST: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300",
};

const COUNTRY_FLAGS: Record<string, string> = {
  NP: "🇳🇵 Nepal",
  IN: "🇮🇳 India",
  AE: "🇦🇪 UAE",
  US: "🇺🇸 USA",
  UK: "🇬🇧 UK",
};

function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

export default function AdminLeadsPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [stats, setStats] = useState({
    totalAll: 0,
    newCount: 0,
    contactedCount: 0,
    wonCount: 0,
    lostCount: 0,
    mapsCount: 0,
    chatCount: 0,
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<string>(searchParams.get("status") || "ALL");
  const [source, setSource] = useState<string>("ALL");
  const [country, setCountry] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [outreachModalOpen, setOutreachModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);

  // WhatsApp & Chat Drawer state
  const [chatLead, setChatLead] = useState<LeadItem | null>(null);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);

  // Row expansion & notes
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leadsAdminApi.getLeads({
        page,
        limit: 20,
        status: status === "ALL" ? undefined : status,
        source: source === "ALL" ? undefined : source,
        country: country === "ALL" ? undefined : country,
        search: search.trim() || undefined,
      });

      const data = res.data;
      setLeads(data?.leads || []);
      setTotalPages(data?.totalPages || 1);
      if (data?.stats) {
        setStats(data.stats);
      }

      const drafts: Record<string, string> = {};
      for (const l of data?.leads || []) {
        drafts[l.id] = l.notes || "";
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
  }, [page, status, source, country, search]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedLeadsList = useMemo(
    () => leads.filter((l) => selectedIds.has(l.id)),
    [leads, selectedIds],
  );

  // Prune any selected IDs that are not present in current loaded leads
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(leads.map((l) => l.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (validIds.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [leads]);

  const handleBulkStatusChange = async (newStatus: LeadStatus) => {
    if (selectedIds.size === 0) return;
    try {
      await leadsAdminApi.bulkUpdateStatus(Array.from(selectedIds), newStatus);
      toast({
        title: "Status updated",
        description: `Updated ${selectedIds.size} leads to ${newStatus}`,
      });
      loadLeads();
      setSelectedIds(new Set());
    } catch (err: any) {
      toast({
        title: "Bulk update failed",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await leadsAdminApi.updateLead(leadId, { status: newStatus });
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)),
      );
      toast({ title: "Lead status updated" });
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveNotes = async (leadId: string) => {
    setSavingId(leadId);
    try {
      await leadsAdminApi.updateLead(leadId, { notes: noteDrafts[leadId] });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, notes: noteDrafts[leadId] } : l,
        ),
      );
      toast({ title: "Notes saved" });
    } catch (err: any) {
      toast({
        title: "Failed to save notes",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      await leadsAdminApi.deleteLead(leadId);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
      toast({ title: "Lead deleted" });
    } catch (err: any) {
      toast({
        title: "Failed to delete lead",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const isAllSelected =
    leads.length > 0 && selectedIds.size === leads.length;

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6 pb-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Target className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                <h1 className="text-2xl font-bold tracking-tight">
                  <T>Jewellery Leads &amp; Cold Outreach</T>
                </h1>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                <T>
                  Public Google Maps jewellery shops, website chat leads, and festival cold email outreach.
                </T>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadLeads}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`}
                />
                <T>Refresh</T>
              </Button>

              <Button
                size="sm"
                onClick={() => setWhatsappModalOpen(true)}
                disabled={selectedIds.size === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <MessageSquare className="h-4 w-4 mr-1.5" />
                <T>WhatsApp</T>
                {selectedIds.size > 0 && ` (${selectedIds.size})`}
              </Button>

              <Button
                size="sm"
                onClick={() => setOutreachModalOpen(true)}
                disabled={selectedIds.size === 0}
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-sm"
              >
                <Send className="h-4 w-4 mr-1.5" />
                <T>Send Cold Outreach</T>
                {selectedIds.size > 0 && ` (${selectedIds.size})`}
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="bg-slate-50 dark:bg-slate-900 border">
              <CardContent className="p-4">
                <div className="text-xs text-slate-500 uppercase font-semibold">Total Leads</div>
                <div className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-100">
                  {stats.totalAll}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40">
              <CardContent className="p-4">
                <div className="text-xs text-amber-700 dark:text-amber-400 uppercase font-semibold">
                  New Prospects
                </div>
                <div className="text-2xl font-bold mt-1 text-amber-900 dark:text-amber-200">
                  {stats.newCount}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40">
              <CardContent className="p-4">
                <div className="text-xs text-blue-700 dark:text-blue-400 uppercase font-semibold">
                  Contacted
                </div>
                <div className="text-2xl font-bold mt-1 text-blue-900 dark:text-blue-200">
                  {stats.contactedCount}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50/60 dark:bg-green-950/20 border-green-200 dark:border-green-900/40">
              <CardContent className="p-4">
                <div className="text-xs text-green-700 dark:text-green-400 uppercase font-semibold">
                  Converted (Won)
                </div>
                <div className="text-2xl font-bold mt-1 text-green-900 dark:text-green-200">
                  {stats.wonCount}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 dark:bg-slate-900 border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 uppercase font-semibold">Google Maps</div>
                  <div className="text-xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">
                    {stats.mapsCount}
                  </div>
                </div>
                <MapPin className="h-5 w-5 text-emerald-600 opacity-60" />
              </CardContent>
            </Card>

            <Card className="bg-slate-50 dark:bg-slate-900 border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 uppercase font-semibold">AI Bot Chat</div>
                  <div className="text-xl font-bold mt-1 text-blue-700 dark:text-blue-400">
                    {stats.chatCount}
                  </div>
                </div>
                <Bot className="h-5 w-5 text-blue-600 opacity-60" />
              </CardContent>
            </Card>
          </div>

          {/* Filters & Search */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by shop name, email, phone, city..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={source} onValueChange={(val) => { setSource(val); setPage(1); }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Sources</SelectItem>
                    <SelectItem value="GOOGLE_MAPS">Google Maps</SelectItem>
                    <SelectItem value="AI_CHATBOT">AI Chatbot</SelectItem>
                    <SelectItem value="MANUAL_IMPORT">Manual Import</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={country} onValueChange={(val) => { setCountry(val); setPage(1); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Countries</SelectItem>
                    <SelectItem value="NP">🇳🇵 Nepal</SelectItem>
                    <SelectItem value="IN">🇮🇳 India</SelectItem>
                    <SelectItem value="AE">🇦🇪 UAE</SelectItem>
                    <SelectItem value="US">🇺🇸 USA</SelectItem>
                    <SelectItem value="UK">🇬🇧 UK</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="CONTACTED">Contacted</SelectItem>
                    <SelectItem value="WON">Won (Converted)</SelectItem>
                    <SelectItem value="LOST">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedIds.size > 0 && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg flex flex-wrap items-center justify-between gap-3 text-sm animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                    <span className="font-semibold text-amber-900 dark:text-amber-200">
                      {selectedIds.size} lead(s) selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setWhatsappModalOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                      <T>WhatsApp Campaign</T>
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => setOutreachModalOpen(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white h-8"
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      <T>Send Email Outreach</T>
                    </Button>

                    <Select onValueChange={(val) => handleBulkStatusChange(val as LeadStatus)}>
                      <SelectTrigger className="h-8 w-[140px] bg-white dark:bg-slate-900">
                        <span className="text-xs">Mark status as...</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CONTACTED">Contacted</SelectItem>
                        <SelectItem value="WON">Won</SelectItem>
                        <SelectItem value="LOST">Lost</SelectItem>
                        <SelectItem value="NEW">New</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-xs uppercase font-semibold text-slate-600 dark:text-slate-400 border-b">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                      />
                    </th>
                    <th className="p-3">Shop Name &amp; Rating</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Contact Channels</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Outreach</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Loading leads...
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        No leads found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => {
                      const isExpanded = expandedId === lead.id;
                      const isSelected = selectedIds.has(lead.id);

                      return (
                        <Fragment key={lead.id}>
                          <tr
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors ${
                              isSelected ? "bg-amber-50/30 dark:bg-amber-950/20" : ""
                            }`}
                          >
                          <td className="p-3 text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleSelect(lead.id)}
                            />
                          </td>

                          <td className="p-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              {lead.shopName}
                              {lead.rating && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 border-amber-300 text-amber-800 bg-amber-50">
                                  <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                  {lead.rating}
                                  {lead.reviewCount ? ` (${lead.reviewCount})` : ""}
                                </Badge>
                              )}
                            </div>
                            {lead.contactName && (
                              <div className="text-xs text-slate-500">
                                Contact: {lead.contactName}
                              </div>
                            )}
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>
                                {lead.city ? `${lead.city}, ` : ""}
                                {COUNTRY_FLAGS[lead.country] || lead.country}
                              </span>
                            </div>
                          </td>

                          <td className="p-3 space-y-1">
                            {lead.email ? (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Mail className="h-3 w-3 text-slate-400" />
                                <a
                                  href={`mailto:${lead.email}`}
                                  className="text-amber-700 dark:text-amber-400 hover:underline truncate max-w-[180px]"
                                >
                                  {lead.email}
                                </a>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No email</span>
                            )}

                            {lead.phone && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Phone className="h-3 w-3 text-slate-400" />
                                <span>{lead.phone}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setChatLead(lead);
                                    setChatDrawerOpen(true);
                                  }}
                                  className="text-[10px] bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium transition-colors cursor-pointer"
                                  title={t("Open Twilio WhatsApp Chat & AI Bot drawer")}
                                >
                                  <MessageSquare className="h-2.5 w-2.5" />
                                  <span><T>Chat</T></span>
                                  {lead._count?.messages ? (
                                    <span className="bg-emerald-600 text-white rounded-full px-1 text-[9px] font-bold">
                                      {lead._count.messages}
                                    </span>
                                  ) : null}
                                </button>
                                <a
                                  href={whatsappLink(lead.phone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                  title={t("Open external WhatsApp Web")}
                                >
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              </div>
                            )}

                            {lead.website && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                <ExternalLink className="h-2.5 w-2.5" />
                                <a
                                  href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline truncate max-w-[160px]"
                                >
                                  {lead.website.replace(/^https?:\/\//, "")}
                                </a>
                              </div>
                            )}
                          </td>

                          <td className="p-3">
                            {lead.source === "GOOGLE_MAPS" ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[11px] gap-1">
                                <MapPin className="h-3 w-3" />
                                Google Maps
                              </Badge>
                            ) : lead.source === "AI_CHATBOT" ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300 text-[11px] gap-1">
                                <Bot className="h-3 w-3" />
                                AI Bot
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[11px]">
                                {lead.source}
                              </Badge>
                            )}
                          </td>

                          <td className="p-3">
                            <Select
                              value={lead.status}
                              onValueChange={(val) => handleStatusChange(lead.id, val as LeadStatus)}
                            >
                              <SelectTrigger
                                className={`h-7 text-xs border font-medium ${STATUS_COLORS[lead.status] || ""}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NEW">New</SelectItem>
                                <SelectItem value="CONTACTED">Contacted</SelectItem>
                                <SelectItem value="WON">Won</SelectItem>
                                <SelectItem value="LOST">Lost</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>

                          <td className="p-3 text-xs">
                            {lead.outreachCount > 0 ? (
                              <div className="space-y-0.5">
                                <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-700">
                                  Sent {lead.outreachCount}x
                                </Badge>
                                {lead.lastCampaignKey && (
                                  <div className="text-[10px] text-slate-500 truncate max-w-[100px]">
                                    {lead.lastCampaignKey}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Not contacted</span>
                            )}
                          </td>

                          <td className="p-3 text-right space-x-1">
                            {lead.phone && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 text-xs gap-1"
                                onClick={() => {
                                  setChatLead(lead);
                                  setChatDrawerOpen(true);
                                }}
                                title="Open WhatsApp Chat & AI Bot"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                {lead._count?.messages ? (
                                  <span className="bg-emerald-600 text-white rounded-full px-1 text-[9px] font-bold">
                                    {lead._count.messages}
                                  </span>
                                ) : null}
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteLead(lead.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/50 dark:bg-slate-900/40 border-b">
                            <td colSpan={8} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className="space-y-2">
                                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                                    <T>Lead Details &amp; Location</T>
                                  </div>
                                  <div className="text-slate-600 dark:text-slate-400 space-y-1">
                                    {lead.address && (
                                      <div>
                                        <strong><T>Address:</T></strong> {lead.address}
                                      </div>
                                    )}
                                    {lead.city && (
                                      <div>
                                        <strong><T>City/State:</T></strong> {lead.city}
                                        {lead.state ? `, ${lead.state}` : ""}
                                      </div>
                                    )}
                                    {lead.phone && (
                                      <div>
                                        <strong><T>Phone:</T></strong> {lead.phone}
                                      </div>
                                    )}
                                    {lead.email && (
                                      <div>
                                        <strong><T>Email:</T></strong> {lead.email}
                                      </div>
                                    )}
                                    {lead.customerServiceWindowExpiresAt && (
                                      <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                                        <strong><T>24h Service Window:</T></strong>{" "}
                                        Active until {new Date(lead.customerServiceWindowExpiresAt).toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                  {lead.phone && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs h-7 gap-1.5"
                                      onClick={() => {
                                        setChatLead(lead);
                                        setChatDrawerOpen(true);
                                      }}
                                    >
                                      <MessageSquare className="h-3.5 w-3.5" />
                                      <T>Open WhatsApp Thread</T>
                                    </Button>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                      <T>Internal Notes</T>
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-6 text-[11px] px-2"
                                      disabled={savingId === lead.id}
                                      onClick={() => handleSaveNotes(lead.id)}
                                    >
                                      {savingId === lead.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      ) : null}
                                      <T>Save Notes</T>
                                    </Button>
                                  </div>
                                  <Textarea
                                    rows={3}
                                    placeholder="Add notes about conversations, preferences, requirements..."
                                    value={noteDrafts[lead.id] || ""}
                                    onChange={(e) =>
                                      setNoteDrafts((prev) => ({
                                        ...prev,
                                        [lead.id]: e.target.value,
                                      }))
                                    }
                                    className="text-xs"
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <div>
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        <OutreachCampaignModal
          open={outreachModalOpen}
          onOpenChange={setOutreachModalOpen}
          selectedLeads={selectedLeadsList}
          onSuccess={() => {
            loadLeads();
            setSelectedIds(new Set());
          }}
        />

        <WhatsAppCampaignModal
          open={whatsappModalOpen}
          onOpenChange={setWhatsappModalOpen}
          selectedLeads={selectedLeadsList}
          onSuccess={() => {
            loadLeads();
            setSelectedIds(new Set());
          }}
        />

        <LeadChatDrawer
          leadId={chatLead?.id || null}
          isOpen={chatDrawerOpen}
          onClose={() => setChatDrawerOpen(false)}
          onLeadUpdated={loadLeads}
        />
      </DashboardLayout>
    </AdminGuard>
  );
}
