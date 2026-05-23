"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { adminApi, chatApi, ticketsApi } from "@/lib/api";
import { Bot, ChevronDown, ChevronRight, Eye, FileText, Loader2, Lock, Mail, MessageSquare, Phone, Plus, RefreshCw, Save, Search, Send, Shield, Store, Trash2, Users, Wand2, X, Zap } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";

interface Conversation {
  id: string;
  status: string;
  updatedAt: string;
  buyer: { id: string; firstName: string; lastName: string };
  shop: { id: string; shopName: string };
  messages: Array<{
    content: string;
    createdAt: string;
    senderRole: string;
    isRead: boolean;
  }>;
  unreadCount?: number;
}

interface Message {
  id: string;
  senderId: string;
  senderRole: string;
  content: string;
  hasViolation: boolean;
  violationType?: string;
  isSystem: boolean;
  isRead: boolean;
  createdAt: string;
  sender?: { firstName: string; lastName: string; role: string };
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
  guestPhone?: string;
  contactCaptured?: boolean;
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

interface EmailTrigger {
  key: string;
  name: string;
  audience: string;
  trigger: string;
  backend: string;
  template: string;
  sender: string;
  replyTo?: string | null;
  variables: string[];
  editable: boolean;
  notes: string;
}

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  audience: string;
  trigger?: string | null;
  subject: string;
  html: string;
  text?: string | null;
  senderName: string;
  senderEmail: string;
  replyTo?: string | null;
  variables: string[];
  isActive: boolean;
  isSystem: boolean;
  updatedAt: string;
}

interface EmailTemplateDraft {
  key: string;
  name: string;
  description: string;
  audience: string;
  trigger: string;
  subject: string;
  html: string;
  text: string;
  senderName: string;
  senderEmail: string;
  replyTo: string;
  variables: string;
  isActive: boolean;
  isSystem: boolean;
}

interface UserSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const emptyEmailTemplateDraft: EmailTemplateDraft = {
  key: "",
  name: "",
  description: "",
  audience: "customer",
  trigger: "",
  subject: "",
  html: "",
  text: "",
  senderName: "Orivraa Support",
  senderEmail: "support@orivraa.com",
  replyTo: "support@orivraa.com",
  variables: "title, recipientName, message, sentAt",
  isActive: true,
  isSystem: false,
};

function templateToDraft(template: EmailTemplate): EmailTemplateDraft {
  return {
    key: template.key,
    name: template.name,
    description: template.description || "",
    audience: template.audience,
    trigger: template.trigger || "",
    subject: template.subject,
    html: template.html,
    text: template.text || "",
    senderName: template.senderName,
    senderEmail: template.senderEmail,
    replyTo: template.replyTo || "",
    variables: template.variables.join(", "),
    isActive: template.isActive,
    isSystem: template.isSystem,
  };
}

function draftPayload(draft: EmailTemplateDraft) {
  return {
    ...draft,
    variables: draft.variables
      .split(",")
      .map((variable) => variable.trim())
      .filter(Boolean),
  };
}

const INTENT_COLOURS: Record<string, string> = {
  pricing: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  trial: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  comparison: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  onboarding: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
  complaint: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  offline_pos: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  compliance: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
};

function IntentBadge({ intent }: { intent: string }) {
  const cls = INTENT_COLOURS[intent] ?? "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {intent.replace(/_/g, " ")}
    </span>
  );
}

