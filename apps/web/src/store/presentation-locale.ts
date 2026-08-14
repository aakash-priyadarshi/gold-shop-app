import { create } from "zustand";
import { LANGUAGES, type Language } from "@/store/preferences";

/**
 * Non-persisted locale override for public surfaces (catalogue, etc.).
 * Lets a page follow the shop's language without writing the visitor's
 * saved preference.
 */
interface PresentationLocaleState {
  locale: Language | null;
  setLocale: (locale: Language | null) => void;
}

export function parseShopLanguage(raw?: string | null): Language {
  if (raw && raw in LANGUAGES) return raw as Language;
  return "en";
}

export const usePresentationLocaleStore = create<PresentationLocaleState>(
  (set) => ({
    locale: null,
    setLocale: (locale) => set({ locale }),
  }),
);
