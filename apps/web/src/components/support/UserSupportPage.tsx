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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  ArrowLeft,
  LifeBuoy,
  Paperclip,
} from "lucide-react";
import { ticketsApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useTicketSocket, TicketMessage } from "@/hooks/useTicketSocket";

// ─── Types ───
interface Ticket {
  id: string;
  ticketNumber: string;
  type: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  assignee?: { firstName: string; lastName: string } | null;
  _count?: { messages: number };
  messages?: TicketMessage[];
}

const TICKET_TYPES = [
  { value: "ORDER_ISSUE", label: "Order Issue" },
  { value: "REFUND_ISSUE", label: "Refund / Return" },
  { value: "PAYMENT_ISSUE", label: "Payment Problem" },
  { value: "PRODUCT_ISSUE", label: "Product Quality" },
  { value: "SHIPPING_ISSUE", label: "Shipping / Delivery" },
  { value: "ACCOUNT_SUSPENSION", label: "Account Suspended" },
  { value: "LOGIN_ISSUE", label: "Login Problem" },
  { value: "HACKED_ACCOUNT", label: "Account Security" },
  { value: "SELLER_COMPLAINT", label: "Complaint about Seller" },
  { value: "BUYER_COMPLAINT", label: "Complaint about Buyer" },
  { value: "PLATFORM_BUG", label: "Technical Issue / Bug" },
  { value: "FEATURE_REQUEST", label: "Feature Request" },
  { value: "KYC_VERIFICATION", label: "KYC / Verification Help" },
  { value: "OTHER", label: "Other" },
];

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
  URGENT: "bg-red-100 text-red-700",
};

function formatStatus(s: string) {
  return s.replace(/_/g, " ");
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Main Component ───
export default function UserSupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Real-time updates
  const { joinTicket, leaveTicket, sendTicketMessage } = useTicketSocket({
    onNewTicketMessage: (msg) => {
      if (selectedTicket && msg.ticketId === selectedTicket.id) {
        setSelectedTicket((prev) =>
          prev
            ? { ...prev, messages: [...(prev.messages || []), msg] }
            : prev,
        );
      }
    },
    onTicketUpdated: (updated) => {
      setTickets((prev) =>
        prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
      );
      if (selectedTicket?.id === updated.id) {
        setSelectedTicket((prev) => (prev ? { ...prev, ...updated } : prev));
      }
    },
  });

  const loadTickets = useCallback(async () => {
    try {
      const { data } = await ticketsApi.getMyTickets();
      setTickets(data.tickets || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const openTicketDetail = async (ticket: Ticket) => {
    try {
      const { data } = await ticketsApi.getTicket(ticket.id);
      setSelectedTicket(data);
      joinTicket(ticket.id);
    } catch {
      // ignore
    }
  };

  const closeTicketDetail = () => {
    if (selectedTicket) leaveTicket(selectedTicket.id);
    setSelectedTicket(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LifeBuoy className="h-6 w-6" />
              Help & Support
            </h1>
            <p className="text-muted-foreground mt-1">
              Create support tickets and track their resolution
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Support Ticket</DialogTitle>
                <DialogDescription>
                  Describe your issue and we&apos;ll get back to you as soon as
                  possible.
                </DialogDescription>
              </DialogHeader>
              <CreateTicketForm
                onSuccess={() => {
                  setShowCreateDialog(false);
                  loadTickets();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Detail view */}
        {selectedTicket ? (
          <TicketDetailView
            ticket={selectedTicket}
            onBack={closeTicketDetail}
            onSendMessage={(content) => {
              sendTicketMessage({
                ticketId: selectedTicket.id,
                content,
              });
            }}
          />
        ) : (
          /* Ticket list */
          <Card>
            <CardHeader>
              <CardTitle>My Tickets</CardTitle>
              <CardDescription>
                {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No tickets yet</p>
                  <p className="text-sm mt-1">
                    Click &quot;New Ticket&quot; to create one
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => openTicketDetail(ticket)}
                      className="w-full text-left border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">
                              {ticket.ticketNumber}
                            </span>
                            <Badge
                              variant="secondary"
                              className={
                                STATUS_COLORS[ticket.status] || ""
                              }
                            >
                              {formatStatus(ticket.status)}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={
                                PRIORITY_COLORS[ticket.priority] || ""
                              }
                            >
                              {ticket.priority}
                            </Badge>
                          </div>
                          <h3 className="font-medium truncate">
                            {ticket.subject}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {ticket.description}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground shrink-0">
                          <div>{formatDate(ticket.createdAt)}</div>
                          {ticket.assignee && (
                            <div className="mt-1 text-green-600">
                              Agent: {ticket.assignee.firstName}
                            </div>
                          )}
                          {ticket._count?.messages && (
                            <div className="mt-1">
                              {ticket._count.messages} messages
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── Create Ticket Form ───
function CreateTicketForm({ onSuccess }: { onSuccess: () => void }) {
  const [type, setType] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !subject || !description) {
      setError("Please fill all fields");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await ticketsApi.create({ type, subject, description });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Issue Type</label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue placeholder="Select issue type..." />
          </SelectTrigger>
          <SelectContent>
            {TICKET_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Subject</label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary of the issue..."
          maxLength={200}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your issue in detail..."
          rows={4}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Submit Ticket
      </Button>
    </form>
  );
}

// ─── Ticket Detail View with Chat ───
function TicketDetailView({
  ticket,
  onBack,
  onSendMessage,
}: {
  ticket: Ticket;
  onBack: () => void;
  onSendMessage: (content: string) => void;
}) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [ticket.messages?.length]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await ticketsApi.addMessage(ticket.id, { content: message.trim() });
      onSendMessage(message.trim());
      setMessage("");
    } catch {
      // fallback
    } finally {
      setSending(false);
    }
  };

  const isClosed = ticket.status === "CLOSED";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{ticket.subject}</CardTitle>
              <Badge
                variant="secondary"
                className={STATUS_COLORS[ticket.status] || ""}
              >
                {formatStatus(ticket.status)}
              </Badge>
            </div>
            <CardDescription>
              {ticket.ticketNumber} &middot;{" "}
              {TICKET_TYPES.find((t) => t.value === ticket.type)?.label ||
                ticket.type}{" "}
              &middot; Created {formatDate(ticket.createdAt)}
              {ticket.assignee &&
                ` · Agent: ${ticket.assignee.firstName} ${ticket.assignee.lastName}`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Description */}
        <div className="bg-muted/50 rounded-lg p-3 mb-4 text-sm">
          <strong>Original description:</strong>
          <p className="mt-1 whitespace-pre-wrap">{ticket.description}</p>
        </div>

        {/* Messages */}
        <div className="border rounded-lg">
          <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
            {(ticket.messages || []).map((msg) => {
              const isMe = msg.senderId === user?.id;
              const isSystem = msg.senderRole === "SYSTEM";

              if (isSystem) {
                return (
                  <div
                    key={msg.id}
                    className="text-center text-xs text-muted-foreground py-1"
                  >
                    {msg.content}
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
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {!isMe && (
                      <div className="text-xs font-medium mb-1 opacity-70">
                        {msg.senderName ||
                          msg.sender?.firstName ||
                          msg.senderRole}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <div
                      className={`text-[10px] mt-1 ${
                        isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      {formatDate(msg.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          {!isClosed && (
            <div className="border-t p-3 flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your reply..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={sending}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!message.trim() || sending}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          {isClosed && (
            <div className="border-t p-3 text-center text-sm text-muted-foreground">
              This ticket is closed. Create a new ticket if you need further
              help.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
