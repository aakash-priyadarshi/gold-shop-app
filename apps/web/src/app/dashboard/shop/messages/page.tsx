'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ShopGuard } from '@/components/auth/RouteGuard';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Lock, Shield } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { chatApi } from '@/lib/api';

interface Conversation {
  id: string;
  status: string;
  updatedAt: string;
  buyer: { id: string; firstName: string; lastName: string };
  shop: { id: string; shopName: string };
  messages: Array<{ content: string; createdAt: string; senderRole: string; isRead: boolean }>;
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

export default function ShopMessagesPage() {
  const { user } = useAuth();
  const shopData = user?.shop;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shopData?.id) {
      loadConversations();
    }
  }, [shopData?.id]);

  useEffect(() => {
    if (selectedConversation) loadMessages(selectedConversation);
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations() {
    try {
      const res = await chatApi.listConversations(shopData?.id);
      setConversations(res.data);
    } catch (e) {
      console.error('Failed to load conversations', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(conversationId: string) {
    try {
      const res = await chatApi.getMessages(conversationId);
      setMessages(res.data.messages);
      chatApi.markAsRead(conversationId);
    } catch (e) {
      console.error('Failed to load messages', e);
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || !selectedConversation) return;
    setSending(true);
    try {
      await chatApi.sendMessage(selectedConversation, { content: newMessage });
      setNewMessage('');
      loadMessages(selectedConversation);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="flex flex-col h-[calc(100vh-8rem)]">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Customer Messages</h1>
          </div>

          <div className="flex flex-1 gap-4 min-h-0">
            {/* Conversation list */}
            <div className="w-80 flex-shrink-0 border rounded-lg overflow-y-auto">
              {loading ? (
                <div className="p-4 text-muted-foreground">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No customer messages yet</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full p-3 text-left border-b hover:bg-muted/50 transition ${
                      selectedConversation === conv.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {conv.buyer.firstName} {conv.buyer.lastName}
                      </span>
                      {conv.status === 'LOCKED' && <Lock className="h-4 w-4 text-destructive" />}
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
            <div className="flex-1 flex flex-col border rounded-lg">
              {!selectedConversation ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Select a conversation
                </div>
              ) : (
                <>
                  <div className="p-3 border-b flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">
                        {selectedConv?.buyer.firstName} {selectedConv?.buyer.lastName}
                      </h3>
                      {selectedConv?.status === 'LOCKED' && (
                        <Badge variant="destructive" className="text-xs">
                          <Lock className="h-3 w-3 mr-1" /> Locked
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      Anti-circumvention active
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.isSystem ? 'justify-center' : msg.senderId === user?.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {msg.isSystem ? (
                          <div className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-full">
                            {msg.content}
                          </div>
                        ) : (
                          <div
                            className={`max-w-[70%] px-3 py-2 rounded-lg ${
                              msg.senderId === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            } ${msg.hasViolation ? 'border-2 border-yellow-500' : ''}`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            {msg.hasViolation && (
                              <p className="text-xs mt-1 opacity-75">⚠️ Contact info removed</p>
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

                  {selectedConv?.status === 'LOCKED' ? (
                    <div className="p-3 border-t bg-muted text-center text-sm text-muted-foreground">
                      Conversation locked — contact support
                    </div>
                  ) : (
                    <div className="p-3 border-t flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Reply to customer..."
                        disabled={sending}
                      />
                      <Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
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
