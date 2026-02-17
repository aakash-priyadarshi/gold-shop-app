'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MessageSquareWarning,
  Unlock,
  RefreshCw,
  ShieldAlert,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { chatApi, supportApi } from '@/lib/api';

interface ViolationStats {
  totalViolations: number;
  lockedConversations: number;
  recentViolations: number;
  topOffenders: Array<{
    conversationId: string;
    violationCount: number;
    buyer?: { name: string };
    shop?: { name: string };
  }>;
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

export default function AdminChatMonitoringPage() {
  const [stats, setStats] = useState<ViolationStats | null>(null);
  const [flagged, setFlagged] = useState<FlaggedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [violationRes, flaggedRes] = await Promise.all([
        chatApi.getViolationStats(),
        supportApi.getFlaggedConversations(),
      ]);
      setStats(violationRes.data);
      setFlagged(flaggedRes.data || []);
    } catch (e) {
      console.error('Failed to load chat monitoring data', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlock(conversationId: string) {
    setUnlocking(conversationId);
    try {
      await chatApi.unlockConversation(conversationId);
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to unlock conversation');
    } finally {
      setUnlocking(null);
    }
  }

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquareWarning className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Chat Monitoring</h1>
            </div>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>

          {/* Stats overview */}
          {stats && (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <ShieldAlert className="h-5 w-5 mx-auto mb-1 text-red-600" />
                  <p className="text-2xl font-bold">{stats.totalViolations}</p>
                  <p className="text-xs text-muted-foreground">Total Violations</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <Lock className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                  <p className="text-2xl font-bold">{stats.lockedConversations}</p>
                  <p className="text-xs text-muted-foreground">Locked Chats</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <MessageSquare className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
                  <p className="text-2xl font-bold">{stats.recentViolations}</p>
                  <p className="text-xs text-muted-foreground">Violations (24h)</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top offenders */}
          {stats?.topOffenders && stats.topOffenders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Offenders</CardTitle>
                <CardDescription>Conversations with the most contact-sharing violations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topOffenders.map((offender, i) => (
                    <div key={offender.conversationId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">#{i + 1}</span>
                        <div>
                          <span className="font-medium">
                            {offender.buyer?.name || 'Unknown'} ↔ {offender.shop?.name || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <Badge variant="destructive">{offender.violationCount} violations</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flagged conversations */}
          <Card>
            <CardHeader>
              <CardTitle>Flagged Conversations</CardTitle>
              <CardDescription>
                Locked or violation-flagged chats. Admin can unlock conversations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : flagged.length === 0 ? (
                <p className="text-muted-foreground">No flagged conversations</p>
              ) : (
                <div className="space-y-2">
                  {flagged.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium">
                          {c.buyer?.name || 'Unknown'} ↔ {c.shop?.name || 'Unknown'}
                        </span>
                        {c.order && (
                          <p className="text-sm text-muted-foreground">
                            Order: {c.order.orderNumber}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {c._count?.messages || 0} messages · {new Date(c.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={c.status === 'LOCKED' ? 'destructive' : 'outline'}>
                          {c.status}
                        </Badge>
                        {c.status === 'LOCKED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnlock(c.id)}
                            disabled={unlocking === c.id}
                          >
                            <Unlock className="h-4 w-4 mr-1" />
                            {unlocking === c.id ? 'Unlocking...' : 'Unlock'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
