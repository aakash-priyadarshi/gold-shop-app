"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { RichMessageCard } from "@/components/chat/RichMessageCard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import {
  useChatSocket,
  type ChatSocketMessage,
  type ViolationWarning,
} from "@/hooks/useChatSocket";
import { chatApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import {
  AlertTriangle,
  Lock,
  MessageSquare,
  ScanLine,
  Send,
  Shield,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
}

interface Message {
  id: string;
  senderId: string;
  senderRole: string;
  content: string;
  hasViolation: boolean;
  isSystem: boolean;
  messageType?: string;
  payload?: any;
  createdAt: string;
}

export default function ShopMessagesPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const shopData = user?.shop;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [violationAlert, setViolationAlert] = useState<ViolationWarning | null>(
    null,
  );
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevConvRef = useRef<string | null>(null);

  /* ── WebSocket callbacks ── */
  const handleNewMessage = useCallback(
    (msg: ChatSocketMessage) => {
      if (msg.conversationId === selectedConversation) {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id)
            ? prev
            : [...prev, msg as unknown as Message],
        );
      }
      loadConversationsQuiet();
    },
    [selectedConversation],
  );

  const handleMessageBlocked = useCallback(
    (data: ViolationWarning) => {
      setViolationAlert(data);
      setSending(false);
      if (data.strikeCount >= 3) {
        refreshUser().then(() => {
          setTimeout(() => window.location.reload(), 2000);
        });
        return;
      }
      setTimeout(() => setViolationAlert(null), 15000);
    },
    [refreshUser],
  );

  const handleTyping = useCallback(
    (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== user?.id) {
        setTypingUser(data.isTyping ? data.userId : null);
        if (data.isTyping) setTimeout(() => setTypingUser(null), 4000);
      }
    },
    [user?.id],
  );

  const {
    connected,
    joinConversation,
    leaveConversation,
    sendMessage: wsSendMessage,
    sendTyping,
    markRead: wsMarkRead,
  } = useChatSocket({
    onNewMessage: handleNewMessage,
    onMessageBlocked: handleMessageBlocked,
    onTyping: handleTyping,
  });

  useEffect(() => {
    if (shopData?.id) loadConversations();
  }, [shopData?.id]);

  /* ── Join/leave WS rooms on conversation switch ── */
  useEffect(() => {
    if (prevConvRef.current && prevConvRef.current !== selectedConversation) {
      leaveConversation(prevConvRef.current);
    }
    prevConvRef.current = selectedConversation;
    if (selectedConversation) {
      loadMessages(selectedConversation);
      joinConversation(selectedConversation);
      if (connected) wsMarkRead(selectedConversation);
    }
  }, [selectedConversation, connected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Slow fallback polling ── */
  useEffect(() => {
    if (!shopData?.id) return;
    const interval = setInterval(
      () => {
        loadConversationsQuiet();
        if (selectedConversation) loadMessages(selectedConversation);
      },
      connected ? 60000 : 15000,
    );
    return () => clearInterval(interval);
  }, [shopData?.id, connected, selectedConversation]);

  async function loadConversations() {
    try {
      const res = await chatApi.listConversations(shopData?.id);
      setConversations(res.data);
    } catch (e) {
      console.error("Failed to load conversations", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadConversationsQuiet() {
    try {
      const res = await chatApi.listConversations(shopData?.id);
      setConversations(res.data);
    } catch {
      /* silent */
    }
  }

  async function loadMessages(conversationId: string) {
    try {
      const res = await chatApi.getMessages(conversationId);
      setMessages(res.data.messages);
      chatApi.markAsRead(conversationId);
    } catch (e) {
      console.error("Failed to load messages", e);
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || !selectedConversation) return;
    const content = newMessage;
    setNewMessage("");
    setSending(true);

    const sentViaWs = connected && wsSendMessage(selectedConversation, content);
    if (!sentViaWs) {
      try {
        const res = await chatApi.sendMessage(selectedConversation, {
          content,
        });
        if (res.data?.blocked) {
          setViolationAlert({
            warning: res.data.warning,
            strikeCount: res.data.strikeCount,
            conversationId: selectedConversation,
          });
          if (res.data.strikeCount >= 3) {
            refreshUser().then(() => {
              setTimeout(() => window.location.reload(), 2000);
            });
          } else {
            setTimeout(() => setViolationAlert(null), 15000);
          }
        } else {
          await loadMessages(selectedConversation);
        }
      } catch (e: any) {
        const msg = e?.response?.data?.message || "Failed to send message";
        setViolationAlert({
          warning: msg,
          strikeCount: 0,
          conversationId: selectedConversation,
        });
        setTimeout(() => setViolationAlert(null), 10000);
      }
    }
    setSending(false);
  }

  function handleInputChange(value: string) {
    setNewMessage(value);
    if (selectedConversation && connected)
      sendTyping(selectedConversation, true);
  }

  const selectedConv = conversations.find((c) => c.id === selectedConversation);
  const t = useT();

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="flex flex-col h-[calc(100vh-8rem)]">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-6 w-6" />
            <h1 className="text-2xl font-bold">
              <T>Customer Messages</T>
            </h1>
            {connected ? (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Wifi className="h-3 w-3" /> <T>Live</T>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <WifiOff className="h-3 w-3" /> <T>Polling</T>
              </span>
            )}
          </div>

          <div className="flex flex-1 gap-4 min-h-0">
            {/* Conversation list */}
            <div className="w-80 flex-shrink-0 border rounded-lg overflow-y-auto" data-tour="messages-list">
              {loading ? (
                <div className="p-4 text-muted-foreground">
                  <T>Loading...</T>
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>
                    <T>No customer messages yet</T>
                  </p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full p-3 text-left border-b hover:bg-muted/50 transition ${
                      selectedConversation === conv.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {conv.buyer.firstName} {conv.buyer.lastName}
                      </span>
                      {conv.status === "LOCKED" && (
                        <Lock className="h-4 w-4 text-destructive" />
                      )}
                      {conv.messages[0] && !conv.messages[0].isRead && (
                        <span className="h-2 w-2 bg-primary rounded-full" />
                      )}
                    </div>
                    {conv.messages[0] && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {conv.messages[0].content}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col border rounded-lg" data-tour="messages-thread">
              {!selectedConversation ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <T>Select a conversation</T>
                </div>
              ) : (
                <>
                  <div className="p-3 border-b flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">
                        {selectedConv?.buyer.firstName}{" "}
                        {selectedConv?.buyer.lastName}
                      </h3>
                      {selectedConv?.status === "LOCKED" && (
                        <Badge variant="destructive" className="text-xs">
                          <Lock className="h-3 w-3 mr-1" /> <T>Locked</T>
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedConv) {
                            router.push(
                              `/dashboard/shop/pos?customerId=${selectedConv.buyer.id}&conversationId=${selectedConv.id}`,
                            );
                          }
                        }}
                      >
                        <ScanLine className="h-3 w-3 mr-1" />
                        <T>Load Picks to POS</T>
                      </Button>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Shield className="h-3 w-3" />
                        <T>Anti-circumvention active</T>
                      </div>
                    </div>
                  </div>

                  {/* Violation warning banner */}
                  {violationAlert &&
                    violationAlert.conversationId === selectedConversation && (
                      <div className="px-4 py-3 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-700">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                              ⚠️ <T>Message Blocked</T>
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                              {violationAlert.warning}
                            </p>
                            {violationAlert.strikeCount > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs font-semibold text-red-800 dark:text-red-200">
                                  Warnings: {violationAlert.strikeCount}/3
                                </span>
                                <div className="flex gap-1">
                                  {[1, 2, 3].map((i) => (
                                    <div
                                      key={i}
                                      className={`w-6 h-2 rounded-full ${
                                        violationAlert.strikeCount >= i
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
                                <span className="text-xs text-red-600 dark:text-red-400">
                                  {violationAlert.strikeCount >= 3
                                    ? "Account suspended!"
                                    : `${3 - violationAlert.strikeCount} warning(s) remaining before account suspension`}
                                </span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setViolationAlert(null)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

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
                                : "bg-muted"
                            } ${msg.hasViolation ? "border-2 border-yellow-500" : ""}`}
                          >
                            <RichMessageCard
                              messageType={msg.messageType}
                              payload={msg.payload}
                              content={msg.content}
                            />
                            {(!msg.messageType ||
                              msg.messageType === "TEXT") && (
                              <p className="text-sm">{msg.content}</p>
                            )}
                            {msg.hasViolation && (
                              <p className="text-xs mt-1 opacity-75">
                                ⚠️ <T>Contact info removed</T>
                              </p>
                            )}
                            <span className="text-xs opacity-60 mt-1 block">
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Typing indicator */}
                    {typingUser && (
                      <div className="flex justify-start">
                        <div className="bg-muted px-3 py-2 rounded-lg">
                          <div className="flex gap-1">
                            <span
                              className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            />
                            <span
                              className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            />
                            <span
                              className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {selectedConv?.status === "LOCKED" ? (
                    <div className="p-3 border-t bg-muted text-center text-sm text-muted-foreground">
                      <T>Conversation locked — contact support</T>
                    </div>
                  ) : (
                    <div className="p-3 border-t flex gap-2">
                      <AutoResizeTextarea
                        className="max-h-[200px] min-h-[44px]"
                        value={newMessage}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder={t("Reply to customer...")}
                        disabled={sending}
                      />
                      <Button
                        onClick={handleSend}
                        disabled={sending || !newMessage.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
