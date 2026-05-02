"use client";

/**
 * SupportBot — floating help widget
 *
 * A real, working rule-based assistant that answers common questions about
 * Orivraa (pricing, features, GST, hallmarking, offline POS, AI agents,
 * onboarding, security, refunds). When it cannot answer, or when the user
 * asks for a human, it escalates to the founder:
 *   • Email:    aakashm301@gmail.com
 *   • Phone:    +91 6203965557 (call + WhatsApp)
 *
 * Pure client-side, no LLM call, no external dependency. Safe to ship today
 * and easy to extend with new intents in the KB array below.
 */

import { Button } from "@/components/ui/button";
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

type Intent = {
  id: string;
  /** Lowercase keywords; ANY match counts. */
  keywords: string[];
  reply: string;
  cta?: { label: string; href: string }[];
};

/* ───────────────────────────── Knowledge base ──────────────────────────── */

const KB: Intent[] = [
  {
    id: "pricing",
    keywords: ["price", "pricing", "cost", "plan", "subscription", "how much", "monthly", "fee", "charges"],
    reply:
      "Orivraa has a Free 30-day trial (no credit card). Paid plans start small for single-shop owners and scale to multi-branch enterprise. Live local prices are shown on the pricing page in your country's currency.",
    cta: [{ label: "See pricing", href: "/pricing" }],
  },
  {
    id: "trial",
    keywords: ["trial", "free", "try", "demo", "test"],
    reply:
      "You get a 30-day free trial — full features, no credit card required. Setup takes under 10 minutes. You can import your existing inventory from CSV/Excel.",
    cta: [{ label: "Start free trial", href: "/auth/register" }],
  },
  {
    id: "features",
    keywords: ["feature", "what does", "what can", "capabilities", "include", "offer"],
    reply:
      "Orivraa is an all-in-one CRM + POS for jewellery shops: live gold/silver pricing, GST/VAT-ready billing, multi-store inventory, hallmark/HUID-aware invoices, customer chat, WhatsApp catalogue, barcode scanning and offline desktop POS that syncs to the cloud.",
    cta: [{ label: "See full feature list", href: "/for-sellers" }],
  },
  {
    id: "gst",
    keywords: ["gst", "tax", "vat", "hsn", "invoice tax"],
    reply:
      "Yes — Orivraa applies the correct GST automatically (3% on gold value + 5% on making charges in India), produces tax-compliant invoices with HSN 7113, and supports VAT for UAE, KSA and other GCC countries. Old-gold exchanges are handled too.",
    cta: [{ label: "Read the GST guide", href: "/blog/how-to-calculate-gst-on-gold-jewellery-india" }],
  },
  {
    id: "hallmark",
    keywords: ["hallmark", "huid", "bis", "purity", "karat", "carat"],
    reply:
      "Every invoice can carry HUID, purity (22K/18K/etc.), gross/net weight and stone weight. We have a full BIS hallmarking compliance checklist if you're new to it.",
    cta: [{ label: "Hallmarking checklist", href: "/blog/hallmarking-compliance-checklist-jewellers-india" }],
  },
  {
    id: "offline",
    keywords: ["offline", "no internet", "internet", "desktop", "pos", "counter", "billing"],
    reply:
      "The desktop POS works fully offline at the counter and auto-syncs to the cloud the moment you're back online. So a power cut or weak signal never stops a sale.",
    cta: [{ label: "Download desktop POS", href: "/download" }],
  },
  {
    id: "multi-store",
    keywords: ["multi", "branch", "store", "shop", "location", "multiple"],
    reply:
      "Yes — you can run multiple branches under one account, transfer stock between stores, and see consolidated reports. Each branch can have its own pricing and staff permissions.",
    cta: [{ label: "Talk to sales", href: "/contact?interest=Enterprise+%2F+Multi-branch" }],
  },
  {
    id: "ai-agent",
    keywords: ["ai", "voice", "agent", "shopkeeper", "bot", "automation", "follow up"],
    reply:
      "Our AI sales agents (in beta) answer customer calls 24/7 in 42 languages, qualify leads, schedule visits and send follow-up emails. The product page has a live demo you can try.",
    cta: [{ label: "See AI sales team demo", href: "/ai-sales-team" }],
  },
  {
    id: "security",
    keywords: ["security", "secure", "data", "safe", "privacy", "backup", "encrypt"],
    reply:
      "Bank-grade encryption in transit (TLS 1.3) and at rest, daily encrypted backups, and your data stays in your region (India / UAE / EU). Your customer list is yours — you can export everything anytime.",
    cta: [{ label: "Read security notes", href: "/privacy" }],
  },
  {
    id: "onboard",
    keywords: ["onboard", "setup", "import", "migrate", "tally", "marg", "start"],
    reply:
      "Three steps: (1) sign up free, (2) import inventory from Excel/CSV (or from Tally/Marg — we'll help), (3) start billing. Most shops are live the same day. We'll personally hand-hold you on a free onboarding call.",
    cta: [{ label: "Book onboarding call", href: "/contact?interest=Onboarding" }],
  },
  {
    id: "refund",
    keywords: ["refund", "cancel", "money back", "stop"],
    reply:
      "Cancel anytime from your dashboard — no lock-in. If something genuinely didn't work for you within the first 30 days of a paid plan, we'll refund it. Your data export is always free.",
  },
  {
    id: "languages",
    keywords: ["language", "hindi", "nepali", "arabic", "marathi", "tamil"],
    reply:
      "The app UI works in English, Hindi, Nepali, Arabic, French, German and Spanish. AI agents speak 42 languages. Invoices print in your customer's language.",
  },
  {
    id: "compare",
    keywords: ["tally", "marg", "vs", "compare", "comparison", "better than"],
    reply:
      "Short version: Tally and Marg ERP are great for accounting but were not built for jewellery shops — no live gold rates, no HUID-aware invoicing, no mobile POS, no free plan. We have detailed side-by-side pages.",
    cta: [
      { label: "Orivraa vs Tally", href: "/compare/orivraa-vs-tally" },
      { label: "Orivraa vs Marg ERP", href: "/compare/orivraa-vs-marg-erp" },
    ],
  },
  {
    id: "human",
    keywords: ["human", "person", "real", "talk to someone", "founder", "owner", "call you", "whatsapp", "phone", "contact you", "speak"],
    reply: `You'll speak with me — ${FOUNDER.name}, the founder. Easiest is WhatsApp or a quick call: ${FOUNDER.phoneDisplay}. Or email ${FOUNDER.email} and I'll reply personally within a few hours.`,
    cta: [
      { label: `WhatsApp ${FOUNDER.phoneDisplay}`, href: `https://wa.me/${FOUNDER.phone.replace("+", "")}` },
      { label: "Email Aakash", href: `mailto:${FOUNDER.email}` },
      { label: `Call ${FOUNDER.phoneDisplay}`, href: `tel:${FOUNDER.phone}` },
    ],
  },
  {
    id: "hello",
    keywords: ["hi", "hello", "hey", "namaste", "salaam", "good morning", "good evening"],
    reply:
      "Hi! I'm the Orivraa assistant. I can answer questions about pricing, features, GST, hallmarking, offline POS, AI agents and onboarding. What would you like to know?",
  },
  {
    id: "thanks",
    keywords: ["thanks", "thank you", "thx", "shukriya", "dhanyabad"],
    reply: "You're welcome! Anything else I can help with?",
  },
];

