"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import api, { adminApi } from "@/lib/api";
import {
    Activity,
    Calendar,
    Clock,
    Download,
    Eye,
    Globe,
    Loader2,
    Mail,
    MapPin,
    MessageSquare,
    Monitor,
    Phone,
    RefreshCw,
    Search,
    Send,
    ShoppingBag,
    Smartphone,
    Star,
    Store,
    TrendingUp,
    User,
    UserCheck,
    Users,
    Wifi,
    WifiOff,
    Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/* --- CURRENCY --- */

const CURRENCY_RATES_TO_NPR: Record<string, number> = {
  NPR: 1, USD: 133, INR: 1.6, EUR: 145, GBP: 168,
  AUD: 85, CAD: 98, SGD: 98, AED: 36, CNY: 18, JPY: 0.9,
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  NPR: "Rs", USD: "$", INR: "Rs", EUR: "EUR",
  GBP: "GBP", AUD: "AUD", CAD: "CAD", SGD: "SGD",
  AED: "AED", CNY: "CNY", JPY: "JPY",
};

function formatNPR(amount: number) {
  if (!amount) return "--";
  return `NPR ${amount.toLocaleString()}`;
}

function formatInCurrency(amountNpr: number, currency: string): string | null {
  if (!amountNpr || currency === "NPR") return null;
  const rate = CURRENCY_RATES_TO_NPR[currency] ?? 1;
  const converted = Math.round(amountNpr / rate);
  return `~ ${currency} ${converted.toLocaleString()}`;
}

function formatCurrencyLabel(currency: string) {
  return `${CURRENCY_SYMBOLS[currency] ?? "CUR"} ${currency}`;
}

/* --- HELPERS --- */

function formatDate(d: string) {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDuration(sec: number): string {
  if (!sec) return "0s";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase() || "?";
}

function getValueTier(totalSpent: number, orderCount: number): { label: string; color: string } {
  if (totalSpent >= 500000 || orderCount >= 20) return { label: "VIP", color: "bg-purple-100 text-purple-800" };
  if (totalSpent >= 100000 || orderCount >= 10) return { label: "High Value", color: "bg-amber-100 text-amber-800" };
  if (orderCount >= 3) return { label: "Regular", color: "bg-blue-100 text-blue-800" };
  return { label: "Occasional", color: "bg-gray-100 text-gray-700" };
}

/* --- TYPES --- */

interface CRMCustomer {
  id: string;
  type: "REGISTERED" | "WALK_IN";
  name: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  preferredCurrency?: string;
  shop?: { id: string; name: string; city: string } | null;
  orderCount: number;
  rfqCount: number;
  quoteCount: number;
  totalSpent: number;
  lastActive: string;
  createdAt: string;
  isOnlineNow?: boolean;
}

interface CustomerProfile {
  type: "REGISTERED" | "WALK_IN";
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string;
  country?: string;
  city?: string;
  currency?: string;
  preferredCurrency?: string;
  address?: string;
  shop?: { id: string; shopName: string; city: string } | null;
  purchaseStats?: any[];
  orderCount?: number;
  rfqCount?: number;
  quoteCount?: number;
  recentOrders?: any[];
  recentRfqs?: any[];
  recentQuotes?: any[];
  lastActive: string;
  memberSince: string;
  sessionSummary?: {
    totalSessions: number;
    totalTimeSec: number;
    totalPageViews: number;
    avgSessionSec: number;
    lastSeen: string | null;
    isOnlineNow: boolean;
  };
}

interface CustomerNote {
  id: string;
  note: string;
  category: string;
  createdAt: string;
  author: { firstName: string; lastName: string };
}

const NOTE_CATEGORIES = [
  { value: "GENERAL", label: "General" },
  { value: "FOLLOW_UP", label: "Follow-up" },
  { value: "PAYMENT", label: "Payment" },
  { value: "PREFERENCE", label: "Preference" },
  { value: "COMPLAINT", label: "Complaint" },
  { value: "VIP", label: "VIP" },
];

/* --- ENGAGEMENT --- */

function getEngagementTags(customer: CRMCustomer) {
  const tags: { label: string; color: string }[] = [];
  const now = new Date();
  const daysSinceCreation = Math.floor((now.getTime() - new Date(customer.createdAt).getTime()) / 86400000);
  const daysSinceActive = Math.floor((now.getTime() - new Date(customer.lastActive).getTime()) / 86400000);
  const totalActivity = customer.orderCount + customer.rfqCount + customer.quoteCount;
  if (daysSinceCreation <= 7) tags.push({ label: "New", color: "bg-green-100 text-green-700" });
  if (daysSinceActive > 60) tags.push({ label: "Inactive", color: "bg-gray-100 text-gray-600" });
  if (customer.totalSpent >= 100000) tags.push({ label: "High Value", color: "bg-amber-100 text-amber-700" });
  if (totalActivity >= 2) tags.push({ label: "Repeat", color: "bg-blue-100 text-blue-700" });
  return tags;
}

export function AdminCustomersCRM() {
  // -- List state --
  const [customers, setCustomers] = useState<CRMCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0, registeredTotal: 0, walkInTotal: 0, highValueCount: 0, newThisMonth: 0, onlineCount: 0,
  });
  // -- Profile sheet state --
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  // -- Notes --
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [noteCategory, setNoteCategory] = useState("GENERAL");
  const [addingNote, setAddingNote] = useState(false);
  // -- Sessions (read-only, registered only) --
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  // -- Message --
  const [msgContent, setMsgContent] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [aiIntent, setAiIntent] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);
  // -- Export --
  const [exporting, setExporting] = useState(false);

  // -- Fetch --
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCustomers({
        query: searchQuery || undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        page,
        limit: 25,
      });
      let list: CRMCustomer[] = res.data.customers || [];

      // Client-side sort (pass sortBy to API if backend supports it in the future)
      if (sortBy === "spent") list = [...list].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
      else if (sortBy === "orders") list = [...list].sort((a, b) => (b.orderCount + b.rfqCount + b.quoteCount) - (a.orderCount + a.rfqCount + a.quoteCount));
      else if (sortBy === "lastActive") list = [...list].sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());

      // Client-side online filter
      if (onlineOnly) list = list.filter((c) => c.isOnlineNow);

      setCustomers(list);
      setTotalPages(res.data.totalPages || 1);

      const raw: CRMCustomer[] = res.data.customers || [];
      const now = new Date();
      const monthAgo = new Date(now.getTime() - 30 * 86400000);
      setStats({
        total: res.data.total || 0,
        registeredTotal: res.data.registeredTotal || 0,
        walkInTotal: res.data.walkInTotal || 0,
        highValueCount: raw.filter((c) => (c.totalSpent || 0) >= 100000).length,
        newThisMonth: raw.filter((c) => new Date(c.createdAt) >= monthAgo).length,
        onlineCount: raw.filter((c) => c.isOnlineNow).length,
      });
    } catch {
      toast({ title: "Error", description: "Failed to load customers", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter, sortBy, onlineOnly, page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { setPage(1); }, [searchQuery, typeFilter, sortBy, onlineOnly]);

  // -- Open profile sheet --
  const openProfile = async (customerId: string, customerType: "REGISTERED" | "WALK_IN") => {
    setSelectedCustomerId(customerId);
    setSheetOpen(true);
    setLoadingProfile(true);
    setActiveTab("overview");
    setSessions([]);
    setMsgContent("");
    setAiIntent("");
    try {
      const [profileRes, notesRes] = await Promise.all([
        adminApi.getCustomerProfile(customerId),
        adminApi.getCustomerNotes(customerId),
      ]);
      setProfile(profileRes.data);
      setNotes(notesRes.data || []);
      if (customerType === "REGISTERED") {
        setLoadingSessions(true);
        try {
          const sessRes = await adminApi.getUserSessions(customerId);
          setSessions(sessRes.data.sessions || []);
        } catch { /* silent */ }
        finally { setLoadingSessions(false); }
      }
    } catch {
      toast({ title: "Error", description: "Failed to load customer profile", variant: "destructive" });
      setSheetOpen(false);
    } finally {
      setLoadingProfile(false);
    }
  };

  // -- Notes --
  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedCustomerId) return;
    setAddingNote(true);
    try {
      await adminApi.addCustomerNote(selectedCustomerId, { note: newNote.trim(), category: noteCategory });
      const notesRes = await adminApi.getCustomerNotes(selectedCustomerId);
      setNotes(notesRes.data || []);
      setNewNote("");
      setNoteCategory("GENERAL");
      toast({ title: "Note added" });
    } catch {
      toast({ title: "Error", description: "Failed to add note", variant: "destructive" });
    } finally { setAddingNote(false); }
  };

  // -- Message --
  const handleSendMessage = async () => {
    if (!profile || !msgContent.trim() || profile.type !== "REGISTERED") return;
    setSendingMsg(true);
    try {
      await api.post("/admin/messages/send", { recipientId: profile.id, content: msgContent.trim() });
      toast({ title: "Message Sent", description: `Message sent to ${profile.name}.` });
      setMsgContent("");
    } catch {
      toast({ variant: "destructive", title: "Failed", description: "Could not send message." });
    } finally { setSendingMsg(false); }
  };

  const handleAIGenerate = async () => {
    if (!aiIntent.trim() || !profile) return;
    setGeneratingAI(true);
    try {
      const res = await api.post("/admin/messages/ai-compose", {
        intent: aiIntent,
        recipientName: profile.name,
        recipientRole: "CUSTOMER",
      });
      setMsgContent(res.data.message || "");
    } catch {
      toast({ variant: "destructive", title: "AI Error", description: "Could not generate message." });
    } finally { setGeneratingAI(false); }
  };

  // -- Export CSV --
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await adminApi.getCustomers({
        query: searchQuery || undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        page: 1,
        limit: 10000,
      });
      const data: CRMCustomer[] = res.data.customers || [];
      if (!data.length) { toast({ title: "No data to export" }); return; }
      const headers = ["Name", "Type", "Phone", "Email", "City", "Country", "Currency", "Shop", "Orders", "RFQs", "Quotes", "Total Spent (NPR)", "Last Active", "Joined"];
      const rows = data.map((c) => [
        c.name, c.type === "REGISTERED" ? "Registered" : "Walk-in",
        c.phone || "", c.email || "", c.city || "", c.country || "",
        c.preferredCurrency || "NPR", c.shop?.name || "",
        c.orderCount, c.rfqCount, c.quoteCount, c.totalSpent,
        formatDate(c.lastActive), formatDate(c.createdAt),
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `Exported ${data.length} customers` });
    } catch {
      toast({ title: "Error", description: "Failed to export", variant: "destructive" });
    } finally { setExporting(false); }
  };

  // -- Derived --
  const preferredCurrency = profile?.preferredCurrency || profile?.currency || "NPR";
  const totalSpentNpr = profile?.purchaseStats?.[0]?.totalSpent || 0;

  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* -- STATS ROW -- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Customers", value: stats.total, icon: Users, color: "" },
          { label: "Registered", value: stats.registeredTotal, icon: UserCheck, color: "text-blue-600" },
          { label: "Walk-in", value: stats.walkInTotal, icon: Store, color: "text-amber-600" },
          { label: "High Value", value: stats.highValueCount, icon: Star, color: "text-purple-600" },
          { label: "New This Month", value: stats.newThisMonth, icon: TrendingUp, color: "text-green-600" },
          { label: "Online Now", value: stats.onlineCount, icon: Wifi, color: "text-emerald-600", dot: true },
        ].map(({ label, value, icon: Icon, color, dot }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`h-3.5 w-3.5 ${color || "text-muted-foreground"}`} />
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {dot && value > 0 && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* -- FILTERS -- */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="walkin">Walk-in</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Newest</SelectItem>
                <SelectItem value="lastActive">Last Active</SelectItem>
                <SelectItem value="spent">Most Spent</SelectItem>
                <SelectItem value="orders">Most Active</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={onlineOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlineOnly((v) => !v)}
              className={`gap-1.5 ${onlineOnly ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
            >
              <span className={`h-2 w-2 rounded-full ${onlineOnly ? "bg-white" : "bg-emerald-500 animate-pulse"}`} />
              Online Only
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* -- CUSTOMERS TABLE -- */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>{onlineOnly ? "No customers currently online" : "No customers found"}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact &amp; Currency</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-center">Orders | RFQs | Quotes</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => {
                    const tags = getEngagementTags(customer);
                    const tier = getValueTier(customer.totalSpent, customer.orderCount);
                    const currency = customer.preferredCurrency || "NPR";
                    const altAmount = formatInCurrency(customer.totalSpent, currency);
                    return (
                      <TableRow
                        key={`${customer.type}-${customer.id}`}
                        className="hover:bg-muted/40 cursor-pointer"
                        onClick={() => openProfile(customer.id, customer.type)}
                      >
                        {/* Customer */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                              {getInitials(customer.name || "?")}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-sm">{customer.name || "--"}</span>
                                {customer.isOnlineNow && (
                                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" title="Online now" />
                                )}
                              </div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tier.color}`}>
                                {tier.label}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Contact & Currency */}
                        <TableCell>
                          <div className="text-sm space-y-0.5">
                            {customer.phone && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />{customer.phone}
                              </div>
                            )}
                            {customer.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span className="truncate max-w-[140px]">{customer.email}</span>
                              </div>
                            )}
                            {currency !== "NPR" && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 w-fit">
                                <Globe className="h-2.5 w-2.5" />{formatCurrencyLabel(currency)}
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Source */}
                        <TableCell>
                          <Badge variant={customer.type === "REGISTERED" ? "default" : "secondary"} className="text-xs">
                            {customer.type === "REGISTERED" ? "Registered" : "Walk-in"}
                          </Badge>
                          {customer.shop && (
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Store className="h-3 w-3" />{customer.shop.name}
                            </div>
                          )}
                        </TableCell>

                        {/* Location */}
                        <TableCell>
                          {customer.city || customer.country ? (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {[customer.city, customer.country].filter(Boolean).join(", ")}
                            </div>
                          ) : "--"}
                        </TableCell>

                        {/* Activity */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2 text-xs">
                            <span className="flex items-center gap-0.5 text-muted-foreground">
                              <ShoppingBag className="h-3 w-3" />{customer.orderCount}
                            </span>
                            <span className="text-muted-foreground/40">|</span>
                            <span className="flex items-center gap-0.5 text-muted-foreground">
                              <MessageSquare className="h-3 w-3" />{customer.rfqCount}
                            </span>
                            <span className="text-muted-foreground/40">|</span>
                            <span className="flex items-center gap-0.5 text-muted-foreground">
                              <Zap className="h-3 w-3" />{customer.quoteCount}
                            </span>
                          </div>
                        </TableCell>

                        {/* Total Spent */}
                        <TableCell>
                          <div className="text-sm font-medium">{formatNPR(customer.totalSpent)}</div>
                          {altAmount && <div className="text-xs text-muted-foreground">{altAmount}</div>}
                        </TableCell>

                        {/* Tags */}
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {tags.length > 0
                              ? tags.map((t) => (
                                  <span key={t.label} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${t.color}`}>
                                    {t.label}
                                  </span>
                                ))
                              : <span className="text-muted-foreground text-xs">--</span>}
                          </div>
                        </TableCell>

                        {/* Last Active */}
                        <TableCell>
                          {customer.isOnlineNow ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />Online
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">{formatRelative(customer.lastActive)}</span>
                          )}
                        </TableCell>

                        {/* View */}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); openProfile(customer.id, customer.type); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({stats.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* -- CUSTOMER PROFILE SHEET -- */}
      <Sheet open={sheetOpen} onOpenChange={(o) => !o && setSheetOpen(false)}>
        <SheetContent side="right" className="w-full sm:w-[720px] sm:max-w-[720px] overflow-y-auto p-0">
          {loadingProfile ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !profile ? null : (
            <>
              {/* -- Sheet Header -- */}
              <div className="sticky top-0 z-10 bg-background border-b">
                <div className="flex items-start gap-4 p-6 pb-0">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {getInitials(profile.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetHeader className="text-left p-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SheetTitle className="text-xl">{profile.name}</SheetTitle>
                        {profile.sessionSummary?.isOnlineNow && (
                          <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />Online
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1.5">
                        <Badge variant={profile.type === "REGISTERED" ? "default" : "secondary"} className="text-xs">
                          {profile.type === "REGISTERED" ? "Registered" : "Walk-in"}
                        </Badge>
                        {profile.status && (
                          <Badge variant={profile.status === "ACTIVE" ? "default" : "destructive"} className="text-xs">
                            {profile.status}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs gap-1">
                          <Globe className="h-3 w-3" />{formatCurrencyLabel(preferredCurrency)}
                        </Badge>
                      </div>
                    </SheetHeader>
                  </div>
                </div>

                {/* Tab bar */}
                <div className="flex mt-4 px-6 overflow-x-auto">
                  {[
                    { value: "overview",     icon: User,          label: "Overview" },
                    { value: "transactions", icon: ShoppingBag,    label: "Transactions" },
                    ...(profile.type === "REGISTERED"
                      ? [{ value: "activity", icon: Activity, label: "Activity" }]
                      : []),
                    { value: "notes",        icon: MessageSquare,  label: `Notes (${notes.length})` },
                    ...(profile.type === "REGISTERED"
                      ? [{ value: "message", icon: Send, label: "Message" }]
                      : []),
                  ].map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setActiveTab(value)}
                      className={`flex items-center gap-1.5 px-3 pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === value
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />{label}
                    </button>
                  ))}
                </div>
              </div>

              {/* -- Tab Content -- */}
              <div className="p-6 space-y-5">

                {/* -- OVERVIEW -- */}
                {activeTab === "overview" && (
                  <div className="space-y-5">
                    {/* Lightweight session strip for registered customers */}
                    {profile.sessionSummary && (
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Sessions", value: profile.sessionSummary.totalSessions, icon: Monitor },
                          { label: "Time Spent", value: formatDuration(profile.sessionSummary.totalTimeSec), icon: Clock },
                          { label: "Page Views", value: profile.sessionSummary.totalPageViews, icon: Globe },
                        ].map(({ label, value, icon: Icon }) => (
                          <Card key={label}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-1 mb-1">
                                <Icon className="h-3 w-3 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">{label}</p>
                              </div>
                              <p className="text-lg font-bold">{value}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Contact */}
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact Information</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {profile.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />{profile.phone}
                            </div>
                          )}
                          {profile.email && (
                            <div className="flex items-center gap-2 min-w-0">
                              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="truncate">{profile.email}</span>
                            </div>
                          )}
                          {(profile.city || profile.country) && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                              {[profile.city, profile.country].filter(Boolean).join(", ")}
                            </div>
                          )}
                          {profile.shop && (
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                              {profile.shop.shopName}, {profile.shop.city}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Account details */}
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Account Details</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Preferred Currency</p>
                            <p className="font-medium">{formatCurrencyLabel(preferredCurrency)}</p>
                            {preferredCurrency !== "NPR" && (
                              <p className="text-xs text-muted-foreground">Base currency: NPR</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Member Since</p>
                            <p className="font-medium flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />{formatDate(profile.memberSince)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Last Active</p>
                            <p className="font-medium flex items-center gap-1">
                              <Wifi className="h-3.5 w-3.5 text-muted-foreground" />{formatRelative(profile.lastActive)}
                            </p>
                          </div>
                          {profile.sessionSummary?.lastSeen && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Last Seen Online</p>
                              <p className="font-medium">{formatRelative(profile.sessionSummary.lastSeen)}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* -- TRANSACTIONS -- */}
                {activeTab === "transactions" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-3">
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">Total Spent (NPR)</p>
                          <p className="text-xl font-bold mt-0.5">{formatNPR(totalSpentNpr)}</p>
                          {preferredCurrency !== "NPR" && totalSpentNpr > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">{formatInCurrency(totalSpentNpr, preferredCurrency)}</p>
                          )}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">Orders</p>
                          <p className="text-xl font-bold mt-0.5">{profile.orderCount || 0}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">RFQs</p>
                          <p className="text-xl font-bold mt-0.5">{profile.rfqCount || 0}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {profile.recentOrders && profile.recentOrders.length > 0 && (
                      <Card>
                        <CardContent className="p-4 space-y-3">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Orders</h4>
                          <div className="space-y-2">
                            {profile.recentOrders.map((order: any) => {
                              const alt = formatInCurrency(order.totalNpr, preferredCurrency);
                              return (
                                <div key={order.id} className="flex justify-between items-center text-sm border-b last:border-0 pb-2">
                                  <div>
                                    <span className="font-medium">#{order.orderNumber}</span>
                                    <span className="text-muted-foreground ml-2">{order.shop?.shopName}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-right">
                                    <div>
                                      <p>{formatNPR(order.totalNpr)}</p>
                                      {alt && <p className="text-xs text-muted-foreground">{alt}</p>}
                                    </div>
                                    <Badge variant="outline" className="text-xs">{order.status}</Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {profile.recentRfqs && profile.recentRfqs.length > 0 && (
                      <Card>
                        <CardContent className="p-4 space-y-3">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent RFQs</h4>
                          <div className="space-y-2">
                            {profile.recentRfqs.map((rfq: any) => (
                              <div key={rfq.id} className="flex justify-between items-center text-sm border-b last:border-0 pb-2">
                                <span className="font-medium">{rfq.jewelleryType}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">{formatDate(rfq.createdAt)}</span>
                                  <Badge variant="outline" className="text-xs">{rfq.status}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {profile.recentQuotes && profile.recentQuotes.length > 0 && (
                      <Card>
                        <CardContent className="p-4 space-y-3">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Walk-in Quotes</h4>
                          <div className="space-y-2">
                            {profile.recentQuotes.map((q: any) => {
                              const alt = formatInCurrency(q.totalPriceNpr, preferredCurrency);
                              return (
                                <div key={q.id} className="flex justify-between items-center text-sm border-b last:border-0 pb-2">
                                  <div>
                                    <span className="font-medium">#{q.quoteNumber}</span>
                                    <span className="text-muted-foreground ml-2">{q.jewelleryType}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-right">
                                    <div>
                                      <p>{formatNPR(q.totalPriceNpr)}</p>
                                      {alt && <p className="text-xs text-muted-foreground">{alt}</p>}
                                    </div>
                                    <Badge variant="outline" className="text-xs">{q.status}</Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {!profile.recentOrders?.length && !profile.recentRfqs?.length && !profile.recentQuotes?.length && (
                      <div className="text-center py-12 text-muted-foreground">
                        <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>No transactions yet</p>
                      </div>
                    )}
                  </div>
                )}

                {/* -- ACTIVITY (registered only) -- */}
                {activeTab === "activity" && (
                  <div className="space-y-5">
                    {profile.sessionSummary && (
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Total Sessions",  value: profile.sessionSummary.totalSessions,                         icon: Monitor },
                          { label: "Time Spent",      value: formatDuration(profile.sessionSummary.totalTimeSec),           icon: Clock },
                          { label: "Avg Session",     value: formatDuration(profile.sessionSummary.avgSessionSec),          icon: Activity },
                          { label: "Page Views",      value: profile.sessionSummary.totalPageViews,                         icon: Globe },
                          { label: "Last Seen",       value: formatRelative(profile.sessionSummary.lastSeen),               icon: Wifi },
                          { label: "Status",          value: profile.sessionSummary.isOnlineNow ? "Online" : "Offline",      icon: profile.sessionSummary.isOnlineNow ? Wifi : WifiOff },
                        ].map(({ label, value, icon: Icon }) => (
                          <Card key={label}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-1 mb-1">
                                <Icon className="h-3 w-3 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">{label}</p>
                              </div>
                              <p className="text-base font-bold">{value}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Recent browsing sessions for this customer.</p>
                      <Button
                        size="sm" variant="outline"
                        onClick={async () => {
                          if (!profile) return;
                          setLoadingSessions(true);
                          try {
                            const r = await adminApi.getUserSessions(profile.id);
                            setSessions(r.data.sessions || []);
                          } catch { /* silent */ }
                          finally { setLoadingSessions(false); }
                        }}
                        disabled={loadingSessions}
                        className="h-7 text-xs gap-1"
                      >
                        <RefreshCw className={`h-3 w-3 ${loadingSessions ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                    </div>

                    {loadingSessions ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : sessions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">No sessions recorded yet.</div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Started</TableHead>
                              <TableHead className="text-xs">Duration</TableHead>
                              <TableHead className="text-xs">Pages</TableHead>
                              <TableHead className="text-xs">Platform</TableHead>
                              <TableHead className="text-xs">Country</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sessions.map((s: any) => (
                              <TableRow key={s.id} className={s.isActive ? "bg-green-50 dark:bg-green-950/20" : ""}>
                                <TableCell className="text-xs">
                                  {s.isActive && <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />}
                                  {formatRelative(s.startedAt)}
                                </TableCell>
                                <TableCell className="text-xs">{s.durationSec ? formatDuration(s.durationSec) : "--"}</TableCell>
                                <TableCell className="text-xs">{s.pageViews}</TableCell>
                                <TableCell className="text-xs">
                                  <div className="flex items-center gap-1">
                                    {s.platform === "mobile" ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                                    {s.platform}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs">{s.country || "--"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}

                {/* -- NOTES -- */}
                {activeTab === "notes" && (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Note</h4>
                      <Textarea
                        placeholder="Add a note about this customer..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={3}
                      />
                      <div className="flex items-center gap-2">
                        <Select value={noteCategory} onValueChange={setNoteCategory}>
                          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {NOTE_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim() || addingNote}>
                          {addingNote && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Add Note
                        </Button>
                      </div>
                    </div>

                    {notes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">No notes yet. Add the first one above.</div>
                    ) : (
                      <div className="space-y-3">
                        {notes.map((n) => (
                          <div key={n.id} className="border rounded-lg p-4 text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">{n.category}</Badge>
                                <span className="text-muted-foreground text-xs">{n.author.firstName} {n.author.lastName}</span>
                              </div>
                              <span className="text-muted-foreground text-xs">{formatDate(n.createdAt)}</span>
                            </div>
                            <p className="leading-relaxed">{n.note}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* -- MESSAGE (registered only) -- */}
                {activeTab === "message" && (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI Compose</h4>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. Follow up on last order, re-engage inactive customer..."
                          value={aiIntent}
                          onChange={(e) => setAiIntent(e.target.value)}
                        />
                        <Button
                          size="sm"
                          onClick={handleAIGenerate}
                          disabled={!aiIntent.trim() || generatingAI}
                          variant="outline"
                        >
                          {generatingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      placeholder="Write a message to this customer..."
                      value={msgContent}
                      onChange={(e) => setMsgContent(e.target.value)}
                      rows={5}
                    />
                    <Button onClick={handleSendMessage} disabled={!msgContent.trim() || sendingMsg} className="w-full gap-2">
                      {sendingMsg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send Message
                    </Button>
                  </div>
                )}

              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
