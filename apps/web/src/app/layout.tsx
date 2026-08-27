import { AppTracking } from "@/components/AppTracking";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GeoMismatchBanner } from "@/components/layout/GeoMismatchBanner";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { SupportBotClient } from "@/components/support/SupportBotClient";
import { Toaster } from "@/components/ui/toaster";
import { BRAND } from "@/config/brand";
import { SITE_URL, MOBILE_SITE_URL } from "@/config/site";
import { mapCountryToMarket } from "@/lib/geo";
import { getLocaleDirection, isUiLocale } from "@gold-shop/shared";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION;

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: BRAND.seo.title,
    template: BRAND.seo.titleTemplate,
  },
  description: BRAND.seo.defaultDescription,
  keywords: BRAND.seo.keywords,
  authors: [{ name: BRAND.companyName }],
  creator: BRAND.name,
  publisher: BRAND.name,
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: [
      "en_GB",
      "en_IN",
      "fr_FR",
      "de_DE",
      "hi_IN",
      "es_ES",
      "ar_AE",
      "ne_NP",
      "gu_IN",
      "mr_IN",
      "ta_IN",
      "te_IN",
      "kn_IN",
      "si_LK",
      "he_IL",
    ],
    url: SITE_URL,
    siteName: BRAND.name,
    title: BRAND.seo.title,
    description: BRAND.seo.defaultDescription,
    images: [
      {
        url: "/brand/orivraa-icon.svg",
        width: 512,
        height: 512,
        alt: `${BRAND.name} - ${BRAND.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@orivraa",
    creator: "@orivraa",
    title: BRAND.seo.title,
    description: BRAND.seo.defaultDescription,
    images: ["/brand/orivraa-icon.svg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/orivraa-icon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: googleSiteVerification
    ? {
        google: googleSiteVerification,
      }
    : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const rawPathname = headersList.get("x-pathname") || "/";
  // Strip trailing slash if present (except for root path)
  const pathname = rawPathname === "/" ? "" : rawPathname;

  const host = headersList.get("host") || "";
  const isMobileDomain = host.startsWith("m.");
  const initialCountry = mapCountryToMarket(
    headersList.get("cf-ipcountry") || headersList.get("x-vercel-ip-country"),
  );

  // Build absolute URLs
  const canonicalUrl = `${SITE_URL}${pathname || "/"}`;
  const alternateUrl = `${MOBILE_SITE_URL}${pathname || "/"}`;
  // Public localized pages are server-rendered under their real, stable
  // routes. Generic pages stay English; the client provider can still update
  // the document after a user changes the dashboard language preference.
  const routeLocale = pathname.match(
    /^\/(?:about|tutorial)\/([a-z]{2})(?:\/|$)/,
  )?.[1];
  const documentLocale =
    routeLocale && isUiLocale(routeLocale) ? routeLocale : "en";
  const documentDirection = getLocaleDirection(documentLocale);

  return (
    <html
      lang={documentLocale}
      dir={documentDirection}
      suppressHydrationWarning
      className={inter.variable}
    >
      <head>
        {/* Dynamic absolute canonical & mobile alternates relationships */}
        <link rel="canonical" href={canonicalUrl} />
        {!isMobileDomain && (
          <link
            rel="alternate"
            media="only screen and (max-width: 640px)"
            href={alternateUrl}
          />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#organization`,
                  name: BRAND.name,
                  url: SITE_URL,
                  logo: {
                    "@type": "ImageObject",
                    url: `${SITE_URL}/brand/orivraa-icon.svg`,
                  },
                  description: BRAND.seo.defaultDescription,
                  address: {
                    "@type": "PostalAddress",
                    addressLocality: "Patna",
                    addressRegion: "Bihar",
                    addressCountry: "IN",
                  },
                  areaServed: [
                    { "@type": "Country", name: "Nepal" },
                    { "@type": "Country", name: "India" },
                    { "@type": "Country", name: "United Arab Emirates" },
                    { "@type": "Country", name: "United States" },
                    { "@type": "Country", name: "United Kingdom" },
                    { "@type": "Country", name: "Sri Lanka" },
                    { "@type": "Country", name: "Israel" },
                  ],
                  knowsLanguage: [
                    "en",
                    "fr",
                    "de",
                    "hi",
                    "es",
                    "ar",
                    "ne",
                    "gu",
                    "mr",
                    "ta",
                    "te",
                    "kn",
                    "si",
                    "he",
                    "yi",
                  ],
                  availableLanguage: [
                    {
                      "@type": "Language",
                      name: "English",
                      alternateName: "en",
                    },
                    {
                      "@type": "Language",
                      name: "French",
                      alternateName: "fr",
                    },
                    {
                      "@type": "Language",
                      name: "German",
                      alternateName: "de",
                    },
                    { "@type": "Language", name: "Hindi", alternateName: "hi" },
                    {
                      "@type": "Language",
                      name: "Spanish",
                      alternateName: "es",
                    },
                    {
                      "@type": "Language",
                      name: "Arabic",
                      alternateName: "ar",
                    },
                    {
                      "@type": "Language",
                      name: "Nepali",
                      alternateName: "ne",
                    },
                    {
                      "@type": "Language",
                      name: "Gujarati",
                      alternateName: "gu",
                    },
                    {
                      "@type": "Language",
                      name: "Marathi",
                      alternateName: "mr",
                    },
                    {
                      "@type": "Language",
                      name: "Tamil",
                      alternateName: "ta",
                    },
                    {
                      "@type": "Language",
                      name: "Telugu",
                      alternateName: "te",
                    },
                    {
                      "@type": "Language",
                      name: "Kannada",
                      alternateName: "kn",
                    },
                    {
                      "@type": "Language",
                      name: "Sinhala",
                      alternateName: "si",
                    },
                    {
                      "@type": "Language",
                      name: "Hebrew",
                      alternateName: "he",
                    },
                    {
                      "@type": "Language",
                      name: "Yiddish",
                      alternateName: "yi",
                    },
                  ],
                  sameAs: [
                    BRAND.social?.instagram,
                    BRAND.social?.twitter,
                    BRAND.social?.facebook,
                    BRAND.social?.linkedin,
                    "https://www.producthunt.com/products/orivraa",
                    "https://www.crunchbase.com/organization/orivraa",
                    "https://www.g2.com/products/orivraa/reviews",
                    "https://www.capterra.com/p/orivraa/",
                    "https://alternativeto.net/software/orivraa/",
                    "https://www.saashub.com/orivraa",
                    "https://betalist.com/startups/orivraa",
                    "https://startupbase.io/startups/orivraa",
                    "https://www.f6s.com/orivraa",
                  ].filter(Boolean),
                  foundingDate: "2024",
                },
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  url: SITE_URL,
                  name: BRAND.name,
                  description: BRAND.seo.defaultDescription,
                  publisher: {
                    "@id": `${SITE_URL}/#organization`,
                  },
                  inLanguage: [
                    "en",
                    "fr",
                    "de",
                    "hi",
                    "es",
                    "ar",
                    "ne",
                    "gu",
                    "mr",
                    "ta",
                    "te",
                    "kn",
                    "si",
                    "he",
                    "yi",
                  ],
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: `${SITE_URL}/shops?search={search_term_string}`,
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${inter.className} antialiased bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100`}
      >
        {/* Fallback for crawlers/bots that don't execute JS */}
        <noscript>
          <div
            style={{
              padding: "40px 20px",
              maxWidth: "800px",
              margin: "0 auto",
              textAlign: "center",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
              Orivraa — Premium Jewellery Marketplace
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#555",
                lineHeight: "1.6",
                marginBottom: "16px",
              }}
            >
              Orivraa is a SaaS marketplace platform that connects customers
              with verified local jewellers across Nepal, India, Dubai, USA
              &amp; UK. Browse ready-made gold, silver &amp; diamond pieces,
              request custom jewellery designs, receive competitive quotes, and
              track your orders — all in one secure platform.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "24px",
                fontSize: "14px",
              }}
            >
              <a href="/privacy" style={{ color: "#B8941F" }}>
                Privacy Policy
              </a>
              <a href="/terms" style={{ color: "#B8941F" }}>
                Terms of Service
              </a>
            </div>
          </div>
        </noscript>
        <Providers initialCountry={initialCountry}>
          <ErrorBoundary>
            <GeoMismatchBanner />
            {children}
            <SupportBotClient />
            <Toaster />
            <AppTracking />
            <ServiceWorkerRegistrar />
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
