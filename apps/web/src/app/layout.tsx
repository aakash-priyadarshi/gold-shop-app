import { GeoMismatchBanner } from "@/components/layout/GeoMismatchBanner";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { BRAND } from "@/config/brand";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
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
    siteName: BRAND.name,
    title: BRAND.seo.title,
    description: BRAND.seo.defaultDescription,
    images: [
      {
        url: "/brand/orivraa-og.png",
        width: 1200,
        height: 630,
        alt: BRAND.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.seo.title,
    description: BRAND.seo.defaultDescription,
    images: ["/brand/orivraa-og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/brand/orivraa-icon.svg", type: "image/svg+xml" },
    ],
    apple: "/brand/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
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
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <GeoMismatchBanner />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
