'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';

const HEARTBEAT_INTERVAL_MS = 60 * 1000;      // 60 seconds
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const SESSION_TOKEN_KEY = 'orivraa_ws_token';
let sessionTokenGlobal: string | null = null;

export function useSessionTracker() {
  const { data: session } = useSession();
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityRef = useRef<NodeJS.Timeout | null>(null);
  const isEndedRef = useRef(false);

  // ── Helpers ─────────────────────────────────────────────────────────

  const getToken = () =>
    sessionTokenGlobal || sessionStorage.getItem(SESSION_TOKEN_KEY) || null;

  const sendEnd = useCallback((closedBy: string) => {
    const token = getToken();
    if (!token || isEndedRef.current) return;
    isEndedRef.current = true;
    const payload = JSON.stringify({ sessionToken: token, closedBy });
    // sendBeacon is fire-and-forget, perfect for page unload
    const beaconSent = navigator.sendBeacon(
      `${process.env.NEXT_PUBLIC_API_URL}/sessions/web/end`,
      new Blob([payload], { type: 'application/json' }),
    );
    if (!beaconSent) {
      // Fallback to sync XHR on unload
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL}/sessions/web/end`, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(payload);
      } catch { /* ignore */ }
    }
  }, []);

  const resetInactivity = useCallback(() => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    inactivityRef.current = setTimeout(() => {
      // Dispatch custom event — PinLockScreen listens to this
      window.dispatchEvent(new CustomEvent('orivraa:session_timeout'));
      sendEnd('timeout');
    }, INACTIVITY_TIMEOUT_MS);
  }, [sendEnd]);

  // ── Session start ─────────────────────────────────────────────────

  useEffect(() => {
    // Avoid double-start (React StrictMode)
    if (sessionTokenGlobal) return;

    const token = crypto.randomUUID();
    sessionTokenGlobal = token;
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    isEndedRef.current = false;

    api
      .post('/sessions/web/start', {
        sessionToken: token,
        referrer: document.referrer || undefined,
      })
      .catch(() => { /* non-critical */ });

    // Start heartbeat
    heartbeatRef.current = setInterval(() => {
      const t = getToken();
      if (!t) return;
      api.post('/sessions/web/heartbeat', { sessionToken: t }).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    // Start inactivity timer
    resetInactivity();

    // Activity listeners
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach(e => window.addEventListener(e, resetInactivity, { passive: true }));

    // End session on tab visibility change / close
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        sendEnd('beacon');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', () => sendEnd('beacon'));

    // Listen for logout
    const handleLogout = () => sendEnd('user_logout');
    window.addEventListener('orivraa:logout', handleLogout);

    return () => {
      clearInterval(heartbeatRef.current!);
      clearTimeout(inactivityRef.current!);
      activityEvents.forEach(e => window.removeEventListener(e, resetInactivity));
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('orivraa:logout', handleLogout);
      sessionTokenGlobal = null;
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-attach user info when session changes (login happening mid-tab)
  useEffect(() => {
    // no-op — user info flows through the bearer token in apiClient interceptors
  }, [session]);
}
