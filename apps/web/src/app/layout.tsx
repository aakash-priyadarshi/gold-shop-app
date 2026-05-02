import { AppTracking } from "@/components/AppTracking";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GeoMismatchBanner } from "@/components/layout/GeoMismatchBanner";
import { Providers } from "@/components/providers";
import { SupportBot } from "@/components/support/SupportBot";
import InitialLoadScreen from "@/components/ui/InitialLoadScreen";
import { Toaster } from "@/components/ui/toaster";
import { BRAND } from "@/config/brand";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.orivraa.com"),
  alternates: {
    canonical: "/",
    languages: {
      en: "https://www.orivraa.com",
      fr: "https://www.orivraa.com",
      de: "https://www.orivraa.com",
      hi: "https://www.orivraa.com",
      es: "https://www.orivraa.com",
      ar: "https://www.orivraa.com",
      ne: "https://www.orivraa.com",
      "x-default": "https://www.orivraa.com",
    },
  },
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
    ],
    url: "https://www.orivraa.com",
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
  verification: {
    // Add your Google Search Console verification ID here
    // google: 'your-verification-id',
  },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://www.orivraa.com/#organization",
                  name: BRAND.name,
                  url: "https://www.orivraa.com",
                  logo: {
                    "@type": "ImageObject",
                    url: "https://www.orivraa.com/brand/orivraa-icon.svg",
                  },
                  description: BRAND.seo.defaultDescription,
                  address: {
                    "@type": "PostalAddress",
                    addressLocality: "Kathmandu",
                    addressCountry: "NP",
                  },
                  areaServed: [
                    { "@type": "Country", name: "Nepal" },
                    { "@type": "Country", name: "India" },
                    { "@type": "Country", name: "United Arab Emirates" },
                    { "@type": "Country", name: "United States" },
                    { "@type": "Country", name: "United Kingdom" },
                  ],
                  knowsLanguage: ["en", "fr", "de", "hi", "es", "ar", "ne"],
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
                  "@id": "https://www.orivraa.com/#website",
                  url: "https://www.orivraa.com",
                  name: BRAND.name,
                  description: BRAND.seo.defaultDescription,
                  publisher: {
                    "@id": "https://www.orivraa.com/#organization",
                  },
                  inLanguage: ["en", "fr", "de", "hi", "es", "ar", "ne"],
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate:
                        "https://www.orivraa.com/shops?search={search_term_string}",
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
          <div style={{ padding: "40px 20px", maxWidth: "800px", margin: "0 auto", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
            <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>Orivraa — Premium Jewellery Marketplace</h1>
            <p style={{ fontSize: "14px", color: "#555", lineHeight: "1.6", marginBottom: "16px" }}>
              Orivraa is a SaaS marketplace platform that connects customers with verified local
              jewellers across Nepal, India, Dubai, USA &amp; UK. Browse ready-made gold, silver
              &amp; diamond pieces, request custom jewellery designs, receive competitive quotes,
              and track your orders — all in one secure platform.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "24px", fontSize: "14px" }}>
              <a href="/privacy" style={{ color: "#B8941F" }}>Privacy Policy</a>
              <a href="/terms" style={{ color: "#B8941F" }}>Terms of Service</a>
            </div>
          </div>
        </noscript>
        <Providers>
          <InitialLoadScreen>
            <ErrorBoundary>
              <GeoMismatchBanner />
              {children}
              <SupportBot />
              <Toaster />
              <SpeedInsights />
              <AppTracking />
            </ErrorBoundary>
          </InitialLoadScreen>
        </Providers>
      </body>
    </html>
  );
}
