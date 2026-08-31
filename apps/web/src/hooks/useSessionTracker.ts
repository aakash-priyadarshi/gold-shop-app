'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import api, { getApiUrl } from '@/lib/api';

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

  /** Current full view path, including query string (so ?tab=… switches count) */
  const getCurrentViewPath = () =>
    typeof window !== 'undefined'
      ? window.location.pathname + window.location.search
      : '/';

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

  /**
   * Handle an in-app view change. Fires on pathname changes AND on in-route
   * changes (query-param / tab switches via history.pushState/replaceState).
   * Flushes the previous view and starts tracking the new one. Idempotent: if
   * the full path hasn't actually changed, it does nothing.
   */
  const handleViewChange = useCallback(() => {
    const token = getToken();
    if (!token) return;

    const fullPath = getCurrentViewPath();
    if (currentPageRef.current?.path === fullPath) return; // no real change

    flushCurrentPage();
    currentPageRef.current = {
      path: fullPath,
      title: document.title,
      startedAt: Date.now(),
    };
  }, [flushCurrentPage]);

  const sendEnd = useCallback((closedBy: string) => {
    const token = getToken();
    if (!token || isEndedRef.current) return;
    isEndedRef.current = true;

    // Flush the current page before ending the session
    flushCurrentPage();

    const payload = JSON.stringify({ sessionToken: token, closedBy });
    const endUrl = `${getApiUrl()}/sessions/web/end`;
    // sendBeacon is fire-and-forget, perfect for page unload
    const beaconSent = navigator.sendBeacon(
      endUrl,
      new Blob([payload], { type: 'application/json' }),
    );
    if (!beaconSent) {
      // Fallback to sync XHR on unload
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', endUrl, false);
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
      path: getCurrentViewPath(),
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

    // ── In-route view change detection ──────────────────────────────
    // The App Router pathname doesn't change for ?tab= / query-param switches,
    // so patch history.pushState/replaceState (and listen to popstate) to catch
    // SPA navigations that only change the query string.
    const origPushState = window.history.pushState;
    const origReplaceState = window.history.replaceState;
    const fireLocationChange = () =>
      window.dispatchEvent(new Event('orivraa:locationchange'));
    window.history.pushState = function (...args) {
      const result = origPushState.apply(this, args as Parameters<typeof origPushState>);
      fireLocationChange();
      return result;
    };
    window.history.replaceState = function (...args) {
      const result = origReplaceState.apply(this, args as Parameters<typeof origReplaceState>);
      fireLocationChange();
      return result;
    };
    window.addEventListener('popstate', fireLocationChange);
    window.addEventListener('orivraa:locationchange', handleViewChange);

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
      window.history.pushState = origPushState;
      window.history.replaceState = origReplaceState;
      window.removeEventListener('popstate', fireLocationChange);
      window.removeEventListener('orivraa:locationchange', handleViewChange);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('orivraa:logout', handleLogout);
      sessionTokenGlobal = null;
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Route change detection ─────────────────────────────────────────
  // Every time pathname changes: flush the OLD page, then start tracking the
  // new one. (Query-param/tab changes are handled by the history patch above.)

  useEffect(() => {
    handleViewChange();
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
