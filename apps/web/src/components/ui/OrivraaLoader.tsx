"use client";

import { useEffect, useState } from "react";

// ─── INDEPENDENT MODULE FLAGS ───────────────────────────────────
// Each resets on hard page load / reload (JS re-executes).
// Each persists during SPA navigation (same JS context).
// They are SEPARATE so root overlay and page-level hooks
// don't race against each other.
let _overlayPlayed = false; // for InitialLoadScreen
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
export function useMinLoadingTime(isLoading: boolean, minMs = 0): boolean {
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

// ─── BESPOKE BRAND LOGO LOADER (Concept 4: Diamond Forge & Solitaire Bloom) ───

export default function OrivraaLoader() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LOADER_CSS }} />

      <div className="loader-container trigger-anim" id="loader">
        
        {/* Ambient Glow behind the Logo */}
        <div className="ambient-glow"></div>
        
        {/* Shimmer Sweep overlay */}
        <div className="shimmer-sweep"></div>

        {/* Sparkle Flare Wrapper (Centered at Star Center cx=52.28, cy=51.73 on 120x96.49 canvas) */}
        <div className="sparkle-wrap">
          <div className="flare-core"></div>
          <div className="flare-ray ray-h"></div>
          <div className="flare-ray ray-v"></div>
          <div className="flare-ray ray-d1"></div>
          <div className="flare-ray ray-d2"></div>
        </div>

        {/* The 3D Brand Logo Scene */}
        <div className="logo-scene">
          <svg id="Layer_1" data-name="Layer 1" className="brand-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 96.49">
            <defs>
              <linearGradient id="linear-gradient" x1="32.59" y1="46.69" x2="104.08" y2="46.69" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#e5a31e"/>
                <stop offset=".11" stopColor="#e5a626"/>
                <stop offset=".29" stopColor="#e8b13c"/>
                <stop offset=".51" stopColor="#ecc260"/>
                <stop offset=".75" stopColor="#f2d992"/>
                <stop offset=".78" stopColor="#f3dd99"/>
              </linearGradient>
              <linearGradient id="linear-gradient-2" x1="0" y1="53.35" x2="79.08" y2="53.35" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#e5a31e"/>
                <stop offset=".05" stopColor="#e7af37"/>
                <stop offset=".12" stopColor="#ebbf5a"/>
                <stop offset=".2" stopColor="#efcc75"/>
                <stop offset=".28" stopColor="#f1d589"/>
                <stop offset=".36" stopColor="#f2db95"/>
                <stop offset=".44" stopColor="#f3dd99"/>
                <stop offset=".66" stopColor="#f1db97"/>
                <stop offset=".74" stopColor="#edd491"/>
                <stop offset=".8" stopColor="#e5c888"/>
                <stop offset=".85" stopColor="#dab77a"/>
                <stop offset=".89" stopColor="#cba168"/>
                <stop offset=".92" stopColor="#ba8652"/>
                <stop offset=".95" stopColor="#a46637"/>
                <stop offset=".98" stopColor="#8c4119"/>
                <stop offset="1" stopColor="#782200"/>
              </linearGradient>
              <linearGradient id="linear-gradient-3" x1="99.66" y1="21.21" x2="120" y2="21.21" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#e5a31e"/>
                <stop offset=".09" stopColor="#e5a421"/>
                <stop offset=".18" stopColor="#e6aa2d"/>
                <stop offset=".27" stopColor="#e8b340"/>
                <stop offset=".36" stopColor="#ebbf5a"/>
                <stop offset=".44" stopColor="#efcf7d"/>
                <stop offset=".5" stopColor="#f3dd99"/>
                <stop offset=".59" stopColor="#f0d996"/>
                <stop offset=".67" stopColor="#eacf8e"/>
                <stop offset=".74" stopColor="#dfbf80"/>
                <stop offset=".8" stopColor="#cfa76d"/>
                <stop offset=".86" stopColor="#bb8854"/>
                <stop offset=".92" stopColor="#a36335"/>
                <stop offset=".97" stopColor="#863711"/>
                <stop offset="1" stopColor="#782200"/>
              </linearGradient>
              <linearGradient id="linear-gradient-4" x1="111.51" y1="9.94" x2="119.54" y2="9.94" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#e5a31e"/>
                <stop offset=".09" stopColor="#e5a421"/>
                <stop offset=".18" stopColor="#e6aa2d"/>
                <stop offset=".27" stopColor="#e8b340"/>
                <stop offset=".36" stopColor="#ebbf5a"/>
                <stop offset=".44" stopColor="#efcf7d"/>
                <stop offset=".5" stopColor="#f3dd99"/>
                <stop offset=".56" stopColor="#ead08e"/>
                <stop offset=".66" stopColor="#d5af73"/>
                <stop offset=".8" stopColor="#b17947"/>
                <stop offset=".97" stopColor="#81300b"/>
                <stop offset="1" stopColor="#782200"/>
              </linearGradient>
              <linearGradient id="linear-gradient-5" x1="85.89" y1="12.36" x2="111.51" y2="12.36" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#e5a31e"/>
                <stop offset=".09" stopColor="#e5a421"/>
                <stop offset=".18" stopColor="#e6aa2d"/>
                <stop offset=".27" stopColor="#e8b340"/>
                <stop offset=".36" stopColor="#ebbf5a"/>
                <stop offset=".44" stopColor="#efcf7d"/>
                <stop offset=".5" stopColor="#f3dd99"/>
                <stop offset=".7" stopColor="#f1db97"/>
                <stop offset=".77" stopColor="#edd491"/>
                <stop offset=".82" stopColor="#e5c888"/>
                <stop offset=".86" stopColor="#dab77a"/>
                <stop offset=".9" stopColor="#cba168"/>
                <stop offset=".93" stopColor="#ba8652"/>
                <stop offset=".96" stopColor="#a46637"/>
                <stop offset=".98" stopColor="#8c4119"/>
                <stop offset="1" stopColor="#782200"/>
              </linearGradient>
              <linearGradient id="linear-gradient-6" x1="75.33" y1="9.58" x2="85.35" y2="9.58" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#e5a31e"/>
                <stop offset=".09" stopColor="#e5a421"/>
                <stop offset=".18" stopColor="#e6aa2d"/>
                <stop offset=".27" stopColor="#e8b340"/>
                <stop offset=".36" stopColor="#ebbf5a"/>
                <stop offset=".44" stopColor="#efcf7d"/>
                <stop offset=".5" stopColor="#f3dd99"/>
                <stop offset=".56" stopColor="#ead08e"/>
                <stop offset=".66" stopColor="#d5af73"/>
                <stop offset=".8" stopColor="#b17947"/>
                <stop offset=".97" stopColor="#81300b"/>
                <stop offset="1" stopColor="#782200"/>
              </linearGradient>
              <linearGradient id="linear-gradient-7" x1="77.17" y1="3.31" x2="89.02" y2="3.31" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#e5a31e"/>
                <stop offset=".09" stopColor="#e5a421"/>
                <stop offset=".18" stopColor="#e6aa2d"/>
                <stop offset=".27" stopColor="#e8b340"/>
                <stop offset=".36" stopColor="#ebbf5a"/>
                <stop offset=".44" stopColor="#efcf7d"/>
                <stop offset=".5" stopColor="#f3dd99"/>
                <stop offset=".56" stopColor="#ead08e"/>
                <stop offset=".66" stopColor="#d5af73"/>
                <stop offset=".8" stopColor="#b17947"/>
                <stop offset=".97" stopColor="#81300b"/>
                <stop offset="1" stopColor="#782200"/>
              </linearGradient>
              <radialGradient id="New_Gradient_Swatch_4" data-name="New Gradient Swatch 4" cx="52.28" cy="51.73" fx="52.28" fy="51.73" r="15.19" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#fffeee"/>
                <stop offset=".28" stopColor="#f3f3e9"/>
                <stop offset=".75" stopColor="#d7dade"/>
                <stop offset=".88" stopColor="#dcd8d4"/>
              </radialGradient>
            </defs>

            {/* ==================== ANIMATED BACKGROUND OUTLINES ==================== */}
            
            {/* Outer Gold Ribbon Outline */}
            <path className="svg-draw-path ribbon-stroke-1" d="M32.59,6.72c.02-1.16,17.16-5.21,34.71,0,23.28,6.91,32.05,25.57,32.9,27.47,6.54,14.59,5.39,34.21-7.85,45.78-2.26,1.98-8.52,6.87-18.11,8.63-16.07,2.95-30.83-4.85-30.48-6.02.19-.62,4.6,1.13,11.47.26,10.33-1.31,19.77-7.74,24.81-15.73,4.28-6.77,4.41-13.11,4.44-16.17.07-8.95-3.65-15.43-5.89-19.22-1.76-2.98-6.71-11.12-17.25-17.16-.92-.53-4.98-2.81-10.94-4.7-10.29-3.25-17.81-2.63-17.81-3.14Z"/>
            
            {/* Inner Copper/Gold Ribbon Outline */}
            <path className="svg-draw-path ribbon-stroke-2" d="M60.73,17.38c-.18.87-5.2-.56-11.59.55-7.45,1.29-12.51,5.33-14.74,7.04-2.03,1.56-11.84,9.38-13.58,22-2.65,19.17,15.23,32.48,18.86,35.18,3.74,2.78,9.81,7.3,18.86,8.58,10.73,1.51,20.22-2.31,20.52-1.51.23.59-4.84,2.98-10.74,4.62-3.99,1.11-19.27,5.36-35.75,0-3.38-1.1-28.25-10.63-32.29-35.34,0,0-3.69-22.55,15.01-40.05,4.43-4.15,12.3-7.93,16.61-7.93h0c4.22-.67,8.07-.09,10.3.24.83.12,1.59.26,2.31.41,2.28.48,4.04,1.03,5.11,1.39,4.39,1.47,11.31,3.79,11.09,4.82Z"/>

            {/* Upper Right Facets Outlines */}
            <polygon className="svg-draw-path facet-stroke f-1" points="99.66 27.64 120 17.23 111.66 14.78 99.66 27.64"/>
            <polygon className="svg-draw-path facet-stroke f-2" points="111.51 13.59 119.54 15.18 112.35 4.71 111.51 13.59"/>
            <polygon className="svg-draw-path facet-stroke f-3" points="96.52 24.72 110.59 14.78 104.4 6.76 111.51 5.17 91.01 0 96.06 4.13 86.58 8.02 85.89 12.36 91.4 19.35 88.87 9.54 106.31 13.85 96.52 24.72"/>
            <polygon className="svg-draw-path facet-stroke f-4" points="75.33 5.9 84.36 13.26 85.35 7.76 75.33 5.9"/>
            <polygon className="svg-draw-path facet-stroke f-5" points="77.17 4.71 85.35 6.63 89.02 0 77.17 4.71"/>

            {/* Center Diamond Star Outline */}
            <path className="svg-draw-path star-stroke" d="M36.23,51.73c0-1,6.92-.13,11.31-3.73,4.69-3.85,3.76-10.55,4.96-10.53,1.17.01.06,6.44,4.47,10.32,4.29,3.78,11.35,2.98,11.36,4.09,0,1.1-6.8.37-11.13,4.08-4.47,3.82-3.61,10.05-4.82,10.04-1.23-.01-.16-6.41-4.61-10.27-4.36-3.79-11.56-2.98-11.55-3.99Z"/>

            {/* ==================== SOLID BRAND LOGO (BLOOM FILL) ==================== */}
            <g id="brand-logo-solid">
              <path className="cls-7" d="M32.59,6.72c.02-1.16,17.16-5.21,34.71,0,23.28,6.91,32.05,25.57,32.9,27.47,6.54,14.59,5.39,34.21-7.85,45.78-2.26,1.98-8.52,6.87-18.11,8.63-16.07,2.95-30.83-4.85-30.48-6.02.19-.62,4.6,1.13,11.47.26,10.33-1.31,19.77-7.74,24.81-15.73,4.28-6.77,4.41-13.11,4.44-16.17.07-8.95-3.65-15.43-5.89-19.22-1.76-2.98-6.71-11.12-17.25-17.16-.92-.53-4.98-2.81-10.94-4.7-10.29-3.25-17.81-2.63-17.81-3.14Z" fill="url(#linear-gradient)"/>
              <path className="cls-1" d="M60.73,17.38c-.18.87-5.2-.56-11.59.55-7.45,1.29-12.51,5.33-14.74,7.04-2.03,1.56-11.84,9.38-13.58,22-2.65,19.17,15.23,32.48,18.86,35.18,3.74,2.78,9.81,7.3,18.86,8.58,10.73,1.51,20.22-2.31,20.52-1.51.23.59-4.84,2.98-10.74,4.62-3.99,1.11-19.27,5.36-35.75,0-3.38-1.1-28.25-10.63-32.29-35.34,0,0-3.69-22.55,15.01-40.05,4.43-4.15,12.3-7.93,16.61-7.93h0c4.22-.67,8.07-.09,10.3.24.83.12,1.59.26,2.31.41,2.28.48,4.04,1.03,5.11,1.39,4.39,1.47,11.31,3.79,11.09,4.82Z" fill="url(#linear-gradient-2)"/>
              <polygon className="cls-3" points="99.66 27.64 120 17.23 111.66 14.78 99.66 27.64" fill="url(#linear-gradient-3)"/>
              <polygon className="cls-2" points="111.51 13.59 119.54 15.18 112.35 4.71 111.51 13.59" fill="url(#linear-gradient-4)"/>
              <polygon className="cls-4" points="96.52 24.72 110.59 14.78 104.4 6.76 111.51 5.17 91.01 0 96.06 4.13 86.58 8.02 85.89 12.36 91.4 19.35 88.87 9.54 106.31 13.85 96.52 24.72" fill="url(#linear-gradient-5)"/>
              <polygon className="cls-6" points="75.33 5.9 84.36 13.26 85.35 7.76 75.33 5.9" fill="url(#linear-gradient-6)"/>
              <polygon className="cls-5" points="77.17 4.71 85.35 6.63 89.02 0 77.17 4.71" fill="url(#linear-gradient-7)"/>
              <path className="cls-8" d="M36.23,51.73c0-1,6.92-.13,11.31-3.73,4.69-3.85,3.76-10.55,4.96-10.53,1.17.01.06,6.44,4.47,10.32,4.29,3.78,11.35,2.98,11.36,4.09,0,1.1-6.8.37-11.13,4.08-4.47,3.82-3.61,10.05-4.82,10.04-1.23-.01-.16-6.41-4.61-10.27-4.36-3.79-11.56-2.98-11.55-3.99Z" fill="url(#New_Gradient_Swatch_4)"/>
            </g>
          </svg>
        </div>

        {/* Refined Brand Name (Orivraa) */}
        <div className="brand-wrap">
          <div className="brand-title">
            <span className="l-0">O</span>
            <span className="l-1">r</span>
            <span className="l-2">i</span>
            <span className="l-3">v</span>
            <span className="l-4">r</span>
            <span className="l-5">a</span>
            <span className="l-6">a</span>
          </div>
          <div className="tagline">Premium Jewellery Platform</div>
          
          {/* Live connection indicator */}
          <div className="sub-indicator">
            <div className="status-dot"></div>
            <span>Secure POS Environment</span>
          </div>
        </div>

        {/* Progress linear bar */}
        <div className="progress-track">
          <div className="progress-fill"></div>
        </div>

      </div>
    </>
  );
}

