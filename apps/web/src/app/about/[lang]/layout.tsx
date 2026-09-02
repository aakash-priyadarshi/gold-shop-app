import {
  ABOUT_CONTENT,
  LIVE_PLATFORMS,
  SUPPORTED_ABOUT_LANGS,
  type Language,
  type PublicAboutLanguage,
} from "@/data/about-i18n";
import {
  ABOUT_SUMMARY_CONTENT,
  isAboutSummaryLanguage,
} from "@/data/about-summary-i18n";
import { BRAND } from "@/config/brand";
import { SITE_URL } from "@/config/site";
import { buildMarketingMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

const BASE_URL = SITE_URL;

const SOCIAL_PROFILES = [
  "https://twitter.com/orivraa",
  "https://instagram.com/orivraa",
  "https://facebook.com/orivraa",
  "https://linkedin.com/company/orivraa",
];

function getSeoContent(lang: Language) {
  return isAboutSummaryLanguage(lang)
    ? ABOUT_SUMMARY_CONTENT[lang]
    : ABOUT_CONTENT[lang];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  if (!SUPPORTED_ABOUT_LANGS.includes(rawLang as PublicAboutLanguage)) {
    return {};
  }
  const lang = rawLang as PublicAboutLanguage;
  const c = getSeoContent(lang);

  const languages: Record<string, string> = { en: `${BASE_URL}/about` };
  for (const l of SUPPORTED_ABOUT_LANGS) {
    languages[l] = `${BASE_URL}/about/${l}`;
  }

  return buildMarketingMetadata({
    title: c.metaTitle,
    description: c.metaDescription,
    path: `/about/${lang}`,
    languages,
    locale: lang,
  });
}

function generateJsonLd(lang: Language) {
  const c = getSeoContent(lang);

  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Orivraa",
      url: BASE_URL,
      logo: `${BASE_URL}/logo.png`,
      description: c.metaDescription,
      foundingDate: "2024",
      founder: {
        "@type": "Organization",
        name: "Orivraa Technologies Pvt. Ltd.",
      },
      address: {
        "@type": "PostalAddress",
        addressLocality: "Patna",
        addressRegion: "Bihar",
        addressCountry: "IN",
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: BRAND.contact.supportEmail,
        contactType: "customer service",
        availableLanguage: [
          "English",
          "Hindi",
          "Nepali",
          "Gujarati",
          "Marathi",
          "Tamil",
          "Telugu",
          "Kannada",
          "Sinhala",
          "Hebrew",
          "Yiddish",
          "French",
          "German",
          "Spanish",
          "Arabic",
        ],
      },
      sameAs: [...SOCIAL_PROFILES, ...LIVE_PLATFORMS.map((p) => p.url)],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: c.metaTitle,
      description: c.metaDescription,
      url: `${BASE_URL}/about/${lang}`,
      inLanguage: lang,
      isPartOf: { "@type": "WebSite", url: BASE_URL },
    },
  ];
}

export default async function LocalizedAboutLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang = (
    SUPPORTED_ABOUT_LANGS.includes(rawLang as PublicAboutLanguage)
      ? rawLang
      : "en"
  ) as Language;
  const jsonLd = generateJsonLd(lang);

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {children}
    </>
  );
}
