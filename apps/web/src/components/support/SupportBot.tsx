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
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { useFeatures } from "@/hooks/useFeatures";
import { api } from "@/lib/api";
import { OPEN_SUPPORT_CHAT_EVENT, useHelpUIStore } from "@/store/help-ui";
import { usePreferencesStore } from "@/store/preferences";
import { Mail, MessageCircle, Phone, Send, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  "Compare with The Edge",
  "Compare with Jewel360",
  "Compare with Lightspeed",
];

const QUICK_ASKS_SELLER = [
  "How do I switch to Easy Mode?",
  "What were my sales this month?",
  "What's my pending invoice amount?",
  "How do I create an invoice?",
  "How do I share my tax report with my CA?",
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
  text: "Hi 👋 <T>I'm the Orivraa AI assistant. Ask me about pricing, features, GST, offline POS, hallmarking \u2014 or just say 'talk to a human' and I'll connect you to our founder.</T>",
};

function makeSellerWelcome(shopName?: string, firstName?: string): Message {
  const nameStr = firstName && shopName 
    ? `${firstName} from ${shopName}` 
    : firstName 
    ? firstName 
    : shopName 
    ? shopName 
    : "";
  return {
    id: "welcome",
    from: "bot",
    text: `Hi ${nameStr ? nameStr + " 👋" : "👋"} <T>I can see your shop\u2019s live data \u2014 ask me about this month\u2019s sales, pending invoices, tax audit status, or how to use any feature.</T>`,
  };
}

function makeMobileWelcome(shopName?: string, firstName?: string): Message {
  const nameStr = firstName && shopName 
    ? `${firstName} from ${shopName}` 
    : firstName 
    ? firstName 
    : shopName 
    ? shopName 
    : "";
  return {
    id: "welcome",
    from: "bot",
    text: `Hi ${nameStr ? nameStr + " 👋" : "👋"} <T>I\u2019m your mobile POS assistant. Ask me how to bill a customer, share a quote on WhatsApp, download your tax report, log a repair, or manage savings schemes.</T>`,
  };
}

