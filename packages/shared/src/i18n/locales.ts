export const UI_LOCALE_CODES = [
  "en",
  "hi",
  "ne",
  "gu",
  "mr",
  "ta",
  "te",
  "kn",
  "si",
  "fr",
  "de",
  "es",
  "ar",
  "he",
  "yi",
] as const;

export type UiLocale = (typeof UI_LOCALE_CODES)[number];
export type LocaleDirection = "ltr" | "rtl";

export interface LocaleDefinition {
  name: string;
  nativeName: string;
  direction: LocaleDirection;
  intlLocale: string;
}

/** Single source of truth for locales supported by the application UI. */
export const LOCALE_REGISTRY: Record<UiLocale, LocaleDefinition> = {
  en: {
    name: "English",
    nativeName: "English",
    direction: "ltr",
    intlLocale: "en-US",
  },
  hi: {
    name: "Hindi",
    nativeName: "हिन्दी",
    direction: "ltr",
    intlLocale: "hi-IN",
  },
  ne: {
    name: "Nepali",
    nativeName: "नेपाली",
    direction: "ltr",
    intlLocale: "ne-NP",
  },
  gu: {
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    direction: "ltr",
    intlLocale: "gu-IN",
  },
  mr: {
    name: "Marathi",
    nativeName: "मराठी",
    direction: "ltr",
    intlLocale: "mr-IN",
  },
  ta: {
    name: "Tamil",
    nativeName: "தமிழ்",
    direction: "ltr",
    intlLocale: "ta-IN",
  },
  te: {
    name: "Telugu",
    nativeName: "తెలుగు",
    direction: "ltr",
    intlLocale: "te-IN",
  },
  kn: {
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    direction: "ltr",
    intlLocale: "kn-IN",
  },
  si: {
    name: "Sinhala",
    nativeName: "සිංහල",
    direction: "ltr",
    intlLocale: "si-LK",
  },
  fr: {
    name: "French",
    nativeName: "Français",
    direction: "ltr",
    intlLocale: "fr-FR",
  },
  de: {
    name: "German",
    nativeName: "Deutsch",
    direction: "ltr",
    intlLocale: "de-DE",
  },
  es: {
    name: "Spanish",
    nativeName: "Español",
    direction: "ltr",
    intlLocale: "es-ES",
  },
  ar: {
    name: "Arabic",
    nativeName: "العربية",
    direction: "rtl",
    intlLocale: "ar-AE",
  },
  he: {
    name: "Hebrew",
    nativeName: "עברית",
    direction: "rtl",
    intlLocale: "he-IL",
  },
  yi: {
    name: "Yiddish",
    nativeName: "ייִדיש",
    direction: "rtl",
    intlLocale: "yi",
  },
};

export const DEFAULT_UI_LOCALE: UiLocale = "en";

export interface LocaleGroup {
  id: "international" | "south-asia" | "europe" | "middle-east";
  label: string;
  locales: readonly UiLocale[];
}

/** Grouped language list for the header / dashboard mega menu. */
export const LOCALE_GROUPS: readonly LocaleGroup[] = [
  { id: "international", label: "International", locales: ["en"] },
  {
    id: "south-asia",
    label: "South Asia",
    locales: ["hi", "ne", "gu", "mr", "ta", "te", "kn", "si"],
  },
  { id: "europe", label: "Europe", locales: ["fr", "de", "es"] },
  { id: "middle-east", label: "Middle East", locales: ["ar", "he", "yi"] },
];

export function isUiLocale(value: unknown): value is UiLocale {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(LOCALE_REGISTRY, value)
  );
}

export function getLocaleDirection(locale: UiLocale): LocaleDirection {
  return LOCALE_REGISTRY[locale].direction;
}

export function filterLocaleGroups(query: string): LocaleGroup[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return LOCALE_GROUPS.map((group) => ({
      ...group,
      locales: [...group.locales],
    }));
  }

  return LOCALE_GROUPS.map((group) => ({
    ...group,
    locales: group.locales.filter((code) => {
      const def = LOCALE_REGISTRY[code];
      return (
        code.toLowerCase().includes(needle) ||
        def.name.toLowerCase().includes(needle) ||
        def.nativeName.toLowerCase().includes(needle)
      );
    }),
  })).filter((group) => group.locales.length > 0);
}

const collatorCache = new Map<string, Intl.Collator>();

/** Resolve a BCP-47 tag for `Intl.Collator` from a UI locale or raw locale string. */
export function getIntlLocale(locale: string | null | undefined): string {
  if (isUiLocale(locale)) {
    return LOCALE_REGISTRY[locale].intlLocale;
  }
  return typeof locale === "string" && locale.trim() ? locale : "en";
}

function getCollator(locale: string | null | undefined): Intl.Collator {
  const tag = getIntlLocale(locale);
  let collator = collatorCache.get(tag);
  if (!collator) {
    collator = new Intl.Collator(tag, { sensitivity: "base", numeric: true });
    collatorCache.set(tag, collator);
  }
  return collator;
}

/**
 * Locale-aware string compare (Alef-Bet for Hebrew/Yiddish, dictionary order
 * elsewhere). Use for names on the current result page; do not rely on
 * Postgres byte order for Hebrew or Yiddish.
 */
export function compareByLocale(
  a: string | null | undefined,
  b: string | null | undefined,
  locale: string | null | undefined,
  order: "asc" | "desc" = "asc",
): number {
  const result = getCollator(locale).compare(a ?? "", b ?? "");
  return order === "desc" ? -result : result;
}

export function sortByLocale<T>(
  items: readonly T[],
  getName: (item: T) => string | null | undefined,
  locale: string | null | undefined,
  order: "asc" | "desc" = "asc",
): T[] {
  return [...items].sort((left, right) =>
    compareByLocale(getName(left), getName(right), locale, order),
  );
}
