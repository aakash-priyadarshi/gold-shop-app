"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Loader2,
  Search,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Send,
  ArrowLeft,
  Ticket,
  UserCheck,
  Clock,
  Shield,
  Eye,
  Lock,
} from "lucide-react";
import { ticketsApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useTicketSocket, TicketMessage, TicketData } from "@/hooks/useTicketSocket";

// ─── Types ───
interface TicketItem {
  id: string;
  ticketNumber: string;
  type: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  userId?: string | null;
  guestEmail?: string | null;
  guestName?: string | null;
  user?: { id: string; firstName: string; lastName: string; email: string; role?: string } | null;
  assignee?: { id: string; firstName: string; lastName: string; email?: string } | null;
  assigneeId?: string | null;
  _count?: { messages: number };
  messages?: TicketMessage[];
}

interface TicketStats {
  open: number;
  claimed: number;
  inProgress: number;
  waitingUser: number;
  resolved: number;
  total: number;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  CLAIMED: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  WAITING_USER: "bg-orange-100 text-orange-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700 font-semibold",
};

function formatStatus(s: string) {
  return s.replace(/_/g, " ");
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateFull(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TYPE_LABELS: Record<string, string> = {
  ACCOUNT_SUSPENSION: "Account Suspended",
  LOGIN_ISSUE: "Login Issue",
  PASSWORD_RECOVERY: "Password Recovery",
  HACKED_ACCOUNT: "Account Security",
  ORDER_ISSUE: "Order Issue",
  REFUND_ISSUE: "Refund / Return",
  PAYMENT_ISSUE: "Payment Problem",
  PRODUCT_ISSUE: "Product Quality",
  SHIPPING_ISSUE: "Shipping / Delivery",
  SELLER_COMPLAINT: "Seller Complaint",
  BUYER_COMPLAINT: "Buyer Complaint",
  PLATFORM_BUG: "Bug Report",
  FEATURE_REQUEST: "Feature Request",
  KYC_VERIFICATION: "KYC Help",
  OTHER: "Other",
};

// ─── Main Component ───
export default function StaffTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Real-time
  const { joinTicket, leaveTicket, sendTicketMessage, claimTicket: wsClaimTicket } =
    useTicketSocket({
      onNewTicket: (newTicket) => {
        // Add to list if viewing OPEN
        if (statusFilter === "OPEN" || statusFilter === "") {
          setTickets((prev) => [newTicket as any, ...prev]);
        }
        setStats((prev) => (prev ? { ...prev, open: prev.open + 1, total: prev.total + 1 } : prev));
      },
      onTicketClaimed: (claimed) => {
        setTickets((prev) =>
          prev.map((t) => (t.id === claimed.id ? { ...t, ...claimed } : t)),
        );
        if (selectedTicket?.id === claimed.id) {
          setSelectedTicket((prev) => (prev ? { ...prev, ...claimed } : prev));
        }
      },
      onTicketStatusChanged: (changed) => {
        setTickets((prev) =>
          prev.map((t) => (t.id === changed.id ? { ...t, ...changed } : t)),
        );
        if (selectedTicket?.id === changed.id) {
          setSelectedTicket((prev) => (prev ? { ...prev, ...changed } : prev));
        }
        // Refresh stats
        loadStats();
      },
      onNewTicketMessage: (msg) => {
        if (selectedTicket && msg.ticketId === selectedTicket.id) {
          setSelectedTicket((prev) =>
            prev
              ? { ...prev, messages: [...(prev.messages || []), msg] }
              : prev,
          );
        }
      },
    });

  const loadStats = useCallback(async () => {
    try {
      const { data } = await ticketsApi.getStats();
      setStats(data);
    } catch {}
  }, []);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      const { data } = await ticketsApi.listAll(params);
      setTickets(data.tickets || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const openTicketDetail = async (ticket: TicketItem) => {
    try {
      const { data } = await ticketsApi.getTicket(ticket.id);
      setSelectedTicket(data);
      joinTicket(ticket.id);
    } catch {}
  };

  const closeTicketDetail = () => {
    if (selectedTicket) leaveTicket(selectedTicket.id);
    setSelectedTicket(null);
  };

  const handleClaim = async (ticketId: string) => {
    try {
      await ticketsApi.claim(ticketId);
      loadTickets();
      if (selectedTicket?.id === ticketId) {
        const { data } = await ticketsApi.getTicket(ticketId);
        setSelectedTicket(data);
      }
      loadStats();
    } catch {}
  };

  const handleStatusChange = async (ticketId: string, status: string, note?: string) => {
    try {
      await ticketsApi.updateStatus(ticketId, { status, note });
      loadTickets();
      if (selectedTicket?.id === ticketId) {
        const { data } = await ticketsApi.getTicket(ticketId);
        setSelectedTicket(data);
      }
      loadStats();
    } catch {}
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="h-6 w-6" />
            Support Tickets
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage, claim, and resolve customer support tickets
          </p>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              { label: "Open", value: stats.open, color: "text-blue-600" },
              { label: "Claimed", value: stats.claimed, color: "text-yellow-600" },
              { label: "In Progress", value: stats.inProgress, color: "text-purple-600" },
              { label: "Waiting User", value: stats.waitingUser, color: "text-orange-600" },
              { label: "Resolved", value: stats.resolved, color: "text-green-600" },
              { label: "Total", value: stats.total, color: "text-gray-600" },
            ].map((s) => (
              <Card key={s.label} className="p-3">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </Card>
            ))}
          </div>
        )}

        {/* Detail view or list */}
        {selectedTicket ? (
          <StaffTicketDetail
            ticket={selectedTicket}
            onBack={closeTicketDetail}
            onClaim={() => handleClaim(selectedTicket.id)}
            onStatusChange={(status, note) =>
              handleStatusChange(selectedTicket.id, status, note)
            }
            currentUserId={user?.id || ""}
          />
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle>All Tickets</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tickets..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(1);
                      }}
                      className="pl-8 w-[200px]"
                    />
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => {
                      setStatusFilter(v === "ALL" ? "" : v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="CLAIMED">Claimed</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="WAITING_USER">Waiting User</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Ticket className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No tickets found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => openTicketDetail(ticket)}
                      className="w-full text-left border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-mono text-xs text-muted-foreground">
                              {ticket.ticketNumber}
                            </span>
                            <Badge variant="secondary" className={STATUS_COLORS[ticket.status] || ""}>
                              {formatStatus(ticket.status)}
                            </Badge>
                            <Badge variant="secondary" className={PRIORITY_COLORS[ticket.priority] || ""}>
                              {ticket.priority}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {TYPE_LABELS[ticket.type] || ticket.type}
                            </span>
                          </div>
                          <h3 className="font-medium truncate">{ticket.subject}</h3>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                            {ticket.user ? (
                              <span>
                                {ticket.user.firstName} {ticket.user.lastName} ({ticket.user.email})
                              </span>
                            ) : ticket.guestEmail ? (
                              <span>Guest: {ticket.guestName || ticket.guestEmail}</span>
                            ) : (
                              <span>Anonymous</span>
                            )}
                            {ticket.assignee && (
                              <span className="text-green-600">
                                → {ticket.assignee.firstName} {ticket.assignee.lastName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground shrink-0">
                          <div>{formatDate(ticket.createdAt)}</div>
                          {ticket._count?.messages && (
                            <div className="mt-1">{ticket._count.messages} msgs</div>
                          )}
                          {ticket.status === "OPEN" && (
                            <Badge variant="outline" className="mt-1 text-blue-600 border-blue-300">
                              Unclaimed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Previous
                      </Button>
                      <span className="text-sm py-2">
                        Page {page} of {totalPages}
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
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── Staff Ticket Detail ───
function StaffTicketDetail({
  ticket,
  onBack,
  onClaim,
  onStatusChange,
  currentUserId,
}: {
  ticket: TicketItem;
  onBack: () => void;
  onClaim: () => void;
  onStatusChange: (status: string, note?: string) => void;
  currentUserId: string;
}) {
  const [message, setMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket.messages?.length]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await ticketsApi.addMessage(ticket.id, {
        content: message.trim(),
        isInternal,
      });
      setMessage("");
    } catch {}
    setSending(false);
  };

  const canClaim = ticket.status === "OPEN" && !ticket.assignee;
  const isMyClaim = ticket.assignee?.id === currentUserId;
  const isClosed = ticket.status === "CLOSED";

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                <Badge variant="secondary" className={STATUS_COLORS[ticket.status] || ""}>
                  {formatStatus(ticket.status)}
                </Badge>
                <Badge variant="secondary" className={PRIORITY_COLORS[ticket.priority] || ""}>
                  {ticket.priority}
                </Badge>
              </div>
              <CardDescription className="mt-1">
                {ticket.ticketNumber} &middot;{" "}
                {TYPE_LABELS[ticket.type] || ticket.type} &middot;{" "}
                {formatDateFull(ticket.createdAt)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {/* User info */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="font-medium mb-1">Reporter</div>
              {ticket.user ? (
                <>
                  <div>
                    {ticket.user.firstName} {ticket.user.lastName}
                  </div>
                  <div className="text-muted-foreground">{ticket.user.email}</div>
                  <div className="text-xs text-muted-foreground">
                    Role: {ticket.user.role}
                  </div>
                </>
              ) : ticket.guestEmail ? (
                <>
                  <div>{ticket.guestName || "Guest"}</div>
                  <div className="text-muted-foreground">{ticket.guestEmail}</div>
                </>
              ) : (
                <div className="text-muted-foreground">Anonymous</div>
              )}
            </div>

            {/* Assignee */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="font-medium mb-1">Assigned To</div>
              {ticket.assignee ? (
                <div>
                  {ticket.assignee.firstName} {ticket.assignee.lastName}
                </div>
              ) : (
                <div className="text-muted-foreground">Unassigned</div>
              )}
            </div>

            {/* Actions */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="font-medium mb-1">Actions</div>
              {canClaim && (
                <Button size="sm" onClick={onClaim} className="w-full">
                  <UserCheck className="h-3 w-3 mr-1" /> Claim Ticket
                </Button>
              )}
              {(isMyClaim || ticket.assignee) && !isClosed && (
                <div className="flex gap-1 flex-wrap">
                  {ticket.status !== "IN_PROGRESS" && ticket.status !== "OPEN" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onStatusChange("IN_PROGRESS")}
                    >
                      In Progress
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusChange("WAITING_USER")}
                  >
                    <Clock className="h-3 w-3 mr-1" /> Wait User
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => onStatusChange("RESOLVED", resolveNote || undefined)}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onStatusChange("CLOSED")}
                  >
                    <Lock className="h-3 w-3 mr-1" /> Close
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Original description */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-4 text-sm">
            <strong>Original description:</strong>
            <p className="mt-1 whitespace-pre-wrap">{ticket.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Conversation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
              {(ticket.messages || []).map((msg) => {
                const isMe = msg.senderId === currentUserId;
                const isSystem = msg.senderRole === "SYSTEM";
                const isInternalNote = msg.isInternal;

                if (isSystem) {
                  return (
                    <div
                      key={msg.id}
                      className="text-center text-xs text-muted-foreground py-1 italic"
                    >
                      ⚙️ {msg.content}
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                        isInternalNote
                          ? "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-700"
                          : isMe
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                      }`}
                    >
                      <div className="text-xs font-medium mb-1 opacity-70 flex items-center gap-1">
                        {msg.senderName || msg.sender?.firstName || msg.senderRole}
                        <span className="text-[10px] opacity-50">
                          ({msg.senderRole})
                        </span>
                        {isInternalNote && (
                          <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-yellow-200">
                            INTERNAL
                          </Badge>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <div className="text-[10px] mt-1 opacity-50">
                        {formatDateFull(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            {!isClosed && (
              <div className="border-t p-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      isInternal
                        ? "Internal note (only visible to staff)..."
                        : "Reply to user..."
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={sending}
                    className={isInternal ? "border-yellow-400" : ""}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!message.trim() || sending}
                    variant={isInternal ? "outline" : "default"}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Eye className="h-3 w-3" />
                    Internal note (staff only)
                  </label>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
