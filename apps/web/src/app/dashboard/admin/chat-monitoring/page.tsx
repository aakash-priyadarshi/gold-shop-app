"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { chatApi, supportApi } from "@/lib/api";
import {
  AlertTriangle,
  Lock,
  MessageSquare,
  MessageSquareWarning,
  RefreshCw,
  ShieldAlert,
  Store,
  Unlock,
  UserCheck,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";

interface ViolationStats {
  totalViolations: number;
  blockedMessages: number;
  lockedConversations: number;
  suspendedUsers: number;
  shopsOnHold: number;
  violationsByType: Array<{ violationType: string; _count: number }>;
  recentViolations: Array<{
    id: string;
    content: string;
    violationType: string;
    hasViolation: boolean;
    isBlocked: boolean;
    createdAt: string;
    sender: { id: string; firstName: string; lastName: string; role: string };
    conversation: {
      id: string;
      shop: { id: string; shopName: string };
      buyer: { id: string; firstName: string; lastName: string };
    };
  }>;
}

interface UserViolationDetail {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
  } | null;
  shop: {
    id: string;
    shopName: string;
    isOnHold: boolean;
    holdReason: string | null;
  } | null;
  totalViolations: number;
  isBlocked: boolean;
  violations: Array<{
    id: string;
    content: string;
    violationType: string;
    createdAt: string;
    conversation: {
      id: string;
      shop: { shopName: string };
      buyer: { firstName: string; lastName: string };
    };
  }>;
}

interface FlaggedConversation {
  id: string;
  status: string;
  createdAt: string;
  buyer?: { id: string; firstName: string; lastName: string };
  shop?: { id: string; shopName: string };
  order?: { orderNumber: string };
  _count?: { messages: number };
  messages?: Array<{
    id: string;
    content: string;
    violationType: string;
    senderRole: string;
    createdAt: string;
    sender?: { id: string; firstName: string; lastName: string; role: string };
  }>;
}

