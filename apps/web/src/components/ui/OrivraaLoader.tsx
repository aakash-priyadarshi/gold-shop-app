"use client";

import { useEffect, useState } from "react";

// ─── INDEPENDENT MODULE FLAGS ───────────────────────────────────
// Each resets on hard page load / reload (JS re-executes).
// Each persists during SPA navigation (same JS context).
// They are SEPARATE so root overlay and page-level hooks
// don't race against each other.
let _overlayPlayed = false;   // for InitialLoadScreen
let _hookLoaderPlayed = false; // for useMinLoadingTime

// Called by InitialLoadScreen. Returns true once per page load.
export function claimInitialAnimation(): boolean {
  if (_overlayPlayed) return false;
  _overlayPlayed = true;
  return true;
}

// ─── MINIMUM DISPLAY TIME HOOK ─────────────────────────────────
// Uses its OWN flag (_hookLoaderPlayed) — independent of the
// root overlay. Both play on first load (the overlay covers the
// page-level loader visually). On SPA navigation both skip.
export function useMinLoadingTime(isLoading: boolean, minMs = 4000): boolean {
  const [isFirstLoad] = useState(() => {
    if (_hookLoaderPlayed) return false;
    _hookLoaderPlayed = true;
    return true;
  });
  const [minTimeElapsed, setMinTimeElapsed] = useState(!isFirstLoad);

  useEffect(() => {
    if (!isFirstLoad) return;
    const timer = setTimeout(() => setMinTimeElapsed(true), minMs);
    return () => clearTimeout(timer);
  }, [isFirstLoad, minMs]);

  // SPA navigation: skip loader entirely
  if (!isFirstLoad) return false;

  // First load: hold until BOTH the animation finishes AND real loading is done
  return !minTimeElapsed || isLoading;
}

// ─── SVG PATH DATA ─────────────────────────────────────────────
// Diamond facets (viewBox 0 0 24 24) — staggered wireframe draw
const DIAMOND_FACETS = [
  // Outer shell
  "M6.236 1C5.1 1 4.06 1.642 3.553 2.658L1.148 7.468A3 3 0 001.402 10.569L9.57 21.85c1.198 1.653 3.662 1.653 4.86 0L22.598 10.57A3 3 0 0022.852 7.468L20.447 2.658C19.94 1.642 18.9 1 17.764 1H6.236Z",
  // Top-left facet
  "M5.342 3.553C5.511 3.214 5.857 3 6.236 3H8.674L7.246 8H3.118L5.342 3.553Z",
  // Top-center facet
  "M9.326 8L10.754 3H13.246L14.674 8H9.326Z",
  // Center facet (heart of diamond)
  "M14.646 10H9.354L12 18.6L14.646 10Z",
  // Right body
  "M13.929 19.131L16.739 10H20.541L13.929 19.131Z",
  // Top-right facet
  "M16.754 8L15.326 3H17.764C18.143 3 18.489 3.214 18.658 3.553L20.882 8H16.754Z",
  // Left body
  "M3.459 10H7.261L10.071 19.131L3.459 10Z",
];

