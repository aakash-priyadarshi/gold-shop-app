/**
 * Voiced /tutorial walkthrough locales that the Cloudflare images worker
 * actually serves (`SUPPORTED_DEMO_LANGS`). UI translation also includes
 * Sinhala (`si`) and Hebrew (`he`), but those have no R2 tutorial assets yet.
 */
export const TUTORIAL_VIDEO_LINKS = [
  { locale: "en", label: "English", url: "https://orivraa.com/tutorial" },
  {
    locale: "hi",
    label: "Hindi (हिन्दी)",
    url: "https://orivraa.com/tutorial/hi",
  },
  {
    locale: "ne",
    label: "Nepali (नेपाली)",
    url: "https://orivraa.com/tutorial/ne",
  },
  {
    locale: "gu",
    label: "Gujarati (ગુજરાતી)",
    url: "https://orivraa.com/tutorial/gu",
  },
  {
    locale: "mr",
    label: "Marathi (मराठी)",
    url: "https://orivraa.com/tutorial/mr",
  },
  { locale: "ta", label: "Tamil (தமிழ்)", url: "https://orivraa.com/tutorial/ta" },
  {
    locale: "te",
    label: "Telugu (తెలుగు)",
    url: "https://orivraa.com/tutorial/te",
  },
  {
    locale: "kn",
    label: "Kannada (ಕನ್ನಡ)",
    url: "https://orivraa.com/tutorial/kn",
  },
  {
    locale: "fr",
    label: "French (Français)",
    url: "https://orivraa.com/tutorial/fr",
  },
  {
    locale: "de",
    label: "German (Deutsch)",
    url: "https://orivraa.com/tutorial/de",
  },
  {
    locale: "es",
    label: "Spanish (Español)",
    url: "https://orivraa.com/tutorial/es",
  },
  {
    locale: "ar",
    label: "Arabic (العربية)",
    url: "https://orivraa.com/tutorial/ar",
  },
] as const;

export const TUTORIAL_VIDEO_LOCALE_CODES = TUTORIAL_VIDEO_LINKS.map(
  (link) => link.locale,
);

/** Prompt block listing only locales the demo worker can actually serve. */
export function formatTutorialVideoPromptLines(): string {
  const lines = TUTORIAL_VIDEO_LINKS.map(
    (link) => `  · ${link.label}: ${link.url}`,
  );
  return [
    `- Full 24-minute walkthrough tutorial available in ${TUTORIAL_VIDEO_LINKS.length} languages:`,
    ...lines,
  ].join("\n");
}
