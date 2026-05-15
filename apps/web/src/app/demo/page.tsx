"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { ArrowRight, PlayCircle } from "lucide-react";
import Link from "next/link";

// 30-second screenshot reel served from Cloudflare R2 via orivraa-images worker.
const SHORT_DEMO_URL = "https://images.orivraa.com/demo/en";

const videoSchema = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "Orivraa — 30-Second Jewellery Shop Software Demo 2026",
  description:
    "Quick 30-second visual demo of Orivraa jewellery shop software showing the live dashboard, smart inventory by weight & purity, lightning POS, GST/VAT invoices, digital catalogues, business analytics, and AI insights.",
  thumbnailUrl: "https://www.orivraa.com/og-image.png",
  uploadDate: "2026-05-15",
  duration: "PT30S",
  contentUrl: SHORT_DEMO_URL,
  embedUrl: "https://www.orivraa.com/demo",
  publisher: {
    "@type": "Organization",
    name: "Orivraa",
    url: "https://orivraa.com",
    logo: {
      "@type": "ImageObject",
      url: "https://www.orivraa.com/logo.png",
    },
  },
  inLanguage: "en",
};

const HIGHLIGHTS = [
  { t: "0:00", l: "Live Dashboard — gold & silver rates" },
  { t: "0:04", l: "Smart Inventory by weight & purity" },
  { t: "0:08", l: "Lightning POS with barcode scan" },
  { t: "0:12", l: "GST / VAT compliant invoices" },
  { t: "0:16", l: "Digital catalogues — share on WhatsApp" },
  { t: "0:20", l: "Reports, GSTR1 & daily closing" },
  { t: "0:24", l: "AI business insights in plain English" },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }}
      />

      <Header />

      {/* HERO */}
      <section className="pt-20 pb-8 px-4 text-center bg-gradient-to-b from-gray-900 to-gray-950">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-amber-500/10 text-amber-400 text-sm font-semibold px-3 py-1 rounded-full border border-amber-500/20 mb-4">
            30-Second Quick Demo
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            See Orivraa in <span className="text-amber-400">30 seconds</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            A blink-and-miss tour of the all-in-one jewellery shop software —
            inventory, POS, GST billing, catalogues, and AI insights.
          </p>
        </div>
      </section>

      {/* VIDEO PLAYER */}
      <section className="px-4 pb-8">
        <div className="max-w-3xl mx-auto">
          <div
            className="relative w-full rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
            style={{ paddingTop: "56.25%" }}
          >
            <video
              className="absolute inset-0 w-full h-full bg-black"
              autoPlay
              muted
              loop
              playsInline
              controls
              preload="metadata"
              poster="https://www.orivraa.com/og-image.png"
              aria-label="Orivraa jewellery shop software 30 second demo video"
            >
              <source src={SHORT_DEMO_URL} type="video/mp4" />
              Your browser does not support HTML5 video. Please{" "}
              <a href={SHORT_DEMO_URL} className="text-amber-400 underline">
                download the demo video
              </a>
              .
            </video>
          </div>
        </div>
      </section>

      {/* HIGHLIGHTS */}
      <section className="px-4 pb-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold text-white mb-4 text-center">
            What you just saw
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {HIGHLIGHTS.map(({ t, l }) => (
              <div
                key={t}
                className="flex items-center gap-3 bg-gray-900 rounded-lg px-4 py-2.5 border border-white/5 text-sm"
              >
                <span className="font-mono text-amber-400 w-10 shrink-0">{t}</span>
                <span className="text-gray-300">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — full tutorial */}
      <section className="px-4 pb-16">
        <div className="max-w-2xl mx-auto text-center bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-2xl border border-amber-500/20 p-8">
          <PlayCircle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Want the detailed tutorial?
          </h2>
          <p className="text-gray-400 mb-6">
            Our full 24-minute walkthrough covers every feature live — inventory,
            POS, GST/VAT billing, karigar tracking, tax engine, and AI insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/tutorial"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Watch the 24-min tutorial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-6 py-3 rounded-xl transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </section>

      {/* SEO TEXT */}
      <section className="sr-only" aria-hidden="false">
        <h2>Orivraa jewellery shop software demo video</h2>
        <p>
          This 30-second demo video shows Orivraa, the all-in-one jewellery shop
          management software. The quick visual tour highlights the live dashboard
          with real-time gold and silver rates, smart inventory tracked by weight
          and purity, a lightning-fast POS with barcode scanning, GST and VAT
          compliant invoices, digital catalogues sharable on WhatsApp, business
          analytics including daily closing and GSTR1 reports, and AI-powered
          business insights you can ask in plain English.
        </p>
        <p>
          Looking for a longer Orivraa walkthrough? Watch the full 24-minute
          tutorial at /tutorial. Free jewellery shop software trial available for
          shops in India, Nepal, UAE, the UK, and the USA. Best jewellery shop
          software demo 2026 for sona chandi shops, sarraf shops, and modern
          multi-branch jewellery retailers.
        </p>
      </section>

      <DynamicFooter />
    </div>
  );
}
