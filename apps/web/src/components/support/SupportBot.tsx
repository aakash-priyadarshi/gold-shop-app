"use client";

/**
 * SupportBot - floating AI help widget
 *
 * Sends messages to POST /tickets/ai-chat or /tickets/seller-chat
 * (Gemini 2.5 Flash + Qdrant RAG).
 * Session persistence via sessionStorage so conversation survives page
 * navigation and open/close within the same browser tab.
 *
 * Human escalation contact:
 *   Email:    aakashm301@gmail.com
 *   WhatsApp: +91 62039 65557
 */

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Mail, MessageCircle, Phone, Send, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHelpUIStore } from "@/store/help-ui";

const FOUNDER = {
  name: "Aakash",
  email: "aakashm301@gmail.com",
  phone: "+916203965557",
  phoneDisplay: "+91 62039 65557",
} as const;

type Message = {
  id: string;
  from: "bot" | "user";
  text: string;
  cta?: { label: string; href: string }[];
};

const QUICK_ASKS_PUBLIC = [
  "What is Orivraa?",
  "How much does it cost?",
  "Does it work offline?",
  "How is GST handled?",
  "Compare with Tally",
];

const QUICK_ASKS_SELLER = [
  "What were my sales this month?",
  "What's my pending invoice amount?",
  "How do I create an invoice?",
  "How do I share my tax report with my CA?",
  "What's my IRD audit status?",
];

const QUICK_ASKS_MOBILE = [
  "How do I create a quick bill?",
  "How do I share a quote on WhatsApp?",
  "How do I download a VAT / GST report?",
  "How do I log a repair job?",
  "How do I enroll a customer in savings scheme?",
];

const ESCALATION_CTA: { label: string; href: string }[] = [
  { label: `WhatsApp ${FOUNDER.phoneDisplay}`, href: `https://wa.me/${FOUNDER.phone.replace("+", "")}` },
  { label: "Email Aakash", href: `mailto:${FOUNDER.email}` },
  { label: `Call ${FOUNDER.phoneDisplay}`, href: `tel:${FOUNDER.phone}` },
];

/* ───────────────────────── Session persistence helpers ───────────────────────── */

const WELCOME_MSG_PUBLIC: Message = {
  id: "welcome",
  from: "bot",
  text: "Hi \uD83D\uDC4B I'm the Orivraa AI assistant. Ask me about pricing, features, GST, offline POS, hallmarking \u2014 or just say 'talk to a human' and I'll connect you to our founder.",
};

function makeSellerWelcome(shopName?: string): Message {
  return {
    id: "welcome",
    from: "bot",
    text: `Hi ${shopName ? shopName + " \uD83D\uDC4B" : "\uD83D\uDC4B"} I can see your shop\u2019s live data \u2014 ask me about this month\u2019s sales, pending invoices, tax audit status, or how to use any feature.`,
  };
}

function makeMobileWelcome(shopName?: string): Message {
  return {
    id: "welcome",
    from: "bot",
    text: `Hi ${shopName ? shopName + " \uD83D\uDC4B" : "\uD83D\uDC4B"} I\u2019m your mobile POS assistant. Ask me how to bill a customer, share a quote on WhatsApp, download your tax report, log a repair, or manage savings schemes.`,
  };
}

const STORAGE_MSGS = "orivraa_chat_messages";
const STORAGE_OPEN = "orivraa_chat_open";
const STORAGE_SESSION_ID = "orivraa_chat_session_id";
const STORAGE_LAUNCHER_POS = "orivraa_chat_launcher_pos";

function readSession<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Returns a stable UUID for this browser-tab session, creating one if absent. */
function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(STORAGE_SESSION_ID);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(STORAGE_SESSION_ID, id);
  }
  return id;
}

/* ------------------------------ Component ------------------------------ */

