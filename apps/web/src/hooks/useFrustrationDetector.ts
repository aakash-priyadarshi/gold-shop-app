'use client';

import { useEffect, useRef } from 'react';
import { triggerErrorReporter } from '@/components/ui/ErrorReporter';

const RAGE_CLICK_THRESHOLD = 3;
const RAGE_CLICK_WINDOW_MS = 1500;
const API_ERROR_WINDOW_MS = 30_000;

export function useFrustrationDetector() {
  const clickLog = useRef<{ target: EventTarget | null; time: number }[]>([]);
  const apiErrorTimes = useRef<number[]>([]);

  // ── Rage-click detection ──────────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const now = Date.now();
      clickLog.current.push({ target: e.target, time: now });

      // Keep only events within the window
      clickLog.current = clickLog.current.filter(c => now - c.time < RAGE_CLICK_WINDOW_MS);

      // Count clicks on the same element
      const sameTargetClicks = clickLog.current.filter(c => c.target === e.target);
      if (sameTargetClicks.length >= RAGE_CLICK_THRESHOLD) {
        triggerErrorReporter({
          trigger: 'rage_click',
          page: window.location.pathname,
          errorMessage: 'User rage-clicked — possible UI issue',
          autoShow: true,
        });
        clickLog.current = []; // Reset after triggering
      }
    };

    window.addEventListener('click', handleClick, { passive: true });
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // ── API error rate detection (via custom event) ───────────────
  // Called by the Axios interceptor when it sees a 5xx
  useEffect(() => {
    const handleApiError = () => {
      const now = Date.now();
      apiErrorTimes.current.push(now);
      apiErrorTimes.current = apiErrorTimes.current.filter(t => now - t < API_ERROR_WINDOW_MS);

      if (apiErrorTimes.current.length >= 2) {
        triggerErrorReporter({
          trigger: 'api_error',
          page: window.location.pathname,
          errorMessage: 'Multiple API errors detected',
          autoShow: true,
        });
        apiErrorTimes.current = [];
      }
    };

    window.addEventListener('orivraa:api_error', handleApiError);
    return () => window.removeEventListener('orivraa:api_error', handleApiError);
  }, []);
}
