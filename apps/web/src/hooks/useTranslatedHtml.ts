"use client";

import { api } from "@/lib/api";
import { usePreferencesStore } from "@/store/preferences";
import { useCallback, useEffect, useRef, useState } from "react";

/* ── simple FNV-1a hash (fast, no crypto needed) ─────────── */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(36);
}

const LS_HTML_PREFIX = "orivraa_html_";

function cacheKey(locale: string, hash: string) {
  return `${LS_HTML_PREFIX}${locale}_${hash}`;
}

function loadCached(locale: string, hash: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(locale, hash));
    if (!raw) return null;
    const { html } = JSON.parse(raw);
    return html ?? null;
  } catch {
    return null;
  }
}

function saveCached(locale: string, hash: string, html: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(cacheKey(locale, hash), JSON.stringify({ html }));
  } catch {
    // localStorage full — ignore
  }
}

function removeCached(locale: string, hash: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(cacheKey(locale, hash));
  } catch {
    // ignore
  }
}

/**
 * Translates a block of HTML content server-side.
 *
 * - Returns original HTML for English locale.
 * - Caches in localStorage keyed by content hash + locale.
 * - Only calls API when the content hash changes or cache misses.
 */
export function useTranslatedHtml(html: string | undefined | null) {
  const locale = usePreferencesStore((s) => s.language);
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const hash = html ? fnv1a(html) : "";

  const fetchTranslation = useCallback(
    async (source: string, h: string, loc: string) => {
      // Check localStorage first
      const cached = loadCached(loc, h);
      if (cached && cached !== source) {
        setTranslated(cached);
        return;
      }
      if (cached === source) {
        removeCached(loc, h);
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const { data } = await api.post<{ html: string; translated?: boolean }>(
          "/translation/html",
          { html: source, locale: loc, contentHash: h },
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          setTranslated(data.html);
          if (data.translated !== false && data.html !== source) {
            saveCached(loc, h, data.html);
          } else {
            removeCached(loc, h);
          }
        }
      } catch (err: any) {
        if (err?.name !== "CanceledError" && err?.code !== "ERR_CANCELED") {
          console.warn("[i18n] HTML translation failed:", err);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!html || locale === "en") {
      setTranslated(null);
      return;
    }
    fetchTranslation(html, hash, locale);

    return () => {
      abortRef.current?.abort();
    };
  }, [html, hash, locale, fetchTranslation]);

  return {
    html: locale === "en" || !html ? (html ?? "") : (translated ?? html),
    loading,
  };
}
