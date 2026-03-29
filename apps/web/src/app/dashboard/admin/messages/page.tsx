"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { adminApi, chatApi } from "@/lib/api";
import { Lock, MessageSquare, Send, Shield, Store, Users, Search } from "lucide-react";
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

export default function AdminMessagesPage() {
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

  // User search feature
  const [userSearchText, setUserSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) loadMessages(selectedConversation);
  }, [selectedConversation]);

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

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="flex flex-col h-[calc(100vh-8rem)]">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-6 w-6" />
            <h1 className="text-2xl font-bold">All Messages</h1>
            <Badge variant="secondary" className="ml-2">
              {conversations.length} conversations
            </Badge>
          </div>

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

                  {/* Admin can respond in any conversation */}
                  <div className="p-3 border-t flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && !e.shiftKey && handleSend()
                      }
                      placeholder="Send a message as Admin..."
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
    </AdminGuard>
  );
}
