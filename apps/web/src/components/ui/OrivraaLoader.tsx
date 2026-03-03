"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

// ─── MINIMUM DISPLAY TIME HOOK ─────────────────────────────────
// Ensures the loader stays visible for at least `minMs` from mount.
// If `isLoading` was false at mount, returns false immediately (no loader flash).
// If `isLoading` was true at mount, holds true for at least `minMs` even after
// the actual loading finishes.
export function useMinLoadingTime(isLoading: boolean, minMs = 3000): boolean {
  const [initiallyLoading] = useState(() => isLoading);
  const [minTimeElapsed, setMinTimeElapsed] = useState(!isLoading);

  useEffect(() => {
    if (!initiallyLoading) return;
    const timer = setTimeout(() => setMinTimeElapsed(true), minMs);
    return () => clearTimeout(timer);
  }, [initiallyLoading, minMs]);

  // Still actually loading, or minimum display time hasn't passed yet
  return isLoading || !minTimeElapsed;
}

// ─── DIAMOND SVG — outline + facets (viewBox 0 0 24 24) ────────
const DIAMOND_OUTLINE =
  "M6.23607 1C5.09976 1 4.06097 1.64201 3.55279 2.65836L1.14806 7.46782C0.647975 8.46799 0.745665 9.66329 1.40152 10.569L9.57018 21.8495C10.7679 23.5035 13.2321 23.5035 14.4298 21.8495L22.5985 10.569C23.2543 9.66329 23.352 8.468 22.852 7.46782L20.4472 2.65836C19.939 1.64201 18.9003 1 17.7639 1H6.23607Z";

const DIAMOND_FACETS = [
  // Top-left crown facet
  "M5.34165 3.55279C5.51104 3.214 5.8573 3 6.23607 3H8.67428L7.24571 8H3.11804L5.34165 3.55279Z",
  // Top-center table
  "M9.32574 8L10.7543 3H13.2457L14.6743 8H9.32574Z",
  // Centre pavilion (main gem face)
  "M14.646 10H9.35397L12 18.5996L14.646 10Z",
  // Right pavilion
  "M13.929 19.1312L16.7386 10H20.5412L13.929 19.1312Z",
  // Top-right crown facet
  "M16.7543 8L15.3257 3H17.7639C18.1427 3 18.489 3.214 18.6584 3.55279L20.882 8H16.7543Z",
  // Left pavilion
  "M3.4588 10H7.26143L10.071 19.1312L3.4588 10Z",
  // Horizontal girdle line
  "M1.14806 7.46782 L3.11804 8 H7.24571 H9.32574 H14.6743 H16.7543 H20.882 L22.852 7.46782",
];

// ─── MARKETS ────────────────────────────────────────────────────
const MARKETS = ["🇮🇳 India", "🇬🇧 UK", "🇦🇪 UAE", "🇳🇵 Nepal"];

// ─── DETERMINISTIC PARTICLES (SSR safe) ─────────────────────────
const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const radius = 380 + (i % 3) * 70;
  return {
    id: i,
    startX: Math.cos(angle) * radius,
    startY: Math.sin(angle) * radius,
    duration: 1.8 + (i % 4) * 0.3,
    delay: (i % 5) * 0.12,
    size: 2 + (i % 3),
  };
});

