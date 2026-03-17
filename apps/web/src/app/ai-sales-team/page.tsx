"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { T } from "@/components/ui/T";
import {
    ArrowRight,
    Bot,
    Brain,
    ChevronDown,
    ChevronRight,
    Clock,
    Globe,
    Headphones,
    Layers,
    MessageSquare,
    Mic,
    Phone,
    Play,
    Send,
    Sparkles,
    Users,
    Wand2,
    Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────────── */
/*  JSON-LD                                                        */
/* ─────────────────────────────────────────────────────────────── */

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Orivraa AI Sales Team",
  applicationCategory: "BusinessApplication",
  description:
    "AI-powered voice and chat sales agents for jewellery businesses. Available 24/7, speaks 42 languages, responds in under 800 ms. Handles calls, meetings, and follow-up emails autonomously.",
  url: "https://www.orivraa.com/ai-sales-team",
  author: {
    "@type": "Organization",
    name: "Orivraa Technologies Pvt. Ltd.",
    url: "https://www.orivraa.com",
  },
  featureList: [
    "24/7 AI voice sales agents",
    "42 languages supported",
    "Sub-800ms response latency",
    "Vector memory for personalised conversations",
    "Persona switching mid-call",
    "Automated meeting scheduling",
    "Post-call email follow-up",
    "Full call transcripts",
  ],
};

/* ─────────────────────────────────────────────────────────────── */
/*  PERSONAS                                                       */
/* ─────────────────────────────────────────────────────────────── */

const PERSONAS = [
  {
    name: "Aria",
    role: "Premium Consultant",
    flag: "🇬🇧",
    lang: "English",
    personality: "Warm, knowledgeable, trust-building",
    accent: "British English",
    specialty: "High-value engagement ring & bridal consultations",
    color: "amber",
  },
  {
    name: "Raj",
    role: "Gold Specialist",
    flag: "🇮🇳",
    lang: "Hindi / English",
    personality: "Enthusiastic, detail-oriented, price-aware",
    accent: "Indian English",
    specialty: "Gold jewellery, making charges, purity comparisons",
    color: "yellow",
  },
  {
    name: "Layla",
    role: "Luxury Advisor",
    flag: "🇦🇪",
    lang: "Arabic / English",
    personality: "Refined, patient, relationship-first",
    accent: "Gulf Arabic",
    specialty: "Diamond sets, 21K gold, gifting occasions",
    color: "orange",
  },
  {
    name: "Maya",
    role: "Custom Design Guide",
    flag: "🇺🇸",
    lang: "English",
    personality: "Creative, empathetic, question-led",
    accent: "American English",
    specialty: "Custom order facilitation, design walks",
    color: "rose",
  },
];

/* ─────────────────────────────────────────────────────────────── */
/*  PIPELINE STEPS                                                 */
/* ─────────────────────────────────────────────────────────────── */

const PIPELINE_STEPS = [
  {
    id: "mic",
    label: "Customer Voice",
    sublabel: "Raw audio input",
    icon: Mic,
    color: "blue",
    ms: null,
  },
  {
    id: "stt",
    label: "Deepgram STT",
    sublabel: "Speech → Text",
    icon: Headphones,
    color: "purple",
    ms: "~180ms",
  },
  {
    id: "llm",
    label: "Gemini Flash",
    sublabel: "Reasoning & Memory",
    icon: Brain,
    color: "amber",
    ms: "~320ms",
  },
  {
    id: "tts",
    label: "ElevenLabs TTS",
    sublabel: "Text → Voice",
    icon: Headphones,
    color: "green",
    ms: "~220ms",
  },
  {
    id: "out",
    label: "Agent Speaks",
    sublabel: "Streamed audio",
    icon: Mic,
    color: "emerald",
    ms: null,
  },
];

/* ─────────────────────────────────────────────────────────────── */
/*  SANDBOX SCRIPT                                                 */
/* ─────────────────────────────────────────────────────────────── */

