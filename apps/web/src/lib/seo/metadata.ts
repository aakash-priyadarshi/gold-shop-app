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

type MarketingMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: { url: string; width: number; height: number; alt: string };
  type?: "website" | "article";
};

/** Strip a trailing brand suffix, then add ` | Orivraa` once if the title is unbranded. */
export function brandPageTitle(title: string): string {
  const cleaned = title.replace(/\s*\|\s*Orivraa(?:\s*2026)?\s*$/i, "").trim();
  if (/orivraa/i.test(cleaned)) return cleaned;
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

  return {
    title: { absolute: title },
    description: input.description,
    keywords: input.keywords,
    alternates: { canonical },
    openGraph: {
      title: ogTitle,
      description: input.ogDescription ?? input.description,
      url: canonical,
      type: input.type ?? "website",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: input.ogDescription ?? input.description,
      images: [ogImage.url],
    },
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
