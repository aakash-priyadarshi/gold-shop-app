"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import {
  ArrowRight,
  BookOpen,
  BarChart3,
  Check,
  Clock,
  Package,
  Receipt,
  Scale,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";

// 24-minute voiced walkthrough served from Cloudflare R2 via orivraa-images worker.
const TUTORIAL_VIDEO_URL = "https://images.orivraa.com/tutorial/en";

// Schema.org VideoObject — enables Google rich results / video carousel.
const videoSchema = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "Orivraa — Complete Jewellery Shop Software Tutorial 2026",
  description:
    "Full 24-minute step-by-step tutorial of Orivraa jewellery shop software. Watch live walkthroughs of GST/VAT billing, POS transactions, inventory by weight & purity, digital catalogues, karigar tracking, tax engine, and AI-powered business insights.",
  thumbnailUrl: "https://www.orivraa.com/og-image.png",
  uploadDate: "2026-05-15",
  duration: "PT24M0S",
  contentUrl: TUTORIAL_VIDEO_URL,
  embedUrl: "https://www.orivraa.com/tutorial",
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
  hasPart: [
    { "@type": "Clip", name: "Introduction & overview", startOffset: 8, url: "https://www.orivraa.com/tutorial#t=8" },
    { "@type": "Clip", name: "Dashboard — live gold & silver prices", startOffset: 72, url: "https://www.orivraa.com/tutorial#t=72" },
    { "@type": "Clip", name: "Inventory management by weight & purity", startOffset: 204, url: "https://www.orivraa.com/tutorial#t=204" },
    { "@type": "Clip", name: "Point of Sale (POS) — create a sale", startOffset: 345, url: "https://www.orivraa.com/tutorial#t=345" },
    { "@type": "Clip", name: "GST invoice generation & printing", startOffset: 450, url: "https://www.orivraa.com/tutorial#t=450" },
    { "@type": "Clip", name: "Digital catalogue builder", startOffset: 540, url: "https://www.orivraa.com/tutorial#t=540" },
    { "@type": "Clip", name: "Customer management & CRM", startOffset: 670, url: "https://www.orivraa.com/tutorial#t=670" },
    { "@type": "Clip", name: "Karigar (artisan) job & account tracking", startOffset: 800, url: "https://www.orivraa.com/tutorial#t=800" },
    { "@type": "Clip", name: "Tax engine — GST / VAT / CGST / SGST", startOffset: 940, url: "https://www.orivraa.com/tutorial#t=940" },
    { "@type": "Clip", name: "Business reports & analytics", startOffset: 1070, url: "https://www.orivraa.com/tutorial#t=1070" },
    { "@type": "Clip", name: "AI business insights", startOffset: 1170, url: "https://www.orivraa.com/tutorial#t=1170" },
    { "@type": "Clip", name: "Mobile app & multi-branch support", startOffset: 1290, url: "https://www.orivraa.com/tutorial#t=1290" },
    { "@type": "Clip", name: "Pricing plans & free trial", startOffset: 1380, url: "https://www.orivraa.com/tutorial#t=1380" },
  ],
};

const CHAPTERS = [
  { time: "0:08", label: "Introduction & overview" },
  { time: "1:12", label: "Dashboard — live gold & silver prices" },
  { time: "3:24", label: "Inventory management by weight & purity" },
  { time: "5:45", label: "Point of Sale (POS) — create a sale" },
  { time: "7:30", label: "GST invoice generation & printing" },
  { time: "9:00", label: "Digital catalogue builder" },
  { time: "11:10", label: "Customer management & CRM" },
  { time: "13:20", label: "Karigar (artisan) job & account tracking" },
  { time: "15:40", label: "Tax engine — GST / VAT / CGST / SGST" },
  { time: "17:50", label: "Business reports & analytics" },
  { time: "19:30", label: "AI business insights" },
  { time: "21:30", label: "Mobile app & multi-branch support" },
  { time: "23:00", label: "Pricing plans & free trial" },
];

const FEATURES = [
  {
    icon: Scale,
    title: "Weight & purity inventory",
    desc: "Track every item by gram, tola, or ounce. Auto-calculate gold / silver value at live market rates.",
  },
  {
    icon: Receipt,
    title: "GST / VAT billing",
    desc: "Generate tax-compliant invoices instantly. GST for India, VAT for UAE/UK, zero-rated exports — covered.",
  },
  {
    icon: Store,
    title: "POS in seconds",
    desc: "Fast touchscreen POS with barcode scan, metal-rate pricing, and instant receipt printing.",
  },
  {
    icon: BookOpen,
    title: "Digital catalogue",
    desc: "Publish a shareable online catalogue with photos, pricing, and a WhatsApp inquiry button.",
  },
  {
    icon: Users,
    title: "Karigar management",
    desc: "Track artisan jobs, material issued vs returned, wages, and outstanding balances.",
  },
  {
    icon: BarChart3,
    title: "Analytics & reports",
    desc: "Daily closing, best-selling items, slow movers, profit breakdown, and tax summaries.",
  },
  {
    icon: Sparkles,
    title: "AI business insights",
    desc: "Ask plain-English questions about your business. Get instant answers from your own data.",
  },
  {
    icon: Smartphone,
    title: "Works everywhere",
    desc: "Browser, Android, iOS, and Windows desktop app. One account, all devices.",
  },
];

