"use client";

import { useEffect, useState } from "react";
import OrivraaLoader, { claimInitialAnimation } from "./OrivraaLoader";

/**
 * Root-level overlay that plays the premium Orivraa loader animation
 * exactly ONCE per page load / reload, on EVERY page.
 *
 * • First visit / F5 reload → 4s animation covering the entire viewport
 * • SPA navigation          → immediately renders children, no overlay
 *
 * Place this inside the root layout, wrapping {children}.
 */
export default function InitialLoadScreen({
  children,
}: {
  children: React.ReactNode;
}) {
  // Own flag — independent of useMinLoadingTime
  const [isFirstLoad] = useState(() => claimInitialAnimation());
  const [showOverlay, setShowOverlay] = useState(isFirstLoad);

  useEffect(() => {
    if (!isFirstLoad) return;
    // Full animation (price counter 3.5s + buffer)
    const timer = setTimeout(() => setShowOverlay(false), 4200);
    return () => clearTimeout(timer);
  }, [isFirstLoad]);

  return (
    <>
      {showOverlay && <OrivraaLoader />}
      {/* Content remains in the DOM (no visibility:hidden) so crawlers/bots can
          read it. The fixed-position overlay visually covers it via z-index. */}
      {children}
    </>
  );
}
