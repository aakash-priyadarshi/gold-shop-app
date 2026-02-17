"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

/* ──────────────────────────────────────────────────────────
   useTicketSocket — Socket.IO hook for real-time ticket updates
   Connects to the /support namespace
   ────────────────────────────────────────────────────────── */

const WS_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/api$/, "");

let sharedTicketSocket: Socket | null = null;
let ticketRefCount = 0;

function getSharedTicketSocket(token: string): Socket {
  if (!sharedTicketSocket || sharedTicketSocket.disconnected) {
    sharedTicketSocket = io(`${WS_BASE}/support`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnection: true,
      autoConnect: true,
    });
  }
  return sharedTicketSocket;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string | null;
  senderRole: string;
  senderName: string | null;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
  isInternal: boolean;
  createdAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null;
}

export interface TicketData {
  id: string;
  ticketNumber: string;
  subject: string;
  type: string;
  status: string;
  priority: string;
  assigneeId?: string | null;
  userId?: string | null;
  user?: { id: string; firstName: string; lastName: string; email: string } | null;
  assignee?: { id: string; firstName: string; lastName: string } | null;
}

// Callback types
type OnNewTicket = (ticket: TicketData) => void;
type OnTicketClaimed = (ticket: TicketData) => void;
type OnTicketStatusChanged = (ticket: TicketData) => void;
type OnTicketUpdated = (ticket: TicketData) => void;
type OnNewTicketMessage = (message: TicketMessage) => void;

interface TicketSocketCallbacks {
  onNewTicket?: OnNewTicket;
  onTicketClaimed?: OnTicketClaimed;
  onTicketStatusChanged?: OnTicketStatusChanged;
  onTicketUpdated?: OnTicketUpdated;
  onNewTicketMessage?: OnNewTicketMessage;
}

export function useTicketSocket(callbacks?: TicketSocketCallbacks) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = getSharedTicketSocket(token);
    socketRef.current = socket;
    ticketRefCount++;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    if (socket.connected) setConnected(true);

    // Global events (for staff who are in the support:staff room)
    const handleNewTicket = (data: TicketData) =>
      cbRef.current?.onNewTicket?.(data);
    const handleTicketClaimed = (data: TicketData) =>
      cbRef.current?.onTicketClaimed?.(data);
    const handleTicketStatusChanged = (data: TicketData) =>
      cbRef.current?.onTicketStatusChanged?.(data);
    const handleTicketUpdated = (data: TicketData) =>
      cbRef.current?.onTicketUpdated?.(data);
    const handleNewTicketMessage = (data: TicketMessage) =>
      cbRef.current?.onNewTicketMessage?.(data);

    socket.on("newTicket", handleNewTicket);
    socket.on("ticketClaimed", handleTicketClaimed);
    socket.on("ticketStatusChanged", handleTicketStatusChanged);
    socket.on("ticketUpdated", handleTicketUpdated);
    socket.on("newTicketMessage", handleNewTicketMessage);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("newTicket", handleNewTicket);
      socket.off("ticketClaimed", handleTicketClaimed);
      socket.off("ticketStatusChanged", handleTicketStatusChanged);
      socket.off("ticketUpdated", handleTicketUpdated);
      socket.off("newTicketMessage", handleNewTicketMessage);

      ticketRefCount--;
      if (ticketRefCount <= 0) {
        socket.disconnect();
        sharedTicketSocket = null;
        ticketRefCount = 0;
      }
    };
  }, []);

  const joinTicket = useCallback((ticketId: string) => {
    socketRef.current?.emit("joinTicket", { ticketId });
  }, []);

  const leaveTicket = useCallback((ticketId: string) => {
    socketRef.current?.emit("leaveTicket", { ticketId });
  }, []);

  const sendTicketMessage = useCallback(
    (data: {
      ticketId: string;
      content: string;
      attachmentUrl?: string;
      attachmentType?: string;
      isInternal?: boolean;
    }) => {
      socketRef.current?.emit("ticketMessage", data);
    },
    [],
  );

  const claimTicket = useCallback((ticketId: string) => {
    socketRef.current?.emit("claimTicket", { ticketId });
  }, []);

  const updateTicketStatus = useCallback(
    (ticketId: string, status: string, note?: string) => {
      socketRef.current?.emit("updateTicketStatus", {
        ticketId,
        status,
        note,
      });
    },
    [],
  );

  return {
    connected,
    joinTicket,
    leaveTicket,
    sendTicketMessage,
    claimTicket,
    updateTicketStatus,
  };
}