const SANDBOX_SCRIPT: { role: "user" | "agent"; text: string }[] = [
  {
    role: "agent",
    text: "Hi! I'm Aria, your personal jewellery consultant. I hear you're looking for an engagement ring — how exciting! What's your partner's style like?",
  },
  {
    role: "user",
    text: "She likes minimalist designs. Not too flashy. Budget around $3,000.",
  },
  {
    role: "agent",
    text: "Perfect — a solitaire in 18K white gold or platinum would suit her beautifully. The classic 4-prong setting in our Elara line starts at $2,650 and lets the stone breathe. Would she prefer a round brilliant or an oval cut? Oval reads 15% larger per carat.",
  },
  {
    role: "user",
    text: "I didn't know oval reads larger. What about the stone quality?",
  },
  {
    role: "agent",
    text: "Great question! For your budget I'd recommend a 1ct oval, G-colour, VS2 clarity — eye-clean but leaves $400 for engraving or a matching band. The cut is where I'd never compromise; it drives 70% of the sparkle. Want me to schedule a 15-minute video call so you can see it under natural light?",
  },
  {
    role: "user",
    text: "Can you try to stump the AI? Ask anything about gemstones, pricing, or break character.",
  },
];

const STATS = [
  { value: "800+", label: "Calls handled daily", icon: Phone },
  { value: "42", label: "Languages supported", icon: Globe },
  { value: "<800ms", label: "End-to-end latency", icon: Zap },
  { value: "24 / 7", label: "Always available", icon: Clock },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Connect your Orivraa shop",
    desc: "The AI reads your live inventory, pricing rules, and product catalogue — so every answer is grounded in your actual stock.",
  },
  {
    step: "02",
    title: "Pick your personas",
    desc: "Choose from Aria, Raj, Layla, Maya — or request a custom voice. Personas can switch mid-call based on language detected.",
  },
  {
    step: "03",
    title: "Publish your call link",
    desc: "Add a click-to-call button to your product pages, WhatsApp profile, or QR code at your counter.",
  },
  {
    step: "04",
    title: "AI handles the rest",
    desc: "Every call is transcribed, summarised, and logged. Follow-up emails are drafted automatically. You review and send.",
  },
];

const FAQS = [
  {
    q: "Can the AI actually answer questions about my specific products?",
    a: "Yes. Orivraa AI is connected to your live inventory and product catalogue. It knows your current stock, pricing, making charges, and availability in real time. It won't hallucinate products you don't carry.",
  },
  {
    q: "What happens when a customer wants to negotiate the price?",
    a: "The agent is trained on jewellery sales psychology. It anchors value before discussing price, offers alternative products within budget, and can apply pre-authorised discount tiers you set. It never goes below your floor price.",
  },
  {
    q: "How does the AI handle questions it can't answer?",
    a: "If a question is outside its training or requires a human decision, the agent gracefully defers: 'Let me have our specialist call you back within the hour.' A task is immediately logged in your CRM.",
  },
  {
    q: "Is the conversation private?",
    a: "All calls are end-to-end encrypted via Daily.co. Transcripts are stored only in your Orivraa account and never used to train public models.",
  },
  {
    q: "What languages are supported?",
    a: "42 languages including English, Hindi, Arabic, French, Mandarin, Spanish, Nepali, and Punjabi. Language detection is automatic — the agent switches mid-sentence if needed.",
  },
];

/* ─────────────────────────────────────────────────────────────── */
/*  WAVEFORM COMPONENT                                             */
/* ─────────────────────────────────────────────────────────────── */

