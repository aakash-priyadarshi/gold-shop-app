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
  FileCheck,
  RefreshCw,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supportApi } from '@/lib/api';

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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAll();
  }, []);

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
          </Tabs>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