// Pendant wireframe (viewBox 0 0 512 512) — subtle background decoration
const PENDANT_PATH =
  "M29.018 18.875c-2.63 10.297.047 21.72 8.044 29.72 10.035 10.034 25.46 11.696 37.29 5 5.914 5.346 11.686 10.373 17.357 15.12-.338 1.818-.522 3.687-.522 5.597 0 17.024 14.008 31 31.03 31 4.917 0 9.576-1.17 13.72-3.24 5.755 3.91 11.562 7.715 17.482 11.48-.474 2.142-.732 4.36-.732 6.635 0 17.024 14.008 31 31.03 31 7.577 0 14.55-2.772 19.964-7.345l13.873 8.125c-.263 1.535-.414 3.113-.414 4.732v38.904L114.07 255.27v160.064l138.284 80.053 138.283-80.053V255.27l-104.047-60.233V156.7c0-.983-.067-1.946-.172-2.897 5.393-3.07 10.655-6.08 15.697-8.994 5.226 3.992 11.736 6.377 18.762 6.377 17.023 0 31-13.976 31-31 0-1.867-.176-3.695-.498-5.476 6.047-3.987 12.012-8.058 17.978-12.298 3.97 1.855 8.38 2.9 13.02 2.9 17.023 0 31.03-13.976 31.03-31 0-1.973-.194-3.903-.553-5.78 5.273-4.45 10.697-9.14 16.318-14.116 11.6 5.714 26.135 3.778 35.736-5.822 7.998-7.998 10.675-19.42 8.045-29.72h-20.413c4.018 4.888 3.736 11.916-.85 16.5-4.887 4.888-12.55 4.89-17.437 0-4.585-4.585-4.867-11.614-.85-16.5h-20.414c-1.915 7.5-1 15.592 2.72 22.528-4.12 3.636-8.123 7.105-12.034 10.434-5.575-5.288-13.083-8.555-21.297-8.555-17.024 0-31.03 14.01-31.03 31.032 0 5.45 1.438 10.583 3.948 15.05-4.245 2.958-8.5 5.84-12.797 8.673-5.6-5.48-13.24-8.88-21.62-8.88-17.025 0-31.032 14.01-31.032 31.032 0 3.166.484 6.225 1.383 9.11-4.23 2.445-8.744 5.028-13.247 7.605-1.028-.994-2.112-1.91-3.246-2.716-6.692-4.768-14.72-6.882-22.714-7.014-7.996-.132-16.15 1.718-22.97 6.504-.807.565-1.586 1.186-2.337 1.85-4.367-2.573-8.764-5.164-12.947-7.622.642-2.47.984-5.056.984-7.716 0-17.024-14.007-31.032-31.03-31.032-7.977 0-15.29 3.075-20.812 8.094-4.47-2.838-8.894-5.69-13.248-8.596 2.267-4.297 3.56-9.178 3.56-14.34 0-17.025-13.977-31.033-31-31.033-8.26 0-15.804 3.304-21.388 8.642-4.515-3.827-9.1-7.833-13.79-12.067 3.063-6.575 3.715-14.03 1.94-20.98H68.568c4.018 4.887 3.736 11.915-.85 16.5-4.887 4.887-12.55 4.888-17.437 0-4.584-4.586-4.865-11.615-.848-16.5H29.018zm93.2 43.094c6.924 0 12.313 5.42 12.313 12.343s-5.387 12.312-12.31 12.312c-6.926 0-12.345-5.39-12.345-12.313 0-6.923 5.42-12.343 12.344-12.343zm260.157 0c6.924 0 12.344 5.42 12.344 12.343s-5.42 12.312-12.345 12.312c-6.924 0-12.344-5.39-12.344-12.313 0-6.923 5.42-12.343 12.345-12.343zM183.72 107.843c6.922 0 12.343 5.42 12.343 12.344 0 6.923-5.42 12.312-12.344 12.312-6.926 0-12.345-5.39-12.345-12.313 0-6.923 5.42-12.343 12.344-12.343zm137.155 0c6.924 0 12.313 5.42 12.313 12.344 0 6.923-5.39 12.312-12.313 12.312-6.924 0-12.344-5.39-12.344-12.313 0-6.923 5.42-12.343 12.345-12.343zm-69.164 38.013c4.695.078 9.355 1.536 12.18 3.55 2.826 2.012 4.01 3.805 4.01 7.292v27.52l-15.546-9-16.526 9.565V156.7c0-4.09 1.258-5.835 3.953-7.725 2.696-1.89 7.237-3.195 11.93-3.118zm-8.122 56.03v32.728l-74.182 43.21-28.558-16.462 102.74-59.476zm18.687.67l102.16 59.138-28.624 16.502-73.533-42.83-.002-32.81zm-9.988 48.62l72.256 42.085-.002 84.316-72.253 42.086-72.256-42.086.003-84.314 72.254-42.088zm.465 18.33l-56.883 98.15v.724l56.566 32.977L309 368.38v-66.085l-56.248-32.79zm-119.994 8.764l28.586 16.48v84.027l-28.586 16.48V278.272zm239.19.668l-.003 115.648-28.715-16.553v-82.54l28.717-16.555zM333.493 393.99l28.414 16.38-99.63 57.677v-32.574l71.216-41.483zm-161.77.375l71.864 41.86v32.494l-100.21-58.013 28.345-16.342z";

// ─── CURRENCY SYMBOLS (global marketplace feel) ─────────────────
const CURRENCIES = [
  { symbol: "₹", label: "INR" },
  { symbol: "$", label: "USD" },
  { symbol: "£", label: "GBP" },
  { symbol: "€", label: "EUR" },
  { symbol: "د.إ", label: "AED" },
];

