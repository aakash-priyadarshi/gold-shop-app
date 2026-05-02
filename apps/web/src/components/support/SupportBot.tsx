"use client";

/**
 * SupportBot â€” floating AI help widget
 *
 * Sends messages to POST /tickets/ai-chat (Gemini 2.5 Flash + Qdrant RAG).
 * Session persistence via sessionStorage so conversation survives page
 * navigation and open/close within the same browser tab.
 *
 * Human escalation contact:
 *   Email:    aakashm301@gmail.com
 *   WhatsApp: +91 62039 65557
 */

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Mail, MessageCircle, Phone, Send, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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

const QUICK_ASKS = [
  "What is Orivraa?",
  "How much does it cost?",
  "Does it work offline?",
  "How is GST handled?",
  "Compare with Tally",
];

const ESCALATION_CTA: { label: string; href: string }[] = [
  { label: `WhatsApp ${FOUNDER.phoneDisplay}`, href: `https://wa.me/${FOUNDER.phone.replace("+", "")}` },
  { label: "Email Aakash", href: `mailto:${FOUNDER.email}` },
  { label: `Call ${FOUNDER.phoneDisplay}`, href: `tel:${FOUNDER.phone}` },
];

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Session persistence helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const WELCOME_MSG: Message = {
  id: "welcome",
  from: "bot",
  text: "Hi ðŸ‘‹ I'm the Orivraa AI assistant. Ask me about pricing, features, GST, offline POS, hallmarking â€” or just say 'talk to a human' and I'll connect you to our founder.",
};

const STORAGE_MSGS = "orivraa_chat_messages";
const STORAGE_OPEN = "orivraa_chat_open";

function readSession<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function SupportBot() {
  const [open, setOpen] = useState<boolean>(() => readSession(STORAGE_OPEN, false));
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() =>
    readSession<Message[]>(STORAGE_MSGS, [WELCOME_MSG]),
  );
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      const res = await api.post<{ reply: string; shouldEscalate: boolean; confidence: number }>(
        "tickets/ai-chat",
        { message: text, history },
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

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Orivraa support chat"
          className="fixed bottom-5 right-5 z-[60] h-14 w-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
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
        <div className="fixed bottom-5 right-5 z-[60] w-[calc(100vw-2.5rem)] sm:w-[380px] h-[560px] max-h-[calc(100vh-3rem)] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Orivraa AI Assistant</p>
              <p className="text-[11px] opacity-90 leading-tight">Powered by Gemini Â· Founder on standby</p>
            </div>
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
              placeholder="Ask anything about Orivraaâ€¦"
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
            Â·{" "}
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