export function SupportBot() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isSellerLoggedIn = user?.role === "SHOPKEEPER";
  const isMobile = pathname.startsWith("/m/") || pathname === "/m";
  const shopName = user?.shop?.shopName ?? (user as { shopName?: string } | null)?.shopName;

  const [open, setOpen] = useState<boolean>(() => readSession(STORAGE_OPEN, false));
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() =>
    readSession<Message[]>(STORAGE_MSGS, [WELCOME_MSG_PUBLIC]),
  );
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { isChatDismissed, dismissChat } = useHelpUIStore();

  // If chat is recalled (isChatDismissed becomes false), we can ensure it is visible
  useEffect(() => {
    if (!isChatDismissed && !open && readSession(STORAGE_OPEN, false) === false) {
      // Chat was just recalled from a hidden state, don't auto-open unless desired.
      // We will just let the launcher appear.
    }
  }, [isChatDismissed, open]);

  const QUICK_ASKS = isMobile
    ? QUICK_ASKS_MOBILE
    : isSellerLoggedIn
    ? QUICK_ASKS_SELLER
    : QUICK_ASKS_PUBLIC;

  // Replace welcome message when seller auth resolves or mobile mode detected
  useEffect(() => {
    if (!isSellerLoggedIn) return;
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === "welcome") {
        return [isMobile ? makeMobileWelcome(shopName) : makeSellerWelcome(shopName)];
      }
      return prev;
    });
  }, [isSellerLoggedIn, shopName, isMobile]);

  // Persist conversation and open state across navigations / open-close
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_MSGS, JSON.stringify(messages)); } catch { /* quota */ }
  }, [messages]);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_OPEN, JSON.stringify(open)); } catch { /* quota */ }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping, open]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || isTyping) return;

    const userMsg: Message = { id: `${Date.now()}-u`, from: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsTyping(true);

    // Build history from current messages (exclude welcome, map to API shape)
    const history = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({
        role: m.from === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

    try {
      const endpoint = isSellerLoggedIn ? "/tickets/seller-chat" : "/tickets/ai-chat";
      const res = await api.post<{ reply: string; shouldEscalate: boolean; confidence: number }>(
        endpoint,
        { message: text, history, sessionId: getOrCreateSessionId(), currentPath: pathname },
      );

      const botMsg: Message = {
        id: `${Date.now()}-b`,
        from: "bot",
        text: res.data.reply,
        cta: res.data.shouldEscalate ? ESCALATION_CTA : undefined,
      };
      setMessages((m) => [...m, botMsg]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `${Date.now()}-b`,
          from: "bot",
          text: `Sorry, I couldn't reach the server. You can reach ${FOUNDER.name} directly:`,
          cta: ESCALATION_CTA,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const showQuickAsks = useMemo(() => messages.length <= 1, [messages.length]);

  /* ───────────────────────── Draggable launcher position ───────────────────────── */

  // `pos` is { right, bottom } in pixels from the viewport edge. null = use the
  // default tailwind classes (bottom-20 right-4 on mobile, bottom-5 right-5 on
  // desktop). Saved in sessionStorage so it survives navigation in this tab.
  type LauncherPos = { right: number; bottom: number };
  const [pos, setPos] = useState<LauncherPos | null>(() =>
    readSession<LauncherPos | null>(STORAGE_LAUNCHER_POS, null),
  );
  const dragInfo = useRef<{
    startX: number;
    startY: number;
    origRight: number;
    origBottom: number;
    moved: boolean;
    pointerId: number;
  } | null>(null);

  const defaultBottom = isMobile ? 80 : 20; // bottom-20 vs bottom-5 (rem→px)
  const defaultRight = isMobile ? 16 : 20;
  const currentRight = pos?.right ?? defaultRight;
  const currentBottom = pos?.bottom ?? defaultBottom;
  // User asked for the mobile launcher to be 1px smaller than the desktop one.
  const launcherSizePx = isMobile ? 55 : 56;

  const onLauncherPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      dragInfo.current = {
        startX: e.clientX,
        startY: e.clientY,
        origRight: currentRight,
        origBottom: currentBottom,
        moved: false,
        pointerId: e.pointerId,
      };
    },
    [currentRight, currentBottom],
  );

  const onLauncherPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = dragInfo.current;
      if (!d || d.pointerId !== e.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.moved && Math.hypot(dx, dy) < 6) return; // ignore tiny jitter
      d.moved = true;
      // We track from right/bottom — moving right (dx > 0) reduces `right`.
      const newRight = d.origRight - dx;
      const newBottom = d.origBottom - dy;
      // Constrain to viewport (launcher size depends on platform)
      const maxRight = window.innerWidth - launcherSizePx;
      const maxBottom = window.innerHeight - launcherSizePx;
      setPos({
        right: Math.max(8, Math.min(maxRight, newRight)),
        bottom: Math.max(8, Math.min(maxBottom, newBottom)),
      });
    },
    [launcherSizePx],
  );

  const onLauncherPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = dragInfo.current;
      dragInfo.current = null;
      if (!d) return;
      if (!d.moved) {
        // Treated as a tap → open chat
        setOpen(true);
        return;
      }
      // Persist final position
      try {
        sessionStorage.setItem(STORAGE_LAUNCHER_POS, JSON.stringify(pos));
      } catch {
        /* quota */
      }
    },
    [pos],
  );

  return (
    <>
      {/* Launcher */}
      {!open && !isChatDismissed && (
        <button
          type="button"
          onPointerDown={onLauncherPointerDown}
          onPointerMove={onLauncherPointerMove}
          onPointerUp={onLauncherPointerUp}
          onPointerCancel={onLauncherPointerUp}
          aria-label="Open Orivraa support chat (drag to reposition)"
          data-tour="support-bot"
          style={{
            right: `${currentRight}px`,
            bottom: `${currentBottom}px`,
            width: `${launcherSizePx}px`,
            height: `${launcherSizePx}px`,
            touchAction: "none",
          }}
          className="fixed z-[60] rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center cursor-grab active:cursor-grabbing"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          style={{ right: `${currentRight}px`, bottom: `${currentBottom}px` }}
          className={`fixed z-[60] w-[calc(100vw-2rem)] sm:w-[380px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
            isMobile
              ? "h-[min(70vh,560px)] max-h-[calc(100dvh-7rem)]"
              : "h-[560px] max-h-[calc(100vh-3rem)]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">
                {isMobile ? "Orivraa Mobile Assistant" : "Orivraa AI Assistant"}
              </p>
              <p className="text-[11px] opacity-90 leading-tight">
                {isMobile
                  ? "POS · Quotes · Repairs · Savings"
                  : "Powered by Gemini | Founder on standby"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                dismissChat();
                setOpen(false);
              }}
              title="Hide chat widget completely"
              aria-label="Hide chat widget"
              className="text-[10px] px-2 py-1 mr-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors uppercase font-medium tracking-wide"
            >
              Hide
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="h-8 w-8 rounded-full hover:bg-white/15 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50 dark:bg-gray-950">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    m.from === "user"
                      ? "bg-amber-500 text-white rounded-br-sm"
                      : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.cta && m.cta.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.cta.map((c) => {
                        const external = /^https?:|^mailto:|^tel:/.test(c.href);
                        return (
                          <a
                            key={c.href + c.label}
                            href={c.href}
                            {...(external
                              ? { target: "_blank", rel: "noopener noreferrer" }
                              : {})}
                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 transition-colors"
                          >
                            {c.label.toLowerCase().includes("whatsapp") && (
                              <Phone className="h-3 w-3" />
                            )}
                            {c.label.toLowerCase().includes("email") && (
                              <Mail className="h-3 w-3" />
                            )}
                            {c.label.toLowerCase().includes("call") && (
                              <Phone className="h-3 w-3" />
                            )}
                            {c.label}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {showQuickAsks && !isTyping && (
              <div className="pt-1">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 px-1">
                  Try asking
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ASKS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void send(q)}
                      className="text-xs px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-amber-300 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2.5 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about Orivraa..."
              className="flex-1 text-sm bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
              maxLength={500}
              disabled={isTyping}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isTyping}
              className="h-9 w-9 rounded-full gold-gradient text-white disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 pb-1.5">
            Need a human?{" "}
            <a
              href={`https://wa.me/${FOUNDER.phone.replace("+", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-600"
            >
              WhatsApp Aakash
            </a>{" "}
            |{" "}
            <a href={`mailto:${FOUNDER.email}`} className="underline hover:text-amber-600">
              {FOUNDER.email}
            </a>
          </p>
        </div>
      )}
    </>
  );
}

export default SupportBot;