// ─── PREMIUM LOADER COMPONENT ───────────────────────────────────
// Pure CSS @keyframes for all animations — zero framer-motion.
// SVG wireframe: CSS stroke-dashoffset (rock-solid, no SSR issues).
// Price counter: React state + requestAnimationFrame.
// Currency: cycles through ₹ $ £ € د.إ every 400ms.
export default function OrivraaLoader() {
  const [price, setPrice] = useState(0);
  const [currIdx, setCurrIdx] = useState(0);

  // Price counter animation (rAF)
  useEffect(() => {
    const duration = 3500;
    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      let val = Math.round(eased * 75000);
      if (t > 0.05 && t < 0.9) {
        val += Math.round((Math.random() - 0.5) * 1500 * (1 - t));
      }
      setPrice(Math.max(0, Math.min(75000, val)));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setPrice(75000);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Currency symbol rotation (loops continuously)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrIdx((prev) => (prev + 1) % CURRENCIES.length);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const { symbol, label } = CURRENCIES[currIdx];
  const formattedNumber = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(price);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LOADER_CSS }} />

      <div className="ovr-root">
        {/* ── DATA PARTICLES: fly from corners to center ── */}
        {Array.from({ length: 20 }, (_, i) => {
          const corner = i % 4;
          return (
            <div
              key={`p${i}`}
              className="ovr-particle"
              style={
                {
                  "--sx": corner % 2 === 0 ? "-50vw" : "50vw",
                  "--sy": corner < 2 ? "-50vh" : "50vh",
                  animationDelay: `${i * 0.18}s`,
                  animationDuration: `${1.8 + (i % 4) * 0.3}s`,
                } as React.CSSProperties
              }
            />
          );
        })}

        {/* ── BACKGROUND PENDANT WIREFRAME ── */}
        <svg className="ovr-pendant-bg" viewBox="0 0 512 512" fill="none">
          <path d={PENDANT_PATH} className="ovr-pendant-stroke" />
        </svg>

        {/* ── RADIAL GLOW ── */}
        <div className="ovr-glow" />

        {/* ── HERO DIAMOND WIREFRAME ── */}
        <div className="ovr-diamond-wrap">
          <svg viewBox="0 0 24 24" fill="none" className="ovr-diamond-svg">
            {/* Wireframe strokes — each facet draws independently */}
            {DIAMOND_FACETS.map((d, i) => (
              <path
                key={`s${i}`}
                d={d}
                className="ovr-facet-stroke"
                style={{ animationDelay: `${i * 0.25}s` }}
              />
            ))}
            {/* Gold fill — blooms after wireframe completes */}
            {DIAMOND_FACETS.map((d, i) => (
              <path
                key={`f${i}`}
                d={d}
                className="ovr-facet-fill"
                style={{ animationDelay: `${2.0 + i * 0.06}s` }}
              />
            ))}
          </svg>
          {/* Shimmer light-sweep on completed diamond */}
          <div className="ovr-shimmer" />
        </div>

        {/* ── PRICE COUNTER with rotating currency ── */}
        <div className="ovr-price">
          <span className="ovr-currency" key={label}>
            {symbol}
          </span>
          {formattedNumber}
        </div>

        {/* ── ENGINE LABEL ── */}
        <div className="ovr-engine">AI Pricing Engine Active</div>

        {/* ── MARKET INDICATORS ── */}
        <div className="ovr-markets">
          <span className="ovr-mkt" style={{ animationDelay: "0s" }}>
            Live Metal Rates
          </span>
          <span className="ovr-mkt-dot">·</span>
          <span className="ovr-mkt" style={{ animationDelay: "0.35s" }}>
            Tax Verified
          </span>
          <span className="ovr-mkt-dot">·</span>
          <span className="ovr-mkt" style={{ animationDelay: "0.7s" }}>
            Orivraa Escrow
          </span>
        </div>

        {/* ── BRAND NAME ── */}
        <div className="ovr-brand">
          {"Orivraa".split("").map((ch, i) => (
            <span
              key={i}
              className={i < 3 ? "ovr-ch-w" : "ovr-ch-g"}
              style={{ animationDelay: `${2.0 + i * 0.09}s` }}
            >
              {ch}
            </span>
          ))}
        </div>

        {/* ── TAGLINE ── */}
        <div className="ovr-tagline">Premium Jewellery Marketplace</div>

        {/* ── PROGRESS BAR ── */}
        <div className="ovr-pbar-track">
          <div className="ovr-pbar-fill" />
        </div>
      </div>
    </>
  );
}

