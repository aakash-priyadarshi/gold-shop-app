'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';

const HEARTBEAT_INTERVAL_MS = 60 * 1000;      // 60 seconds
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const SESSION_TOKEN_KEY = 'orivraa_ws_token';
let sessionTokenGlobal: string | null = null;

export function useSessionTracker() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityRef = useRef<NodeJS.Timeout | null>(null);
  const isEndedRef = useRef(false);

  // Tracks the page the user is currently on and when they arrived
  const currentPageRef = useRef<{ path: string; title: string; startedAt: number } | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────────

  const getToken = () =>
    sessionTokenGlobal || sessionStorage.getItem(SESSION_TOKEN_KEY) || null;

  /** Flush the current page view to the backend (call before navigation/end) */
  const flushCurrentPage = useCallback(() => {
    const token = getToken();
    const page = currentPageRef.current;
    if (!token || !page) return;

    const durationSec = Math.round((Date.now() - page.startedAt) / 1000);
    // Fire-and-forget — we don't await
    api.post('/sessions/web/page-view', {
      sessionToken: token,
      path: page.path,
      title: page.title,
      durationSec,
    }).catch(() => { /* non-critical */ });

    currentPageRef.current = null;
  }, []);

  const sendEnd = useCallback((closedBy: string) => {
    const token = getToken();
    if (!token || isEndedRef.current) return;
    isEndedRef.current = true;

    // Flush the current page before ending the session
    flushCurrentPage();

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
  }, [flushCurrentPage]);

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

    // Record the first page immediately
    currentPageRef.current = {
      path: window.location.pathname,
      title: document.title,
      startedAt: Date.now(),
    };

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

  // ── Route change detection ─────────────────────────────────────────
  // Every time pathname changes: flush the OLD page, then start tracking the new one

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Flush the previous page visit (if any)
    flushCurrentPage();

    // Start tracking the new page
    currentPageRef.current = {
      path: pathname,
      title: document.title,
      startedAt: Date.now(),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Re-attach user info when session changes (login happening mid-tab)
  useEffect(() => {
    // When session becomes available (login finishes), immediately send a heartbeat
    // to link the anonymous web session to the user.
    const t = getToken();
    if (t && session?.user) {
      api.post('/sessions/web/heartbeat', { sessionToken: t }).catch(() => {});
    }
  }, [session]);
}
