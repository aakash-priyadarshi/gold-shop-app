"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// ─── PENDANT SVG PATHS (main jewellery wireframe) ───────────────
const PENDANT_PATHS = [
  // Chain / top connector
  "M251.71 145.856v38.904L114.07 255.27",
  "M251.71 184.76l138.637 70.51",
  // Outer hexagonal body
  "M114.07 255.27v160.064l138.284 80.053 138.283-80.053V255.27",
  // Inner hex frame
  "M252.46 278.272l72.256 42.085v84.316L252.46 446.76l-72.256-42.086v-84.314z",
  // Inner facet
  "M252.46 296.602l-56.883 98.15v.724l56.566 32.977L309 368.38v-66.085z",
  // Bottom facets
  "M333.493 393.99l28.414 16.38-99.63 57.677v-32.574z",
  "M171.723 394.365l71.864 41.86v32.494l-100.21-58.013z",
];

// ─── DATA FEED LABELS ───────────────────────────────────────────
const PRICE_FEEDS = [
  { label: "Gold 24K", target: 72450, prefix: "₹" },
  { label: "Silver", target: 895, prefix: "₹" },
  { label: "GST", target: 3, prefix: "", suffix: "%" },
  { label: "Making", target: 8, prefix: "", suffix: "%" },
];

const MARKETS = ["🇮🇳 India", "🇬🇧 UK", "🇦🇪 UAE", "🇳🇵 Nepal"];

// ─── DETERMINISTIC PARTICLES (no random — SSR safe) ─────────────
const PARTICLES = Array.from({ length: 20 }, (_, i) => {
  const angle = (i / 20) * Math.PI * 2;
  const radius = 350 + (i % 3) * 80;
  return {
    id: i,
    startX: Math.cos(angle) * radius,
    startY: Math.sin(angle) * radius,
    // Stagger: first particles arrive fastest
    duration: 0.6 + (i % 5) * 0.15,
    delay: (i % 4) * 0.05,
    size: 2 + (i % 3),
  };
});

