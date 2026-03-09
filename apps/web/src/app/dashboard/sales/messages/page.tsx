"use client";

import { SalesGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { chatApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import { Lock, MessageSquare, Send, Shield, Store, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

export default function SalesMessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) loadMessages(selectedConversation);
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const selectedConv = conversations.find((c) => c.id === selectedConversation);
  const t = useT();

  return (
    <SalesGuard>
      <DashboardLayout>
        <div className="flex flex-col h-[calc(100vh-8rem)]">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-6 w-6" />
            <h1 className="text-2xl font-bold">
              <T>Messages</T>
            </h1>
            <Badge variant="secondary" className="ml-2">
              {t(`${conversations.length} conversations`)}
            </Badge>
          </div>

          <div className="flex flex-1 gap-4 min-h-0">
            {/* Conversation list */}
            <div className="w-80 flex-shrink-0 border rounded-lg overflow-y-auto">
              {loading ? (
                <div className="p-4 text-muted-foreground">
                  <T>Loading...</T>
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>
                    <T>No conversations found</T>
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
                  <T>Select a conversation to view messages</T>
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
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      <T>Sales view</T>
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
                                ⚠️ {t("Violation:")}{" "}
                                {msg.violationType ||
                                  t("Contact info detected")}
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

                  {/* Sales can respond in conversations */}
                  <div className="p-3 border-t flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && !e.shiftKey && handleSend()
                      }
                      placeholder={t("Send a message as Sales...")}
                      disabled={sending}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={sending || !newMessage.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </SalesGuard>
  );
}