// ─── ALL CSS — injected via <style> tag ─────────────────────────
const LOADER_CSS = `
/* ═══════════════════════════════════════════════════
   ORIVRAA PREMIUM LOADER — Pure CSS Animations
   ═══════════════════════════════════════════════════ */

/* === ROOT === */
.ovr-root {
  position: fixed; inset: 0; z-index: 99999;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: #0B0C10;
  overflow: hidden;
  user-select: none; -webkit-user-select: none;
  font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif;
}

/* === DATA PARTICLES (fly from corners → center) === */
.ovr-particle {
  position: absolute;
  width: 3px; height: 3px;
  background: #D4AF37;
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(212,175,55,0.8), 0 0 12px rgba(212,175,55,0.3);
  left: 50%; top: 50%;
  pointer-events: none;
  animation: ovr-fly 2s ease-in infinite;
}
@keyframes ovr-fly {
  0%   { transform: translate(var(--sx), var(--sy)); opacity: 0; }
  15%  { opacity: 1; }
  85%  { opacity: 0.6; }
  100% { transform: translate(0, 0); opacity: 0; }
}

/* === BACKGROUND PENDANT WIREFRAME === */
.ovr-pendant-bg {
  position: absolute;
  width: 320px; height: 320px;
  opacity: 0.07;
  pointer-events: none;
}
@media (min-width: 640px) {
  .ovr-pendant-bg { width: 420px; height: 420px; }
}
.ovr-pendant-stroke {
  stroke: #D4AF37;
  stroke-width: 2;
  fill: none;
  stroke-dasharray: 12000;
  stroke-dashoffset: 12000;
  animation: ovr-draw-pendant 5s ease-in-out 0.3s forwards;
}
@keyframes ovr-draw-pendant {
  to { stroke-dashoffset: 0; }
}

/* === RADIAL GLOW (behind diamond) === */
.ovr-glow {
  position: absolute;
  width: 200px; height: 200px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(212,175,55,0.18) 0%,
    rgba(212,175,55,0.04) 50%,
    transparent 70%
  );
  animation: ovr-pulse 2.5s ease-in-out infinite;
  pointer-events: none;
}
@keyframes ovr-pulse {
  0%, 100% { transform: scale(1);   opacity: 0.5; }
  50%      { transform: scale(1.5); opacity: 1; }
}

/* === HERO DIAMOND === */
.ovr-diamond-wrap {
  position: relative; z-index: 20;
  width: 160px; height: 160px;
}
@media (min-width: 640px) {
  .ovr-diamond-wrap { width: 200px; height: 200px; }
}
.ovr-diamond-svg {
  width: 100%; height: 100%;
  filter: drop-shadow(0 0 8px rgba(212,175,55,0.25));
}

/* Facet wireframe strokes — each draws itself */
.ovr-facet-stroke {
  stroke: #D4AF37;
  stroke-width: 0.35;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: ovr-draw-facet 1.8s ease-in-out forwards;
}
@keyframes ovr-draw-facet {
  to { stroke-dashoffset: 0; }
}

/* Facet fill — subtle gold bloom after wireframe */
.ovr-facet-fill {
  stroke: none;
  fill: rgba(212,175,55,0);
  animation: ovr-bloom 0.6s ease-out forwards;
  animation-fill-mode: backwards;
}
@keyframes ovr-bloom {
  from { fill: rgba(212,175,55,0); }
  to   { fill: rgba(212,175,55,0.12); }
}

/* Shimmer sweep across completed diamond */
.ovr-shimmer {
  position: absolute;
  inset: -10%;
  background: linear-gradient(
    105deg,
    transparent 30%,
    rgba(255,255,255,0.25) 48%,
    rgba(255,255,255,0.4) 50%,
    rgba(255,255,255,0.25) 52%,
    transparent 70%
  );
  opacity: 0;
  pointer-events: none;
  animation: ovr-sweep 0.8s ease-in-out 2.8s forwards;
}
@keyframes ovr-sweep {
  0%   { transform: translateX(-150%); opacity: 1; }
  100% { transform: translateX(150%);  opacity: 0; }
}

/* Assembled glow burst behind diamond */
.ovr-diamond-wrap::after {
  content: "";
  position: absolute; inset: -30%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(212,175,55,0.2) 0%,
    transparent 70%
  );
  opacity: 0;
  animation: ovr-assembled 1s ease-out 2.5s forwards;
  pointer-events: none;
}
@keyframes ovr-assembled {
  from { opacity: 0; transform: scale(0.5); }
  to   { opacity: 1; transform: scale(1); }
}

/* === PRICE COUNTER === */
.ovr-price {
  margin-top: 28px; z-index: 30;
  font-size: 2rem; font-weight: 300;
  color: #FFFFFF;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 20px rgba(212,175,55,0.3);
  opacity: 0;
  animation: ovr-fade-up 0.5s ease-out 0.4s forwards;
  display: flex; align-items: baseline; gap: 4px;
}
@media (min-width: 640px) {
  .ovr-price { font-size: 2.75rem; }
}
/* Currency symbol — quick swap animation */
.ovr-currency {
  display: inline-block;
  min-width: 1.2em;
  text-align: right;
  color: #D4AF37;
  font-weight: 500;
  animation: ovr-curr-swap 0.25s ease-out;
}
@keyframes ovr-curr-swap {
  0%   { opacity: 0; transform: translateY(-8px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* === ENGINE LABEL === */
.ovr-engine {
  margin-top: 6px; z-index: 30;
  font-size: 9px; font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: #D4AF37;
  font-family: system-ui, -apple-system, sans-serif;
  opacity: 0;
  animation: ovr-fade-up 0.5s ease-out 1s forwards;
}

/* === MARKET INDICATORS === */
.ovr-markets {
  margin-top: 10px; z-index: 30;
  display: flex; gap: 8px;
  align-items: center;
  opacity: 0;
  animation: ovr-fade-up 0.5s ease-out 1.3s forwards;
}
.ovr-mkt {
  font-size: 8px; text-transform: uppercase;
  letter-spacing: 0.2em;
  color: rgba(255,255,255,0.35);
  font-family: system-ui, -apple-system, sans-serif;
  animation: ovr-blink 1.2s ease-in-out infinite;
}
.ovr-mkt-dot {
  font-size: 10px;
  color: rgba(212,175,55,0.3);
  font-family: system-ui, -apple-system, sans-serif;
}
@keyframes ovr-blink {
  0%, 100% { opacity: 0.3; }
  50%      { opacity: 1; }
}

/* === BRAND NAME === */
.ovr-brand {
  margin-top: 24px; z-index: 30;
  display: flex; align-items: baseline;
}
.ovr-ch-w, .ovr-ch-g {
  font-size: 1.75rem; font-weight: 700;
  letter-spacing: 0.05em;
  opacity: 0;
  transform: translateY(16px);
  animation: ovr-letter-in 0.35s ease-out forwards;
}
@media (min-width: 640px) {
  .ovr-ch-w, .ovr-ch-g { font-size: 2.25rem; }
}
.ovr-ch-w { color: #FFFFFF; }
.ovr-ch-g { color: #D4AF37; }
@keyframes ovr-letter-in {
  to { opacity: 1; transform: translateY(0); }
}

/* === TAGLINE === */
.ovr-tagline {
  margin-top: 8px; z-index: 30;
  font-size: 9px; text-transform: uppercase;
  letter-spacing: 0.35em;
  color: rgba(212,175,55,0.5);
  font-family: system-ui, -apple-system, sans-serif;
  opacity: 0;
  animation: ovr-fade-up 0.5s ease-out 2.6s forwards;
}
@media (min-width: 640px) {
  .ovr-tagline { font-size: 11px; }
}

/* === PROGRESS BAR === */
.ovr-pbar-track {
  margin-top: 20px; z-index: 30;
  width: 140px; height: 1.5px;
  border-radius: 999px;
  background: rgba(255,255,255,0.04);
  overflow: hidden;
}
@media (min-width: 640px) {
  .ovr-pbar-track { width: 180px; }
}
.ovr-pbar-fill {
  height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, #B8941F, #D4AF37, #FFD700);
  width: 0%;
  animation: ovr-fill 3s ease-in-out forwards;
}
@keyframes ovr-fill {
  to { width: 100%; }
}

/* === SHARED: FADE UP === */
@keyframes ovr-fade-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;
