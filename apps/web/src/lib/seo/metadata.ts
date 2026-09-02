import { SITE_URL } from "@/config/site";
import type { Metadata } from "next";

/** Default social preview image used across marketing pages. */
export const DEFAULT_OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "Orivraa jewellery shop software",
} as const;

export const MCP_OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "Orivraa seller AI keys and MCP integration for jewellery shops",
} as const;

/** Open Graph `language_TERRITORY` values aligned with the root layout. */
export const OPEN_GRAPH_LOCALES = {
  en: "en_US",
  fr: "fr_FR",
  de: "de_DE",
  hi: "hi_IN",
  es: "es_ES",
  ar: "ar_AE",
  ne: "ne_NP",
  gu: "gu_IN",
  mr: "mr_IN",
  ta: "ta_IN",
  te: "te_IN",
  kn: "kn_IN",
  si: "si_LK",
  he: "he_IL",
  yi: "yi_IL",
} as const;

export function openGraphLocaleForLang(lang: string): string {
  if (Object.prototype.hasOwnProperty.call(OPEN_GRAPH_LOCALES, lang)) {
    return OPEN_GRAPH_LOCALES[lang as keyof typeof OPEN_GRAPH_LOCALES];
  }
  return "en_US";
}

type MarketingOgVideo = {
  url: string;
  secureUrl?: string;
  type?: string;
};

type MarketingMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: { url: string; width: number; height: number; alt: string };
  type?: "website" | "article" | "video.other";
  videos?: MarketingOgVideo[];
  languages?: Record<string, string>;
  locale?: string;
  robots?: Metadata["robots"];
};

const BRAND_PATTERNS = [
  /orivraa/i,
  /أوريفرا/,
  /ओरिव्रा/,
  /ઓરિવ્રા/,
  /ಒರಿವ್ರಾ/,
  /ஒரிவ்ரா/,
  /ఒరివ్రా/,
  /אוריברה/,
  /אָריווראַ/,
  /ඔරිව්රා/,
];

/** Strip a trailing brand suffix, then add ` | Orivraa` once if the title is unbranded. */
export function brandPageTitle(title: string): string {
  const cleaned = title.replace(/\s*\|\s*Orivraa(?:\s*2026)?\s*$/i, "").trim();
  const alreadyBranded = BRAND_PATTERNS.some((pattern) => pattern.test(cleaned));
  if (alreadyBranded) return cleaned;
  return `${cleaned} | Orivraa`;
}

export function absolutePageTitle(title: string): { absolute: string } {
  return { absolute: brandPageTitle(title) };
}

export function buildMarketingMetadata(input: MarketingMetadataInput): Metadata {
  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const canonical = `${SITE_URL}${path}`;
  const ogImage = input.ogImage ?? DEFAULT_OG_IMAGE;
  const title = brandPageTitle(input.title);
  const ogTitle = brandPageTitle(input.ogTitle ?? input.title);
  const hasVideos = Boolean(input.videos && input.videos.length > 0);

  return {
    title: { absolute: title },
    description: input.description,
    keywords: input.keywords,
    alternates: {
      canonical,
      ...(input.languages ? { languages: input.languages } : {}),
    },
    openGraph: {
      title: ogTitle,
      description: input.ogDescription ?? input.description,
      url: canonical,
      type: input.type ?? (hasVideos ? "video.other" : "website"),
      siteName: "Orivraa",
      locale: input.locale ?? "en_US",
      images: [ogImage],
      ...(hasVideos ? { videos: input.videos } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: input.ogDescription ?? input.description,
      images: [ogImage.url],
    },
    robots: input.robots,
  };
}

export function buildFaqJsonLd(
  questions: Array<{ question: string; answer: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

