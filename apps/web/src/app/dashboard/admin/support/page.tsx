'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ShieldCheck,
  MessageSquare,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Clock,
  TrendingUp,
  Bot,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Users,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supportApi, ticketsApi } from '@/lib/api';

interface DashboardStats {
  pendingRefunds: number;
  totalOrders: number;
  activeConversations: number;
  lockedConversations: number;
  recentViolations24h: number;
}

interface QueuedOrder {
  id: string;
  orderNumber: string;
  status: string;
  detailedStatus: string;
  totalNpr: number;
  displayCurrency: string;
  createdAt: string;
  buyer?: { name: string; email: string };
  shop?: { name: string };
}

interface FlaggedConversation {
  id: string;
  status: string;
  createdAt: string;
  buyer?: { name: string };
  shop?: { name: string };
  order?: { orderNumber: string };
  _count?: { messages: number };
}

interface PendingVerification {
  id: string;
  status: string;
  type: string;
  createdAt: string;
  user?: { name: string; email: string };
}

interface ActivityItem {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: any;
  createdAt: string;
  user?: { name: string };
}

interface BotLog {
  id: string;
  role: string;
  content: string;
  actionTaken?: string;
  confidence?: number;
  ipAddress?: string;
  createdAt: string;
}

interface BotSession {
  id: string;
  ipAddress?: string;
  messageCount: number;
  escalated: boolean;
  leadIntents: string[];
  guestName?: string;
  guestEmail?: string;
  startedAt: string;
  lastMessageAt: string;
  logs: BotLog[];
}

interface BotStats {
  totalSessions: number;
  escalatedSessions: number;
  escalationRate: string;
  avgMessagesPerSession: string;
  intentBreakdown: { intent: string; count: number }[];
  dailySessions: { day: string; count: number }[];
}

const INTENT_COLOURS: Record<string, string> = {
  pricing: 'bg-green-100 text-green-800',
  trial: 'bg-blue-100 text-blue-800',
  comparison: 'bg-purple-100 text-purple-800',
  onboarding: 'bg-yellow-100 text-yellow-800',
  complaint: 'bg-red-100 text-red-800',
  offline_pos: 'bg-orange-100 text-orange-800',
  compliance: 'bg-teal-100 text-teal-800',
};

function IntentBadge({ intent }: { intent: string }) {
  const cls = INTENT_COLOURS[intent] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {intent}
    </span>
  );
}