function WaveformBars({ active }: { active: boolean }) {
  const bars = Array.from({ length: 32 });
  return (
    <div className="flex items-center gap-[2px] h-8">
      {bars.map((_, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all duration-75 ${
            active ? "bg-amber-500" : "bg-amber-200 dark:bg-amber-900"
          }`}
          style={{
            height: active
              ? `${8 + Math.abs(Math.sin((Date.now() / 200 + i * 0.4))) * 24}px`
              : "4px",
            animationDelay: `${i * 30}ms`,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  PIPELINE VISUALIZER                                            */
/* ─────────────────────────────────────────────────────────────── */

function PipelineVisualizer() {
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const simulate = () => {
    if (running) return;
    setRunning(true);
    setActiveStep(0);
    let step = 0;
    intervalRef.current = setInterval(() => {
      step += 1;
      if (step >= PIPELINE_STEPS.length) {
        setActiveStep(-1);
        setRunning(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      setActiveStep(step);
    }, 520);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const colorMap: Record<string, string> = {
    blue: "border-blue-400 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
    purple:
      "border-purple-400 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300",
    amber:
      "border-amber-400 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
    green:
      "border-green-400 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300",
    emerald:
      "border-emerald-400 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {PIPELINE_STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = activeStep === i;
          const isDone = activeStep > i;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 px-4 py-3 w-32 transition-all duration-300 ${
                  isActive
                    ? colorMap[s.color] + " scale-110 shadow-lg"
                    : isDone
                    ? "border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 opacity-60"
                    : "border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700"
                }`}
              >
                <Icon
                  className={`w-5 h-5 mb-1 ${isActive ? "" : "text-gray-400"}`}
                />
                <span className="text-xs font-semibold text-center leading-tight">
                  {s.label}
                </span>
                <span className="text-[10px] text-gray-400 text-center">
                  {s.sublabel}
                </span>
                {s.ms && (
                  <span
                    className={`mt-1 text-[10px] font-mono font-bold ${
                      isActive ? "text-current" : "text-gray-300 dark:text-gray-600"
                    }`}
                  >
                    {s.ms}
                  </span>
                )}
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <ChevronRight
                  className={`w-4 h-4 flex-shrink-0 transition-colors duration-300 ${
                    isDone
                      ? "text-amber-400"
                      : "text-gray-300 dark:text-gray-600"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <button
          onClick={simulate}
          disabled={running}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold px-6 py-2.5 rounded-full transition-colors"
        >
          <Play className="w-4 h-4" />
          {running ? "Simulating…" : "Simulate a turn"}
        </button>
        <p className="mt-2 text-xs text-gray-400">
          Total round-trip ≈ 720ms · Streamed output starts at ~500ms
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  VECTOR MEMORY X-RAY                                            */
/* ─────────────────────────────────────────────────────────────── */

const MEMORY_NODES = [
  { label: "Prefers white gold", score: 0.97, x: 20, y: 15 },
  { label: "Budget: $3,000", score: 0.95, x: 60, y: 10 },
  { label: "Minimalist style", score: 0.93, x: 40, y: 40 },
  { label: "Oval cut interest", score: 0.88, x: 75, y: 55 },
  { label: "Anniversary buyer", score: 0.71, x: 15, y: 70 },
  { label: "Asked about clarity", score: 0.66, x: 55, y: 80 },
];

function VectorMemoryXray() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<typeof MEMORY_NODES>([]);

  const handleSearch = () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    setTimeout(() => {
      setSearching(false);
      const shuffled = [...MEMORY_NODES].sort(() => 0.5 - Math.random());
      setResults(shuffled.slice(0, 4).sort((a, b) => b.score - a.score));
    }, 900);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Left: chat */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Live Conversation
        </p>
        <div className="space-y-2 text-sm">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 max-w-[90%]">
            She prefers white gold and minimalist designs.
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 ml-auto max-w-[90%] text-right">
            The Elara solitaire in 18K white gold is popular with customers who
            value clean lines.
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 max-w-[90%]">
            What stone cut would suit her?
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Query the memory…"
            className="flex-1 text-sm border border-gray-200 dark:border-gray-700 bg-transparent rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            onClick={handleSearch}
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-full p-2"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: vector space */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          3072-dim Vector Space (2D projection)
        </p>
        <div className="relative bg-gray-50 dark:bg-gray-800 rounded-xl h-48 overflow-hidden">
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "linear-gradient(#888 1px, transparent 1px), linear-gradient(90deg, #888 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          {MEMORY_NODES.map((n, i) => (
            <div
              key={i}
              className={`absolute w-2.5 h-2.5 rounded-full border-2 transition-all duration-500 ${
                results.find((r) => r.label === n.label)
                  ? "bg-amber-400 border-amber-600 scale-150"
                  : "bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500"
              }`}
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
              title={n.label}
            />
          ))}
          {searching && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-xs text-amber-500 font-mono animate-pulse">
                Scanning 68 memory vectors…
              </div>
            </div>
          )}
        </div>
        {results.length > 0 && (
          <div className="mt-3 space-y-1">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-600 dark:text-gray-300">
                  {r.label}
                </span>
                <span className="font-mono text-amber-600 dark:text-amber-400">
                  {r.score.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
        {!searching && results.length === 0 && (
          <p className="text-center text-xs text-gray-400 mt-3">
            Type a query and press Enter to see retrieval in action
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  SANDBOX CHAT                                                   */
/* ─────────────────────────────────────────────────────────────── */

function InteractiveSandbox() {
  const [messages, setMessages] = useState(SANDBOX_SCRIPT.slice(0, 1));
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = () => {
    if (!input.trim() || thinking) return;
    const userMsg = { role: "user" as const, text: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);
    const nextIdx = messages.length; // current length after push
    const nextScripted = SANDBOX_SCRIPT[nextIdx + 1];
    setTimeout(() => {
      const reply = nextScripted
        ? nextScripted
        : {
            role: "agent" as const,
            text: "That's a great question! Our specialists would love to answer that in more detail. Want me to schedule a quick 10-minute call with one of our master jewellers?",
          };
      setMessages((m) => [...m, reply]);
      setThinking(false);
    }, 900 + Math.random() * 600);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 overflow-hidden bg-white dark:bg-gray-900 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold">Aria · Premium Consultant</p>
          <p className="text-xs text-green-600 dark:text-green-400">
            ● Online
          </p>
        </div>
        <div className="ml-auto">
          <WaveformBars active={thinking} />
        </div>
      </div>

      {/* Scenario chip */}
      <div className="px-4 pt-3">
        <div className="inline-flex items-center gap-1.5 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 rounded-full px-3 py-1">
          <Sparkles className="w-3 h-3" />
          Scenario: Engagement ring consultation · Try to stump our AI
        </div>
      </div>

      {/* Messages */}
      <div className="h-72 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "agent" && (
              <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                <Bot className="w-3 h-3 text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] text-sm rounded-2xl px-3 py-2 leading-relaxed ${
                m.role === "user"
                  ? "bg-amber-500 text-white rounded-br-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center mr-2 mt-0.5">
              <Bot className="w-3 h-3 text-white" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask anything about the ring, gemstones, pricing…"
          disabled={thinking}
          className="flex-1 text-sm border border-gray-200 dark:border-gray-700 bg-transparent rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={thinking || !input.trim()}
          className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-white rounded-full p-2.5"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  FAQ ACCORDION                                                  */
/* ─────────────────────────────────────────────────────────────── */

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {FAQS.map((f, i) => (
        <div
          key={i}
          className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
        >
          <button
            className="w-full flex items-center justify-between px-5 py-4 text-left font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span>{f.q}</span>
            <ChevronDown
              className={`w-4 h-4 flex-shrink-0 ml-2 transition-transform ${open === i ? "rotate-180" : ""}`}
            />
          </button>
          {open === i && (
            <div className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {f.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  PAGE                                                           */
/* ─────────────────────────────────────────────────────────────── */

export default function AISalesTeamPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      <main className="min-h-screen">
        {/* ── HERO ── */}
        <section className="relative bg-gradient-to-b from-amber-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 pt-24 pb-20 overflow-hidden">
          {/* decorative circles */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-amber-100 dark:bg-amber-900/20 blur-3xl opacity-60 pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-orange-100 dark:bg-orange-900/20 blur-3xl opacity-40 pointer-events-none" />

          <div className="relative max-w-5xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full px-4 py-1.5 mb-6 border border-amber-200 dark:border-amber-700">
              <Sparkles className="w-3.5 h-3.5" />
              <T>Next-Generation AI for Jewellery Sales</T>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight mb-6">
              <T>Your AI-Powered Jewellery</T>
              <br />
              <span className="text-amber-500">
                <T>Sales Team.</T>
              </span>{" "}
              <span className="text-gray-500 dark:text-gray-400 font-normal">
                <T>Available 24/7.</T>
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              <T>
                Hire AI agents that speak 42 languages, respond in under 800ms,
                and never call in sick. They know your inventory, close deals,
                and file the paperwork — while you sleep.
              </T>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 py-3.5 rounded-full transition-colors shadow-lg shadow-amber-200 dark:shadow-amber-900/50"
              >
                <T>Contact Us</T>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#sandbox"
                className="inline-flex items-center gap-2 border-2 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-semibold px-8 py-3.5 rounded-full transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <T>Try the Demo</T>
              </a>
            </div>
          </div>
        </section>

        {/* ── STATS BAR ── */}
        <section className="bg-white dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800 py-10">
          <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 mb-2">
                    <Icon className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {s.value}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    <T>{s.label}</T>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── TRANSPARENT PIPELINE ── */}
        <section className="py-20 bg-gray-50 dark:bg-gray-950">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">
                <Layers className="w-4 h-4" />
                <T>Open Architecture</T>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                <T>See every millisecond of the pipeline</T>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                <T>
                  Unlike black-box solutions, Orivraa AI is fully transparent.
                  Click simulate to watch a live voice turn travel from customer
                  speech to agent reply.
                </T>
              </p>
            </div>
            <PipelineVisualizer />
          </div>
        </section>

        {/* ── VECTOR MEMORY ── */}
        <section className="py-20 bg-white dark:bg-gray-900">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">
                <Brain className="w-4 h-4" />
                <T>Vector Memory</T>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                <T>AI that actually remembers your customer</T>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                <T>
                  Every fact from every conversation is encoded into a 3072-dim
                  semantic vector. Query the memory in real time below — watch
                  the relevant context surface instantly.
                </T>
              </p>
            </div>
            <VectorMemoryXray />
          </div>
        </section>

        {/* ── PERSONAS ── */}
        <section className="py-20 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-950 dark:to-gray-900">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">
                <Users className="w-4 h-4" />
                <T>Your Team</T>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                <T>Meet your AI sales agents</T>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                <T>
                  Each persona is trained on thousands of real jewellery sales
                  conversations. They can switch mid-call based on the
                  customer&apos;s detected language.
                </T>
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {PERSONAS.map((p) => (
                <div
                  key={p.name}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 hover:shadow-lg hover:-translate-y-1 transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-2xl">
                      {p.flag}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {p.name}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {p.role}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <div>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        Language:{" "}
                      </span>
                      {p.lang}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        Style:{" "}
                      </span>
                      {p.personality}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        Expert at:{" "}
                      </span>
                      {p.specialty}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-400 mt-8">
              <T>
                Custom personas available on request — match your brand voice
                exactly.
              </T>
            </p>
          </div>
        </section>

        {/* ── INTERACTIVE SANDBOX ── */}
        <section id="sandbox" className="py-20 bg-white dark:bg-gray-900">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">
                <MessageSquare className="w-4 h-4" />
                <T>Interactive Demo</T>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                <T>Try to stump our AI rep</T>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                <T>
                  You&apos;re buying an engagement ring. Ask anything — pricing,
                  stone quality, comparisons, or try to break the script. See
                  how Aria handles it.
                </T>
              </p>
            </div>
            <InteractiveSandbox />
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="py-20 bg-gradient-to-b from-amber-500 to-orange-500">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                <T>Up and running in 48 hours</T>
              </h2>
              <p className="text-amber-100 max-w-xl mx-auto">
                <T>
                  No engineering required. We onboard your product catalogue,
                  configure the persona voices, and go live.
                </T>
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {HOW_IT_WORKS.map((s) => (
                <div key={s.step} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 text-white font-extrabold text-lg mb-4">
                    {s.step}
                  </div>
                  <h3 className="font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-amber-100 text-sm leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── INTEGRATIONS ── */}
        <section className="py-20 bg-gray-50 dark:bg-gray-950">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">
              <Zap className="w-4 h-4" />
              <T>Integrations</T>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              <T>Works where your customers already are</T>
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-12">
              <T>
                No new apps for your customers to install. The AI meets them on
                the channels they use.
              </T>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Phone,
                  title: "Phone / Twilio",
                  desc: "Inbound & outbound telephone calls via your existing number",
                },
                {
                  icon: Wand2,
                  title: "Daily.co Video",
                  desc: "Branded HD video meetings with AI in-room from day one",
                },
                {
                  icon: Bot,
                  title: "Google Meet",
                  desc: "AI bot joins scheduled Google Meet links automatically",
                },
                {
                  icon: MessageSquare,
                  title: "WhatsApp Chat",
                  desc: "Text-based AI sales agent on your WhatsApp Business number",
                },
                {
                  icon: Globe,
                  title: "Website Widget",
                  desc: "Embed a chat or call button on any page in 2 lines of code",
                },
                {
                  icon: Sparkles,
                  title: "Orivraa Marketplace",
                  desc: "Buyers browsing your shop can speak directly with the AI",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 hover:shadow-md transition-shadow text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-amber-500" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-20 bg-white dark:bg-gray-900">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                <T>Frequently asked questions</T>
              </h2>
            </div>
            <FAQ />
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="py-24 bg-gradient-to-br from-gray-900 via-gray-950 to-black">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <Sparkles className="w-10 h-10 text-amber-400 mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              <T>Ready to put an AI rep on every call?</T>
            </h2>
            <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
              <T>
                Book a 20-minute demo and we will show you a live session with
                your own product catalogue — no commitment required.
              </T>
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-10 py-4 rounded-full text-lg transition-colors shadow-xl shadow-amber-900/50"
            >
              <T>Contact Us</T>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-gray-500 text-sm mt-6">
              <T>
                Custom enterprise pricing · White-label available · No setup
                fees
              </T>
            </p>
          </div>
        </section>
      </main>

      <DynamicFooter />
    </>
  );
}
