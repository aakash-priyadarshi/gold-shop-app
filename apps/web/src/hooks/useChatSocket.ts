"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

/* ──────────────────────────────────────────────────────────
   useChatSocket — lightweight Socket.IO hook for live chat
   
   Strategy for cost optimisation:
   • Single shared socket per user (singleton via module-level ref)
   • Join/leave conversation rooms to scope events
   • No polling when socket is connected
   • Auto-reconnect with exponential back-off (built-in Socket.IO)
   • Falls back to HTTP if WS fails
   ────────────────────────────────────────────────────────── */

const WS_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/api$/, "");

let sharedSocket: Socket | null = null;
let refCount = 0;

function getSharedSocket(token: string): Socket {
  if (!sharedSocket || sharedSocket.disconnected) {
    sharedSocket = io(`${WS_BASE}/chat`, {
      auth: { token },
      transports: ["websocket", "polling"], // prefer WS, fallback to long-poll
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnection: true,
      autoConnect: true,
    });
  }
  return sharedSocket;
}

export interface ChatSocketMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  content: string;
  hasViolation?: boolean;
  isSystem?: boolean;
  createdAt: string;
  attachmentUrl?: string;
  attachmentType?: string;
}

export interface ViolationWarning {
  warning: string;
  strikeCount: number;
  conversationId: string;
}

export function useChatSocket({
  onNewMessage,
  onMessageBlocked,
  onTyping,
  onMessagesRead,
}: {
  onNewMessage?: (msg: ChatSocketMessage) => void;
  onMessageBlocked?: (data: ViolationWarning) => void;
  onTyping?: (data: { userId: string; isTyping: boolean }) => void;
  onMessagesRead?: (data: { userId: string }) => void;
} = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const joinedRooms = useRef<Set<string>>(new Set());

  // Stable callback refs to avoid re-registering listeners
  const cbNewMessage = useRef(onNewMessage);
  const cbBlocked = useRef(onMessageBlocked);
  const cbTyping = useRef(onTyping);
  const cbRead = useRef(onMessagesRead);
  cbNewMessage.current = onNewMessage;
  cbBlocked.current = onMessageBlocked;
  cbTyping.current = onTyping;
  cbRead.current = onMessagesRead;

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    const socket = getSharedSocket(token);
    socketRef.current = socket;
    refCount++;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleNewMessage = (msg: ChatSocketMessage) =>
      cbNewMessage.current?.(msg);
    const handleBlocked = (data: ViolationWarning) => cbBlocked.current?.(data);
    const handleTyping = (data: { userId: string; isTyping: boolean }) =>
      cbTyping.current?.(data);
    const handleRead = (data: { userId: string }) => cbRead.current?.(data);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("newMessage", handleNewMessage);
    socket.on("messageBlocked", handleBlocked);
    socket.on("userTyping", handleTyping);
    socket.on("messagesRead", handleRead);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("newMessage", handleNewMessage);
      socket.off("messageBlocked", handleBlocked);
      socket.off("userTyping", handleTyping);
      socket.off("messagesRead", handleRead);
      refCount--;
      if (refCount <= 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        refCount = 0;
      }
    };
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    const socket = socketRef.current;
    if (socket?.connected && !joinedRooms.current.has(conversationId)) {
      socket.emit("joinConversation", { conversationId });
      joinedRooms.current.add(conversationId);
    }
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    const socket = socketRef.current;
    if (socket?.connected && joinedRooms.current.has(conversationId)) {
      socket.emit("leaveConversation", { conversationId });
      joinedRooms.current.delete(conversationId);
    }
  }, []);

  const sendMessage = useCallback(
    (
      conversationId: string,
      content: string,
      attachmentUrl?: string,
      attachmentType?: string,
    ) => {
      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit("sendMessage", {
          conversationId,
          content,
          attachmentUrl,
          attachmentType,
        });
        return true;
      }
      return false; // fallback to HTTP
    },
    [],
  );

  const sendTyping = useCallback(
    (conversationId: string, isTyping: boolean) => {
      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit("typing", { conversationId, isTyping });
      }
    },
    [],
  );

  const markRead = useCallback((conversationId: string) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit("markRead", { conversationId });
    }
  }, []);

  const checkOnline = useCallback(
    (userIds: string[]): Promise<string[]> => {
      const socket = socketRef.current;
      if (!socket?.connected) return Promise.resolve([]);
      return new Promise((resolve) => {
        socket.emit("checkOnline", { userIds }, (response: any) => {
          resolve(response?.data?.online || []);
        });
        // Timeout fallback
        setTimeout(() => resolve([]), 3000);
      });
    },
    [],
  );

  return {
    connected,
    joinConversation,
    leaveConversation,
    sendMessage,
    sendTyping,
    markRead,
    checkOnline,
  };
}
