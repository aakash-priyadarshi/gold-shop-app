"use client";

import { motion } from "framer-motion";
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

  return isLoading || !minTimeElapsed;
}

// ─── SONAR RINGS CONFIG ─────────────────────────────────────────
const RINGS = [0, 1, 2, 3, 4];
const BRAND_LETTERS = ["O", "r", "i", "v", "r", "a", "a"];
const GOLD_SPLIT = 3; // "Ori" white, "vraa" gold

// ─── COMPONENT ──────────────────────────────────────────────────
export default function OrivraaLoader() {
  const [phase, setPhase] = useState<"rings" | "brand" | "tagline">("rings");

  useEffect(() => {
    // Phase 1: rings are already playing on mount
    // Phase 2: brand appears at 0.6s
    const t1 = setTimeout(() => setPhase("brand"), 600);
    // Phase 3: tagline fades in at 1.5s
    const t2 = setTimeout(() => setPhase("tagline"), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0B0C10] overflow-hidden select-none">
      {/* ── SONAR RINGS — expand outward continuously ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {RINGS.map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border"
            style={{
              borderColor: "rgba(212, 175, 55, 0.25)",
              width: 80,
              height: 80,
            }}
            animate={{
              scale: [1, 8],
              opacity: [0.6, 0],
            }}
            transition={{
              duration: 2.8,
              delay: i * 0.55,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* ── CENTRAL GLOW — always visible warm pulse ── */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 160,
          height: 160,
          background:
            "radial-gradient(circle, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 40%, transparent 70%)",
        }}
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* ── GOLD "O" ICON — appears immediately, pulses ── */}
      <motion.div
        className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #D4AF37 0%, #B8941F 50%, #96780A 100%)",
          boxShadow: "0 0 40px rgba(212,175,55,0.4), 0 0 80px rgba(212,175,55,0.15)",
        }}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <span className="text-4xl font-bold text-white leading-none" style={{ fontFamily: "serif" }}>
          O
        </span>

        {/* Shimmer sweep across icon */}
        <motion.div
          className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.35) 48%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.35) 52%, transparent 70%)",
            }}
            animate={{ x: ["-150%", "150%"] }}
            transition={{
              duration: 1,
              delay: 1.8,
              repeat: Infinity,
              repeatDelay: 2.5,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      </motion.div>

      {/* ── BRAND NAME — letter by letter reveal ── */}
      <div className="mt-8 flex items-baseline z-10 overflow-hidden">
        {BRAND_LETTERS.map((letter, i) => (
          <motion.span
            key={i}
            className="text-3xl sm:text-4xl font-bold tracking-wide"
            style={{
              fontFamily: "serif",
              color: i < GOLD_SPLIT ? "#ffffff" : "#D4AF37",
            }}
            initial={{ y: 30, opacity: 0 }}
            animate={
              phase === "rings"
                ? { y: 30, opacity: 0 }
                : { y: 0, opacity: 1 }
            }
            transition={{
              duration: 0.35,
              delay: i * 0.07,
              ease: "easeOut",
            }}
          >
            {letter}
          </motion.span>
        ))}
      </div>

      {/* ── TAGLINE ── */}
      <motion.span
        className="mt-3 text-[10px] sm:text-xs uppercase tracking-[0.35em] z-10"
        style={{ color: "rgba(212, 175, 55, 0.7)" }}
        initial={{ opacity: 0, y: 8 }}
        animate={
          phase === "tagline"
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 8 }
        }
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        Premium Jewellery Marketplace
      </motion.span>

      {/* ── PROGRESS BAR — thin gold line filling left to right ── */}
      <div className="mt-6 w-40 sm:w-48 h-[2px] rounded-full overflow-hidden z-10 bg-white/5">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, #B8941F, #D4AF37, #FFD700)",
          }}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 2.8, ease: "easeInOut" }}
        />
      </div>

      {/* ── FLOATING DOTS — subtle ambient particles ── */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const r = 220 + (i % 3) * 40;
        return (
          <motion.div
            key={`dot-${i}`}
            className="absolute w-1 h-1 rounded-full pointer-events-none"
            style={{
              background: "#D4AF37",
              boxShadow: "0 0 4px rgba(212,175,55,0.6)",
            }}
            animate={{
              x: [Math.cos(angle) * r, Math.cos(angle + 0.5) * r * 0.6, Math.cos(angle) * r],
              y: [Math.sin(angle) * r, Math.sin(angle + 0.5) * r * 0.6, Math.sin(angle) * r],
              opacity: [0.3, 0.7, 0.3],
              scale: [0.8, 1.3, 0.8],
            }}
            transition={{
              duration: 3 + (i % 3),
              delay: i * 0.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
}
