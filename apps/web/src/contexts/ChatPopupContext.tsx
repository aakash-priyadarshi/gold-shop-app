"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

export interface ChatPopupState {
  /** Whether the chat widget is visible at all */
  isOpen: boolean;
  /** Whether the floating chat bubble has been dismissed by the user */
  isHidden: boolean;
  /** Whether the widget is minimized (shows only the bubble/header) */
  isMinimized: boolean;
  /** The currently active conversation ID (null = show conversation list) */
  activeConversationId: string | null;
  /** Open the popup with a specific conversation */
  openChat: (conversationId: string) => void;
  /** Open the popup showing the conversation list */
  openChatList: () => void;
  /** Minimize the popup to a floating bubble */
  minimizeChat: () => void;
  /** Close the popup completely */
  closeChat: () => void;
  /** Hide the floating popup/bubble until the user restores it */
  hideChat: () => void;
  /** Restore the floating popup/bubble after hiding it */
  restoreChat: () => void;
  /** Toggle between minimized and expanded */
  toggleMinimize: () => void;
}

const ChatPopupContext = createContext<ChatPopupState | null>(null);

export function ChatPopupProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("orivraa-chat-hidden") === "1";
  });
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  const openChat = useCallback((conversationId: string) => {
    localStorage.removeItem("orivraa-chat-hidden");
    setIsHidden(false);
    setActiveConversationId(conversationId);
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const openChatList = useCallback(() => {
    localStorage.removeItem("orivraa-chat-hidden");
    setIsHidden(false);
    setActiveConversationId(null);
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const minimizeChat = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
    setActiveConversationId(null);
  }, []);

  const hideChat = useCallback(() => {
    localStorage.setItem("orivraa-chat-hidden", "1");
    setIsHidden(true);
    setIsOpen(false);
    setIsMinimized(false);
    setActiveConversationId(null);
  }, []);

  const restoreChat = useCallback(() => {
    localStorage.removeItem("orivraa-chat-hidden");
    setIsHidden(false);
    setIsOpen(false);
    setIsMinimized(false);
    setActiveConversationId(null);
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  return (
    <ChatPopupContext.Provider
      value={{
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
      }}
    >
      {children}
    </ChatPopupContext.Provider>
  );
}

export function useChatPopup() {
  const ctx = useContext(ChatPopupContext);
  if (!ctx) {
    throw new Error("useChatPopup must be used within a ChatPopupProvider");
  }
  return ctx;
}
