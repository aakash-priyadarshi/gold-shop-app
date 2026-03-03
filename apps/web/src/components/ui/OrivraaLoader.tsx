"use client";

import { useEffect, useState } from "react";

// ─── MINIMUM DISPLAY TIME HOOK ─────────────────────────────────
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

// ─── PURE CSS LOADER — zero framer-motion dependency ────────────
// Every animation uses CSS @keyframes. Guaranteed to work on every
// browser, no SSR hydration issues, no initial→animate failures.
export default function OrivraaLoader() {
  return (
    <>
      {/* Inject all keyframes and animation styles */}
      <style dangerouslySetInnerHTML={{ __html: LOADER_CSS }} />

      <div className="orivraa-loader">
        {/* Sonar rings */}
        <div className="orivraa-rings">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="orivraa-ring"
              style={{ animationDelay: `${i * 0.55}s` }}
            />
          ))}
        </div>

        {/* Central warm glow */}
        <div className="orivraa-glow" />

        {/* Gold "O" icon */}
        <div className="orivraa-icon">
          <span>O</span>
          <div className="orivraa-shimmer" />
        </div>

        {/* Brand name — letter by letter */}
        <div className="orivraa-brand">
          {"Orivraa".split("").map((letter, i) => (
            <span
              key={i}
              className={i < 3 ? "orivraa-letter-white" : "orivraa-letter-gold"}
              style={{ animationDelay: `${0.6 + i * 0.07}s` }}
            >
              {letter}
            </span>
          ))}
        </div>

        {/* Tagline */}
        <div className="orivraa-tagline">Premium Jewellery Marketplace</div>

        {/* Progress bar */}
        <div className="orivraa-progress-track">
          <div className="orivraa-progress-fill" />
        </div>

        {/* Floating ambient dots */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={`dot-${i}`}
            className="orivraa-dot"
            style={{
              // Position them in a circle
              left: `calc(50% + ${Math.round(Math.cos((i / 8) * Math.PI * 2) * 160)}px)`,
              top: `calc(50% + ${Math.round(Math.sin((i / 8) * Math.PI * 2) * 160)}px)`,
              animationDelay: `${i * 0.25}s`,
              animationDuration: `${3 + (i % 3)}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}

// ─── ALL CSS — injected via <style> tag ─────────────────────────
const LOADER_CSS = `
/* Container */
.orivraa-loader {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0B0C10;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

/* ── SONAR RINGS ── */
.orivraa-rings {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.orivraa-ring {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 1px solid rgba(212, 175, 55, 0.3);
  animation: orivraa-sonar 2.8s ease-out infinite;
}
@keyframes orivraa-sonar {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(8); opacity: 0; }
}

/* ── CENTRAL GLOW ── */
.orivraa-glow {
  position: absolute;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 40%, transparent 70%);
  animation: orivraa-pulse 2s ease-in-out infinite;
  pointer-events: none;
}
@keyframes orivraa-pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.4); opacity: 1; }
}

/* ── GOLD "O" ICON ── */
.orivraa-icon {
  position: relative;
  z-index: 10;
  width: 80px;
  height: 80px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #D4AF37 0%, #B8941F 50%, #96780A 100%);
  box-shadow: 0 0 40px rgba(212,175,55,0.4), 0 0 80px rgba(212,175,55,0.15);
  animation: orivraa-icon-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  overflow: hidden;
}
.orivraa-icon > span {
  font-size: 2.5rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
  font-family: serif;
}
@keyframes orivraa-icon-in {
  0% { transform: scale(0) rotate(-180deg); opacity: 0; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

/* Shimmer sweep on icon */
.orivraa-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.35) 48%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.35) 52%, transparent 70%);
  animation: orivraa-shimmer-sweep 1s ease-in-out 1.8s infinite;
  animation-fill-mode: backwards;
}
@keyframes orivraa-shimmer-sweep {
  0% { transform: translateX(-150%); }
  50% { transform: translateX(150%); }
  50.01%, 100% { transform: translateX(-150%); }
}

/* ── BRAND LETTERS ── */
.orivraa-brand {
  margin-top: 32px;
  display: flex;
  align-items: baseline;
  z-index: 10;
}
.orivraa-letter-white,
.orivraa-letter-gold {
  font-size: 1.875rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  font-family: serif;
  opacity: 0;
  transform: translateY(20px);
  animation: orivraa-letter-in 0.35s ease-out forwards;
}
@media (min-width: 640px) {
  .orivraa-letter-white,
  .orivraa-letter-gold {
    font-size: 2.25rem;
  }
}
.orivraa-letter-white { color: #ffffff; }
.orivraa-letter-gold { color: #D4AF37; }

@keyframes orivraa-letter-in {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* ── TAGLINE ── */
.orivraa-tagline {
  margin-top: 12px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.35em;
  color: rgba(212, 175, 55, 0.7);
  z-index: 10;
  opacity: 0;
  transform: translateY(8px);
  animation: orivraa-fade-up 0.5s ease-out 1.5s forwards;
}
@media (min-width: 640px) {
  .orivraa-tagline { font-size: 12px; }
}
@keyframes orivraa-fade-up {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* ── PROGRESS BAR ── */
.orivraa-progress-track {
  margin-top: 24px;
  width: 160px;
  height: 2px;
  border-radius: 9999px;
  overflow: hidden;
  z-index: 10;
  background: rgba(255,255,255,0.03);
}
@media (min-width: 640px) {
  .orivraa-progress-track { width: 192px; }
}
.orivraa-progress-fill {
  height: 100%;
  border-radius: 9999px;
  background: linear-gradient(90deg, #B8941F, #D4AF37, #FFD700);
  width: 0%;
  animation: orivraa-fill 2.8s ease-in-out forwards;
}
@keyframes orivraa-fill {
  0% { width: 0%; }
  100% { width: 100%; }
}

/* ── FLOATING DOTS ── */
.orivraa-dot {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #D4AF37;
  box-shadow: 0 0 4px rgba(212,175,55,0.6);
  pointer-events: none;
  animation: orivraa-float 3s ease-in-out infinite;
}
@keyframes orivraa-float {
  0%, 100% { opacity: 0.3; transform: scale(0.8) translate(0, 0); }
  50% { opacity: 0.7; transform: scale(1.3) translate(-10px, -10px); }
}
`;