// ─── COMPONENT ──────────────────────────────────────────────────
export default function OrivraaLoader() {
  const [activeMarket, setActiveMarket] = useState(0);
  const shimmerRef = useRef(false);
  const [showShimmer, setShowShimmer] = useState(false);

  // Final quote counter
  const quoteValue = useMotionValue(0);
  const displayQuote = useTransform(quoteValue, (v) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(v),
  );

  // Individual price feed counters
  const goldPrice = useMotionValue(0);
  const silverPrice = useMotionValue(0);
  const gstVal = useMotionValue(0);
  const makingVal = useMotionValue(0);

  const displayGold = useTransform(goldPrice, (v) =>
    v > 0 ? `₹${Math.round(v).toLocaleString("en-IN")}` : "—",
  );
  const displaySilver = useTransform(silverPrice, (v) =>
    v > 0 ? `₹${Math.round(v).toLocaleString("en-IN")}` : "—",
  );
  const displayGst = useTransform(gstVal, (v) =>
    v > 0 ? `${v.toFixed(1)}%` : "—",
  );
  const displayMaking = useTransform(makingVal, (v) =>
    v > 0 ? `${v.toFixed(1)}%` : "—",
  );

  useEffect(() => {
    // All counters start immediately — no delays
    const c1 = animate(goldPrice, 72450, { duration: 1.8, ease: "easeOut" });
    const c2 = animate(silverPrice, 895, { duration: 1.5, ease: "easeOut" });
    const c3 = animate(gstVal, 3, { duration: 1.2, ease: "easeOut" });
    const c4 = animate(makingVal, 8, { duration: 1.4, ease: "easeOut" });
    const c5 = animate(quoteValue, 75000, { duration: 2.2, ease: "easeOut" });

    // Shimmer sweep after 1.5s
    const shimmerTimer = setTimeout(() => {
      if (!shimmerRef.current) {
        shimmerRef.current = true;
        setShowShimmer(true);
      }
    }, 1500);

    return () => {
      c1.stop();
      c2.stop();
      c3.stop();
      c4.stop();
      c5.stop();
      clearTimeout(shimmerTimer);
    };
  }, [goldPrice, silverPrice, gstVal, makingVal, quoteValue]);

  // Cycle markets fast
  useEffect(() => {
    const iv = setInterval(
      () => setActiveMarket((p) => (p + 1) % MARKETS.length),
      400,
    );
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-[#0B0C10] overflow-hidden">
      {/* ── Data particles: fly from edges to center immediately ── */}
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: "radial-gradient(circle, #D4AF37, transparent 70%)",
            boxShadow: "0 0 8px 2px rgba(212,175,55,0.5)",
          }}
          initial={{ x: p.startX, y: p.startY, opacity: 0.9 }}
          animate={{
            x: [p.startX, 0],
            y: [p.startY, 0],
            opacity: [0.9, 0],
            scale: [1, 0.2],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            repeatDelay: 0.3,
            ease: "easeIn",
          }}
        />
      ))}

      {/* ── Ambient gold glow (visible from frame 1) ── */}
      <motion.div
        className="absolute w-72 h-72 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 65%)",
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── Main content: SVG left + Data right ── */}
      <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-10 z-10">
        {/* ── Pendant wireframe ── */}
        <div className="relative w-40 h-40 sm:w-52 sm:h-52 flex-shrink-0">
          <motion.svg
            viewBox="60 120 400 380"
            fill="none"
            className="w-full h-full"
            style={{
              filter: "drop-shadow(0 0 12px rgba(212,175,55,0.35))",
            }}
          >
            <defs>
              <linearGradient
                id="pendantGold"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#FFD133" />
                <stop offset="50%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#B8941F" />
              </linearGradient>
            </defs>
            {PENDANT_PATHS.map((d, i) => (
              <motion.path
                key={i}
                d={d}
                stroke="url(#pendantGold)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0, opacity: 1 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 1.2,
                  delay: i * 0.1,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.svg>

          {/* Shimmer sweep across pendant */}
          {showShimmer && (
            <motion.div
              className="absolute inset-0 pointer-events-none overflow-hidden rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 45%, rgba(212,175,55,0.3) 50%, rgba(255,255,255,0.25) 55%, transparent 70%)",
                }}
                initial={{ x: "-120%" }}
                animate={{ x: "120%" }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
            </motion.div>
          )}

          {/* Glow pulse behind pendant */}
          <motion.div
            className="absolute inset-0 -z-10 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 60%)",
            }}
            animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* ── Data feed panel ── */}
        <div className="flex flex-col gap-3 min-w-[180px]">
          {/* Live price feeds */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Gold 24K
              </span>
              <motion.span className="text-sm font-mono font-semibold text-gold-500 tabular-nums">
                {displayGold}
              </motion.span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Silver
              </span>
              <motion.span className="text-sm font-mono font-semibold text-gray-300 dark:text-gray-400 tabular-nums">
                {displaySilver}
              </motion.span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500">
                GST
              </span>
              <motion.span className="text-sm font-mono text-gray-400 dark:text-gray-500 tabular-nums">
                {displayGst}
              </motion.span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Making
              </span>
              <motion.span className="text-sm font-mono text-gray-400 dark:text-gray-500 tabular-nums">
                {displayMaking}
              </motion.span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />

          {/* Final quote */}
          <div className="text-center sm:text-left">
            <motion.div
              className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-white tabular-nums"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
            >
              {displayQuote}
            </motion.div>
            <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-gold-500">
              Smart Quote
            </span>
          </div>

          {/* Market cycling */}
          <div className="flex items-center gap-2 flex-wrap">
            {MARKETS.map((m, i) => (
              <motion.span
                key={m}
                className="text-[9px] tracking-wider text-gold-600 dark:text-gold-400"
                animate={{
                  opacity: activeMarket === i ? 1 : 0.15,
                  scale: activeMarket === i ? 1.1 : 0.9,
                }}
                transition={{ duration: 0.2 }}
              >
                {m}
              </motion.span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom brand ── */}
      <div className="absolute bottom-5 flex flex-col items-center gap-1">
        <div className="flex gap-4 text-[8px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600">
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            Live Metal Rates
          </motion.span>
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
          >
            Tax Verified
          </motion.span>
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
          >
            Escrow Secured
          </motion.span>
        </div>
        <span className="text-[9px] tracking-[0.2em] uppercase text-gray-300 dark:text-gray-700">
          Orivraa &middot; Premium Jewellery Marketplace
        </span>
      </div>
    </div>
  );
}
