"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatPopup } from "@/contexts/ChatPopupContext";
import { useAuth } from "@/hooks/useAuth";
import {
  useChatSocket,
  type ChatSocketMessage,
  type ViolationWarning,
} from "@/hooks/useChatSocket";
import { chatApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import {
  AlertTriangle,
  ArrowLeft,
  EyeOff,
  ExternalLink,
  FileText,
  ImageIcon,
  Loader2,
  Lock,
  MessageSquare,
  Minus,
  Paperclip,
  Send,
  Shield,
  Smile,
  Video,
  WifiOff,
  X,
} from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
  shop: { id: string; shopName: string; userId?: string };
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
  attachmentUrl?: string;
  attachmentType?: string;
}

const CLOUDFLARE_UPLOAD_URL =
  process.env.NEXT_PUBLIC_CDN_UPLOAD_URL || "https://images.orivraa.com/upload";

/* ────────────────────────────────────────────────────────────
   Widget
   ──────────────────────────────────────────────────────────── */
export function ChatPopupWidget() {
  const { user, refreshUser } = useAuth();
  const {
    isOpen,
    isHidden,
    isMinimized,
    activeConversationId,
    openChat,
    openChatList,
    minimizeChat,
    closeChat,
    hideChat,
    restoreChat,
    toggleMinimize,
  } = useChatPopup();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [violationAlert, setViolationAlert] = useState<ViolationWarning | null>(
    null,
  );
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevConvRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const seenMsgIds = useRef<Set<string>>(new Set());
  const [fileAccept, setFileAccept] = useState("");
  const pathname = usePathname();
  const [bubblePosition, setBubblePosition] = useState(() => {
    if (typeof window === "undefined") return { right: 96, bottom: 24 };
    try {
      const saved = localStorage.getItem("orivraa-chat-bubble-position");
      return saved ? JSON.parse(saved) : { right: 96, bottom: 24 };
    } catch {
      return { right: 96, bottom: 24 };
    }
  });
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
  } | null>(null);

  const isShopkeeper = user?.role === "SHOPKEEPER";
  const shopId = user?.shop?.id;

  const updateUnreadCount = useCallback((convs: Conversation[]) => {
    const unread = convs.reduce((acc, c) => {
      const lastMsg = c.messages?.[0];
      if (lastMsg && !lastMsg.isRead && lastMsg.senderRole !== user?.role) {
        return acc + 1;
      }
      return acc;
    }, 0);
    setUnreadCount(unread);
  }, [user?.role]);

  /* ── Load conversations (full, with loading state) ── */
  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConvs(true);
    try {
      const res = await chatApi.listConversations(
        isShopkeeper ? shopId : undefined,
      );
      const convs: Conversation[] = res.data || [];
      setConversations(convs);
      updateUnreadCount(convs);
    } catch {
      /* silent */
    } finally {
      setLoadingConvs(false);
    }
  }, [user, isShopkeeper, shopId, updateUnreadCount]);

  /* ── Quiet refresh (no loading spinner) ── */
  const loadConversationsQuiet = useCallback(async () => {
    if (!user) return;
    try {
      const res = await chatApi.listConversations(
        isShopkeeper ? shopId : undefined,
      );
      const convs: Conversation[] = res.data || [];
      setConversations(convs);
      updateUnreadCount(convs);
    } catch {
      /* silent */
    }
  }, [user, isShopkeeper, shopId, updateUnreadCount]);

  /* ── WebSocket: live message handling ── */
  const handleNewMessage = useCallback(
    (msg: ChatSocketMessage) => {
      // Global dedup — message may arrive from both room broadcast and direct emit
      if (seenMsgIds.current.has(msg.id)) return;
      seenMsgIds.current.add(msg.id);
      // Keep the set from growing unbounded
      if (seenMsgIds.current.size > 200) {
        const arr = Array.from(seenMsgIds.current);
        seenMsgIds.current = new Set(arr.slice(-100));
      }

      // If we're in the conversation, append the message
      if (msg.conversationId === activeConversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg as unknown as Message];
        });
      }

      // If the chatbox is closed/minimized or msg is for a different conversation,
      // immediately bump the unread count so the badge shows right away
      if (
        msg.senderId !== user?.id &&
        (!isOpen || isMinimized || msg.conversationId !== activeConversationId)
      ) {
        setUnreadCount((prev) => prev + 1);
      }

      // Also refresh conversation list for accurate sidebar/unread counts
      loadConversationsQuiet();
    },
    [
      activeConversationId,
      isOpen,
      isMinimized,
      user?.id,
      loadConversationsQuiet,
    ],
  );

  const handleMessageBlocked = useCallback(
    (data: ViolationWarning) => {
      setViolationAlert(data);
      setSending(false);

      // 3rd strike — account has been suspended
      // Refresh user profile so SuspendedOverlay activates, then reload the page
      if (data.strikeCount >= 3) {
        refreshUser().then(() => {
          // Small delay so the user sees the final warning before the overlay appears
          setTimeout(() => window.location.reload(), 2000);
        });
        return;
      }

      // Auto-dismiss after 15s for non-suspension violations
      setTimeout(() => setViolationAlert(null), 15000);
    },
    [refreshUser],
  );

  const handleTypingEvent = useCallback(
    (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== user?.id) {
        setTypingUser(data.isTyping ? data.userId : null);
        if (data.isTyping) {
          if (typingTimeout.current) clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => setTypingUser(null), 4000);
        }
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
    checkOnline,
  } = useChatSocket({
    onNewMessage: handleNewMessage,
    onMessageBlocked: handleMessageBlocked,
    onTyping: handleTypingEvent,
  });

  /* ── Online presence check ── */
  useEffect(() => {
    if (!connected || conversations.length === 0) return;
    // Gather the other party's user IDs from conversations
    const otherUserIds = conversations.map((c) =>
      isShopkeeper ? c.buyerId : c.shop?.userId || c.shopId,
    );
    const uniqueIds = Array.from(new Set(otherUserIds)).filter(Boolean);
    if (uniqueIds.length === 0) return;

    checkOnline(uniqueIds).then((onlineIds) => {
      setOnlineUsers(new Set(onlineIds));
    });

    // Re-check every 30s
    const interval = setInterval(() => {
      checkOnline(uniqueIds).then((onlineIds) => {
        setOnlineUsers(new Set(onlineIds));
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [connected, conversations, isShopkeeper, checkOnline]);

  /* ── File attachment handler ── */
  const openFilePicker = (type: "image" | "video" | "document") => {
    setShowAttachMenu(false);
    if (type === "image") {
      setFileAccept("image/jpeg,image/png,image/webp,image/gif");
    } else if (type === "video") {
      setFileAccept("video/mp4,video/webm");
    } else {
      setFileAccept(
        "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    }
    // Need to wait a tick so the accept attribute updates
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const isDoc =
      file.type === "application/pdf" ||
      file.type.includes("msword") ||
      file.type.includes("wordprocessingml");

    if (!isImage && !isVideo && !isDoc) {
      alert(
        "Only images (JPG, PNG, WebP, GIF), videos (MP4, WebM), and documents (PDF, DOC) are allowed.",
      );
      return;
    }

    // Validate size: images 2MB, videos 10MB, docs 5MB
    if (isImage && file.size > 2 * 1024 * 1024) {
      alert("Image too large. Maximum size: 2 MB");
      e.target.value = "";
      return;
    }
    if (isVideo && file.size > 10 * 1024 * 1024) {
      alert("Video too large. Maximum size: 10 MB");
      e.target.value = "";
      return;
    }
    if (isDoc && file.size > 5 * 1024 * 1024) {
      alert("Document too large. Maximum size: 5 MB");
      e.target.value = "";
      return;
    }

    // Validate video duration (max 30 seconds)
    if (isVideo) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > 30) {
          alert("Video too long. Maximum duration: 30 seconds");
          setAttachmentFile(null);
          setAttachmentPreview(null);
          return;
        }
        // Video is valid
        setAttachmentFile(file);
        setAttachmentPreview("video");
      };
      video.src = URL.createObjectURL(file);
    } else {
      setAttachmentFile(file);
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (ev) =>
          setAttachmentPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setAttachmentPreview("document");
      }
    }

    // Reset the input so the same file can be selected again
    e.target.value = "";
  };

  const clearAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
  };

  const uploadFile = async (
    file: File,
  ): Promise<{ url: string; type: string } | null> => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(CLOUDFLARE_UPLOAD_URL, {
        method: "POST",
        headers: { "X-Upload-Type": "chat" },
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Upload failed");

      const isVideo = file.type.startsWith("video/");
      const isDoc =
        file.type === "application/pdf" ||
        file.type.includes("msword") ||
        file.type.includes("wordprocessingml");
      const attachmentType = isVideo ? "video" : isDoc ? "document" : "image";
      return { url: data.url, type: attachmentType };
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload file. Please try again.");
      return null;
    } finally {
      setUploading(false);
    }
  };

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

  /* ── Send message: prefer WebSocket, fallback to HTTP ── */
  const handleSend = async () => {
    if ((!newMessage.trim() && !attachmentFile) || !activeConversationId)
      return;
    const content =
      newMessage ||
      (attachmentFile
        ? `[${attachmentFile.type.startsWith("video") ? "Video" : attachmentFile.type.startsWith("image") ? "Photo" : "Document"}]`
        : "");
    setNewMessage("");
    setSending(true);

    let attachmentUrl: string | undefined;
    let attachmentType: string | undefined;

    // Upload attachment first if present
    if (attachmentFile) {
      const uploadResult = await uploadFile(attachmentFile);
      if (!uploadResult) {
        setSending(false);
        return;
      }
      attachmentUrl = uploadResult.url;
      attachmentType = uploadResult.type;
      clearAttachment();
    }

    // Try WebSocket first (instant, no HTTP round-trip)
    const sentViaWs =
      connected &&
      wsSendMessage(
        activeConversationId,
        content,
        attachmentUrl,
        attachmentType,
      );

    if (!sentViaWs) {
      // Fallback to HTTP
      try {
        const res = await chatApi.sendMessage(activeConversationId, {
          content,
          attachmentUrl,
          attachmentType,
        });
        // Check if the response indicates a blocked message
        if (res.data?.blocked) {
          const violationData = {
            warning: res.data.warning,
            strikeCount: res.data.strikeCount,
            conversationId: activeConversationId,
          };
          setViolationAlert(violationData);
          // 3rd strike — suspension
          if (res.data.strikeCount >= 3) {
            refreshUser().then(() => {
              setTimeout(() => window.location.reload(), 2000);
            });
          } else {
            setTimeout(() => setViolationAlert(null), 15000);
          }
        } else {
          await loadMessages(activeConversationId);
        }
      } catch (e: any) {
        const msg = e?.response?.data?.message || "Failed to send message";
        setViolationAlert({
          warning: msg,
          strikeCount: 0,
          conversationId: activeConversationId,
        });
        setTimeout(() => setViolationAlert(null), 10000);
      }
    }

    setSending(false);
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

  /* ── Load messages & join/leave WS rooms when conversation changes ── */
  useEffect(() => {
    // Leave previous room
    if (prevConvRef.current && prevConvRef.current !== activeConversationId) {
      leaveConversation(prevConvRef.current);
    }
    prevConvRef.current = activeConversationId;

    if (activeConversationId && isOpen && !isMinimized) {
      loadMessages(activeConversationId);
      joinConversation(activeConversationId);
      if (connected) wsMarkRead(activeConversationId);
    }
  }, [
    activeConversationId,
    isOpen,
    isMinimized,
    connected,
    joinConversation,
    leaveConversation,
    loadMessages,
    wsMarkRead,
  ]);

  /* ── Slow poll as fallback (60s) — only if WebSocket is NOT connected ── */
  useEffect(() => {
    if (!user) return;
    // Always do initial load
    loadConversationsQuiet();
    // If WS connected, use very slow polling (60s) as a safety net
    // If WS disconnected, use faster polling (15s) as fallback
    const interval = setInterval(
      () => {
        loadConversationsQuiet();
        if (activeConversationId && isOpen && !isMinimized) {
          loadMessages(activeConversationId);
        }
      },
      connected ? 60000 : 15000,
    );
    return () => clearInterval(interval);
  }, [
    user,
    connected,
    activeConversationId,
    isOpen,
    isMinimized,
    loadConversationsQuiet,
    loadMessages,
  ]);

  /* ── Typing indicator on input ── */
  const handleInputChange = (value: string) => {
    setNewMessage(value);
    if (activeConversationId && connected) {
      sendTyping(activeConversationId, true);
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  /* ── Resolve display name for a conversation ── */
  const getConvName = (conv: Conversation) => {
    if (isShopkeeper) {
      return (
        `${conv.buyer?.firstName || ""} ${conv.buyer?.lastName || ""}`.trim() ||
        "Customer"
      );
    }
    return conv.shop?.shopName || "Shop";
  };

  /* ── Emoji handler ── */
  const handleEmojiSelect = (emoji: any) => {
    setNewMessage((prev) => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  /* ── Close menus on outside click ── */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(e.target as Node)
      ) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── Hide the chat bubble on /messages pages since it overlaps the send button ── */
  const isOnMessagesPage = pathname?.includes("/messages");

  const clampBubblePosition = useCallback((right: number, bottom: number) => {
    const maxRight = Math.max(8, window.innerWidth - 64);
    const maxBottom = Math.max(8, window.innerHeight - 64);
    return {
      right: Math.min(Math.max(8, right), maxRight),
      bottom: Math.min(Math.max(8, bottom), maxBottom),
    };
  }, []);

  const moveBubbleBy = useCallback(
    (dx: number, dy: number) => {
      setBubblePosition((prev: { right: number; bottom: number }) => {
        const next = clampBubblePosition(prev.right - dx, prev.bottom - dy);
        localStorage.setItem(
          "orivraa-chat-bubble-position",
          JSON.stringify(next),
        );
        return next;
      });
    },
    [clampBubblePosition],
  );

  const handleBubblePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleBubblePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag?.active) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    moveBubbleBy(dx, dy);
    drag.startX = event.clientX;
    drag.startY = event.clientY;
  };

  const handleBubblePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = dragRef.current
      ? { ...dragRef.current, active: false }
      : null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  if (isHidden) {
    if (isOnMessagesPage) return null;
    return (
      <button
        type="button"
        onClick={() => {
          restoreChat();
          openChatList();
        }}
        style={{ right: bubblePosition.right, bottom: bubblePosition.bottom }}
        className={cn(
          "fixed z-50 flex h-11 w-11 items-center justify-center rounded-full",
          "bg-white text-gold-700 border border-gold-200 shadow-lg shadow-gold-500/20",
          "ring-2 ring-gold-300/60 animate-pulse",
          "focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2",
        )}
        aria-label="Restore chat help"
        title="Restore chat help"
      >
        <MessageSquare className="h-5 w-5" />
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-gold-500" />
      </button>
    );
  }

  /* ─────────────────────────────────────────────────────────
     RENDER: Floating bubble (when closed or minimized)
     ───────────────────────────────────────────────────────── */
  if (!isOpen || isMinimized) {
    // Don't show bubble on messages pages — it hides the send button
    if (isOnMessagesPage) return null;
    return (
      <div
        style={{ right: bubblePosition.right, bottom: bubblePosition.bottom }}
        className="fixed z-50 touch-none"
        onPointerDown={handleBubblePointerDown}
        onPointerMove={handleBubblePointerMove}
        onPointerUp={handleBubblePointerUp}
      >
        <button
          onClick={() => {
            if (dragRef.current?.moved) return;
            isOpen ? toggleMinimize() : openChatList();
          }}
          className={cn(
            "flex items-center justify-center",
            "w-14 h-14 rounded-2xl",
            "bg-gradient-to-br from-gold-500 to-gold-600",
            "text-white shadow-lg shadow-gold-500/30",
            "hover:shadow-xl hover:shadow-gold-500/40 hover:scale-105",
            "transition-all duration-200 cursor-grab active:cursor-grabbing",
            "focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2",
          )}
          aria-label="Open chat"
        >
          <MessageSquare className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full ring-2 ring-white dark:ring-[#161B22]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            hideChat();
          }}
          className="absolute -top-2 -left-2 h-7 w-7 rounded-full bg-white text-gray-500 shadow border border-gray-200 flex items-center justify-center"
          aria-label="Hide chat"
          title="Hide chat"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      </div>
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
        "bg-white dark:bg-[#161B22] rounded-2xl",
        "border border-gray-200 dark:border-gray-700",
        "shadow-2xl shadow-black/15 dark:shadow-black/40",
        "flex flex-col overflow-hidden",
        "animate-in slide-in-from-bottom-4 fade-in duration-200",
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-white flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {activeConversationId && (
            <button
              onClick={() => {
                setViolationAlert(null);
                openChatList();
              }}
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
          {/* Online / Connection indicator */}
          {activeConversationId &&
            activeConv &&
            (() => {
              const otherId = isShopkeeper
                ? activeConv.buyerId
                : activeConv.shop?.userId || activeConv.shopId;
              const isOnline = onlineUsers.has(otherId);
              return isOnline ? (
                <span className="flex items-center gap-1 flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] text-green-200">Online</span>
                </span>
              ) : connected ? (
                <span className="text-[10px] text-white/50 flex-shrink-0">
                  Offline
                </span>
              ) : (
                <WifiOff className="h-3 w-3 text-red-200 flex-shrink-0" />
              );
            })()}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* View full messages page */}
          {activeConversationId && (
            <a
              href={`/dashboard/${user?.role === "SHOPKEEPER" ? "shop" : user?.role === "ADMIN" ? "admin" : user?.role === "SALES" ? "sales" : "customer"}/messages`}
              className="p-1.5 rounded-lg hover:bg-white/20 transition"
              title="View all messages"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button
            onClick={minimizeChat}
            className="p-1.5 rounded-lg hover:bg-white/20 transition"
            aria-label="Minimize chat"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={hideChat}
            className="p-1.5 rounded-lg hover:bg-white/20 transition"
            aria-label="Hide chat bubble"
            title="Hide chat bubble"
          >
            <EyeOff className="h-4 w-4" />
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
          {/* See full messages link */}
          <a
            href={`/dashboard/${user?.role === "SHOPKEEPER" ? "shop" : user?.role === "ADMIN" ? "admin" : user?.role === "SALES" ? "sales" : "customer"}/messages`}
            className="flex items-center justify-center gap-1.5 px-3 py-2 border-b dark:border-gray-700 text-xs text-gold-600 dark:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-900/20 transition font-medium"
          >
            <ExternalLink className="h-3 w-3" />
            See full messages page
          </a>
          {loadingConvs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                No conversations yet
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Start a conversation from an order or shop page
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {conversations.map((conv) => {
                const lastMsg = conv.messages?.[0];
                const isUnread =
                  lastMsg &&
                  !lastMsg.isRead &&
                  lastMsg.senderRole !== user?.role;
                return (
                  <button
                    key={conv.id}
                    onClick={() => openChat(conv.id)}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-start gap-3",
                      isUnread && "bg-gold-50/50 dark:bg-gold-900/20",
                    )}
                  >
                    {/* Avatar circle with online indicator */}
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-100 to-gold-200 dark:from-gold-800 dark:to-gold-700 flex items-center justify-center text-gold-700 dark:text-gold-200 text-xs font-bold">
                        {getConvName(conv).charAt(0).toUpperCase()}
                      </div>
                      {onlineUsers.has(
                        isShopkeeper
                          ? conv.buyerId
                          : conv.shop?.userId || conv.shopId,
                      ) && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-[#161B22]" />
                      )}
                    </div>
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
                          {getConvName(conv)}
                        </span>
                        {conv.status === "LOCKED" && (
                          <Lock className="h-3 w-3 text-red-500 flex-shrink-0" />
                        )}
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
                          {lastMsg.content}
                        </p>
                      )}
                      <span className="text-[10px] text-gray-400 mt-0.5 block">
                        {conv.updatedAt
                          ? new Date(conv.updatedAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                          : ""}
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400 flex-shrink-0">
            <Shield className="h-3 w-3" />
            Messages are monitored for safety
          </div>

          {/* Violation warning banner */}
          {violationAlert &&
            violationAlert.conversationId === activeConversationId && (
              <div className="px-3 py-2.5 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800/50 flex-shrink-0 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-red-800 dark:text-red-200">
                      Message Blocked
                    </p>
                    <p className="text-[11px] text-red-700 dark:text-red-300 mt-0.5 leading-relaxed">
                      {violationAlert.warning}
                    </p>
                    {violationAlert.strikeCount > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-semibold text-red-800">
                          Warnings: {violationAlert.strikeCount}/3
                        </span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={cn(
                                "w-4 h-1.5 rounded-full",
                                violationAlert.strikeCount >= i
                                  ? i === 3
                                    ? "bg-red-600"
                                    : i === 2
                                      ? "bg-orange-500"
                                      : "bg-yellow-500"
                                  : "bg-gray-200 dark:bg-gray-600",
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-red-600">
                          {violationAlert.strikeCount >= 3
                            ? "Account suspended"
                            : `${3 - violationAlert.strikeCount} remaining`}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setViolationAlert(null)}
                    className="text-red-400 hover:text-red-600 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

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
                      msg.isSystem
                        ? "justify-center"
                        : msg.senderId === user?.id
                          ? "justify-end"
                          : "justify-start",
                    )}
                  >
                    {msg.isSystem ? (
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 px-2.5 py-1 rounded-full">
                        {msg.content}
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "max-w-[80%] px-3 py-2 rounded-2xl text-sm",
                          msg.senderId === user?.id
                            ? "bg-gradient-to-br from-gold-500 to-gold-600 text-white rounded-br-md"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-md",
                          msg.hasViolation && "ring-2 ring-yellow-400",
                        )}
                      >
                        {/* Attachment rendering */}
                        {msg.attachmentUrl && (
                          <div className="mb-1.5">
                            {msg.attachmentType === "image" ? (
                              <a
                                href={msg.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Image
                                  src={msg.attachmentUrl}
                                  alt="Shared image"
                                  width={320}
                                  height={192}
                                  unoptimized
                                  className="max-w-full max-h-48 rounded-lg object-cover cursor-pointer hover:opacity-90 transition"
                                />
                              </a>
                            ) : msg.attachmentType === "video" ? (
                              <video
                                src={msg.attachmentUrl}
                                controls
                                className="max-w-full max-h-48 rounded-lg"
                                preload="metadata"
                              />
                            ) : (
                              <a
                                href={msg.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium",
                                  msg.senderId === user?.id
                                    ? "bg-white/20 text-white hover:bg-white/30"
                                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600",
                                )}
                              >
                                <FileText className="h-4 w-4" />
                                Document
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}
                        <p className="break-words">{msg.content}</p>
                        {msg.hasViolation && (
                          <p className="text-[10px] mt-1 opacity-75">
                            ⚠️ Contact info removed
                          </p>
                        )}
                        <span className="text-[10px] opacity-60 mt-1 block">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {/* Typing indicator */}
                {typingUser && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-2xl rounded-bl-md">
                      <div className="flex gap-1">
                        <span
                          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          {activeConv?.status === "LOCKED" ? (
            <div className="px-3 py-2.5 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-center text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              <Lock className="h-3 w-3 inline mr-1" />
              Conversation locked — contact support
            </div>
          ) : (
            <div className="px-3 py-2.5 border-t dark:border-gray-700 flex-shrink-0 bg-white dark:bg-[#161B22] space-y-2 relative">
              {/* Attachment preview */}
              {attachmentPreview && (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  {attachmentPreview.startsWith("data:image") ? (
                    <Image
                      src={attachmentPreview}
                      alt="Preview"
                      width={40}
                      height={40}
                      unoptimized
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : attachmentPreview === "video" ? (
                    <div className="w-10 h-10 rounded bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <Video className="h-5 w-5 text-blue-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-orange-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-600 dark:text-gray-300 truncate block">
                      {attachmentFile?.name}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {attachmentFile
                        ? `${(attachmentFile.size / 1024 / 1024).toFixed(1)} MB`
                        : ""}
                    </span>
                  </div>
                  <button
                    onClick={clearAttachment}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              )}

              {/* Emoji picker popover */}
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-full left-0 mb-2 z-50"
                >
                  <Picker
                    data={data}
                    onEmojiSelect={handleEmojiSelect}
                    theme="light"
                    previewPosition="none"
                    skinTonePosition="none"
                    maxFrequentRows={1}
                    perLine={7}
                    emojiSize={20}
                    emojiButtonSize={28}
                    set="native"
                  />
                </div>
              )}

              {/* Attachment type chooser */}
              {showAttachMenu && (
                <div
                  ref={attachMenuRef}
                  className="absolute bottom-full left-8 mb-2 z-50 bg-white dark:bg-[#161B22] rounded-xl shadow-lg dark:shadow-black/40 border border-gray-200 dark:border-gray-700 p-1.5 min-w-[140px]"
                >
                  <button
                    onClick={() => openFilePicker("image")}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left"
                  >
                    <ImageIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <div>
                      <span className="font-medium">Photo</span>
                      <span className="text-[10px] text-gray-400 block">
                        Max 2 MB
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => openFilePicker("video")}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left"
                  >
                    <Video className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <span className="font-medium">Video</span>
                      <span className="text-[10px] text-gray-400 block">
                        Max 30s, 10 MB
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => openFilePicker("document")}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left"
                  >
                    <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <div>
                      <span className="font-medium">Document</span>
                      <span className="text-[10px] text-gray-400 block">
                        PDF, DOC — Max 5 MB
                      </span>
                    </div>
                  </button>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={fileAccept || "image/*,video/*,.pdf,.doc,.docx"}
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex items-center gap-1.5">
                {/* Emoji button */}
                <button
                  onClick={() => {
                    setShowEmojiPicker(!showEmojiPicker);
                    setShowAttachMenu(false);
                  }}
                  disabled={sending || uploading}
                  className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex-shrink-0"
                  title="Emoji"
                >
                  <Smile className="h-4 w-4" />
                </button>
                {/* Attach button */}
                <button
                  onClick={() => {
                    setShowAttachMenu(!showAttachMenu);
                    setShowEmojiPicker(false);
                  }}
                  disabled={sending || uploading}
                  className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex-shrink-0"
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                {/* Message input */}
                <Input
                  value={newMessage}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) handleSend();
                  }}
                  onFocus={() => {
                    setShowEmojiPicker(false);
                    setShowAttachMenu(false);
                  }}
                  placeholder="Type a message…"
                  disabled={sending || uploading}
                  className="text-sm h-9 rounded-xl flex-1 min-w-0"
                />
                {/* Send button — fixed width so it doesn't shrink */}
                <Button
                  onClick={handleSend}
                  disabled={
                    sending ||
                    uploading ||
                    (!newMessage.trim() && !attachmentFile)
                  }
                  className="h-9 w-9 min-w-[36px] p-0 rounded-xl bg-gold-500 hover:bg-gold-600 flex-shrink-0"
                >
                  {sending || uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