// ─── ALL CSS — injected via <style> tag ─────────────────────────
const LOADER_CSS = `
/* ═══════════════════════════════════════════════════
   ORIVRAA PREMIUM BRAND LOADER — Concept 4
   ═══════════════════════════════════════════════════ */

/* === RESET & FOUNDATION === */
.loader-container {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
  z-index: 999999 !important;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: #050608;
  overflow: hidden;
  user-select: none; -webkit-user-select: none;
  font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif;
  perspective: 1000px;
}

/* === RADIAL AMBIENT GLOW === */
.ambient-glow {
  position: absolute;
  width: 320px; height: 320px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(229, 163, 30, 0.15) 0%,
    rgba(229, 163, 30, 0.03) 45%,
    transparent 70%
  );
  filter: blur(25px);
  z-index: 1;
  transform: scale(0.9);
  animation: pulse-glow 4s ease-in-out infinite;
  pointer-events: none;
}
@keyframes pulse-glow {
  0%, 100% { transform: scale(0.9); opacity: 0.5; }
  50%      { transform: scale(1.2); opacity: 1; }
}

/* === LOGO CONTAINER (3D SCENE) === */
.logo-scene {
  position: relative;
  width: 200px; height: 170px;
  z-index: 10;
  transform-style: preserve-3d;
  transform: rotateX(10deg) translateY(-10px);
  animation: float-logo 6s ease-in-out infinite;
}
@media (min-width: 640px) {
  .logo-scene { width: 260px; height: 220px; }
}
@keyframes float-logo {
  0%, 100% { transform: rotateX(10deg) translateY(-10px) rotateY(0deg); }
  50%      { transform: rotateX(14deg) translateY(-22px) rotateY(2deg); }
}

.brand-svg {
  width: 100%; height: 100%;
  overflow: visible;
}

/* === SVG OUTLINES (FORGING) === */
.svg-draw-path {
  fill: none !important;
  stroke-width: 0.8px;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dashoffset: 600;
  stroke-dasharray: 600;
}

/* Rich Gold Ribbon outline */
.ribbon-stroke-1 {
  stroke: #ffd992;
  filter: drop-shadow(0 0 4px rgba(229, 163, 30, 0.6));
}
.trigger-anim .ribbon-stroke-1 {
  animation: draw-path 2.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* Warm Copper Ribbon outline */
.ribbon-stroke-2 {
  stroke: #e5a31e;
  filter: drop-shadow(0 0 2px rgba(229, 163, 30, 0.4));
}
.trigger-anim .ribbon-stroke-2 {
  animation: draw-path 2.4s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards;
}

/* Diamond center star outline */
.star-stroke {
  stroke: #ffffff;
  stroke-width: 0.6px;
  stroke-dashoffset: 150;
  stroke-dasharray: 150;
  filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.8));
}
.trigger-anim .star-stroke {
  animation: draw-path 1.2s cubic-bezier(0.25, 1, 0.5, 1) 2.2s forwards;
}

/* Diamond facets outlines */
.facet-stroke {
  stroke: #ffffff;
  stroke-width: 0.4px;
  stroke-dashoffset: 200;
  stroke-dasharray: 200;
  opacity: 0.7;
}
.trigger-anim .facet-stroke {
  animation: draw-path 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.trigger-anim .f-1 { animation-delay: 1.3s; }
.trigger-anim .f-2 { animation-delay: 1.5s; }
.trigger-anim .f-3 { animation-delay: 1.7s; }
.trigger-anim .f-4 { animation-delay: 1.8s; }
.trigger-anim .f-5 { animation-delay: 1.9s; }

@keyframes draw-path {
  to { stroke-dashoffset: 0; }
}

/* === SOLID GRADIENT BLOOM === */
.cls-1, .cls-2, .cls-3, .cls-4, .cls-5, .cls-6, .cls-7, .cls-8 {
  opacity: 0;
  transition: opacity 1.5s ease-in-out;
}

.trigger-anim .cls-7 { animation: bloom-fill 1.8s cubic-bezier(0.25, 1, 0.5, 1) 2.2s forwards; }
.trigger-anim .cls-1 { animation: bloom-fill 1.8s cubic-bezier(0.25, 1, 0.5, 1) 2.4s forwards; }
.trigger-anim .cls-8 { animation: bloom-fill-bright 1.6s cubic-bezier(0.25, 1, 0.5, 1) 2.8s forwards; }

/* Facets bloom */
.trigger-anim .cls-3 { animation: bloom-fill 1.2s ease-out 2.5s forwards; }
.trigger-anim .cls-2 { animation: bloom-fill 1.2s ease-out 2.6s forwards; }
.trigger-anim .cls-4 { animation: bloom-fill 1.2s ease-out 2.7s forwards; }
.trigger-anim .cls-6 { animation: bloom-fill 1.2s ease-out 2.8s forwards; }
.trigger-anim .cls-5 { animation: bloom-fill 1.2s ease-out 2.9s forwards; }

@keyframes bloom-fill {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes bloom-fill-bright {
  from { opacity: 0; filter: brightness(0.5); }
  to   { opacity: 1; filter: brightness(1.2) drop-shadow(0 0 10px rgba(255,255,255,0.4)); }
}

/* === LENS FLARE (SPARKLE ON STAR) === */
.sparkle-wrap {
  position: absolute;
  top: 54%;
  left: 44%;
  width: 0; height: 0;
  display: flex;
  align-items: center; justify-content: center;
  pointer-events: none;
  z-index: 20;
}
.flare-core {
  position: absolute;
  width: 5px; height: 5px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 
    0 0 25px 8px #ffffff, 
    0 0 45px 18px rgba(229, 163, 30, 0.8), 
    0 0 75px 30px rgba(255, 255, 255, 0.4);
  opacity: 0;
  transform: scale(0);
}
.trigger-anim .flare-core {
  animation: flare-burst 1.6s cubic-bezier(0.16, 1, 0.3, 1) 2.8s forwards;
}

.flare-ray {
  position: absolute;
  background: linear-gradient(90deg, transparent, #ffffff 50%, transparent);
  opacity: 0;
  transform: scaleX(0);
}
.ray-h { width: 160px; height: 1.5px; }
.ray-v { 
  width: 1.5px; height: 160px; 
  background: linear-gradient(180deg, transparent, #ffffff 50%, transparent);
}
.ray-d1 { width: 110px; height: 1px; transform: rotate(45deg) scaleX(0); }
.ray-d2 { width: 110px; height: 1px; transform: rotate(-45deg) scaleX(0); }

.trigger-anim .flare-ray {
  animation: ray-burst 1.4s cubic-bezier(0.16, 1, 0.3, 1) 2.8s forwards;
}
.trigger-anim .ray-d1 { animation: ray-burst-rotated-1 1.4s cubic-bezier(0.16, 1, 0.3, 1) 2.8s forwards; }
.trigger-anim .ray-d2 { animation: ray-burst-rotated-2 1.4s cubic-bezier(0.16, 1, 0.3, 1) 2.8s forwards; }

@keyframes flare-burst {
  0% { opacity: 0; transform: scale(0); }
  30% { opacity: 1; transform: scale(1.5); }
  65% { opacity: 0.9; transform: scale(0.95); }
  100% { opacity: 0; transform: scale(0); }
}
@keyframes ray-burst {
  0% { opacity: 0; transform: scaleX(0); }
  25% { opacity: 1; transform: scaleX(1.3); }
  100% { opacity: 0; transform: scaleX(0); }
}
@keyframes ray-burst-rotated-1 {
  0% { opacity: 0; transform: rotate(45deg) scaleX(0); }
  25% { opacity: 0.8; transform: rotate(45deg) scaleX(1.1); }
  100% { opacity: 0; transform: rotate(45deg) scaleX(0); }
}
@keyframes ray-burst-rotated-2 {
  0% { opacity: 0; transform: rotate(-45deg) scaleX(0); }
  25% { opacity: 0.8; transform: rotate(-45deg) scaleX(1.1); }
  100% { opacity: 0; transform: rotate(-45deg) scaleX(0); }
}

/* === SHIMMER SWEEP OVER LOGO === */
.shimmer-sweep {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    transparent 35%,
    rgba(255, 255, 255, 0.4) 48%,
    rgba(255, 255, 255, 0.8) 50%,
    rgba(255, 255, 255, 0.4) 52%,
    transparent 65%
  );
  mix-blend-mode: overlay;
  opacity: 0;
  transform: translateX(-120%) skewX(-15deg);
  pointer-events: none;
  z-index: 15;
}
.trigger-anim .shimmer-sweep {
  animation: sweep-effect 1.2s cubic-bezier(0.16, 1, 0.3, 1) 3.0s forwards;
}
@keyframes sweep-effect {
  0%   { transform: translateX(-120%) skewX(-15deg); opacity: 0; }
  25%  { opacity: 1; }
  75%  { opacity: 1; }
  100% { transform: translateX(120%) skewX(-15deg); opacity: 0; }
}

/* === BRAND INFO & TEXTS === */
.brand-wrap {
  margin-top: -10px;
  text-align: center;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.brand-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.08em;
  display: flex;
  gap: 2px;
  margin-bottom: 8px;
}
@media (min-width: 640px) {
  .brand-title { font-size: 36px; }
}

.brand-title span {
  display: inline-block;
  opacity: 0;
  transform: translateY(20px) scale(0.9);
}
.trigger-anim .brand-title span {
  animation: letter-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* Staggered brand letters (O r i v r a a) */
.trigger-anim .l-0 { animation-delay: 2.7s; color: #ffffff; }
.trigger-anim .l-1 { animation-delay: 2.8s; color: #ffffff; }
.trigger-anim .l-2 { animation-delay: 2.9s; color: #ffffff; }
.trigger-anim .l-3 { animation-delay: 3.0s; color: #e5a31e; }
.trigger-anim .l-4 { animation-delay: 3.1s; color: #e5a31e; }
.trigger-anim .l-5 { animation-delay: 3.2s; color: #e5a31e; }
.trigger-anim .l-6 { animation-delay: 3.3s; color: #e5a31e; }

@keyframes letter-in {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.tagline {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.35em;
  color: rgba(229, 163, 30, 0.65);
  font-family: system-ui, -apple-system, sans-serif;
  font-weight: 600;
  opacity: 0;
  transform: translateY(10px);
}
@media (min-width: 640px) {
  .tagline { font-size: 10.5px; }
}
.trigger-anim .tagline {
  animation: fade-up-tag 0.8s cubic-bezier(0.16, 1, 0.3, 1) 3.4s forwards;
}

.sub-indicator {
  margin-top: 18px;
  font-size: 8.5px;
  font-family: system-ui, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.25em;
  color: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
}
.trigger-anim .sub-indicator {
  animation: fade-in-indicator 0.6s ease-out 3.7s forwards;
}

.status-dot {
  width: 4px; height: 4px;
  background-color: #22c55e;
  border-radius: 50%;
  box-shadow: 0 0 8px #22c55e;
  animation: pulse-dot 1.5s infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 0.4; }
  50%      { opacity: 1; }
}

@keyframes fade-up-tag {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fade-in-indicator {
  to { opacity: 1; }
}

/* === PROGRESS LINE === */
.progress-track {
  margin-top: 24px;
  width: 150px; height: 1.5px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 999px;
  overflow: hidden;
  opacity: 0;
}
@media (min-width: 640px) {
  .progress-track { width: 190px; }
}
.trigger-anim .progress-track {
  animation: fade-in-indicator 0.4s ease-out 2.5s forwards;
}

.progress-fill {
  width: 0%; height: 100%;
  background: linear-gradient(90deg, #782200, #e5a31e, #f3dd99, #ffffff);
  border-radius: 999px;
}
.trigger-anim .progress-fill {
  animation: fill-pbar 3.2s cubic-bezier(0.4, 0, 0.2, 1) 0.5s forwards;
}
@keyframes fill-pbar {
  to { width: 100%; }
}

/* Subtle 3D Scale Bump at Climax */
.trigger-anim {
  animation: trigger-scene-scale 4.2s ease-in-out forwards;
}
@keyframes trigger-scene-scale {
  0% { transform: scale(0.96) rotateX(10deg) translateY(-10px); }
  65% { transform: scale(0.96) rotateX(10deg) translateY(-10px); }
  72% { transform: scale(1.02) rotateX(12deg) translateY(-12px); filter: brightness(1.15); }
  80% { transform: scale(1) rotateX(10deg) translateY(-10px); filter: brightness(1); }
  100% { transform: scale(1) rotateX(10deg) translateY(-10px); }
}
`;
;