export default function AdminChatMonitoringPage() {
  const [stats, setStats] = useState<ViolationStats | null>(null);
  const [flagged, setFlagged] = useState<FlaggedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserViolationDetail | null>(
    null,
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [tab, setTab] = useState<"overview" | "violations" | "user">(
    "overview",
  );

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
      console.error("Failed to load chat monitoring data", e);
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
      alert(e.response?.data?.message || "Failed to unlock conversation");
    } finally {
      setUnlocking(null);
    }
  }

  async function handleUnblockUser(userId: string) {
    if (
      !confirm(
        "Are you sure you want to unblock this user? Their account and conversations will be reactivated.",
      )
    )
      return;
    setUnblocking(userId);
    try {
      await chatApi.unblockUser(userId);
      loadData();
      if (selectedUserId === userId) {
        loadUserHistory(userId);
      }
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to unblock user");
    } finally {
      setUnblocking(null);
    }
  }

  async function loadUserHistory(userId: string) {
    setUserLoading(true);
    setSelectedUserId(userId);
    setTab("user");
    try {
      const res = await chatApi.getUserViolationHistory(userId);
      setSelectedUser(res.data);
    } catch (e) {
      console.error("Failed to load user violations", e);
    } finally {
      setUserLoading(false);
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

          {/* Tab navigation */}
          <div className="flex gap-2 border-b pb-2">
            <Button
              variant={tab === "overview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("overview")}
            >
              Overview
            </Button>
            <Button
              variant={tab === "violations" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("violations")}
            >
              Recent Violations
            </Button>
            {selectedUser && (
              <Button
                variant={tab === "user" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTab("user")}
              >
                User: {selectedUser.user?.firstName}{" "}
                {selectedUser.user?.lastName}
              </Button>
            )}
          </div>

          {/* ──── OVERVIEW TAB ──── */}
          {tab === "overview" && (
            <>
              {/* Stats overview */}
              {stats && (
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <ShieldAlert className="h-5 w-5 mx-auto mb-1 text-red-600" />
                      <p className="text-2xl font-bold">
                        {stats.totalViolations}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total Violations
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <MessageSquare className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                      <p className="text-2xl font-bold">
                        {stats.blockedMessages}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Blocked Messages
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <Lock className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
                      <p className="text-2xl font-bold">
                        {stats.lockedConversations}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Locked Chats
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <UserX className="h-5 w-5 mx-auto mb-1 text-red-700" />
                      <p className="text-2xl font-bold">
                        {stats.suspendedUsers}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Suspended Users
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <Store className="h-5 w-5 mx-auto mb-1 text-red-500" />
                      <p className="text-2xl font-bold">{stats.shopsOnHold}</p>
                      <p className="text-xs text-muted-foreground">
                        Shops On Hold
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Violation types breakdown */}
              {stats?.violationsByType && stats.violationsByType.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Violations by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {stats.violationsByType.map((v) => (
                        <Badge
                          key={v.violationType}
                          variant="outline"
                          className="text-sm px-3 py-1"
                        >
                          {v.violationType || "Unknown"}: {v._count}
                        </Badge>
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
                    Locked or violation-flagged chats. Admin can unlock
                    conversations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : flagged.length === 0 ? (
                    <p className="text-muted-foreground">
                      No flagged conversations
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {flagged.map((c) => (
                        <div
                          key={c.id}
                          className="p-3 border rounded-lg space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium flex items-center gap-1 flex-wrap">
                                <a
                                  href={`/dashboard/admin/users?id=${c.buyer?.id}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {c.buyer
                                    ? `${c.buyer.firstName} ${c.buyer.lastName}`
                                    : "Unknown Buyer"}
                                </a>
                                <span className="text-muted-foreground">↔</span>
                                <a
                                  href={`/dashboard/admin/shops?id=${c.shop?.id}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {c.shop?.shopName || "Unknown Shop"}
                                </a>
                              </div>
                              {c.order && (
                                <p className="text-sm text-muted-foreground">
                                  Order: {c.order.orderNumber}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {c._count?.messages || 0} messages ·{" "}
                                {new Date(c.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  c.status === "LOCKED"
                                    ? "destructive"
                                    : "outline"
                                }
                              >
                                {c.status}
                              </Badge>
                              {c.status === "LOCKED" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnlock(c.id)}
                                  disabled={unlocking === c.id}
                                >
                                  <Unlock className="h-4 w-4 mr-1" />
                                  {unlocking === c.id
                                    ? "Unlocking..."
                                    : "Unlock"}
                                </Button>
                              )}
                            </div>
                          </div>
                          {/* Show latest violation messages */}
                          {c.messages && c.messages.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {c.messages.slice(0, 2).map((m) => (
                                <div
                                  key={m.id}
                                  className="text-xs bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-900"
                                >
                                  <span className="font-medium text-red-700 dark:text-red-300">
                                    {m.sender
                                      ? `${m.sender.firstName} ${m.sender.lastName} (${m.sender.role})`
                                      : m.senderRole}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · {m.violationType} ·{" "}
                                    {new Date(m.createdAt).toLocaleString()}
                                  </span>
                                  <p className="font-mono mt-0.5 text-red-800 dark:text-red-200">
                                    {m.content.substring(0, 100)}
                                    {m.content.length > 100 ? "…" : ""}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* ──── RECENT VIOLATIONS TAB ──── */}
          {tab === "violations" && stats && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Violations</CardTitle>
                <CardDescription>
                  Most recent blocked messages. Click a user to see their full
                  violation history.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recentViolations.length === 0 ? (
                  <p className="text-muted-foreground">
                    No violations recorded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {stats.recentViolations.map((v) => (
                      <div
                        key={v.id}
                        className="p-3 border rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto font-medium"
                              onClick={() => loadUserHistory(v.sender.id)}
                            >
                              {v.sender.firstName} {v.sender.lastName}
                            </Button>
                            <Badge variant="outline" className="text-xs">
                              {v.sender.role}
                            </Badge>
                            {v.isBlocked && (
                              <Badge variant="destructive" className="text-xs">
                                BLOCKED
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(v.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="secondary">{v.violationType}</Badge>
                          <span className="text-muted-foreground">
                            in {v.conversation.buyer.firstName} ↔{" "}
                            {v.conversation.shop.shopName}
                          </span>
                        </div>
                        <p className="text-sm bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-900 font-mono">
                          {v.content.substring(0, 200)}
                          {v.content.length > 200 ? "…" : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ──── USER VIOLATION HISTORY TAB ──── */}
          {tab === "user" && (
            <>
              {userLoading ? (
                <p className="text-muted-foreground">Loading user history...</p>
              ) : selectedUser ? (
                <div className="space-y-4">
                  {/* User info card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {selectedUser.user?.firstName}{" "}
                            {selectedUser.user?.lastName}
                            <Badge variant="outline">
                              {selectedUser.user?.role}
                            </Badge>
                            {selectedUser.isBlocked && (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />{" "}
                                BLOCKED
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {selectedUser.totalViolations} total violation(s)
                            {selectedUser.shop &&
                              ` · Shop: ${selectedUser.shop.shopName}`}
                            {selectedUser.shop?.isOnHold &&
                              ` (ON HOLD: ${selectedUser.shop.holdReason})`}
                          </CardDescription>
                        </div>
                        {selectedUser.isBlocked && selectedUser.user && (
                          <Button
                            variant="outline"
                            onClick={() =>
                              handleUnblockUser(selectedUser.user!.id)
                            }
                            disabled={unblocking === selectedUser.user.id}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            {unblocking === selectedUser.user.id
                              ? "Unblocking..."
                              : "Unblock User"}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Strike meter */}
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">
                          Strike Progress:
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {Math.min(selectedUser.totalViolations, 3)}/3
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-3 flex-1 rounded-full ${
                              selectedUser.totalViolations >= i
                                ? i === 3
                                  ? "bg-red-600"
                                  : i === 2
                                    ? "bg-orange-500"
                                    : "bg-yellow-500"
                                : "bg-gray-200 dark:bg-gray-700"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedUser.totalViolations >= 3
                          ? "Account blocked — 3 strikes reached"
                          : `${3 - selectedUser.totalViolations} strike(s) remaining before account block`}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Violation list */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Violation History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedUser.violations.length === 0 ? (
                        <p className="text-muted-foreground">
                          No violations found.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {selectedUser.violations.map((v, idx) => (
                            <div
                              key={v.id}
                              className="p-3 border rounded-lg space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-red-600">
                                    Strike #
                                    {selectedUser.violations.length - idx}
                                  </span>
                                  <Badge variant="secondary">
                                    {v.violationType}
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(v.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {v.conversation.buyer.firstName} ↔{" "}
                                {v.conversation.shop.shopName}
                              </p>
                              <p className="text-sm bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-900 font-mono">
                                {v.content.substring(0, 300)}
                                {v.content.length > 300 ? "…" : ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Select a user from the violations tab to view their history.
                </p>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