function BotSessionRow({ session }: { session: BotSession }) {
  const [open, setOpen] = useState(false);
  const displayName = session.guestName || session.guestEmail || session.guestPhone || session.ipAddress || "Anonymous visitor";

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <button
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium truncate">{displayName}</span>
              {session.guestEmail && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" /> {session.guestEmail}
                </span>
              )}
              {session.guestPhone && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" /> {session.guestPhone}
                </span>
              )}
              {session.contactCaptured && !session.escalated && (
                <Badge className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-0">lead captured</Badge>
              )}
              {session.escalated && <Badge variant="destructive" className="text-xs">escalated</Badge>}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {session.leadIntents.length > 0 ? (
                session.leadIntents.map((intent) => <IntentBadge key={intent} intent={intent} />)
              ) : (
                <span className="text-xs text-muted-foreground">No lead intent detected yet</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">
            {new Date(session.startedAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          <p className="text-xs text-muted-foreground">{session.messageCount} messages</p>
        </div>
      </button>

      {open && (
        <div className="border-t bg-muted/20 divide-y max-h-96 overflow-y-auto">
          {session.logs.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">No transcript messages logged.</div>
          ) : (
            session.logs.map((log) => (
              <div key={log.id} className="px-4 py-3 flex gap-3 text-sm">
                <span
                  className={`uppercase text-[10px] font-bold pt-0.5 w-16 shrink-0 text-right ${
                    log.role === "assistant" ? "text-blue-500" : "text-slate-400"
                  }`}
                >
                  {log.role}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={log.role === "assistant" ? "text-blue-900 dark:text-blue-100 font-medium" : "text-foreground"}>
                    {log.content}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {log.actionTaken && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200">
                        <Zap className="h-3 w-3" /> {log.actionTaken}
                      </span>
                    )}
                    {typeof log.confidence === "number" && (
                      <span className="text-[10px] text-muted-foreground">
                        Confidence {Math.round(log.confidence * 100)}%
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminMessagesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState<"conversations" | "ai" | "emails" | "triggers" | "templates">("conversations");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // User search feature
  const [userSearchText, setUserSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // AI Generation feature
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [aiPromptText, setAiPromptText] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const [botStats, setBotStats] = useState<BotStats | null>(null);
  const [botSessions, setBotSessions] = useState<BotSession[]>([]);
  const [botPage, setBotPage] = useState(1);
  const [botTotal, setBotTotal] = useState(0);
  const [botLoading, setBotLoading] = useState(false);

  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [emailPage, setEmailPage] = useState(1);
  const [emailTotal, setEmailTotal] = useState(0);
  const [emailLoading, setEmailLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  // Email filter
  const [emailTypeFilter, setEmailTypeFilter] = useState<"all" | "manual" | "automated">("all");
  const [emailDirectionFilter, setEmailDirectionFilter] = useState<"all" | "OUTBOUND" | "INBOUND">("all");
  const [emailTriggers, setEmailTriggers] = useState<EmailTrigger[]>([]);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateDraft, setTemplateDraft] = useState<EmailTemplateDraft>(emptyEmailTemplateDraft);
  const [templatePreview, setTemplatePreview] = useState<{ subject: string; html: string; from: string; replyTo?: string | null } | null>(null);

  // ── Compose new email ────────────────────────────────────────────────────
  const [composingNew, setComposingNew] = useState(false);
  const [composeRecipientMode, setComposeRecipientMode] = useState<"search" | "manual">("search");
  const [composeUserId, setComposeUserId] = useState<string | null>(null);
  const [composeEmail, setComposeEmail] = useState("");
  const [composeName, setComposeName] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composeSending, setComposeSending] = useState(false);
  const [composeUserQuery, setComposeUserQuery] = useState("");
  const [composeUserResults, setComposeUserResults] = useState<UserSearchResult[]>([]);
  const [composeUserSearching, setComposeUserSearching] = useState(false);
  // AI writer
  const [aiWriterOpen, setAiWriterOpen] = useState(false);
  const [aiWriterPrompt, setAiWriterPrompt] = useState("");
  const [aiWriterLoading, setAiWriterLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("view") === "ai") setActiveView("ai");
  }, [searchParams]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) loadMessages(selectedConversation);
  }, [selectedConversation]);

  useEffect(() => {
    if (activeView === "ai") loadBotSessions(botPage);
    if (activeView === "emails") loadEmails(emailPage, emailTypeFilter, emailDirectionFilter);
    if (activeView === "triggers") loadEmailTriggers();
    if (activeView === "templates") loadEmailTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, botPage, emailPage, emailTypeFilter, emailDirectionFilter]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (userSearchText.trim().length > 2) {
      setIsSearchingUsers(true);
      const delay = setTimeout(async () => {
        try {
          const res = await adminApi.getCustomers({ 
            query: userSearchText, 
            type: 'registered', 
            limit: 5 
          });
          setSearchResults(res.data.customers || []);
        } catch (e) {
          console.error("Failed to search users", e);
        } finally {
          setIsSearchingUsers(false);
        }
      }, 500);
      return () => clearTimeout(delay);
    } else {
      setSearchResults([]);
      setIsSearchingUsers(false);
    }
  }, [userSearchText]);

  // Debounced user search for compose
  useEffect(() => {
    if (composeUserQuery.trim().length < 2) {
      setComposeUserResults([]);
      return;
    }
    setComposeUserSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await adminApi.searchUsers(composeUserQuery.trim());
        setComposeUserResults(res.data.users || []);
      } catch {
        // silently fail — user can still type manual email
      } finally {
        setComposeUserSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [composeUserQuery]);

  async function startNewChat(userId: string) {
    try {
      setUserSearchText("");
      setSearchResults([]);
      const res = await chatApi.createAdminToUserConversation({ targetUserId: userId });
      await loadConversations();
      setSelectedConversation(res.data.id);
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to create conversation");
    }
  }

  async function loadConversations() {
    try {
      const res = await chatApi.listConversations();
      setConversations(res.data || []);
    } catch (e) {
      console.error("Failed to load conversations", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadBotSessions(page = botPage) {
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
      console.error("Failed to load AI chat transcripts", e);
    } finally {
      setBotLoading(false);
    }
  }

  async function loadEmails(page = emailPage, typeFilter = emailTypeFilter, dirFilter = emailDirectionFilter) {
    setEmailLoading(true);
    try {
      const res = await adminApi.getEmailLogs({
        page,
        limit: 20,
        ...(typeFilter !== "all" ? { type: typeFilter } : {}),
        ...(dirFilter !== "all" ? { direction: dirFilter } : {}),
      });
      setEmailLogs(res.data.emails || []);
      setEmailTotal(res.data.total || 0);
    } catch (e) {
      console.error("Failed to load email logs", e);
    } finally {
      setEmailLoading(false);
    }
  }

  async function loadEmailTriggers() {
    setTriggerLoading(true);
    try {
      const res = await adminApi.getEmailTriggers();
      setEmailTriggers(res.data.triggers || []);
    } catch (e) {
      console.error("Failed to load email triggers", e);
    } finally {
      setTriggerLoading(false);
    }
  }

  async function loadEmailTemplates(selectId = selectedTemplateId) {
    setTemplateLoading(true);
    try {
      const res = await adminApi.getEmailTemplates();
      const templates: EmailTemplate[] = res.data.templates || [];
      setEmailTemplates(templates);
      const selected = templates.find((template) => template.id === selectId) || templates[0];
      if (selected) {
        setSelectedTemplateId(selected.id);
        setTemplateDraft(templateToDraft(selected));
      }
    } catch (e) {
      console.error("Failed to load email templates", e);
      toast({ variant: "destructive", title: "Error", description: "Failed to load email templates" });
    } finally {
      setTemplateLoading(false);
    }
  }

  function selectEmailTemplate(template: EmailTemplate) {
    setSelectedTemplateId(template.id);
    setTemplateDraft(templateToDraft(template));
    setTemplatePreview(null);
  }

  function startNewEmailTemplate() {
    setSelectedTemplateId(null);
    setTemplateDraft({ ...emptyEmailTemplateDraft });
    setTemplatePreview(null);
  }

  async function saveEmailTemplate() {
    setTemplateSaving(true);
    try {
      const payload = draftPayload(templateDraft);
      const res = selectedTemplateId
        ? await adminApi.updateEmailTemplate(selectedTemplateId, payload)
        : await adminApi.createEmailTemplate(payload);
      const saved = res.data.template as EmailTemplate;
      setSelectedTemplateId(saved.id);
      setTemplateDraft(templateToDraft(saved));
      setTemplatePreview(null);
      await loadEmailTemplates(saved.id);
      toast({ title: "Template saved", description: `${saved.name} is ready to use.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.response?.data?.message || "Failed to save template" });
    } finally {
      setTemplateSaving(false);
    }
  }

  async function deleteEmailTemplate() {
    if (!selectedTemplateId) return;
    if (!window.confirm("Delete this email template? Existing sent emails will stay in history.")) return;
    setTemplateSaving(true);
    try {
      await adminApi.deleteEmailTemplate(selectedTemplateId);
      setSelectedTemplateId(null);
      setTemplateDraft({ ...emptyEmailTemplateDraft });
      setTemplatePreview(null);
      await loadEmailTemplates(null);
      toast({ title: "Template deleted" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.response?.data?.message || "Failed to delete template" });
    } finally {
      setTemplateSaving(false);
    }
  }

  async function previewEmailTemplateDraft() {
    setTemplateSaving(true);
    try {
      const res = await adminApi.previewEmailTemplateDraft(draftPayload(templateDraft));
      setTemplatePreview(res.data);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Preview failed", description: e.response?.data?.message || "Failed to render preview" });
    } finally {
      setTemplateSaving(false);
    }
  }

  async function handleSendReply() {
    if (!replyText.trim() || !selectedEmail?.user?.id) return;
    setSendingReply(true);
    try {
      await adminApi.sendMessage({
        recipientId: selectedEmail.user.id,
        content: replyText,
        subject: `Re: ${selectedEmail.subject}`,
      });
      setReplyText("");
      setSelectedEmail(null);
      loadEmails();
      toast({ title: "Email Sent", description: "Your reply has been sent." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.response?.data?.message || "Failed to send reply" });
    } finally {
      setSendingReply(false);
    }
  }

  function resetCompose() {
    setComposingNew(false);
    setComposeRecipientMode("search");
    setComposeUserId(null);
    setComposeEmail("");
    setComposeName("");
    setComposeSubject("");
    setComposeMessage("");
    setComposeUserQuery("");
    setComposeUserResults([]);
    setAiWriterOpen(false);
    setAiWriterPrompt("");
  }

  async function handleAiWrite() {
    if (!aiWriterPrompt.trim()) return;
    setAiWriterLoading(true);
    try {
      const res = await adminApi.aiComposeEmail({
        prompt: aiWriterPrompt.trim(),
        recipientName: composeName || undefined,
        recipientRole: undefined,
      });
      if (res.data.subject) setComposeSubject(res.data.subject);
      if (res.data.message) setComposeMessage(res.data.message);
      setAiWriterOpen(false);
      setAiWriterPrompt("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "AI writer failed", description: e.response?.data?.message || "Could not generate email." });
    } finally {
      setAiWriterLoading(false);
    }
  }

  function selectComposeUser(user: UserSearchResult) {
    setComposeUserId(user.id);
    setComposeEmail(user.email);
    setComposeName(`${user.firstName} ${user.lastName}`.trim());
    setComposeUserQuery("");
    setComposeUserResults([]);
  }

  async function handleSendCompose() {
    if (!composeMessage.trim()) return;
    if (composeRecipientMode === "search" && !composeUserId) {
      toast({ variant: "destructive", title: "No recipient", description: "Select a user from the search results." });
      return;
    }
    if (composeRecipientMode === "manual" && !composeEmail.trim()) {
      toast({ variant: "destructive", title: "No recipient", description: "Enter a recipient email address." });
      return;
    }
    setComposeSending(true);
    try {
      const payload =
        composeRecipientMode === "search"
          ? { recipientId: composeUserId!, content: composeMessage, subject: composeSubject || undefined }
          : { recipientEmail: composeEmail.trim(), recipientName: composeName.trim() || undefined, content: composeMessage, subject: composeSubject || undefined };
      await adminApi.sendMessage(payload);
      toast({ title: "Email sent", description: `Email delivered to ${composeEmail || composeName}.` });
      resetCompose();
      loadEmails(emailPage);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to send", description: e.response?.data?.message || "Something went wrong." });
    } finally {
      setComposeSending(false);
    }
  }

  async function loadMessages(conversationId: string) {
    try {
      const res = await chatApi.getMessages(conversationId);
      setMessages(res.data.messages || []);
      chatApi.markAsRead(conversationId);
    } catch (e) {
      console.error("Failed to load messages", e);
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || !selectedConversation) return;
    setSending(true);
    try {
      await chatApi.sendMessage(selectedConversation, { content: newMessage });
      setNewMessage("");
      loadMessages(selectedConversation);
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleGenerateAi() {
    if (!aiPromptText.trim()) return;
    setIsGeneratingAi(true);
    try {
      // Pass the last 5 messages for context
      const recentContext = messages.slice(-5).map(m => `${m.senderRole}: ${m.content}`).join('\n');
      const res = await chatApi.generateAdminDraft({ 
         prompt: aiPromptText, 
         context: recentContext 
      });
      setNewMessage(res.data.text || res.data); // depending on backend format
      setAiPromptOpen(false);
      setAiPromptText("");
    } catch (e: any) {
      alert("Failed to generate AI message: " + (e.response?.data?.message || e.message));
    } finally {
      setIsGeneratingAi(false);
    }
  }

  async function handleUnlock(conversationId: string) {
    try {
      await chatApi.unlockConversation(conversationId);
      loadConversations();
      if (selectedConversation === conversationId) {
        loadMessages(conversationId);
      }
    } catch (e) {
      console.error("Failed to unlock conversation", e);
    }
  }

  const selectedConv = conversations.find((c) => c.id === selectedConversation);
  const selectedEmailTemplate = emailTemplates.find((template) => template.id === selectedTemplateId) || null;
  const botTotalPages = Math.max(1, Math.ceil(botTotal / 20));

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="flex flex-col h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              {activeView === "ai" ? <Bot className="h-6 w-6" /> : activeView === "emails" || activeView === "triggers" || activeView === "templates" ? <Mail className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
              <h1 className="text-2xl font-bold">All Messages</h1>
              <Badge variant="secondary" className="ml-2">
                {activeView === "ai" ? `${botTotal} AI sessions` : activeView === "emails" ? `${emailTotal} emails` : activeView === "triggers" ? `${emailTriggers.length} triggers` : activeView === "templates" ? `${emailTemplates.length} templates` : `${conversations.length} conversations`}
              </Badge>
            </div>
            <div className="flex rounded-lg border bg-muted/30 p-1">
              <Button
                size="sm"
                variant={activeView === "conversations" ? "default" : "ghost"}
                className="gap-1"
                onClick={() => setActiveView("conversations")}
              >
                <MessageSquare className="h-4 w-4" /> Conversations
              </Button>
              <Button
                size="sm"
                variant={activeView === "ai" ? "default" : "ghost"}
                className="gap-1"
                onClick={() => setActiveView("ai")}
              >
                <Bot className="h-4 w-4" /> AI Assistant Chats
              </Button>
              <Button
                size="sm"
                variant={activeView === "emails" ? "default" : "ghost"}
                className="gap-1"
                onClick={() => setActiveView("emails")}
              >
                <Mail className="h-4 w-4" /> Emails
              </Button>
              <Button
                size="sm"
                variant={activeView === "triggers" ? "default" : "ghost"}
                className="gap-1"
                onClick={() => setActiveView("triggers")}
              >
                <Shield className="h-4 w-4" /> Triggers
              </Button>
              <Button
                size="sm"
                variant={activeView === "templates" ? "default" : "ghost"}
                className="gap-1"
                onClick={() => setActiveView("templates")}
              >
                <FileText className="h-4 w-4" /> Templates
              </Button>
            </div>
          </div>

          {activeView === "conversations" ? (
          <div className="flex flex-1 gap-4 min-h-0">
            {/* Conversation list */}
            <div className="w-80 flex-shrink-0 border rounded-lg overflow-y-auto relative flex flex-col bg-background">
              <div className="p-3 border-b border-muted bg-white dark:bg-muted/10 sticky top-0 z-10 w-full space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search users (name, email) to chat..." 
                    className="pl-8 !h-9 text-sm"
                    value={userSearchText}
                    onChange={(e) => setUserSearchText(e.target.value)}
                  />
                  {isSearchingUsers && (
                    <div className="absolute right-2.5 top-2.5 h-4 w-4 rounded-full border-t-2 border-primary animate-spin" />
                  )}
                </div>
                
                {/* Search Results Dropdown */}
                {userSearchText.length > 2 && (
                  <div className="absolute left-3 right-3 top-12 bg-background border rounded-lg shadow-lg max-h-64 overflow-y-auto z-[60]">
                    {searchResults.length > 0 ? (
                      searchResults.map((usr) => (
                        <button
                          key={usr.id}
                          className="w-full p-2 text-left hover:bg-muted text-sm flex items-center gap-2 border-b last:border-0"
                          onClick={() => startNewChat(usr.id)}
                        >
                          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="truncate flex-1">
                            <span className="font-medium block truncate dark:text-foreground">{usr.name}</span>
                            <span className="text-xs text-muted-foreground block truncate">{usr.email}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      !isSearchingUsers && (
                        <div className="p-3 text-sm text-center text-muted-foreground">
                          No users found
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {loading ? (
                <div className="p-4 text-muted-foreground flex-1">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground flex-1">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No conversations found</p>
                </div>
              ) : (
                conversations
                  // Filter existing conversations locally
                  .filter((conv) => {
                     const searchLower = userSearchText.toLowerCase();
                     if (!searchLower) return true;
                     return conv.buyer.firstName.toLowerCase().includes(searchLower) ||
                            conv.buyer.lastName.toLowerCase().includes(searchLower) ||
                            conv.shop.shopName.toLowerCase().includes(searchLower);
                  })
                  .map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                        setSelectedConversation(conv.id);
                        setUserSearchText(""); // Clear search to hide dropdown when selecting an existing chat
                    }}
                    className={`w-full p-3 text-left border-b hover:bg-muted/50 transition ${
                      selectedConversation === conv.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {conv.buyer.firstName} {conv.buyer.lastName}
                      </span>
                      <div className="flex items-center gap-1">
                        {conv.status === "LOCKED" && (
                          <Lock className="h-3 w-3 text-destructive" />
                        )}
                        {(conv.unreadCount || 0) > 0 && (
                          <Badge
                            variant="default"
                            className="text-xs h-5 px-1.5"
                          >
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Store className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {conv.shop.shopName}
                      </span>
                    </div>
                    {conv.messages[0] && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {conv.messages[0].content}
                      </p>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col border rounded-lg">
              {!selectedConversation ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Select a conversation to view messages
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="p-3 border-b flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-medium">
                          {selectedConv?.buyer.firstName}{" "}
                          {selectedConv?.buyer.lastName}
                        </h3>
                        <span className="text-muted-foreground">↔</span>
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {selectedConv?.shop.shopName}
                        </span>
                      </div>
                      {selectedConv?.status === "LOCKED" && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="destructive" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" /> Locked
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs"
                            onClick={() => handleUnlock(selectedConversation)}
                          >
                            Unlock
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      Admin view
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.isSystem
                            ? "justify-center"
                            : msg.senderId === user?.id
                              ? "justify-end"
                              : "justify-start"
                        }`}
                      >
                        {msg.isSystem ? (
                          <div className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-full">
                            {msg.content}
                          </div>
                        ) : (
                          <div
                            className={`max-w-[70%] px-3 py-2 rounded-lg ${
                              msg.senderId === user?.id
                                ? "bg-primary text-primary-foreground"
                                : msg.senderRole === "SHOPKEEPER"
                                  ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50"
                                  : "bg-muted"
                            } ${msg.hasViolation ? "border-2 border-yellow-500" : ""}`}
                          >
                            <div className="text-xs font-medium opacity-75 mb-1">
                              {msg.sender
                                ? `${msg.sender.firstName} ${msg.sender.lastName} (${msg.senderRole})`
                                : msg.senderRole}
                            </div>
                            <p className="text-sm">{msg.content}</p>
                            {msg.hasViolation && (
                              <p className="text-xs mt-1 opacity-75">
                                ⚠️ Violation:{" "}
                                {msg.violationType || "Contact info detected"}
                              </p>
                            )}
                            <span className="text-xs opacity-60 mt-1 block">
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* AI Generation prompt box */}
                  {aiPromptOpen && (
                    <div className="p-3 border-t bg-muted/30 flex items-center gap-2">
                      <div className="flex-1 relative">
                        <Wand2 className="absolute left-2.5 top-2.5 h-4 w-4 text-primary" />
                        <Input
                          autoFocus
                          placeholder="Tell Gemini what to write... e.g., 'Acknowledge their documents and say we will review by tomorrow'"
                          className="pl-8 !h-9 text-sm focus-visible:ring-primary"
                          value={aiPromptText}
                          onChange={(e) => setAiPromptText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleGenerateAi()}
                          disabled={isGeneratingAi}
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={handleGenerateAi}
                        disabled={isGeneratingAi || !aiPromptText.trim()}
                        className="h-9 whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        {isGeneratingAi ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
                        {isGeneratingAi ? "Generating..." : "Generate AI"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setAiPromptOpen(false); setAiPromptText(""); }}
                        className="h-9"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  {/* Admin can respond in any conversation */}
                  <div className="p-3 border-t flex gap-2 items-center bg-background">
                    <Button 
                      variant={(aiPromptOpen || newMessage.length > 0) ? "outline" : "default"}
                      size="icon"
                      className={`shrink-0 ${!aiPromptOpen && newMessage.length === 0 ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 border-indigo-200' : ''}`}
                      onClick={() => setAiPromptOpen(!aiPromptOpen)}
                      title="AI Suggestion"
                      type="button"
                    >
                      <Wand2 className="h-4 w-4" />
                    </Button>
                    <AutoResizeTextarea
                      className="flex-1 max-h-[200px] min-h-[44px]"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Send a message as Admin..."
                      disabled={sending}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={sending || !newMessage.trim()}
                      className="shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
          ) : activeView === "emails" ? (
            <div className="flex flex-1 gap-4 min-h-0 bg-background border rounded-lg overflow-hidden relative">
              <div className="w-1/3 border-r overflow-y-auto">
                <div className="sticky top-0 bg-background z-10 border-b">
                  <div className="p-4 flex justify-between items-center gap-2">
                    <h2 className="font-semibold">Email History</h2>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => { setComposingNew(true); setSelectedEmail(null); }}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" /> Compose
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => loadEmails(emailPage, emailTypeFilter, emailDirectionFilter)} disabled={emailLoading}>
                        <RefreshCw className={`h-4 w-4 ${emailLoading ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </div>
                  {/* Filter bar */}
                  <div className="px-3 pb-2 space-y-2">
                    <div className="flex rounded-md border overflow-hidden text-xs">
                      {(["all", "manual", "automated"] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => { setEmailTypeFilter(f); setEmailPage(1); }}
                          className={`flex-1 py-1.5 font-medium transition-colors capitalize ${emailTypeFilter === f ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                        >
                          {f === "manual" ? "Manual" : f === "automated" ? "Automated" : "All"}
                        </button>
                      ))}
                    </div>
                    <div className="flex rounded-md border overflow-hidden text-xs">
                      {([["all", "All"], ["OUTBOUND", "Outbound"], ["INBOUND", "Inbound"]] as const).map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => { setEmailDirectionFilter(val); setEmailPage(1); }}
                          className={`flex-1 py-1.5 font-medium transition-colors ${emailDirectionFilter === val ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {emailLoading && emailLogs.length === 0 ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : emailLogs.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No email logs found.</div>
                ) : (
                  <div className="divide-y">
                    {emailLogs.map((log) => (
                      <button
                        key={log.id}
                        onClick={() => { setSelectedEmail(log); setComposingNew(false); }}
                        className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${!composingNew && selectedEmail?.id === log.id ? "bg-muted" : ""}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium truncate pr-2">
                            {log.direction === "OUTBOUND" ? "To: " + log.toAddress : "From: " + log.fromAddress}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm font-semibold truncate text-foreground">{log.subject}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={log.direction === "OUTBOUND" ? "secondary" : "default"} className="text-[10px]">
                            {log.direction}
                          </Badge>
                          {log.user && (
                            <span className="text-xs text-muted-foreground truncate">{log.user.firstName} {log.user.lastName} ({log.user.role})</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="p-4 border-t flex justify-between items-center sticky bottom-0 bg-background">
                  <Button variant="outline" size="sm" onClick={() => setEmailPage(p => Math.max(1, p - 1))} disabled={emailPage === 1 || emailLoading}>Previous</Button>
                  <span className="text-sm text-muted-foreground">Page {emailPage}</span>
                  <Button variant="outline" size="sm" onClick={() => setEmailPage(p => p + 1)} disabled={emailLogs.length < 20 || emailLoading}>Next</Button>
                </div>
              </div>
              <div className="w-2/3 flex flex-col overflow-y-auto">
                {composingNew ? (
                  /* ── Compose form ──────────────────────────────────────────────── */
                  <div className="flex flex-col h-full">
                    <div className="p-5 border-b flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">New Email</h2>
                        <p className="text-sm text-muted-foreground">Send an email to a registered user or any email address.</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={resetCompose} title="Cancel">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex-1 p-5 space-y-5 overflow-y-auto">
                      {/* Recipient mode toggle */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium">Recipient</label>
                        <div className="flex rounded-lg border overflow-hidden text-sm">
                          <button
                            type="button"
                            onClick={() => { setComposeRecipientMode("search"); setComposeUserId(null); setComposeEmail(""); setComposeName(""); }}
                            className={`flex-1 px-4 py-2 transition-colors ${composeRecipientMode === "search" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                          >
                            Find user
                          </button>
                          <button
                            type="button"
                            onClick={() => { setComposeRecipientMode("manual"); setComposeUserId(null); setComposeUserQuery(""); setComposeUserResults([]); }}
                            className={`flex-1 px-4 py-2 transition-colors ${composeRecipientMode === "manual" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                          >
                            Manual email
                          </button>
                        </div>

                        {composeRecipientMode === "search" ? (
                          <div className="space-y-2">
                            {/* Selected user chip */}
                            {composeUserId ? (
                              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
                                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{composeName}</p>
                                  <p className="text-xs text-muted-foreground truncate">{composeEmail}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => { setComposeUserId(null); setComposeEmail(""); setComposeName(""); }}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search by name or email..."
                                  className="pl-9"
                                  value={composeUserQuery}
                                  onChange={(e) => setComposeUserQuery(e.target.value)}
                                />
                                {composeUserSearching && (
                                  <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                                {!composeUserSearching && composeUserResults.length > 0 && (
                                  <div className="absolute left-0 right-0 top-full mt-1 bg-background border rounded-lg shadow-lg z-30 max-h-56 overflow-y-auto">
                                    {composeUserResults.map((u) => (
                                      <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => selectComposeUser(u)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted text-left border-b last:border-0"
                                      >
                                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">{u.firstName} {u.lastName}</p>
                                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] shrink-0">{u.role}</Badge>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {!composeUserSearching && composeUserQuery.trim().length >= 2 && composeUserResults.length === 0 && (
                                  <div className="absolute left-0 right-0 top-full mt-1 bg-background border rounded-lg shadow-lg z-30 p-3 text-sm text-center text-muted-foreground">
                                    No users found
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <label className="space-y-1.5 text-sm block">
                              <span className="font-medium">Email address <span className="text-destructive">*</span></span>
                              <Input
                                type="email"
                                placeholder="recipient@example.com"
                                value={composeEmail}
                                onChange={(e) => setComposeEmail(e.target.value)}
                              />
                            </label>
                            <label className="space-y-1.5 text-sm block">
                              <span className="font-medium">Display name <span className="text-muted-foreground">(optional)</span></span>
                              <Input
                                placeholder="Recipient name"
                                value={composeName}
                                onChange={(e) => setComposeName(e.target.value)}
                              />
                            </label>
                          </div>
                        )}
                      </div>

                      {/* AI Writer */}
                      <div className="rounded-lg border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setAiWriterOpen((o) => !o)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-sm font-medium"
                        >
                          <div className="flex items-center gap-2">
                            <Wand2 className="h-4 w-4 text-indigo-500" />
                            Write with AI
                          </div>
                          <span className="text-xs text-muted-foreground">{aiWriterOpen ? "Hide" : "Expand"}</span>
                        </button>
                        {aiWriterOpen && (
                          <div className="border-t p-4 space-y-3 bg-muted/10">
                            <p className="text-xs text-muted-foreground">Describe what you want to say and AI will write the subject and message for you.</p>
                            <AutoResizeTextarea
                              autoFocus
                              placeholder='e.g. "Tell the seller their account was approved and they can now list products"'
                              className="min-h-[80px] text-sm"
                              value={aiWriterPrompt}
                              onChange={(e) => setAiWriterPrompt(e.target.value)}
                              disabled={aiWriterLoading}
                            />
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                onClick={handleAiWrite}
                                disabled={aiWriterLoading || !aiWriterPrompt.trim()}
                                className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                {aiWriterLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                {aiWriterLoading ? "Generating..." : "Generate Email"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Subject */}
                      <label className="space-y-1.5 text-sm font-medium block">
                        Subject <span className="text-muted-foreground">(optional)</span>
                        <Input
                          placeholder="Message from Orivraa Support"
                          value={composeSubject}
                          onChange={(e) => setComposeSubject(e.target.value)}
                        />
                      </label>

                      {/* Message */}
                      <label className="space-y-1.5 text-sm font-medium block">
                        Message <span className="text-destructive">*</span>
                        <AutoResizeTextarea
                          placeholder="Write your message here..."
                          className="min-h-[160px]"
                          value={composeMessage}
                          onChange={(e) => setComposeMessage(e.target.value)}
                        />
                      </label>
                    </div>

                    <div className="p-5 border-t flex items-center justify-end gap-2">
                      <Button variant="outline" onClick={resetCompose} disabled={composeSending}>
                        Cancel
                      </Button>
                      <Button onClick={handleSendCompose} disabled={composeSending || !composeMessage.trim()}>
                        {composeSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        Send Email
                      </Button>
                    </div>
                  </div>
                ) : selectedEmail ? (
                  <>
                    <div className="p-6 border-b">
                      <h2 className="text-xl font-bold mb-4">{selectedEmail.subject}</h2>
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground mb-4">
                        <div><span className="font-medium text-foreground">From:</span> {selectedEmail.fromAddress}</div>
                        <div><span className="font-medium text-foreground">To:</span> {selectedEmail.toAddress}</div>
                        <div><span className="font-medium text-foreground">Date:</span> {new Date(selectedEmail.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted/20 rounded-md whitespace-pre-wrap">
                        {selectedEmail.body}
                      </div>
                    </div>
                    {selectedEmail.user && (
                      <div className="p-4 border-t mt-auto">
                        <h3 className="text-sm font-medium mb-2">Reply to {selectedEmail.user.firstName}</h3>
                        <AutoResizeTextarea
                          placeholder="Type your reply here..."
                          className="min-h-[100px] mb-2"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                        />
                        <div className="flex justify-end">
                          <Button onClick={handleSendReply} disabled={!replyText.trim() || sendingReply}>
                            {sendingReply ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                            Send Reply
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                    <Mail className="h-12 w-12 mb-4 opacity-20" />
                    <p>Select an email to view details</p>
                    <p className="text-sm mt-1">or click <strong>Compose</strong> to send a new email</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeView === "triggers" ? (
            <div className="flex-1 min-h-0 overflow-y-auto border rounded-lg bg-background">
              <div className="p-4 border-b flex items-center justify-between gap-3 sticky top-0 bg-background z-10">
                <div>
                  <h2 className="font-semibold">Email Triggers</h2>
                  <p className="text-sm text-muted-foreground">Current code-driven email moments, templates, senders, and variables.</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadEmailTriggers} disabled={triggerLoading}>
                  {triggerLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Refresh
                </Button>
              </div>

              {triggerLoading && emailTriggers.length === 0 ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : emailTriggers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No email triggers found.</div>
              ) : (
                <div className="divide-y">
                  {emailTriggers.map((trigger) => (
                    <div key={trigger.key} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base">{trigger.name}</h3>
                            <Badge variant={trigger.audience.toLowerCase().includes("admin") ? "destructive" : "secondary"} className="text-xs">
                              {trigger.audience}
                            </Badge>
                            <Badge variant={trigger.editable ? "default" : "outline"} className="text-xs">
                              {trigger.editable ? "Editable" : "Code-managed"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{trigger.trigger}</p>
                        </div>
                        <div className="text-xs text-muted-foreground text-right shrink-0">
                          <div>{trigger.backend}</div>
                          <div className="mt-1 font-medium text-foreground">{trigger.template}.hbs</div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3 mt-4 text-sm">
                        <div className="rounded-md border p-3">
                          <div className="text-xs uppercase text-muted-foreground font-medium mb-1">Sender</div>
                          <div className="break-words">{trigger.sender}</div>
                          {trigger.replyTo && <div className="text-xs text-muted-foreground mt-1">Reply-to: {trigger.replyTo}</div>}
                        </div>
                        <div className="rounded-md border p-3 md:col-span-2">
                          <div className="text-xs uppercase text-muted-foreground font-medium mb-2">Variables</div>
                          <div className="flex flex-wrap gap-1.5">
                            {trigger.variables.map((variable) => (
                              <Badge key={variable} variant="outline" className="font-mono text-[11px]">
                                {`{{${variable}}}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mt-3">{trigger.notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeView === "templates" ? (
            <div className="flex flex-1 gap-4 min-h-0 bg-background border rounded-lg overflow-hidden">
              <div className="w-80 border-r flex flex-col min-h-0">
                <div className="p-4 border-b flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">Templates</h2>
                    <p className="text-xs text-muted-foreground">Create and edit reusable email formats.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={startNewEmailTemplate} className="gap-1">
                    <Plus className="h-4 w-4" /> New
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {templateLoading && emailTemplates.length === 0 ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : emailTemplates.length === 0 ? (
                    <div className="p-6 text-sm text-center text-muted-foreground">No templates yet.</div>
                  ) : (
                    <div className="divide-y">
                      {emailTemplates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => selectEmailTemplate(template)}
                          className={`w-full text-left p-4 hover:bg-muted/50 transition ${selectedTemplateId === template.id ? "bg-muted" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{template.name}</span>
                            {!template.isActive && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-1">{template.key}</p>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Badge variant={template.audience.toLowerCase().includes("admin") ? "destructive" : "secondary"} className="text-[10px]">
                              {template.audience}
                            </Badge>
                            {template.isSystem && <Badge variant="outline" className="text-[10px]">Default</Badge>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0 overflow-y-auto">
                <div className="p-4 border-b flex items-center justify-between gap-3 sticky top-0 bg-background z-10">
                  <div>
                    <h2 className="font-semibold">{selectedTemplateId ? "Edit Template" : "New Template"}</h2>
                    <p className="text-sm text-muted-foreground">Variables use Handlebars format, for example {"{{recipientName}}"}.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={previewEmailTemplateDraft} disabled={templateSaving || !templateDraft.html.trim()} className="gap-1">
                      {templateSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                      Preview
                    </Button>
                    {selectedTemplateId && !selectedEmailTemplate?.isSystem && (
                      <Button variant="outline" size="sm" onClick={deleteEmailTemplate} disabled={templateSaving} className="gap-1 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    )}
                    <Button size="sm" onClick={saveEmailTemplate} disabled={templateSaving} className="gap-1">
                      {templateSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </Button>
                  </div>
                </div>

                <div className="p-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1.5 text-sm font-medium">
                        Name
                        <Input value={templateDraft.name} onChange={(e) => setTemplateDraft((draft) => ({ ...draft, name: e.target.value }))} placeholder="Manual support message" />
                      </label>
                      <label className="space-y-1.5 text-sm font-medium">
                        Key
                        <Input value={templateDraft.key} onChange={(e) => setTemplateDraft((draft) => ({ ...draft, key: e.target.value }))} placeholder="manual_user_message" disabled={Boolean(selectedTemplateId)} />
                      </label>
                    </div>

                    <label className="space-y-1.5 text-sm font-medium block">
                      Description
                      <Input value={templateDraft.description} onChange={(e) => setTemplateDraft((draft) => ({ ...draft, description: e.target.value }))} placeholder="What this email is used for" />
                    </label>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1.5 text-sm font-medium">
                        Audience
                        <Input value={templateDraft.audience} onChange={(e) => setTemplateDraft((draft) => ({ ...draft, audience: e.target.value }))} placeholder="customer, seller, admin" />
                      </label>
                      <label className="space-y-1.5 text-sm font-medium">
                        Trigger
                        <Input value={templateDraft.trigger} onChange={(e) => setTemplateDraft((draft) => ({ ...draft, trigger: e.target.value }))} placeholder="POST /admin/messages/send" />
                      </label>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="space-y-1.5 text-sm font-medium">
                        Sender name
                        <Input value={templateDraft.senderName} onChange={(e) => setTemplateDraft((draft) => ({ ...draft, senderName: e.target.value }))} />
                      </label>
                      <label className="space-y-1.5 text-sm font-medium">
                        Sender email
                        <select
                          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={templateDraft.senderEmail}
                          onChange={(e) => setTemplateDraft((draft) => ({ ...draft, senderEmail: e.target.value }))}
                        >
                          <option value="support@orivraa.com">support@orivraa.com</option>
                          <option value="orders@orivraa.com">orders@orivraa.com</option>
                          <option value="noreply@orivraa.com">noreply@orivraa.com</option>
                          <option value="admin@orivraa.com">admin@orivraa.com</option>
                        </select>
                      </label>
                      <label className="space-y-1.5 text-sm font-medium">
                        Reply-to
                        <Input value={templateDraft.replyTo} onChange={(e) => setTemplateDraft((draft) => ({ ...draft, replyTo: e.target.value }))} placeholder="support@orivraa.com" />
                      </label>
                    </div>

                    <label className="space-y-1.5 text-sm font-medium block">
                      Subject
                      <Input value={templateDraft.subject} onChange={(e) => setTemplateDraft((draft) => ({ ...draft, subject: e.target.value }))} placeholder="{{title}}" />
                    </label>

                    <label className="space-y-1.5 text-sm font-medium block">
                      HTML template
                      <textarea
                        className="min-h-[320px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={templateDraft.html}
                        onChange={(e) => setTemplateDraft((draft) => ({ ...draft, html: e.target.value }))}
                        spellCheck={false}
                      />
                    </label>

                    <label className="space-y-1.5 text-sm font-medium block">
                      Plain text fallback
                      <AutoResizeTextarea
                        className="min-h-[90px]"
                        value={templateDraft.text}
                        onChange={(e) => setTemplateDraft((draft) => ({ ...draft, text: e.target.value }))}
                        placeholder="{{message}}"
                      />
                    </label>

                    <label className="space-y-1.5 text-sm font-medium block">
                      Variables
                      <Input value={templateDraft.variables} onChange={(e) => setTemplateDraft((draft) => ({ ...draft, variables: e.target.value }))} placeholder="title, recipientName, message, sentAt" />
                    </label>

                    <div className="flex items-center gap-6 text-sm">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={templateDraft.isActive} onChange={(e) => setTemplateDraft((draft) => ({ ...draft, isActive: e.target.checked }))} />
                        Active
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={templateDraft.isSystem} onChange={(e) => setTemplateDraft((draft) => ({ ...draft, isSystem: e.target.checked }))} />
                        Default template
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <h3 className="font-medium mb-3">Available Variables</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {draftPayload(templateDraft).variables.map((variable) => (
                          <Badge key={variable} variant="outline" className="font-mono text-[11px]">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border overflow-hidden">
                      <div className="p-4 border-b">
                        <h3 className="font-medium">Preview</h3>
                        {templatePreview ? (
                          <div className="text-xs text-muted-foreground mt-2 space-y-1">
                            <div><span className="font-medium text-foreground">From:</span> {templatePreview.from}</div>
                            <div><span className="font-medium text-foreground">Subject:</span> {templatePreview.subject}</div>
                            {templatePreview.replyTo && <div><span className="font-medium text-foreground">Reply-to:</span> {templatePreview.replyTo}</div>}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">Render a preview to inspect the final email.</p>
                        )}
                      </div>
                      {templatePreview ? (
                        <iframe title="Email preview" srcDoc={templatePreview.html} className="w-full h-[520px] bg-white" />
                      ) : (
                        <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                          No preview rendered yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{botStats?.totalSessions ?? botTotal}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Escalated</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{botStats?.escalatedSessions ?? 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Escalation Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{botStats?.escalationRate ?? "0%"}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg Messages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{botStats?.avgMessagesPerSession ?? "0"}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">AI assistant transcripts</h2>
                  <p className="text-sm text-muted-foreground">
                    Review who used the AI assistant, what they asked, detected lead intents, and escalation history.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadBotSessions(botPage)} disabled={botLoading}>
                  {botLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Refresh
                </Button>
              </div>

              {botStats?.intentBreakdown?.length ? (
                <div className="flex flex-wrap gap-2">
                  {botStats.intentBreakdown.slice(0, 10).map((intent) => (
                    <Badge key={intent.intent} variant="outline" className="gap-1">
                      {intent.intent.replace(/_/g, " ")}
                      <span className="text-muted-foreground">{intent.count}</span>
                    </Badge>
                  ))}
                </div>
              ) : null}

              <div className="space-y-3">
                {botLoading && botSessions.length === 0 ? (
                  <div className="border rounded-lg p-8 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin" />
                    Loading AI chats...
                  </div>
                ) : botSessions.length === 0 ? (
                  <div className="border rounded-lg p-8 text-center text-muted-foreground">
                    <Bot className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    No AI assistant chats logged yet
                  </div>
                ) : (
                  botSessions.map((session) => <BotSessionRow key={session.id} session={session} />)
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={botPage <= 1 || botLoading}
                  onClick={() => setBotPage((page) => Math.max(1, page - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {botPage} of {botTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={botPage >= botTotalPages || botLoading}
                  onClick={() => setBotPage((page) => Math.min(botTotalPages, page + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
