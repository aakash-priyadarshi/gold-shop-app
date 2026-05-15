"use client";

import { useCallback } from "react";

type HapticPattern = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 35,
  success: [15, 40, 15],
  warning: [25, 60, 25],
  error: [40, 80, 40, 80, 40],
};

/**
 * Mobile haptic feedback. No-op on devices without the Vibration API
 * (most desktops and iOS Safari without permission).
 *
 * Usage:
 *   const haptic = useHaptics();
 *   haptic("light");   // tap
 *   haptic("success"); // checkout success
 */
export function useHaptics() {
  return useCallback((pattern: HapticPattern = "light") => {
    if (typeof window === "undefined") return;
    const nav = window.navigator as Navigator & {
      vibrate?: (p: number | number[]) => boolean;
    };
    if (typeof nav.vibrate !== "function") return;
    try {
      nav.vibrate(PATTERNS[pattern]);
    } catch {
      // ignore — vibration is best-effort
    }
  }, []);
}