function SessionRow({ session }: { session: BotSession }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">
                {session.guestName ?? session.ipAddress ?? 'Anonymous'}
              </span>
              {session.guestEmail && (
                <span className="text-xs text-muted-foreground">{session.guestEmail}</span>
              )}
              {session.escalated && (
                <Badge variant="destructive" className="text-xs">escalated</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {session.leadIntents.map((i) => (
                <IntentBadge key={i} intent={i} />
              ))}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-xs text-muted-foreground">
            {new Date(session.startedAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </p>
          <p className="text-xs text-muted-foreground">{session.messageCount} messages</p>
        </div>
      </button>

      {open && (
        <div className="border-t bg-slate-50 divide-y max-h-80 overflow-y-auto">
          {session.logs.map((log) => (
            <div key={log.id} className="px-4 py-2.5 flex gap-3 text-sm">
              <span
                className={`uppercase text-[10px] font-bold pt-0.5 w-16 shrink-0 text-right ${
                  log.role === 'assistant' ? 'text-blue-500' : 'text-slate-400'
                }`}
              >
                {log.role}
              </span>
              <div className="flex-1 min-w-0">
                <p className={log.role === 'assistant' ? 'text-blue-900 font-medium' : 'text-slate-700'}>
                  {log.content}
                </p>
                {log.actionTaken && (
                  <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    <Zap className="h-3 w-3" /> {log.actionTaken}
                  </span>
                )}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SupportDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<QueuedOrder[]>([]);
  const [flagged, setFlagged] = useState<FlaggedConversation[]>([]);
  const [verifications, setVerifications] = useState<PendingVerification[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Bot session state
  const [botStats, setBotStats] = useState<BotStats | null>(null);
  const [botSessions, setBotSessions] = useState<BotSession[]>([]);
  const [botPage, setBotPage] = useState(1);
  const [botTotal, setBotTotal] = useState(0);
  const [botLoading, setBotLoading] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (activeTab === 'bot') loadBot(botPage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, botPage]);

  async function loadAll() {
    setLoading(true);
    try {
      const [statsRes, ordersRes, flaggedRes, verificationsRes, activityRes] = await Promise.all([
        supportApi.getDashboard(),
        supportApi.getOrders(1, 20),
        supportApi.getFlaggedConversations(),
        supportApi.getPendingVerifications(),
        supportApi.getRecentActivity(),
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data?.orders || ordersRes.data || []);
      setFlagged(flaggedRes.data || []);
      setVerifications(verificationsRes.data || []);
      setActivity(activityRes.data || []);
    } catch (e) {
      console.error('Failed to load support dashboard', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadBot(page: number) {
    setBotLoading(true);
    try {
      const [statsRes, sessionsRes] = await Promise.all([
        botStats ? Promise.resolve({ data: botStats }) : ticketsApi.getBotStats(),
        ticketsApi.getBotSessions(page, 20),
      ]);
      setBotStats(statsRes.data);
      setBotSessions(sessionsRes.data?.sessions ?? []);
      setBotTotal(sessionsRes.data?.total ?? 0);
    } catch (e) {
      console.error('Failed to load bot data', e);
    } finally {
      setBotLoading(false);
    }
  }

  const botTotalPages = Math.ceil(botTotal / 20);

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Support Dashboard</h1>
            </div>
            <Button variant="outline" size="sm" onClick={loadAll}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>

          {/* Stat cards */}
          {stats && (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <RotateCcw className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
                  <p className="text-2xl font-bold">{stats.pendingRefunds}</p>
                  <p className="text-xs text-muted-foreground">Pending Refunds</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                  <p className="text-2xl font-bold">{stats.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <MessageSquare className="h-5 w-5 mx-auto mb-1 text-green-600" />
                  <p className="text-2xl font-bold">{stats.activeConversations}</p>
                  <p className="text-xs text-muted-foreground">Active Chats</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-red-600" />
                  <p className="text-2xl font-bold">{stats.lockedConversations}</p>
                  <p className="text-xs text-muted-foreground">Locked Chats</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                  <p className="text-2xl font-bold">{stats.recentViolations24h}</p>
                  <p className="text-xs text-muted-foreground">Violations (24h)</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Orders Queue</TabsTrigger>
              <TabsTrigger value="flagged">
                Flagged Chats
                {flagged.length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {flagged.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="verifications">
                KYC Pending
                {verifications.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {verifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              <TabsTrigger value="bot">
                <Bot className="h-3.5 w-3.5 mr-1" />
                Bot Chats
              </TabsTrigger>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-blue-600 hover:text-blue-700"
                onClick={() => window.location.href = '/dashboard/admin/support/contacts'}
              >
                Manage Global Contacts <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </TabsList>

            {/* Orders Queue */}
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Orders Queue</CardTitle>
                  <CardDescription>Orders requiring attention or processing</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : orders.length === 0 ? (
                    <p className="text-muted-foreground">No orders in queue</p>
                  ) : (
                    <div className="space-y-2">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <span className="font-medium">{order.orderNumber}</span>
                            <p className="text-sm text-muted-foreground">
                              {order.buyer?.name} → {order.shop?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{order.detailedStatus || order.status}</Badge>
                            <p className="text-sm mt-1">
                              {order.displayCurrency} {order.totalNpr}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Flagged Conversations */}
            <TabsContent value="flagged">
              <Card>
                <CardHeader>
                  <CardTitle>Flagged Conversations</CardTitle>
                  <CardDescription>Locked or violation-flagged chat threads</CardDescription>
                </CardHeader>
                <CardContent>
                  {flagged.length === 0 ? (
                    <p className="text-muted-foreground">No flagged conversations</p>
                  ) : (
                    <div className="space-y-2">
                      {flagged.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <span className="font-medium">
                              {c.buyer?.name} ↔ {c.shop?.name}
                            </span>
                            {c.order && (
                              <p className="text-sm text-muted-foreground">
                                Order: {c.order.orderNumber}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {c._count?.messages || 0} messages
                            </p>
                          </div>
                          <Badge variant={c.status === 'LOCKED' ? 'destructive' : 'outline'}>
                            {c.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* KYC Pending */}
            <TabsContent value="verifications">
              <Card>
                <CardHeader>
                  <CardTitle>Pending KYC Verifications</CardTitle>
                  <CardDescription>Users waiting for identity verification</CardDescription>
                </CardHeader>
                <CardContent>
                  {verifications.length === 0 ? (
                    <p className="text-muted-foreground">No pending verifications</p>
                  ) : (
                    <div className="space-y-2">
                      {verifications.map((v) => (
                        <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <span className="font-medium">{v.user?.name}</span>
                            <p className="text-sm text-muted-foreground">{v.user?.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Submitted: {new Date(v.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="secondary">{v.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recent Activity */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest audit log entries</CardDescription>
                </CardHeader>
                <CardContent>
                  {activity.length === 0 ? (
                    <p className="text-muted-foreground">No recent activity</p>
                  ) : (
                    <div className="space-y-2">
                      {activity.map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <span className="font-medium capitalize">
                              {a.action.replace(/_/g, ' ').toLowerCase()}
                            </span>
                            <p className="text-sm text-muted-foreground">
                              {a.resourceType} · {a.user?.name || 'System'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(a.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="outline">{a.resourceType}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Bot Chats Tab ─── */}
            <TabsContent value="bot" className="space-y-4">

              {/* KPI strip */}
              {botStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <Users className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                      <p className="text-2xl font-bold">{botStats.totalSessions}</p>
                      <p className="text-xs text-muted-foreground">Total Sessions</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <ArrowUpRight className="h-5 w-5 mx-auto mb-1 text-red-500" />
                      <p className="text-2xl font-bold">{botStats.escalatedSessions}</p>
                      <p className="text-xs text-muted-foreground">
                        Escalated · <span className="text-red-500 font-semibold">{botStats.escalationRate}</span>
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <MessageSquare className="h-5 w-5 mx-auto mb-1 text-green-600" />
                      <p className="text-2xl font-bold">{botStats.avgMessagesPerSession}</p>
                      <p className="text-xs text-muted-foreground">Avg Messages / Session</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <Bot className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                      <p className="text-xl font-bold text-green-600 flex items-center justify-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Online
                      </p>
                      <p className="text-xs text-muted-foreground">Gemini 2.5 Flash</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Intent breakdown */}
              {botStats && botStats.intentBreakdown.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Lead Intent Breakdown</CardTitle>
                    <CardDescription>What visitors are asking about (last 12 months)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {botStats.intentBreakdown.map((r) => (
                        <div key={r.intent} className="flex items-center gap-1.5">
                          <IntentBadge intent={r.intent} />
                          <span className="text-sm font-semibold">{r.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Daily trend (last 30 days) */}
              {botStats && botStats.dailySessions.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Sessions — Last 30 Days</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-1 h-20">
                      {botStats.dailySessions.map((d) => {
                        const max = Math.max(...botStats.dailySessions.map((x) => x.count), 1);
                        const pct = Math.round((d.count / max) * 100);
                        return (
                          <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                            <div
                              className="w-full bg-blue-400 rounded-sm transition-all hover:bg-blue-600"
                              style={{ height: `${Math.max(pct, 4)}%` }}
                            />
                            <span className="text-[9px] text-muted-foreground hidden group-hover:block absolute -top-4 bg-white border px-1 rounded shadow text-nowrap">
                              {d.day}: {d.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Conversation list */}
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Conversation History</CardTitle>
                    <CardDescription>
                      {botTotal} total sessions · click any row to read the full chat
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => loadBot(botPage)}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {botLoading ? (
                    <p className="text-sm text-muted-foreground">Loading conversations…</p>
                  ) : botSessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No conversations yet.</p>
                  ) : (
                    botSessions.map((s) => <SessionRow key={s.id} session={s} />)
                  )}

                  {/* Pagination */}
                  {botTotalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={botPage === 1}
                        onClick={() => setBotPage((p) => p - 1)}
                      >
                        Previous
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Page {botPage} / {botTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={botPage >= botTotalPages}
                        onClick={() => setBotPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}


interface DashboardStats {
  pendingRefunds: number;
  totalOrders: number;
  activeConversations: number;
  lockedConversations: number;
  recentViolations24h: number;
}

interface QueuedOrder {
  id: string;
  orderNumber: string;
  status: string;
  detailedStatus: string;
  totalNpr: number;
  displayCurrency: string;
  createdAt: string;
  buyer?: { name: string; email: string };
  shop?: { name: string };
}

interface FlaggedConversation {
  id: string;
  status: string;
  createdAt: string;
  buyer?: { name: string };
  shop?: { name: string };
  order?: { orderNumber: string };
  _count?: { messages: number };
}

interface PendingVerification {
  id: string;
  status: string;
  type: string;
  createdAt: string;
  user?: { name: string; email: string };
}

interface ActivityItem {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: any;
  createdAt: string;
  user?: { name: string };
}

export default function SupportDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<QueuedOrder[]>([]);
  const [flagged, setFlagged] = useState<FlaggedConversation[]>([]);
  const [verifications, setVerifications] = useState<PendingVerification[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [aiAnalytics, setAiAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [statsRes, ordersRes, flaggedRes, verificationsRes, activityRes, aiAnalyticsRes] = await Promise.all([
        supportApi.getDashboard(),
        supportApi.getOrders(1, 20),
        supportApi.getFlaggedConversations(),
        supportApi.getPendingVerifications(),
        supportApi.getRecentActivity(),
        supportApi.getAiAnalytics().catch(() => ({ data: null })),
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data?.orders || ordersRes.data || []);
      setFlagged(flaggedRes.data || []);
      setVerifications(verificationsRes.data || []);
      setActivity(activityRes.data || []);
      setAiAnalytics(aiAnalyticsRes?.data || null);
    } catch (e) {
      console.error('Failed to load support dashboard', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Support Dashboard</h1>
            </div>
            <Button variant="outline" size="sm" onClick={loadAll}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>

          {/* Stat cards */}
          {stats && (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <RotateCcw className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
                  <p className="text-2xl font-bold">{stats.pendingRefunds}</p>
                  <p className="text-xs text-muted-foreground">Pending Refunds</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                  <p className="text-2xl font-bold">{stats.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <MessageSquare className="h-5 w-5 mx-auto mb-1 text-green-600" />
                  <p className="text-2xl font-bold">{stats.activeConversations}</p>
                  <p className="text-xs text-muted-foreground">Active Chats</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-red-600" />
                  <p className="text-2xl font-bold">{stats.lockedConversations}</p>
                  <p className="text-xs text-muted-foreground">Locked Chats</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                  <p className="text-2xl font-bold">{stats.recentViolations24h}</p>
                  <p className="text-xs text-muted-foreground">Violations (24h)</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Orders Queue</TabsTrigger>
              <TabsTrigger value="flagged">
                Flagged Chats
                {flagged.length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {flagged.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="verifications">
                KYC Pending
                {verifications.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {verifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              <TabsTrigger value="bot">Bot Analytics</TabsTrigger>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto text-blue-600 hover:text-blue-700"
                onClick={() => window.location.href = '/dashboard/admin/support/contacts'}
              >
                Manage Global Contacts &rarr;
              </Button>
            </TabsList>

            {/* Orders Queue */}
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Orders Queue</CardTitle>
                  <CardDescription>Orders requiring attention or processing</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : orders.length === 0 ? (
                    <p className="text-muted-foreground">No orders in queue</p>
                  ) : (
                    <div className="space-y-2">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <span className="font-medium">{order.orderNumber}</span>
                            <p className="text-sm text-muted-foreground">
                              {order.buyer?.name} → {order.shop?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{order.detailedStatus || order.status}</Badge>
                            <p className="text-sm mt-1">
                              {order.displayCurrency} {order.totalNpr}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Flagged Conversations */}
            <TabsContent value="flagged">
              <Card>
                <CardHeader>
                  <CardTitle>Flagged Conversations</CardTitle>
                  <CardDescription>Locked or violation-flagged chat threads</CardDescription>
                </CardHeader>
                <CardContent>
                  {flagged.length === 0 ? (
                    <p className="text-muted-foreground">No flagged conversations</p>
                  ) : (
                    <div className="space-y-2">
                      {flagged.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <span className="font-medium">
                              {c.buyer?.name} ↔ {c.shop?.name}
                            </span>
                            {c.order && (
                              <p className="text-sm text-muted-foreground">
                                Order: {c.order.orderNumber}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {c._count?.messages || 0} messages
                            </p>
                          </div>
                          <Badge
                            variant={c.status === 'LOCKED' ? 'destructive' : 'outline'}
                          >
                            {c.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* KYC Pending */}
            <TabsContent value="verifications">
              <Card>
                <CardHeader>
                  <CardTitle>Pending KYC Verifications</CardTitle>
                  <CardDescription>Users waiting for identity verification</CardDescription>
                </CardHeader>
                <CardContent>
                  {verifications.length === 0 ? (
                    <p className="text-muted-foreground">No pending verifications</p>
                  ) : (
                    <div className="space-y-2">
                      {verifications.map((v) => (
                        <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <span className="font-medium">{v.user?.name}</span>
                            <p className="text-sm text-muted-foreground">{v.user?.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Submitted: {new Date(v.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="secondary">{v.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recent Activity */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest audit log entries</CardDescription>
                </CardHeader>
                <CardContent>
                  {activity.length === 0 ? (
                    <p className="text-muted-foreground">No recent activity</p>
                  ) : (
                    <div className="space-y-2">
                      {activity.map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <span className="font-medium capitalize">
                              {a.action.replace(/_/g, ' ').toLowerCase()}
                            </span>
                            <p className="text-sm text-muted-foreground">
                              {a.resourceType} · {a.user?.name || 'System'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(a.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="outline">{a.resourceType}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            {/* Bot Analytics */}
            <TabsContent value="bot">
              <Card>
                <CardHeader>
                  <CardTitle>AI Operations Dashboard</CardTitle>
                  <CardDescription>Live health & performance of Gemini Support Core</CardDescription>
                </CardHeader>
                <CardContent>
                  {!aiAnalytics ? (
                    <p className="text-muted-foreground">Loading AI Metrics...</p>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between">
                            <div>
                               <p className="text-sm font-medium text-muted-foreground">Status</p>
                               <p className="text-xl font-bold text-green-600 flex items-center gap-1">
                                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span> Online
                               </p>
                            </div>
                         </div>
                         <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between">
                            <div>
                               <p className="text-sm font-medium text-muted-foreground">Total Chats Handled</p>
                               <p className="text-xl font-bold">{aiAnalytics.totalChats}</p>
                            </div>
                         </div>
                         <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between">
                            <div>
                               <p className="text-sm font-medium text-muted-foreground">Actions Executed</p>
                               <p className="text-xl font-bold text-blue-600">{aiAnalytics.actionsTaken}</p>
                            </div>
                         </div>
                         <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between">
                            <div>
                               <p className="text-sm font-medium text-muted-foreground">Avg Confidence</p>
                               <p className="text-xl font-bold text-purple-600">&gt; 97%</p>
                            </div>
                         </div>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-muted p-2 border-b">
                           <h3 className="font-semibold text-sm px-2">Recent AI Transcript Logs</h3>
                        </div>
                        {aiAnalytics.recentLogs?.length === 0 ? (
                            <p className="p-4 text-sm text-muted-foreground">No recent AI interactions.</p>
                        ) : (
                            <div className="divide-y max-h-[400px] overflow-y-auto bg-slate-50">
                               {aiAnalytics.recentLogs?.map((log: any) => (
                                  <div key={log.id} className="p-3 text-sm flex gap-3">
                                     <div className="font-bold uppercase text-xs pt-1 w-16 opacity-50 text-right">
                                        {log.role}
                                     </div>
                                     <div className="flex-1">
                                        <p className={`${log.role === 'assistant' ? 'text-blue-900 font-medium' : 'text-slate-700'}`}>
                                           {log.content}
                                        </p>
                                        {log.actionTaken && (
                                           <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                              Triggered Core Action: {log.actionTaken}
                                           </span>
                                        )}
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                           {new Date(log.createdAt).toLocaleString()} {log.ipAddress ? `· IP: ${log.ipAddress}` : ''}
                                        </p>
                                     </div>
                                  </div>
                               ))}
                            </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
