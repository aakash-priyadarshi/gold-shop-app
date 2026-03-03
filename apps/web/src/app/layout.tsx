import { GeoMismatchBanner } from "@/components/layout/GeoMismatchBanner";
import { Providers } from "@/components/providers";
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
      { url: "/favicon/favicon.ico" },
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
                  sameAs: [
                    BRAND.social?.instagram,
                    BRAND.social?.twitter,
                    BRAND.social?.facebook,
                    BRAND.social?.linkedin,
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
        <Providers>
          <InitialLoadScreen>
            <GeoMismatchBanner />
            {children}
            <Toaster />
            <SpeedInsights />
          </InitialLoadScreen>
        </Providers>
      </body>
    </html>
  );
}
