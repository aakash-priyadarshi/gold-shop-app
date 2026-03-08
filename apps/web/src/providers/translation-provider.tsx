"use client";

import { api } from "@/lib/api";
import { usePreferencesStore, type Language } from "@/store/preferences";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ────────────────────────────────────────────────────────────── */
/*  Types                                                         */
/* ────────────────────────────────────────────────────────────── */

interface TranslationContextValue {
  /** Current locale */
  locale: Language;
  /** Get translation for an English string (returns original while loading) */
  t: (text: string) => string;
  /** Register text for batch translation — called by <T> on mount */
  register: (text: string) => void;
  /** True while a translation batch is in-flight */
  loading: boolean;
}

const TranslationContext = createContext<TranslationContextValue>({
  locale: "en",
  t: (text) => text,
  register: () => {},
  loading: false,
});

/* ────────────────────────────────────────────────────────────── */
/*  localStorage cache helpers                                    */
/* ────────────────────────────────────────────────────────────── */

const LS_KEY_PREFIX = "orivraa_i18n_";

function loadFromStorage(locale: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`${LS_KEY_PREFIX}${locale}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStorage(locale: string, dict: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${LS_KEY_PREFIX}${locale}`, JSON.stringify(dict));
  } catch {
    // localStorage full — ignore
  }
}

/* ────────────────────────────────────────────────────────────── */
/*  Provider                                                      */
/* ────────────────────────────────────────────────────────────── */

export function TranslationProvider({ children }: { children: ReactNode }) {
  const locale = usePreferencesStore((s) => s.language);
  const [dict, setDict] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Pending texts collected between flushes
  const pending = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const inflightRef = useRef(false);

  // Load localStorage cache when locale changes
  useEffect(() => {
    if (locale === "en") {
      setDict({});
      return;
    }
    setDict(loadFromStorage(locale));
  }, [locale]);

  // Flush pending texts → API → dict + localStorage
  const flush = useCallback(async () => {
    if (locale === "en" || pending.current.size === 0 || inflightRef.current)
      return;

    const texts = Array.from(pending.current);
    pending.current.clear();
    inflightRef.current = true;
    setLoading(true);

    try {
      const { data } = await api.post<{ translations: string[] }>(
        "/translation/batch",
        { texts, locale },
      );

      setDict((prev) => {
        const next = { ...prev };
        texts.forEach((t, i) => {
          if (data.translations[i]) next[t] = data.translations[i];
        });
        saveToStorage(locale, next);
        return next;
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[i18n] Translation batch failed:", err);
    } finally {
      inflightRef.current = false;
      setLoading(false);

      // If more texts were registered while in-flight, flush again
      if (pending.current.size > 0) {
        timer.current = setTimeout(flush, 50);
      }
    }
  }, [locale]);

  // Register text for translation. Debounced to batch together.
  const register = useCallback(
    (text: string) => {
      if (locale === "en" || dict[text]) return;
      pending.current.add(text);
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, 150);
    },
    [locale, dict, flush],
  );

  // Lookup: returns translation or original English string
  const t = useCallback(
    (text: string) => {
      if (locale === "en") return text;
      return dict[text] || text;
    },
    [locale, dict],
  );

  return (
    <TranslationContext.Provider value={{ locale, t, register, loading }}>
      {children}
    </TranslationContext.Provider>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  Hooks                                                         */
/* ────────────────────────────────────────────────────────────── */

/** Use translation context */
export function useTranslation() {
  return useContext(TranslationContext);
}

/**
 * Shorthand hook: returns a `t()` function that
 * translates English text to the current locale.
 *
 * Usage:
 *   const t = useT();
 *   return <p>{t("Welcome to Orivraa")}</p>;
 */
export function useT() {
  return useContext(TranslationContext).t;
}