// ─── COMPONENT ──────────────────────────────────────────────────
export default function OrivraaLoader() {
  const [isAssembled, setIsAssembled] = useState(false);
  const [activeMarket, setActiveMarket] = useState(0);

  // Main price counter — flickers from 0 to ₹75,000
  const count = useMotionValue(0);
  const displayValue = useTransform(count, (latest) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(latest),
  );

  useEffect(() => {
    const controls = animate(count, 75000, {
      duration: 2.5,
      ease: "easeInOut",
    });

    // Trigger assembled glow + shimmer after wireframe draws
    const timer = setTimeout(() => setIsAssembled(true), 2200);

    return () => {
      controls.stop();
      clearTimeout(timer);
    };
  }, [count]);

  // Cycle markets every 400ms
  useEffect(() => {
    const iv = setInterval(
      () => setActiveMarket((p) => (p + 1) % MARKETS.length),
      400,
    );
    return () => clearInterval(iv);
  }, []);

  return (
    // ALWAYS dark background — no white mode for the loader
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0B0C10] overflow-hidden">
      {/* ── BACKGROUND DATA PARTICLES — fly from edges to center ── */}
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: "radial-gradient(circle, #D4AF37 40%, transparent 70%)",
            boxShadow: "0 0 6px 2px rgba(212,175,55,0.4)",
          }}
          initial={{ x: p.startX, y: p.startY, opacity: 0.8 }}
          animate={{
            x: [p.startX, 0],
            y: [p.startY, 0],
            opacity: [0.8, 0],
            scale: [1, 0.3],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            repeatDelay: 0.5,
            ease: "easeIn",
          }}
        />
      ))}

      {/* ── AMBIENT GLOW (visible from frame 1) ── */}
      <motion.div
        className="absolute w-80 h-80 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 60%)",
        }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── THE DIAMOND WIREFRAME — centre of the screen ── */}
      <div className="relative w-52 h-52 sm:w-64 sm:h-64 flex items-center justify-center z-10">
        <motion.svg
          viewBox="-1 -1 26 25"
          className="w-full h-full"
          fill="none"
          style={{
            filter: isAssembled
              ? "drop-shadow(0 0 30px rgba(212,175,55,0.6))"
              : "drop-shadow(0 0 10px rgba(212,175,55,0.25))",
            transition: "filter 0.6s ease",
          }}
        >
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="50%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#B8941F" />
            </linearGradient>
          </defs>

          {/* Diamond outline — draws first */}
          <motion.path
            d={DIAMOND_OUTLINE}
            stroke="url(#goldGrad)"
            strokeWidth={0.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 1 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
          />

          {/* Facets — staggered after outline */}
          {DIAMOND_FACETS.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              stroke="url(#goldGrad)"
              strokeWidth={0.3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0.8 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: 1.0,
                delay: 0.4 + i * 0.12,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.svg>

        {/* Shimmer sweep across diamond after assembled */}
        {isAssembled && (
          <motion.div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 45%, rgba(212,175,55,0.35) 50%, rgba(255,255,255,0.2) 55%, transparent 70%)",
              }}
              initial={{ x: "-120%" }}
              animate={{ x: "120%" }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </motion.div>
        )}

        {/* Pulse glow behind diamond */}
        <motion.div
          className="absolute inset-0 -z-10 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 55%)",
          }}
          animate={{ scale: [0.9, 1.2, 0.9], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* ── FLICKERING PRICE COUNTER ── */}
      <div className="mt-8 text-center z-10">
        <motion.h2 className="text-4xl sm:text-5xl font-serif text-white tracking-tighter tabular-nums">
          {displayValue}
        </motion.h2>
      </div>

      {/* ── STATUS LABELS & MARKETS ── */}
      <motion.div
        className="mt-4 flex flex-col items-center z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <span
          className="text-[10px] uppercase tracking-[0.3em] font-bold"
          style={{ color: "#D4AF37" }}
        >
          Smart Quote Construction
        </span>

        {/* Market labels — cycling highlight */}
        <div className="flex gap-3 mt-2">
          {MARKETS.map((m, i) => (
            <motion.span
              key={m}
              className="text-[9px] tracking-wider"
              style={{ color: activeMarket === i ? "#D4AF37" : "#555" }}
              animate={{
                opacity: activeMarket === i ? 1 : 0.2,
                scale: activeMarket === i ? 1.15 : 0.9,
              }}
              transition={{ duration: 0.2 }}
            >
              {m}
            </motion.span>
          ))}
        </div>

        {/* Flickering status tags */}
        <div className="flex gap-4 mt-3 text-[8px] uppercase tracking-widest text-gray-500">
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
            Orivraa Escrow
          </motion.span>
        </div>
      </motion.div>

      {/* ── BOTTOM BRAND ── */}
      <div className="absolute bottom-5 text-center z-10">
        <span className="text-[9px] tracking-[0.2em] uppercase text-gray-700">
          Orivraa · Premium Jewellery Marketplace
        </span>
      </div>
    </div>
  );
}
