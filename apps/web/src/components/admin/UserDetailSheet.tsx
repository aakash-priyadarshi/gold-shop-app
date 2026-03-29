"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/api";
import api from "@/lib/api";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Globe,
  Key,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Monitor,
  Phone,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  StickyNote,
  Store,
  Trash2,
  User as UserIcon,
  Wifi,
  WifiOff,
  XCircle,
  Plus,
  Star,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SessionSummary {
  totalSessions: number;
  totalTimeSec: number;
  totalPageViews: number;
  avgSessionSec: number;
  lastSeen: string | null;
  isOnlineNow: boolean;
}

interface RiskScore {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  chatViolations: number;
  recentSecurityEvents: number;
}

interface UserDetail {
  id: string;
  email: string;
  phone?: string;
  phoneVerifiedAt?: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  preferredLanguage?: string;
  preferredCurrency?: string;
  preferredCountry?: string;
  preferredCity?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  shop?: any;
  shops?: any[];
  sessionSummary?: SessionSummary;
  riskScore?: RiskScore;
}

interface Props {
  open: boolean;
  onClose: () => void;
  user: UserDetail | null;
  loading: boolean;
  onEdit: () => void;
  onSuspend: () => void;
  onActivate: () => void;
  onTogglePhoneVerify: () => void;
  onAddShop: () => void;
  onDeleteShop: (shopId: string) => void;
  verifyingPhone: boolean;
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

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function RiskBadge({ level }: { level: "LOW" | "MEDIUM" | "HIGH" }) {
  if (level === "HIGH") return (
    <Badge className="bg-red-100 text-red-700 gap-1">
      <ShieldAlert className="h-3 w-3" /> High Risk
    </Badge>
  );
  if (level === "MEDIUM") return (
    <Badge className="bg-amber-100 text-amber-700 gap-1">
      <AlertTriangle className="h-3 w-3" /> Medium Risk
    </Badge>
  );
  return (
    <Badge className="bg-green-100 text-green-700 gap-1">
      <ShieldCheck className="h-3 w-3" /> Low Risk
    </Badge>
  );
}

function OnlineDot({ isOnline }: { isOnline: boolean }) {
  return isOnline ? (
    <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block" />
      Online
    </span>
  ) : null;
}

export function UserDetailSheet({
  open, onClose, user, loading,
  onEdit, onSuspend, onActivate, onTogglePhoneVerify, onAddShop, onDeleteShop,
  verifyingPhone,
}: Props) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [authSessions, setAuthSessions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [msgContent, setMsgContent] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiIntent, setAiIntent] = useState("");
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (open && user) {
      setActiveTab("profile");
      setSessions([]);
      setAuthSessions([]);
      setAuditLogs([]);
      setMsgContent("");
      setAiIntent("");
    }
  }, [open, user?.id]);

  const loadSessions = async () => {
    if (!user || loadingSessions) return;
    setLoadingSessions(true);
    try {
      const [webRes, authRes] = await Promise.all([
        adminApi.getUserSessions(user.id),
        adminApi.getUserAuthSessions(user.id),
      ]);
      setSessions(webRes.data.sessions || []);
      setAuthSessions(authRes.data.sessions || []);
    } catch { /* silent */ }
    finally { setLoadingSessions(false); }
  };

  const loadAuditLog = async () => {
    if (!user || loadingAudit) return;
    setLoadingAudit(true);
    try {
      const res = await adminApi.getUserAuditLog(user.id);
      setAuditLogs(res.data.logs || []);
    } catch { /* silent */ }
    finally { setLoadingAudit(false); }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "activity" && sessions.length === 0) loadSessions();
    if (tab === "audit" && auditLogs.length === 0) loadAuditLog();
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!user) return;
    setRevokingId(sessionId);
    try {
      await adminApi.revokeAuthSession(user.id, sessionId);
      setAuthSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast({ title: "Session Revoked", description: "The auth token has been invalidated." });
    } catch {
      toast({ variant: "destructive", title: "Failed", description: "Could not revoke session." });
    } finally { setRevokingId(null); }
  };

  const handleSendMessage = async () => {
    if (!user || !msgContent.trim()) return;
    setSendingMsg(true);
    try {
      await api.post("/admin/messages/send", {
        recipientId: user.id,
        content: msgContent.trim(),
      });
      toast({ title: "Message Sent", description: `Message sent to ${user.firstName}.` });
      setMsgContent("");
    } catch {
      toast({ variant: "destructive", title: "Failed", description: "Could not send message." });
    } finally { setSendingMsg(false); }
  };

  const handleAIGenerate = async () => {
    if (!aiIntent.trim() || !user) return;
    setGeneratingAI(true);
    try {
      const res = await api.post("/admin/messages/ai-compose", {
        intent: aiIntent,
        recipientName: `${user.firstName} ${user.lastName}`,
        recipientRole: user.role,
      });
      setMsgContent(res.data.message || "");
    } catch {
      toast({ variant: "destructive", title: "AI Error", description: "Could not generate message." });
    } finally { setGeneratingAI(false); }
  };

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "";

  const ss = user?.sessionSummary;
  const risk = user?.riskScore;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[720px] sm:max-w-[720px] overflow-y-auto p-0"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !user ? null : (
          <>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background border-b">
              <div className="flex items-start gap-4 p-6 pb-0">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SheetTitle className="text-xl">
                      {user.firstName} {user.lastName}
                    </SheetTitle>
                    {ss?.isOnlineNow && <OnlineDot isOnline />}
                    {risk && <RiskBadge level={risk.level} />}
                  </div>
                  <SheetDescription className="text-sm mt-0.5">
                    {user.email} · {user.role}
                  </SheetDescription>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {user.status === "ACTIVE" ? (
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    ) : user.status === "SUSPENDED" ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="secondary">{user.status}</Badge>
                    )}
                    {user.role !== "ADMIN" && (
                      user.status === "ACTIVE" ? (
                        <Button size="sm" variant="outline" onClick={onSuspend}
                          className="h-6 text-xs text-amber-600 border-amber-300 hover:bg-amber-50">
                          Suspend
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={onActivate}
                          className="h-6 text-xs text-green-600 border-green-300 hover:bg-green-50">
                          Activate
                        </Button>
                      )
                    )}
                    <Button size="sm" variant="outline" onClick={onEdit}
                      className="h-6 text-xs">
                      Edit
                    </Button>
                  </div>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-4">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-6 pb-0 gap-1 overflow-x-auto">
                  {[
                    { value: "profile", icon: UserIcon, label: "Profile" },
                    { value: "activity", icon: Activity, label: "Activity" },
                    { value: "shops", icon: Store, label: "Shops" },
                    { value: "audit", icon: Shield, label: "Audit Log" },
                    { value: "message", icon: MessageSquare, label: "Message" },
                  ].map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => handleTabChange(value)}
                      className={`flex items-center gap-1.5 px-3 pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === value
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Tabs Content */}
            <div className="p-6">
              {/* ── PROFILE TAB ── */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  {/* Session summary strip */}
                  {ss && (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Total Sessions", value: ss.totalSessions },
                        { label: "Time Spent", value: formatDuration(ss.totalTimeSec) },
                        { label: "Page Views", value: ss.totalPageViews },
                      ].map(({ label, value }) => (
                        <Card key={label}>
                          <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="text-lg font-bold">{value}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Email</Label>
                      <p className="flex items-center gap-2 text-sm">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        {user.email}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Phone</Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{user.phone || "—"}</span>
                        {user.phone && (
                          user.phoneVerifiedAt
                            ? <Badge className="bg-green-100 text-green-700 gap-1 text-xs">
                                <CheckCircle className="h-3 w-3" /> Verified
                              </Badge>
                            : <Badge variant="secondary" className="text-xs gap-1">
                                <XCircle className="h-3 w-3" /> Unverified
                              </Badge>
                        )}
                      </div>
                      {user.phone && (
                        <Button size="sm" variant="outline" onClick={onTogglePhoneVerify}
                          disabled={verifyingPhone}
                          className={`mt-1 h-7 text-xs ${user.phoneVerifiedAt
                            ? "text-red-600 border-red-200 hover:bg-red-50"
                            : "text-green-600 border-green-200 hover:bg-green-50"
                          }`}>
                          {verifyingPhone && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          {user.phoneVerifiedAt ? "Remove Verification" : "Manually Verify"}
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Language</Label>
                      <p className="text-sm">{user.preferredLanguage || "en"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Currency</Label>
                      <p className="text-sm">{user.preferredCurrency || "NPR"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Country / City</Label>
                      <p className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {[user.preferredCity, user.preferredCountry].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Joined</Label>
                      <p className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatDateTime(user.createdAt)}
                      </p>
                    </div>
                    {user.lastLoginAt && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Last Login</Label>
                        <p className="flex items-center gap-1 text-sm">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDateTime(user.lastLoginAt)}
                        </p>
                      </div>
                    )}
                    {ss?.lastSeen && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Last Seen</Label>
                        <p className="flex items-center gap-1 text-sm">
                          <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatRelative(ss.lastSeen)}
                        </p>
                      </div>
                    )}
                  </div>

                  {risk && (
                    <div className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Risk Assessment</h4>
                        <RiskBadge level={risk.level} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Chat Violations</p>
                          <p className={`font-semibold ${risk.chatViolations > 0 ? "text-red-600" : "text-green-600"}`}>
                            {risk.chatViolations}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Security Events (30d)</p>
                          <p className={`font-semibold ${risk.recentSecurityEvents > 2 ? "text-red-600" : "text-green-600"}`}>
                            {risk.recentSecurityEvents}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── ACTIVITY TAB ── */}
              {activeTab === "activity" && (
                <div className="space-y-6">
                  {ss && (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Total Sessions", value: ss.totalSessions, icon: Monitor },
                        { label: "Time Spent", value: formatDuration(ss.totalTimeSec), icon: Clock },
                        { label: "Avg Session", value: formatDuration(ss.avgSessionSec), icon: Activity },
                        { label: "Page Views", value: ss.totalPageViews, icon: Globe },
                        { label: "Last Seen", value: formatRelative(ss.lastSeen), icon: Wifi },
                        { label: "Status", value: ss.isOnlineNow ? "Online" : "Offline", icon: ss.isOnlineNow ? Wifi : WifiOff },
                      ].map(({ label, value, icon: Icon }) => (
                        <Card key={label}>
                          <CardContent className="p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">{label}</p>
                            </div>
                            <p className="text-base font-bold">{value}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm">Web Sessions</h4>
                      <Button size="sm" variant="outline" onClick={loadSessions} disabled={loadingSessions} className="h-7 text-xs gap-1">
                        <RefreshCw className={`h-3 w-3 ${loadingSessions ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                    </div>
                    {loadingSessions ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : sessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No sessions recorded yet.</p>
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
                              <TableHead className="text-xs">Ended By</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sessions.map((s: any) => (
                              <TableRow key={s.id} className={s.isActive ? "bg-green-50 dark:bg-green-950/20" : ""}>
                                <TableCell className="text-xs">
                                  {s.isActive && <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />}
                                  {formatRelative(s.startedAt)}
                                </TableCell>
                                <TableCell className="text-xs">{s.durationSec ? formatDuration(s.durationSec) : "—"}</TableCell>
                                <TableCell className="text-xs">{s.pageViews}</TableCell>
                                <TableCell className="text-xs">
                                  <div className="flex items-center gap-1">
                                    {s.platform === "mobile" ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                                    {s.platform}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs">{s.country || "—"}</TableCell>
                                <TableCell className="text-xs">{s.closedBy || (s.isActive ? "Active" : "—")}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-3">Active Auth Tokens</h4>
                    {authSessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No active JWT sessions.</p>
                    ) : (
                      <div className="space-y-2">
                        {authSessions.map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                            <div className="text-xs space-y-0.5">
                              <p className="flex items-center gap-1">
                                <Key className="h-3 w-3 text-muted-foreground" />
                                {s.ipAddress || "Unknown IP"}
                              </p>
                              <p className="text-muted-foreground">
                                {s.userAgent?.substring(0, 60) || "Unknown device"}
                              </p>
                              <p className="text-muted-foreground">
                                Created {formatRelative(s.createdAt)} · Expires {formatRelative(s.expiresAt)}
                              </p>
                            </div>
                            <Button
                              size="sm" variant="destructive"
                              disabled={revokingId === s.id}
                              onClick={() => handleRevokeSession(s.id)}
                              className="h-7 text-xs gap-1 shrink-0"
                            >
                              {revokingId === s.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <LogOut className="h-3 w-3" />}
                              Revoke
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── SHOPS TAB ── */}
              {activeTab === "shops" && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" onClick={onAddShop}
                      className="bg-green-600 hover:bg-green-700 gap-1">
                      <Plus className="h-4 w-4" /> Add Shop
                    </Button>
                  </div>
                  {(user.shops || (user.shop ? [user.shop] : [])).filter(Boolean).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Store className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No shops yet.</p>
                      <p className="text-sm">Click &quot;Add Shop&quot; to create one.</p>
                    </div>
                  ) : (
                    (user.shops || [user.shop]).filter(Boolean).map((shop: any, i: number) => (
                      <div key={shop.id} className={`border rounded-lg p-4 ${i > 0 ? "mt-4" : ""}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                              <Store className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{shop.shopName}</p>
                              <div className="flex gap-1 mt-0.5">
                                {shop.isVerified
                                  ? <Badge className="bg-green-100 text-green-700 text-xs">Verified</Badge>
                                  : <Badge className="bg-amber-100 text-amber-700 text-xs">Pending</Badge>}
                                {shop.isActive
                                  ? <Badge className="bg-blue-100 text-blue-700 text-xs">Active</Badge>
                                  : <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                              </div>
                            </div>
                          </div>
                          <Button size="sm" variant="destructive" onClick={() => onDeleteShop(shop.id)}
                            className="h-7 text-xs gap-1">
                            <Trash2 className="h-3 w-3" /> Delete
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">Location</p>
                            <p>{[shop.city, shop.country].filter(Boolean).join(", ") || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Contact</p>
                            <p>{shop.contactPhone || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Email</p>
                            <p>{shop.contactEmail || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Created</p>
                            <p>{formatRelative(shop.createdAt)}</p>
                          </div>
                        </div>
                        {shop.supportedMaterials?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {shop.supportedMaterials.map((m: string) => (
                              <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── AUDIT LOG TAB ── */}
              {activeTab === "audit" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Recent Actions</h4>
                    <Button size="sm" variant="outline" onClick={loadAuditLog} disabled={loadingAudit} className="h-7 text-xs gap-1">
                      <RefreshCw className={`h-3 w-3 ${loadingAudit ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>
                  {loadingAudit ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">No audit log entries found.</p>
                  ) : (
                    <div className="space-y-2">
                      {auditLogs.map((log: any) => (
                        <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg text-xs">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{log.action.replace(/_/g, " ")}</p>
                            <p className="text-muted-foreground mt-0.5">
                              {log.resourceType} {log.resourceId?.substring(0, 8)}…
                              {log.ipAddress && ` · ${log.ipAddress}`}
                            </p>
                          </div>
                          <p className="text-muted-foreground shrink-0">{formatRelative(log.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── MESSAGE TAB ── */}
              {activeTab === "message" && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/40 rounded-lg">
                    <p className="text-sm font-medium mb-1">Sending to</p>
                    <p className="text-sm text-muted-foreground">{user.firstName} {user.lastName} — {user.email}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">AI Compose</Label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Welcome them and ask about KYC…"
                        value={aiIntent}
                        onChange={(e) => setAiIntent(e.target.value)}
                        className="flex-1 border rounded-md px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-ring"
                      />
                      <Button size="sm" variant="outline" onClick={handleAIGenerate}
                        disabled={generatingAI || !aiIntent.trim()}
                        className="gap-1 shrink-0">
                        {generatingAI
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Star className="h-3.5 w-3.5 text-amber-500" />}
                        Generate
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Describe what you want to say and AI will write the full message.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Message</Label>
                    <Textarea
                      placeholder="Type your message here…"
                      value={msgContent}
                      onChange={(e) => setMsgContent(e.target.value)}
                      rows={6}
                      className="resize-none"
                    />
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={handleSendMessage}
                    disabled={sendingMsg || !msgContent.trim()}
                  >
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
  );
}