function makeUnverifiedWelcome(shopName?: string, daysLeft?: number, isWithinSandbox?: boolean, firstName?: string): Message {
  const nameStr = firstName && shopName 
    ? `${firstName} from ${shopName}` 
    : firstName 
    ? firstName 
    : shopName 
    ? shopName 
    : "";
  if (isWithinSandbox) {
    return {
      id: "welcome",
      from: "bot",
      text: `Hi ${nameStr ? nameStr + " 👋" : "👋"} <T>Orivraa is running in KYC Sandbox Mode. You have ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left to test POS billing and invoice creation. During this trial, printed invoices will carry a repeated diagonal watermark "DEMO BILL - NOT FOR COMMERCIAL SALE". Get verified now to enable production-ready billing, or enter a valid business Tax ID on POS forms to bypass the watermark!</T>`,
      cta: [
        { label: "Verify KYC Now", href: "/dashboard/shop/kyc" },
      ],
    };
  } else {
    return {
      id: "welcome",
      from: "bot",
      text: `Hi ${nameStr ? nameStr + " 👋" : "👋"} <T>Your KYC Sandbox period has expired and invoicing is locked. Complete your KYC business verification immediately to resume POS counter checkouts!</T>`,
      cta: [
        { label: "Verify KYC Now", href: "/dashboard/shop/kyc" },
      ],
    };
  }
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

function parseTextWithT(text: string) {
  const parts = [];
  const regex = /<[tT]>(.*?)<\/[tT]>/g;
  let match;
  let lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(<T key={match.index}>{match[1]}</T>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

function renderMessageContent(text: string) {
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const label = match[1];
    const href = match[2];
    const isExternal = /^https?:/.test(href);

    parts.push(
      <a
        key={match.index}
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 underline font-semibold transition-colors"
      >
        {label}
      </a>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.map((part, idx) => {
    if (typeof part === "string") {
      return parseTextWithT(part);
    }
    return part;
  });
}

export function SupportBot() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { planName } = useFeatures();
  const isSellerLoggedIn = user?.role === "SHOPKEEPER";
  const isMobile = pathname.startsWith("/m/") || pathname === "/m";
  const shopName = user?.shop?.shopName ?? (user as { shopName?: string } | null)?.shopName;
  const isVerified = user?.shop?.isVerified ?? false;

  const registrationAgeDays = useMemo(() => {
    if (!user) return 0;
    const createdDate = new Date(user.createdAt).getTime();
    return (Date.now() - createdDate) / (1000 * 60 * 60 * 24);
  }, [user]);

  const daysLeft = useMemo(() => {
    if (!user) return 0;
    const createdDate = new Date(user.createdAt).getTime();
    const diffDays = 7 - (Date.now() - createdDate) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(diffDays));
  }, [user]);

  const isWithinSandbox = useMemo(() => {
    return registrationAgeDays <= 7;
  }, [registrationAgeDays]);

  const [open, setOpen] = useState<boolean>(() => readSession(STORAGE_OPEN, false));
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() =>
    readSession<Message[]>(STORAGE_MSGS, [WELCOME_MSG_PUBLIC]),
  );
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { isChatDismissed, dismissChat, isChatShaking } = useHelpUIStore();
  const dashboardMode = usePreferencesStore((s) => s.dashboardMode);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [isWaving, setIsWaving] = useState(false);
  const [isExcited, setIsExcited] = useState(false);
  const [botState, setBotState] = useState<"default" | "ring" | "diamond" | "crown" | "gold_bar">("default");
  const [bubbleText, setBubbleText] = useState<string>("<T>Need help? Ask AI!</T>");
  const [currentAnimation, setCurrentAnimation] = useState<"none" | "spin" | "wave" | "bounce" | "excited">("none");
  const [isDragging, setIsDragging] = useState(false);

  const triggerRandomAction = useCallback(() => {
    if (open || isDragging) return;

    const isDashboard = pathname.includes("dashboard") || pathname.startsWith("/m") || isSellerLoggedIn;
    
    let text = "";
    let state: "default" | "ring" | "diamond" | "crown" | "gold_bar" = "default";
    let animation: "none" | "spin" | "wave" | "bounce" | "excited" = "none";

    if (isDashboard) {
      if (pathname.includes("tax") || pathname.includes("vat") || pathname.includes("gst")) {
        text = "<T>If you need any help in filing tax ask me, okay?</T>";
        state = "gold_bar";
        animation = "spin";
      } else if (pathname.includes("inventory") || pathname.includes("stock") || pathname.includes("catalogue")) {
        text = "<T>Let's organize your luxurious inventory today! 💎</T>";
        state = "diamond";
        animation = "bounce";
      } else if (pathname.includes("sales") || pathname.includes("analytics") || pathname.includes("report")) {
        text = "<T>Look at those sales grow! Gold-standard numbers! 📈</T>";
        state = "crown";
        animation = "excited";
      } else if (pathname.includes("pos") || pathname.includes("bill") || pathname.includes("checkout")) {
        text = "<T>Let's check out some gold billing tickets! 🧾</T>";
        state = "ring";
        animation = "spin";
      } else {
        // General dashboard pages: check subscription status
        const currentPlan = planName?.toLowerCase() || "";
        const isFreePlan = !planName || currentPlan.includes("free") || currentPlan.includes("trial");

        if (isFreePlan) {
          // 50% chance to remind about upgrading to Pro with different high-value feature callouts
          if (Math.random() > 0.5) {
            const upsells = [
              { state: "crown" as const, text: "<T>You are on the Free Plan! Upgrade to Pro to download tax reports without watermarking! 🚀</T>", animation: "excited" as const },
              { state: "gold_bar" as const, text: "<T>Running slow internet? Upgrade to Pro to unlock continuous offline POS database sync! ⚡</T>", animation: "spin" as const },
              { state: "diamond" as const, text: "<T>Want deeper RAG analysis? Upgrade to Pro to get 10x more AI Sales forecasting credits monthly! 📈</T>", animation: "bounce" as const },
              { state: "ring" as const, text: "<T>Impress your clients! Upgrade to Pro to connect your custom domain and remove invoice branding! 🏷️</T>", animation: "spin" as const },
              { state: "crown" as const, text: "<T>Automate your sales! Upgrade to Pro to enable instant automated WhatsApp invoice sharing! 💬</T>", animation: "excited" as const },
            ];
            const action = upsells[Math.floor(Math.random() * upsells.length)];
            text = action.text;
            state = action.state;
            animation = action.animation;
          } else {
            // General dashboard cheer
            const dashboardActions = [
              { state: "default" as const, text: "<T>You're doing great! Let's close some deals! 🚀</T>", animation: "excited" as const },
              { state: "ring" as const, text: "<T>Sales are looking golden today! 💰</T>", animation: "spin" as const },
              { state: "diamond" as const, text: "<T>Look at that beautiful dashboard shine! ✨</T>", animation: "bounce" as const },
              { state: "crown" as const, text: "<T>Keep up the amazing work, superstar! 🌟</T>", animation: "excited" as const },
              { state: "gold_bar" as const, text: "<T>Gold-standard performance right there! 🏆</T>", animation: "spin" as const },
            ];
            const action = dashboardActions[Math.floor(Math.random() * dashboardActions.length)];
            text = action.text;
            state = action.state;
            animation = action.animation;
          }
        } else {
          // Pro user dashboard cheer
          const proDashboardActions = [
            { state: "default" as const, text: "<T>Welcome back, Pro member! Let's scale today! 🚀</T>", animation: "excited" as const },
            { state: "ring" as const, text: "<T>Exclusive Pro-tier performance activated! 💎</T>", animation: "spin" as const },
            { state: "diamond" as const, text: "<T>Your shop looks brilliant today! ✨</T>", animation: "bounce" as const },
            { state: "crown" as const, text: "<T>Leading the gold industry standard! 👑</T>", animation: "excited" as const },
            { state: "gold_bar" as const, text: "<T>High-end security and backup enabled! 🔒</T>", animation: "spin" as const },
          ];
          const action = proDashboardActions[Math.floor(Math.random() * proDashboardActions.length)];
          text = action.text;
          state = action.state;
          animation = action.animation;
        }
      }
    } else {
      // Public pages
      if (pathname.includes("pricing")) {
        text = "<T>I assure you we have the cheapest software! 💰</T>";
        state = "gold_bar";
        animation = "spin";
      } else if (pathname.includes("security")) {
        text = "<T>We are so secure! 🔒</T>";
        state = "crown";
        animation = "excited";
      } else {
        // General public routes
        const publicActions = [
          { state: "default" as const, text: "<T>HI, if you have any question ask me</T>", animation: "wave" as const },
          { state: "ring" as const, text: "<T>See my ring? It's pure gold! 💍</T>", animation: "spin" as const },
          { state: "diamond" as const, text: "<T>Shine bright like a diamond! 💎</T>", animation: "bounce" as const },
          { state: "crown" as const, text: "<T>Only the royal gold standard for you! 👑</T>", animation: "excited" as const },
          { state: "gold_bar" as const, text: "<T>Solid gold support, 24/7! 🪙</T>", animation: "spin" as const },
        ];
        const action = publicActions[Math.floor(Math.random() * publicActions.length)];
        text = action.text;
        state = action.state;
        animation = action.animation;
      }
    }

    setBotState(state);
    setBubbleText(text);
    setBubbleVisible(true);
    
    if (animation === "wave") setIsWaving(true);
    if (animation === "excited") setIsExcited(true);
    setCurrentAnimation(animation);

    // After 6.5 seconds, return to normal default
    setTimeout(() => {
      setBotState("default");
      setBubbleVisible(false);
      setIsWaving(false);
      setIsExcited(false);
      setCurrentAnimation("none");
    }, 6500);
  }, [open, isDragging, pathname, isSellerLoggedIn, planName]);

  // Periodic Clippy-like interactions timer
  useEffect(() => {
    if (isChatDismissed) return;

    // Initial action after 3s
    const initialTimer = setTimeout(() => {
      triggerRandomAction();
    }, 3000);

    // Periodic actions every 25 seconds
    const interval = setInterval(() => {
      triggerRandomAction();
    }, 25000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isChatDismissed, triggerRandomAction]);

  // Track session count to keep tooltip visible for new users
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    try {
      const count = parseInt(localStorage.getItem("orivraa_chat_session_count") || "0", 10);
      if (count < 3) {
        setIsNewUser(true);
        const sessionId = getOrCreateSessionId();
        const lastSessionId = localStorage.getItem("orivraa_chat_last_session_id");
        if (lastSessionId !== sessionId) {
          localStorage.setItem("orivraa_chat_session_count", (count + 1).toString());
          localStorage.setItem("orivraa_chat_last_session_id", sessionId);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Auto-show bubble on mount or when chat is recalled
  useEffect(() => {
    if (!isChatDismissed) {
      setBubbleVisible(true);
      if (!isNewUser) {
        const timer = setTimeout(() => setBubbleVisible(false), 4500);
        return () => clearTimeout(timer);
      }
    }
  }, [isChatDismissed, isNewUser]);

  // If chat is recalled (isChatDismissed becomes false), we can ensure it is visible
  useEffect(() => {
    if (!isChatDismissed && !open && readSession(STORAGE_OPEN, false) === false) {
      // Chat was just recalled from a hidden state, don't auto-open unless desired.
      // We will just let the launcher appear.
    }
  }, [isChatDismissed, open]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOpenRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      setBubbleVisible(false);
      setOpen(true);
      if (detail?.message) {
        setInput(detail.message);
      }
    };

    window.addEventListener(
      OPEN_SUPPORT_CHAT_EVENT,
      handleOpenRequest as EventListener,
    );
    return () => {
      window.removeEventListener(
        OPEN_SUPPORT_CHAT_EVENT,
        handleOpenRequest as EventListener,
      );
    };
  }, []);

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
        if (!isVerified) {
          return [makeUnverifiedWelcome(shopName, daysLeft, isWithinSandbox, user?.firstName)];
        }
        return [isMobile ? makeMobileWelcome(shopName, user?.firstName) : makeSellerWelcome(shopName, user?.firstName)];
      }
      return prev;
    });
  }, [isSellerLoggedIn, shopName, isMobile, isVerified, daysLeft, isWithinSandbox, user?.firstName]);

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
        { 
          message: text, 
          history, 
          sessionId: getOrCreateSessionId(), 
          currentPath: pathname, 
          dashboardMode,
          // Enrich chatbot request with comprehensive live user and plan context:
          userContext: {
            isSellerLoggedIn,
            role: user?.role,
            firstName: user?.firstName,
            lastName: user?.lastName,
            email: user?.email,
            shopName: shopName,
            planName: planName,
            isVerified: isVerified,
            daysLeft: daysLeft,
            isWithinSandbox: isWithinSandbox
          }
        },
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
  const [isOverDismissZone, setIsOverDismissZone] = useState(false);
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
  // Size-adjust launcher: mobile is smaller (46px) than PC (56px)
  const launcherSizePx = isMobile ? 46 : 56;

  // Dismiss zone is at bottom-center of the viewport
  const DISMISS_ZONE_SIZE = 64;
  const DISMISS_ZONE_RADIUS = 50; // proximity threshold in px

  const checkDismissZone = useCallback((clientX: number, clientY: number) => {
    if (!isMobile) return false;
    const zoneCenterX = window.innerWidth / 2;
    const zoneCenterY = window.innerHeight - 100; // 100px from bottom
    const dist = Math.hypot(clientX - zoneCenterX, clientY - zoneCenterY);
    return dist < DISMISS_ZONE_RADIUS;
  }, [isMobile]);

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
      if (isMobile && !isDragging) setIsDragging(true);
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
      // Check dismiss zone proximity
      if (isMobile) {
        setIsOverDismissZone(checkDismissZone(e.clientX, e.clientY));
      }
    },
    [launcherSizePx, isMobile, isDragging, checkDismissZone],
  );

  const onLauncherPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = dragInfo.current;
      dragInfo.current = null;
      setIsDragging(false);
      setIsOverDismissZone(false);
      if (!d) return;
      if (!d.moved) {
        // Treated as a tap → open chat
        setOpen(true);
        return;
      }
      // If dropped on dismiss zone → dismiss the widget
      if (isMobile && checkDismissZone(e.clientX, e.clientY)) {
        dismissChat();
        setPos(null); // reset position
        return;
      }
      // Persist final position
      try {
        sessionStorage.setItem(STORAGE_LAUNCHER_POS, JSON.stringify(pos));
      } catch {
        /* quota */
      }
    },
    [pos, isMobile, checkDismissZone, dismissChat],
  );

  return (
    <>
      {/* Custom style block containing beautiful robot, jewelry, and panel transitions */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes chat-shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          10%, 30%, 50%, 70%, 90% { transform: translate(-4px, 0) rotate(-3deg); }
          20%, 40%, 60%, 80% { transform: translate(4px, 0) rotate(3deg); }
        }
        .animate-shake {
          animation: chat-shake 0.5s ease-in-out;
        }
        @keyframes eye-blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.15); }
        }
        @keyframes arm-wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-40deg); }
          75% { transform: rotate(20deg); }
        }
        .animate-blink {
          animation: eye-blink 3s ease-in-out infinite;
        }
        .animate-wave {
          animation: arm-wave 0.75s ease-in-out infinite;
        }
        @keyframes bot-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes bot-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bot-spin {
          animation: bot-spin 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animate-bot-bounce {
          animation: bot-bounce 0.8s ease-in-out infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(217,119,6,0.3);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(217,119,6,0.5);
        }
        @keyframes panel-appear {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-panel-appear {
          animation: panel-appear 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes panel-appear-mobile {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-panel-appear-mobile {
          animation: panel-appear-mobile 0.32s cubic-bezier(0.32, 0.94, 0.6, 1) forwards;
        }
      `}} />
      {/* Mobile drag-to-dismiss zone — appears when dragging the launcher */}
      {isDragging && isMobile && (
        <div className="fixed inset-0 z-[59] pointer-events-none">
          <div
            className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 transition-all duration-200 ${
              isOverDismissZone ? "scale-125" : "scale-100"
            }`}
            style={{ bottom: "68px" }}
          >
            <div
              className={`h-16 w-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                isOverDismissZone
                  ? "bg-red-500 shadow-lg shadow-red-500/40"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              <X className={`h-7 w-7 transition-colors ${
                isOverDismissZone ? "text-white" : "text-gray-500 dark:text-gray-400"
              }`} />
            </div>
            <span className={`text-[10px] font-semibold transition-colors ${
              isOverDismissZone ? "text-red-500" : "text-gray-400"
            }`}>
              <T>Drop to hide</T>
            </span>
          </div>
        </div>
      )}

      {/* Launcher */}
      {!open && !isChatDismissed && (
        <div
          style={{
            position: "fixed",
            right: `${currentRight}px`,
            bottom: `${currentBottom}px`,
            zIndex: 60,
            touchAction: "none",
          }}
          className={`flex flex-col items-end gap-1.5 ${isChatShaking ? "animate-shake" : ""}`}
        >
          {bubbleVisible && !isDragging && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[11px] px-3 py-1.5 rounded-xl shadow-md whitespace-nowrap animate-bounce relative mb-1 shrink-0 font-semibold z-[61] border border-amber-400/30">
              {parseTextWithT(bubbleText)}
              <span className="absolute -bottom-1 right-4 h-0 w-0 border-l-[6px] border-r-[0px] border-t-[6px] border-l-transparent border-t-amber-500" />
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              onPointerDown={onLauncherPointerDown}
              onPointerMove={onLauncherPointerMove}
              onPointerUp={onLauncherPointerUp}
              onPointerCancel={onLauncherPointerUp}
              aria-label="Open Orivraa support chat (drag to reposition)"
              data-tour="support-bot"
              style={{
                width: `${launcherSizePx}px`,
                height: `${launcherSizePx}px`,
                opacity: isOverDismissZone ? 0.5 : 1,
              }}
              className={`rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 ${
                isDragging ? "scale-90" : "hover:scale-105 active:scale-95"
              }`}
              onMouseEnter={() => {
                setBubbleVisible(true);
                setIsExcited(true);
              }}
              onMouseLeave={() => {
                setBubbleVisible(false);
                setIsExcited(false);
              }}
            >
              {/* Cute Waving & Animated Welcoming Robot / Jewelry Face */}
              <div className="relative flex items-center justify-center w-full h-full p-1 select-none">
                <svg
                  viewBox="0 0 100 100"
                  className={`w-full h-full transition-transform duration-300 ${
                    isExcited ? "scale-110 -translate-y-0.5" : ""
                  } ${
                    currentAnimation === "spin" ? "animate-bot-spin" : ""
                  } ${
                    currentAnimation === "bounce" ? "animate-bot-bounce" : ""
                  }`}
                >
                  <defs>
                    {/* Glowing Friendly LED Eyes */}
                    <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="100%" stopColor="#0891b2" />
                    </radialGradient>
                    
                    {/* Soft Welcoming Gold / Champagne Head Gradient */}
                    <linearGradient id="goldMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFF8E7" />
                      <stop offset="35%" stopColor="#FFE082" />
                      <stop offset="70%" stopColor="#D4AF37" />
                      <stop offset="100%" stopColor="#B58F1A" />
                    </linearGradient>

                    {/* Cute Cheek Blush Gradient */}
                    <radialGradient id="blushGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#fda4af" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* 1. Default Robot Head */}
                  {botState === "default" && (
                    <>
                      {/* Antenna */}
                      <rect x="47" y="12" width="6" height="15" fill="#B58F1A" rx="2" />
                      {/* Glowing Antenna Tip */}
                      <circle
                        cx="50"
                        cy="10"
                        r="5.5"
                        className="fill-amber-300 animate-pulse"
                        style={{ animationDuration: "1s" }}
                      />

                      {/* Ears / Side Bolts */}
                      <rect x="16" y="44" width="6" height="14" fill="#B58F1A" rx="2" />
                      <rect x="78" y="44" width="6" height="14" fill="#B58F1A" rx="2" />

                      {/* Robot Head */}
                      <rect x="20" y="24" width="60" height="52" fill="url(#goldMetal)" rx="18" stroke="#fff" strokeWidth="2.5" />
                      
                      {/* Visor Screen */}
                      <rect x="26" y="31" width="48" height="38" fill="#1e293b" rx="12" />
                    </>
                  )}

                  {/* 2. Gold Ring */}
                  {botState === "ring" && (
                    <>
                      {/* Hoop of the Ring */}
                      <circle cx="50" cy="62" r="23" fill="none" stroke="url(#goldMetal)" strokeWidth="8" />
                      {/* Signet Face Plate */}
                      <circle cx="50" cy="46" r="23" fill="url(#goldMetal)" stroke="#fff" strokeWidth="2" />
                      {/* Diamond gem on top of ring */}
                      <polygon points="50,11 40,23 60,23" fill="#22d3ee" stroke="#fff" strokeWidth="1" />
                      <polygon points="50,11 45,23 55,23" fill="#e0f7fa" opacity="0.8" />
                      {/* Dark Visor screen on Signet Plate */}
                      <circle cx="50" cy="46" r="18" fill="#1e293b" />
                    </>
                  )}

                  {/* 3. Luxury Diamond */}
                  {botState === "diamond" && (
                    <>
                      {/* Outer Diamond Shape */}
                      <polygon points="50,15 80,35 68,78 32,78 20,35" fill="url(#goldMetal)" stroke="#fff" strokeWidth="2" />
                      {/* Diamond Facet lines for reflections */}
                      <line x1="50" y1="15" x2="50" y2="30" stroke="#fff" strokeWidth="1" opacity="0.6" />
                      <line x1="80" y1="35" x2="68" y2="40" stroke="#fff" strokeWidth="1" opacity="0.6" />
                      <line x1="20" y1="35" x2="32" y2="40" stroke="#fff" strokeWidth="1" opacity="0.6" />
                      <line x1="68" y1="78" x2="60" y2="70" stroke="#fff" strokeWidth="1" opacity="0.6" />
                      <line x1="32" y1="78" x2="40" y2="70" stroke="#fff" strokeWidth="1" opacity="0.6" />
                      {/* Diamond Visor screen */}
                      <polygon points="50,30 70,40 60,70 40,70 30,40" fill="#1e293b" />
                    </>
                  )}

                  {/* 4. Royal Crown */}
                  {botState === "crown" && (
                    <>
                      {/* Gold Crown */}
                      <path d="M15,72 L10,36 L35,52 L50,26 L65,52 L90,36 L85,72 Z" fill="url(#goldMetal)" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
                      {/* Royal gems on peak tips */}
                      <circle cx="10" cy="36" r="4" fill="#f43f5e" stroke="#fff" strokeWidth="0.8" />
                      <circle cx="50" cy="26" r="5" fill="#22d3ee" stroke="#fff" strokeWidth="0.8" />
                      <circle cx="90" cy="36" r="4" fill="#f43f5e" stroke="#fff" strokeWidth="0.8" />
                      {/* Crown Visor screen */}
                      <rect x="25" y="49" width="50" height="20" fill="#1e293b" rx="6" />
                    </>
                  )}

                  {/* 5. Gold Bar */}
                  {botState === "gold_bar" && (
                    <>
                      {/* Gold Bullion Shape */}
                      <polygon points="20,18 80,18 90,78 10,78" fill="url(#goldMetal)" stroke="#fff" strokeWidth="2" />
                      {/* Bevel lines */}
                      <polygon points="25,23 75,23 82,73 18,73" fill="none" stroke="#FFE082" strokeWidth="1.5" opacity="0.6" />
                      {/* Gold Bar Stamp */}
                      <text x="50" y="30" fill="#FFF8E7" fontSize="6.5" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">ORIVRAA 99.9%</text>
                      {/* Visor Screen */}
                      <rect x="24" y="36" width="52" height="34" fill="#1e293b" rx="8" />
                    </>
                  )}

                  {/* Dynamic Face Elements Overlay */}
                  {(() => {
                    const isCrown = botState === "crown";
                    const isRing = botState === "ring";
                    const eyeY = isCrown ? 55 : isRing ? 42 : 45;
                    const cheekY = isCrown ? 62 : isRing ? 51 : 56;
                    const cheekXOffset = isRing ? 6 : 0;
                    
                    // Render mouth path
                    let mouthPath = "";
                    if (isExcited) {
                      mouthPath = isCrown 
                        ? "M44 61 C 44 66, 56 66, 56 61" 
                        : isRing 
                        ? "M45 49 C 45 53, 55 53, 55 49" 
                        : "M44 58 C 44 65, 56 65, 56 58";
                    } else {
                      mouthPath = isCrown 
                        ? "M44 60 Q50 63 56 60" 
                        : isRing 
                        ? "M45 49 Q50 51 55 49" 
                        : "M44 57 Q50 61 56 57";
                    }

                    return (
                      <>
                        {/* Blush cheeks */}
                        <circle cx={34 + cheekXOffset} cy={cheekY} r="5" fill="url(#blushGlow)" />
                        <circle cx={66 - cheekXOffset} cy={cheekY} r="5" fill="url(#blushGlow)" />

                        {/* Blinking Glowing Eyes */}
                        <ellipse
                          cx={38 + (isRing ? 3 : 0)}
                          cy={eyeY}
                          rx={isExcited ? (isRing ? 5.5 : 7.5) : (isRing ? 4 : 5.5)}
                          ry={isExcited ? (isRing ? 5.5 : 7.5) : (isRing ? 4 : 5.5)}
                          fill="url(#eyeGlow)"
                          className="origin-center animate-blink"
                          style={{ transformOrigin: `${38 + (isRing ? 3 : 0)}px ${eyeY}px` }}
                        />
                        <ellipse
                          cx={62 - (isRing ? 3 : 0)}
                          cy={eyeY}
                          rx={isExcited ? (isRing ? 5.5 : 7.5) : (isRing ? 4 : 5.5)}
                          ry={isExcited ? (isRing ? 5.5 : 7.5) : (isRing ? 4 : 5.5)}
                          fill="url(#eyeGlow)"
                          className="origin-center animate-blink"
                          style={{ transformOrigin: `${62 - (isRing ? 3 : 0)}px ${eyeY}px` }}
                        />

                        {/* Cute Mouth */}
                        {isExcited ? (
                          <path d={mouthPath} fill="#fda4af" stroke="#fff" strokeWidth="1" />
                        ) : (
                          <path d={mouthPath} stroke="#22d3ee" strokeWidth="2" fill="none" strokeLinecap="round" />
                        )}
                      </>
                    );
                  })()}
                </svg>

                {/* Overlaid Waving Robot Arm */}
                {isWaving && (
                  <div
                    className="absolute -right-1 -top-1 w-[22px] h-[26px] origin-bottom-left animate-wave pointer-events-none"
                    style={{
                      transformOrigin: "bottom left",
                    }}
                  >
                    <svg viewBox="0 0 20 25" className="w-full h-full">
                      {/* Arm segment */}
                      <path d="M2 20 C 6 13, 11 10, 15 4" stroke="#FFE082" strokeWidth="4.5" strokeLinecap="round" fill="none" strokeLinejoin="round" />
                      {/* Hand */}
                      <circle cx="15" cy="4" r="3.5" fill="#FFF8E7" stroke="#D4AF37" strokeWidth="1.5" />
                    </svg>
                  </div>
                )}
              </div>

              {!isDragging && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
              )}
            </button>
            {/* Dismiss button — desktop only (mobile uses drag-to-dismiss) */}
            {!isMobile && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissChat();
                }}
                className="absolute -top-0.5 -left-0.5 h-4 w-4 bg-white text-gray-500 border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 shadow-sm z-10"
                title="Hide chat widget"
                aria-label="Hide chat widget"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Panel */}
      {open && (
        <div
          style={isMobile ? undefined : { right: `${currentRight}px`, bottom: `${currentBottom}px` }}
          className={isMobile
            ? "fixed inset-0 z-[60] bg-gradient-to-b from-amber-50/10 via-white to-amber-50/5 dark:from-amber-950/5 dark:via-gray-900 dark:to-gray-950 flex flex-col animate-panel-appear-mobile"
            : `fixed z-[60] w-[380px] bg-white dark:bg-gray-900 border border-amber-200/65 dark:border-amber-900/45 rounded-2xl shadow-[0_15px_60px_rgba(212,175,55,0.18)] dark:shadow-[0_15px_60px_rgba(212,175,55,0.06)] flex flex-col overflow-hidden h-[560px] max-h-[calc(100vh-3rem)] origin-bottom-right animate-panel-appear`
          }
        >
          {/* Header */}
          <div className={`flex items-center gap-3 px-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white ${isMobile ? "py-3 pt-[max(0.75rem,env(safe-area-inset-top))]" : "py-3"}`}>
            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 p-1">
              {/* Cute Waving Mini Mascot in the Header */}
              <svg viewBox="0 0 100 100" className="w-full h-full select-none">
                <defs>
                  <radialGradient id="eyeGlowHeader" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#0891b2" />
                  </radialGradient>
                  <linearGradient id="goldMetalHeader" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFF8E7" />
                    <stop offset="50%" stopColor="#FFE082" />
                    <stop offset="100%" stopColor="#D4AF37" />
                  </linearGradient>
                </defs>
                <rect x="20" y="24" width="60" height="52" fill="url(#goldMetalHeader)" rx="18" stroke="#fff" strokeWidth="2.5" />
                <rect x="26" y="31" width="48" height="38" fill="#1e293b" rx="12" />
                <ellipse cx="38" cy="45" rx="5.5" ry="5.5" fill="url(#eyeGlowHeader)" className="animate-blink" style={{ transformOrigin: "38px 45px" }} />
                <ellipse cx="62" cy="45" rx="5.5" ry="5.5" fill="url(#eyeGlowHeader)" className="animate-blink" style={{ transformOrigin: "62px 45px" }} />
                <path d="M44 57 Q50 61 56 57" stroke="#22d3ee" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
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
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gradient-to-b from-amber-50/15 via-white to-amber-50/10 dark:from-amber-950/5 dark:via-gray-950 dark:to-amber-950/5 custom-scrollbar">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed transition-all ${
                    m.from === "user"
                      ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-br-sm shadow-md shadow-amber-500/10"
                      : "bg-white/95 dark:bg-gray-800/95 text-gray-800 dark:text-gray-100 border border-amber-100/50 dark:border-amber-950/30 rounded-bl-sm shadow-[0_2px_8px_rgba(0,0,0,0.02)] backdrop-blur-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{renderMessageContent(m.text)}</p>
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
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 transition-colors shadow-sm"
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
                            <T>{c.label}</T>
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
                <div className="bg-white/95 dark:bg-gray-800/95 border border-amber-100/50 dark:border-amber-950/30 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {showQuickAsks && !isTyping && (
              <div className="pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600/80 dark:text-amber-400/80 mb-2 px-1">
                  <T>Try asking</T>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ASKS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void send(q)}
                      className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-amber-100/60 dark:border-amber-950/40 text-gray-700 dark:text-gray-200 hover:border-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/15 transition-all shadow-[0_2px_4px_rgba(0,0,0,0.01)] active:scale-95"
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
            className="border-t border-amber-100/50 dark:border-amber-950/40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-3 py-2.5 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about Orivraa..."
              className="flex-1 text-sm bg-amber-50/20 dark:bg-amber-950/10 border border-amber-100/30 dark:border-amber-950/20 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 rounded-full px-4 py-2 outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
              maxLength={500}
              disabled={isTyping}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isTyping}
              className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white disabled:opacity-40 shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className={`text-[10px] text-center text-gray-400 dark:text-gray-500 ${isMobile ? "pb-[max(0.375rem,env(safe-area-inset-bottom))]" : "pb-1.5"}`}>
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
