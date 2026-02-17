"use client";

import { useAuth } from "@/hooks/useAuth";
import { chatApi } from "@/lib/api";
import { useChatPopup } from "@/contexts/ChatPopupContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  MessageSquare,
  Minus,
  Send,
  X,
  Shield,
  Lock,
  Loader2,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";

/* ────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────── */
interface Conversation {
  id: string;
  buyerId: string;
  shopId: string;
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
}

interface Message {
  id: string;
  senderId: string;
  senderRole: string;
  content: string;
  hasViolation: boolean;
  isSystem: boolean;
  createdAt: string;
}

/* ────────────────────────────────────────────────────────────
   Widget
   ──────────────────────────────────────────────────────────── */
export function ChatPopupWidget() {
  const { user } = useAuth();
  const {
    isOpen,
    isMinimized,
    activeConversationId,
    openChat,
    openChatList,
    minimizeChat,
    closeChat,
    toggleMinimize,
  } = useChatPopup();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isShopkeeper = user?.role === "SHOPKEEPER";
  const shopId = user?.shop?.id;

  /* ── Load conversations ── */
  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConvs(true);
    try {
      const res = await chatApi.listConversations(isShopkeeper ? shopId : undefined);
      const convs: Conversation[] = res.data || [];
      setConversations(convs);

      // Count unread
      const unread = convs.reduce((acc, c) => {
        const lastMsg = c.messages?.[0];
        if (lastMsg && !lastMsg.isRead && lastMsg.senderRole !== user.role) {
          return acc + 1;
        }
        return acc;
      }, 0);
      setUnreadCount(unread);
    } catch {
      /* silent */
    } finally {
      setLoadingConvs(false);
    }
  }, [user, isShopkeeper, shopId]);

  /* ── Load messages for active conversation ── */
  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await chatApi.getMessages(convId);
      setMessages(res.data?.messages || []);
      chatApi.markAsRead(convId).catch(() => {});
    } catch {
      /* silent */
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  /* ── Send message ── */
  const handleSend = async () => {
    if (!newMessage.trim() || !activeConversationId) return;
    setSending(true);
    try {
      await chatApi.sendMessage(activeConversationId, { content: newMessage });
      setNewMessage("");
      await loadMessages(activeConversationId);
    } catch (e: any) {
      /* show inline later if needed */
    } finally {
      setSending(false);
    }
  };

  /* ── Auto-scroll to bottom ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Load conversations on open ── */
  useEffect(() => {
    if (isOpen && !isMinimized) {
      loadConversations();
    }
  }, [isOpen, isMinimized, loadConversations]);

  /* ── Load messages when conversation changes ── */
  useEffect(() => {
    if (activeConversationId && isOpen && !isMinimized) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId, isOpen, isMinimized, loadMessages]);

  /* ── Poll for new messages every 8s when chat is open ── */
  useEffect(() => {
    if (isOpen && !isMinimized && activeConversationId) {
      pollRef.current = setInterval(() => {
        loadMessages(activeConversationId);
      }, 8000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen, isMinimized, activeConversationId, loadMessages]);

  /* ── Poll conversation list for unread badge even when minimized/closed ── */
  useEffect(() => {
    if (!user) return;
    // Initial load for unread count
    loadConversations();
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, [user, loadConversations]);

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  /* ── Resolve display name for a conversation ── */
  const getConvName = (conv: Conversation) => {
    if (isShopkeeper) {
      return `${conv.buyer?.firstName || ""} ${conv.buyer?.lastName || ""}`.trim() || "Customer";
    }
    return conv.shop?.shopName || "Shop";
  };

  /* ─────────────────────────────────────────────────────────
     RENDER: Floating bubble (when closed or minimized)
     ───────────────────────────────────────────────────────── */
  if (!isOpen || isMinimized) {
    return (
      <button
        onClick={() => (isOpen ? toggleMinimize() : openChatList())}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "flex items-center justify-center",
          "w-14 h-14 rounded-2xl",
          "bg-gradient-to-br from-gold-500 to-gold-600",
          "text-white shadow-lg shadow-gold-500/30",
          "hover:shadow-xl hover:shadow-gold-500/40 hover:scale-105",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2",
        )}
        aria-label="Open chat"
      >
        <MessageSquare className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    );
  }

  /* ─────────────────────────────────────────────────────────
     RENDER: Expanded chat popup
     ───────────────────────────────────────────────────────── */
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "w-[370px] h-[520px]",
        "bg-white rounded-2xl",
        "border border-gray-200",
        "shadow-2xl shadow-black/15",
        "flex flex-col overflow-hidden",
        "animate-in slide-in-from-bottom-4 fade-in duration-200",
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-white flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {activeConversationId && (
            <button
              onClick={() => openChatList()}
              className="p-1 rounded-lg hover:bg-white/20 transition"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <MessageSquare className="h-5 w-5 flex-shrink-0" />
          <span className="font-semibold text-sm truncate">
            {activeConversationId ? getConvName(activeConv!) : "Messages"}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={minimizeChat}
            className="p-1.5 rounded-lg hover:bg-white/20 transition"
            aria-label="Minimize chat"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={closeChat}
            className="p-1.5 rounded-lg hover:bg-white/20 transition"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      {!activeConversationId ? (
        /* ── Conversation List ── */
        <ScrollArea className="flex-1">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Start a conversation from an order or shop page
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conv) => {
                const lastMsg = conv.messages?.[0];
                const isUnread = lastMsg && !lastMsg.isRead && lastMsg.senderRole !== user?.role;
                return (
                  <button
                    key={conv.id}
                    onClick={() => openChat(conv.id)}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-gray-50 transition flex items-start gap-3",
                      isUnread && "bg-gold-50/50",
                    )}
                  >
                    {/* Avatar circle */}
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-gold-100 to-gold-200 flex items-center justify-center text-gold-700 text-xs font-bold">
                      {getConvName(conv).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("text-sm truncate", isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-700")}>
                          {getConvName(conv)}
                        </span>
                        {conv.status === "LOCKED" && <Lock className="h-3 w-3 text-red-500 flex-shrink-0" />}
                      </div>
                      {lastMsg && (
                        <p className={cn("text-xs truncate mt-0.5", isUnread ? "text-gray-700 font-medium" : "text-gray-500")}>
                          {lastMsg.content}
                        </p>
                      )}
                      <span className="text-[10px] text-gray-400 mt-0.5 block">
                        {conv.updatedAt ? new Date(conv.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    {isUnread && (
                      <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-gold-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      ) : (
        /* ── Active Chat ── */
        <>
          {/* Safety banner */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border-b text-[11px] text-gray-500 flex-shrink-0">
            <Shield className="h-3 w-3" />
            Messages are monitored for safety
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-3 py-2">
            {loadingMsgs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.isSystem ? "justify-center" : msg.senderId === user?.id ? "justify-end" : "justify-start",
                    )}
                  >
                    {msg.isSystem ? (
                      <div className="text-[10px] text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
                        {msg.content}
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "max-w-[80%] px-3 py-2 rounded-2xl text-sm",
                          msg.senderId === user?.id
                            ? "bg-gradient-to-br from-gold-500 to-gold-600 text-white rounded-br-md"
                            : "bg-gray-100 text-gray-800 rounded-bl-md",
                          msg.hasViolation && "ring-2 ring-yellow-400",
                        )}
                      >
                        <p className="break-words">{msg.content}</p>
                        {msg.hasViolation && (
                          <p className="text-[10px] mt-1 opacity-75">⚠️ Contact info removed</p>
                        )}
                        <span className="text-[10px] opacity-60 mt-1 block">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          {activeConv?.status === "LOCKED" ? (
            <div className="px-3 py-2.5 border-t bg-gray-50 text-center text-xs text-gray-500 flex-shrink-0">
              <Lock className="h-3 w-3 inline mr-1" />
              Conversation locked — contact support
            </div>
          ) : (
            <div className="px-3 py-2.5 border-t flex gap-2 flex-shrink-0 bg-white">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Type a message…"
                disabled={sending}
                className="text-sm h-9 rounded-xl"
              />
              <Button
                onClick={handleSend}
                disabled={sending || !newMessage.trim()}
                size="sm"
                className="h-9 w-9 p-0 rounded-xl bg-gold-500 hover:bg-gold-600"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
