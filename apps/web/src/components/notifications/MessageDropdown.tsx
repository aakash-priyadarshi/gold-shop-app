"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatPopup } from "@/contexts/ChatPopupContext";
import { useAuth } from "@/hooks/useAuth";
import { chatApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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

export function MessageDropdown() {
  const { user } = useAuth();
  const { openChat } = useChatPopup();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isShopkeeper = user?.role === "SHOPKEEPER";
  const shopId = user?.shop?.id;

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await chatApi.listConversations(
        isShopkeeper ? shopId : undefined,
      );
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
    }
  }, [user, isShopkeeper, shopId]);

  // Fetch on mount + poll every 30s
  useEffect(() => {
    if (!user) return;
    fetchConversations();
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [user, fetchConversations]);

  // Refresh when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchConversations().finally(() => setLoading(false));
    }
  }, [isOpen, fetchConversations]);

  const getDisplayName = (conv: Conversation) => {
    if (isShopkeeper) {
      return (
        `${conv.buyer?.firstName || ""} ${conv.buyer?.lastName || ""}`.trim() ||
        "Customer"
      );
    }
    return conv.shop?.shopName || "Shop";
  };

  const getInitial = (conv: Conversation) => {
    return getDisplayName(conv).charAt(0).toUpperCase();
  };

  const getMessagesRoute = () => {
    switch (user?.role) {
      case "SHOPKEEPER":
        return "/dashboard/shop/messages";
      case "ADMIN":
        return "/dashboard/admin/chat-monitoring";
      default:
        return "/dashboard/customer/messages";
    }
  };

  const handleConversationClick = (convId: string) => {
    setIsOpen(false);
    openChat(convId);
  };

  // Show at most 5 recent conversations
  const recentConvs = conversations.slice(0, 5);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageSquare className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Messages
          </span>
          {unreadCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {unreadCount} unread
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-[340px]">
          {loading && conversations.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : recentConvs.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare className="h-8 w-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-muted-foreground">
                No conversations yet
              </p>
            </div>
          ) : (
            recentConvs.map((conv) => {
              const lastMsg = conv.messages?.[0];
              const isUnread =
                lastMsg && !lastMsg.isRead && lastMsg.senderRole !== user?.role;

              return (
                <button
                  key={conv.id}
                  onClick={() => handleConversationClick(conv.id)}
                  className={cn(
                    "w-full px-3 py-2.5 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left",
                    isUnread && "bg-gold-50/50 dark:bg-gold-950/20",
                  )}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-gold-100 to-gold-200 flex items-center justify-center text-gold-700 text-xs font-bold mt-0.5">
                    {getInitial(conv)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm truncate",
                          isUnread
                            ? "font-semibold text-gray-900 dark:text-gray-100"
                            : "font-medium text-gray-700 dark:text-gray-300",
                        )}
                      >
                        {getDisplayName(conv)}
                      </span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {conv.updatedAt
                          ? formatDistanceToNow(new Date(conv.updatedAt), {
                              addSuffix: false,
                            })
                          : ""}
                      </span>
                    </div>
                    {lastMsg && (
                      <p
                        className={cn(
                          "text-xs truncate mt-0.5",
                          isUnread
                            ? "text-gray-700 dark:text-gray-300 font-medium"
                            : "text-gray-500 dark:text-gray-400",
                        )}
                      >
                        {lastMsg.senderRole === user?.role ? "You: " : ""}
                        {lastMsg.content}
                      </p>
                    )}
                  </div>

                  {/* Unread dot */}
                  {isUnread && (
                    <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-gold-500" />
                  )}
                </button>
              );
            })
          )}
        </ScrollArea>
        {conversations.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <Link
              href={getMessagesRoute()}
              onClick={() => setIsOpen(false)}
              className="block w-full text-center text-sm py-2 text-gold-600 hover:text-gold-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
            >
              View all messages
            </Link>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