const TRUST_POINTS = [
  "Live metal price feeds — gold & silver update every minute",
  "Supports India (GST), Nepal, UAE (VAT), UK, and USA out of the box",
  "Free plan available — no credit card required",
  "30-day free trial on Pro plans",
  "ISO-standard security, data encrypted at rest and in transit",
  "WhatsApp notifications for invoices and order updates",
];

export default function TutorialPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }}
      />

      <Header />

      {/* HERO */}
      <section className="pt-20 pb-8 px-4 text-center bg-gradient-to-b from-gray-900 to-gray-950">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block bg-amber-500/10 text-amber-400 text-sm font-semibold px-3 py-1 rounded-full border border-amber-500/20 mb-4">
            Full 24-min Tutorial
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            Orivraa Jewellery Shop Software —{" "}
            <span className="text-amber-400">Complete Tutorial</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">
            Step-by-step walkthrough of every feature: inventory, billing, POS,
            digital catalogues, karigars, tax reports, and AI insights.
          </p>
          <p className="text-sm text-gray-500">
            Looking for the 30-second overview instead?{" "}
            <Link href="/demo" className="text-amber-400 underline hover:text-amber-300">
              Watch the quick demo
            </Link>
          </p>
        </div>
      </section>

      {/* VIDEO PLAYER */}
      <section className="px-4 pb-12">
        <div className="max-w-5xl mx-auto">
          <div
            className="relative w-full rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
            style={{ paddingTop: "56.25%" }}
          >
            <video
              className="absolute inset-0 w-full h-full bg-black"
              controls
              preload="metadata"
              poster="https://www.orivraa.com/og-image.png"
              aria-label="Orivraa jewellery shop software complete tutorial video"
            >
              <source src={TUTORIAL_VIDEO_URL} type="video/mp4" />
              Your browser does not support HTML5 video. Please{" "}
              <a href={TUTORIAL_VIDEO_URL} className="text-amber-400 underline">
                download the tutorial video
              </a>
              .
            </video>
          </div>

          <div className="flex items-center gap-3 mt-4 justify-end text-sm text-gray-500 flex-wrap">
            <span>Available in:</span>
            <span className="bg-amber-500 text-gray-950 font-semibold px-2 py-0.5 rounded">
              English
            </span>
            <Link
              href="/tutorial/hi"
              className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors"
            >
              हिन्दी
            </Link>
            <Link
              href="/tutorial/ne"
              className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors"
            >
              नेपाली
            </Link>
            <Link
              href="/tutorial/es"
              className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors"
            >
              Español
            </Link>
            <Link
              href="/tutorial/ar"
              className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors"
            >
              العربية
            </Link>
          </div>
        </div>
      </section>

      {/* CHAPTER INDEX */}
      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-6">
            What&apos;s covered in this tutorial
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CHAPTERS.map(({ time, label }) => (
              <div
                key={time}
                className="flex items-center gap-3 bg-gray-900 rounded-lg px-4 py-3 border border-white/5"
              >
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-mono text-amber-400 text-sm w-12 shrink-0">
                  {time}
                </span>
                <span className="text-gray-300 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE GRID */}
      <section className="px-4 pb-20 bg-gray-900/50">
        <div className="max-w-6xl mx-auto py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">
              Everything a jewellery shop needs
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              One subscription covers your entire shop — from the weighing scale to
              GST returns.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-gray-900 rounded-xl p-5 border border-white/5 hover:border-amber-500/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            Why jewellery shops across India, Nepal, and UAE choose Orivraa
          </h2>
          <ul className="space-y-3">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-gray-300">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24">
        <div className="max-w-2xl mx-auto text-center bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-2xl border border-amber-500/20 p-10">
          <ShieldCheck className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">
            Ready to try it yourself?
          </h2>
          <p className="text-gray-400 mb-8">
            Free plan, no credit card required. Pro plans start at ₹299/month for
            India. Full-featured 30-day trial on all paid plans.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-7 py-3 rounded-xl transition-colors"
            >
              Start free trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/jewellery-shop-software"
              className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-7 py-3 rounded-xl transition-colors"
            >
              See all features
            </Link>
          </div>
        </div>
      </section>

      {/* SEO TEXT */}
      <section className="sr-only" aria-hidden="false">
        <h2>Orivraa jewellery shop software tutorial video</h2>
        <p>
          Orivraa is a complete jewellery shop management software used by gold shops,
          silver shops, and multi-branch jewellery stores in India, Nepal, UAE, the UK,
          and the USA. This tutorial video shows a full step-by-step walkthrough of all
          key features: jewellery billing software with GST and VAT support, jewellery
          POS software for fast counter sales, jewellery inventory software that tracks
          items by weight, karat, and purity, digital catalogue software to share your
          collection online, karigar management to track artisan work orders and metal
          issued, and AI-powered business analytics.
        </p>
        <p>
          This is the best jewellery shop software tutorial 2026 for sona chandi shops,
          sarraf shops, and modern jewellery retailers looking for a Marg ERP alternative,
          Vyapar alternative, or Jwelly ERP alternative that works on mobile and desktop.
          Free jewellery billing software trial available. Jewellery software India,
          Nepal, UAE prices shown. <Link href="/tutorial/hi">Hindi tutorial</Link> is now live.
        </p>
      </section>

      <DynamicFooter />
    </div>
  );
}