const QUICK_ASKS = [
  "How much does it cost?",
  "Does it work offline?",
  "How is GST handled?",
  "Compare with Tally",
  "Talk to a human",
];

/* ───────────────────────────── Matching engine ─────────────────────────── */

function matchIntent(text: string): Intent | undefined {
  const q = text.toLowerCase();
  let best: { intent: Intent; score: number } | undefined;
  for (const intent of KB) {
    let score = 0;
    for (const kw of intent.keywords) {
      if (q.includes(kw)) score += kw.length; // longer keyword = stronger signal
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { intent, score };
    }
  }
  return best?.intent;
}

const FALLBACK: Pick<Intent, "reply" | "cta"> = {
  reply: `I don't have a confident answer for that one — let me put you straight through to ${FOUNDER.name}, the founder. He'll reply personally.`,
  cta: [
    { label: `WhatsApp ${FOUNDER.phoneDisplay}`, href: `https://wa.me/${FOUNDER.phone.replace("+", "")}` },
    { label: "Email Aakash", href: `mailto:${FOUNDER.email}` },
    { label: `Call ${FOUNDER.phoneDisplay}`, href: `tel:${FOUNDER.phone}` },
  ],
};

/* ───────────────────────────── Component ───────────────────────────────── */

export function SupportBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      from: "bot",
      text:
        "Hi 👋 I'm the Orivraa assistant. Ask me about pricing, features, GST, offline POS, hallmarking — or just say 'talk to a human' and I'll connect you to our founder.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const userMsg: Message = { id: `${Date.now()}-u`, from: "user", text };
    const intent = matchIntent(text);
    const botPayload = intent ?? FALLBACK;
    const botMsg: Message = {
      id: `${Date.now()}-b`,
      from: "bot",
      text: botPayload.reply,
      cta: botPayload.cta,
    };
    setMessages((m) => [...m, userMsg, botMsg]);
    setInput("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
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
              <p className="text-sm font-semibold leading-tight">Orivraa Support</p>
              <p className="text-[11px] opacity-90 leading-tight">Usually replies instantly · Founder on standby</p>
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

            {showQuickAsks && (
              <div className="pt-1">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 px-1">
                  Try asking
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ASKS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
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
              placeholder="Ask anything about Orivraa…"
              className="flex-1 text-sm bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
              maxLength={500}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
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
            ·{" "}
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
