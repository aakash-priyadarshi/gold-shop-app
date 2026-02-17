"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { ticketsApi } from "@/lib/api";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  CreditCard,
  ExternalLink,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Package,
  Send,
  ShieldCheck,
  Ticket,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// ─── Types ───
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  shouldEscalate?: boolean;
  suggestedTicketType?: string;
}

const QUICK_QUESTIONS = [
  "How do I track my order?",
  "What payment methods are accepted?",
  "How to request a refund?",
  "How does KYC verification work?",
  "My account is suspended",
  "How to list products as a seller?",
];

const TICKET_TYPES_MAP: Record<string, string> = {
  ACCOUNT_SUSPENSION: "Account Suspended",
  LOGIN_ISSUE: "Login Issue",
  ORDER_ISSUE: "Order Issue",
  REFUND_ISSUE: "Refund / Return",
  PAYMENT_ISSUE: "Payment Problem",
  PRODUCT_ISSUE: "Product Quality",
  SHIPPING_ISSUE: "Shipping / Delivery",
  PLATFORM_BUG: "Bug Report",
  OTHER: "Other",
};

const HELP_TOPICS = [
  {
    icon: Package,
    title: "Orders & Delivery",
    desc: "Track orders, delivery status, shipping info",
  },
  {
    icon: CreditCard,
    title: "Payments & Refunds",
    desc: "Payment methods, refund policies, billing",
  },
  {
    icon: ShieldCheck,
    title: "Account & Security",
    desc: "Login, KYC verification, account settings",
  },
  {
    icon: MessageSquare,
    title: "Chat & Communication",
    desc: "Platform messaging rules and guidelines",
  },
];

export default function HelpPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! 👋 I'm the OriVraa support assistant. How can I help you today?\n\nYou can ask me about orders, payments, account issues, or anything else about the platform.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [suggestedType, setSuggestedType] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const { data } = await ticketsApi.aiChat({
        message: text.trim(),
        history,
      });

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.reply,
        shouldEscalate: data.shouldEscalate,
        suggestedTicketType: data.suggestedTicketType,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.shouldEscalate && data.suggestedTicketType) {
        setSuggestedType(data.suggestedTicketType);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm sorry, I'm having trouble connecting right now. Please try again or create a support ticket for direct assistance.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-amber-600" />
              <h1 className="font-bold text-lg">Help Center</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link href={`/dashboard/${user?.role?.toLowerCase()}/support`}>
                <Button variant="outline" size="sm">
                  <Ticket className="h-4 w-4 mr-1" /> My Tickets
                </Button>
              </Link>
            ) : (
              <Link href="/auth/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {HELP_TOPICS.map((topic) => (
            <Card
              key={topic.title}
              className="p-3 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() =>
                sendMessage(`Tell me about ${topic.title.toLowerCase()}`)
              }
            >
              <topic.icon className="h-5 w-5 text-amber-600 mb-2" />
              <h3 className="font-medium text-sm">{topic.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {topic.desc}
              </p>
            </Card>
          ))}
        </div>

        {/* Chat area */}
        <Card className="max-w-3xl mx-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-5 w-5 text-amber-600" />
              AI Support Assistant
              <span className="text-xs text-muted-foreground font-normal">
                Powered by Gemini
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Messages */}
            <div className="border rounded-lg">
              <div className="max-h-[400px] overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => (
                  <div key={i}>
                    <div
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          msg.role === "user"
                            ? "bg-amber-600 text-white"
                            : "bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-xs opacity-70">
                          {msg.role === "user" ? (
                            <>
                              <User className="h-3 w-3" /> You
                            </>
                          ) : (
                            <>
                              <Bot className="h-3 w-3" /> Assistant
                            </>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                    {/* Escalation prompt */}
                    {msg.shouldEscalate && (
                      <div className="flex justify-start mt-2 ml-2">
                        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm max-w-[80%]">
                          <p className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                            🎫 Want to connect with a human support agent?
                          </p>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSuggestedType(
                                msg.suggestedTicketType || "OTHER",
                              );
                              setShowTicketForm(true);
                            }}
                          >
                            <Ticket className="h-3 w-3 mr-1" /> Create Support
                            Ticket
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick questions */}
              {messages.length <= 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-xs border rounded-full px-3 py-1 hover:bg-accent transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="border-t p-3 flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  disabled={loading}
                />
                <Button
                  size="icon"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Bottom actions */}
            <div className="flex items-center justify-between mt-4 text-sm">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTicketForm(true)}
              >
                <Ticket className="h-4 w-4 mr-1" /> Create a Ticket
              </Button>
              <Link
                href="/platform-guidelines"
                className="text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                Platform Guidelines <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Ticket Dialog */}
      <Dialog open={showTicketForm} onOpenChange={setShowTicketForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              {isAuthenticated
                ? "Our support team will review your issue and respond as soon as possible."
                : "You can submit a ticket as a guest. Provide your email so we can reply to you."}
            </DialogDescription>
          </DialogHeader>
          <HelpTicketForm
            isAuthenticated={isAuthenticated}
            suggestedType={suggestedType}
            chatSummary={messages
              .slice(-4)
              .map((m) => `${m.role}: ${m.content}`)
              .join("\n")}
            onSuccess={() => {
              setShowTicketForm(false);
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content:
                    "✅ Your support ticket has been created! Our team will get back to you soon." +
                    (isAuthenticated
                      ? " You can track it in Dashboard → Help & Support."
                      : " We'll email you at the address you provided."),
                },
              ]);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Ticket Form (works for both guest and logged-in) ───
function HelpTicketForm({
  isAuthenticated,
  suggestedType,
  chatSummary,
  onSuccess,
}: {
  isAuthenticated: boolean;
  suggestedType: string;
  chatSummary: string;
  onSuccess: () => void;
}) {
  const [type, setType] = useState(suggestedType || "");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState(
    chatSummary
      ? `[From AI Chat]\n${chatSummary}\n\n---\nAdditional details:\n`
      : "",
  );
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !subject || !description) {
      setError("Please fill all required fields");
      return;
    }
    if (!isAuthenticated && !guestEmail) {
      setError("Please provide your email address");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      if (isAuthenticated) {
        await ticketsApi.create({ type, subject, description });
      } else {
        await ticketsApi.createGuest({
          type,
          subject,
          description,
          guestEmail,
          guestName: guestName || undefined,
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isAuthenticated && (
        <>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Your Email *
            </label>
            <Input
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="your@email.com"
              type="email"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Your Name (optional)
            </label>
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your name"
            />
          </div>
        </>
      )}

      <div>
        <label className="text-sm font-medium mb-1 block">Issue Type *</label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue placeholder="Select issue type..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TICKET_TYPES_MAP).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Subject *</label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary of the issue..."
          maxLength={200}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Description *</label>
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
