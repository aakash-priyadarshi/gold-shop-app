import {
    ABOUT_CONTENT,
    LIVE_PLATFORMS,
    SUPPORTED_ABOUT_LANGS,
    type AboutContentLanguage,
} from "@/data/about-i18n";
import { Metadata } from "next";

const BASE_URL = "https://www.orivraa.com";

const SOCIAL_PROFILES = [
  "https://twitter.com/orivraa",
  "https://instagram.com/orivraa",
  "https://facebook.com/orivraa",
  "https://linkedin.com/company/orivraa",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  if (!SUPPORTED_ABOUT_LANGS.includes(rawLang as AboutContentLanguage)) {
    return {};
  }
  const lang = rawLang as AboutContentLanguage;
  const c = ABOUT_CONTENT[lang];

  const languages: Record<string, string> = { en: `${BASE_URL}/about` };
  for (const l of SUPPORTED_ABOUT_LANGS) {
    languages[l] = `${BASE_URL}/about/${l}`;
  }

  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: {
      canonical: `${BASE_URL}/about/${lang}`,
      languages,
    },
    openGraph: {
      title: c.metaTitle,
      description: c.metaDescription,
      url: `${BASE_URL}/about/${lang}`,
      locale: lang,
      type: "website",
      siteName: "Orivraa",
    },
    other: {
      "content-language": lang,
    },
  };
}

function generateJsonLd(lang: AboutContentLanguage) {
  const c = ABOUT_CONTENT[lang];

  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Orivraa",
      url: BASE_URL,
      logo: `${BASE_URL}/logo.png`,
      description: c.metaDescription,
      foundingDate: "2024",
      founder: { "@type": "Organization", name: "Orivraa Technologies Pvt. Ltd." },
      address: {
        "@type": "PostalAddress",
        addressLocality: "Kathmandu",
        addressCountry: "NP",
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@orivraa.com",
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
  const lang = (SUPPORTED_ABOUT_LANGS.includes(rawLang as AboutContentLanguage) ? rawLang : "en") as AboutContentLanguage;
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
