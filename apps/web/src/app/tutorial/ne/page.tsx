"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    Check,
    Clock,
    Receipt,
    Scale,
    ShieldCheck,
    Smartphone,
    Sparkles,
    Store,
    Users,
} from "lucide-react";
import Link from "next/link";

const TUTORIAL_VIDEO_URL = "https://images.orivraa.com/tutorial/ne";

const videoSchema = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "ओरिव्रा — गहना पसल सफ्टवेयर सम्पूर्ण नेपाली ट्यूटोरियल 2026",
  description:
    "ओरिव्रा गहना पसल सफ्टवेयरको २४ मिनेटको नेपाली ट्यूटोरियल। GST/VAT बिलिङ, POS Transaction, तौल र शुद्धताद्वारा Inventory, Digital Catalogue, कारीगर Tracking, Tax Report र AI Business Insights को step-by-step demo।",
  thumbnailUrl: "https://www.orivraa.com/og-image.png",
  uploadDate: "2026-05-15",
  duration: "PT24M0S",
  contentUrl: TUTORIAL_VIDEO_URL,
  embedUrl: "https://www.orivraa.com/tutorial/ne",
  publisher: {
    "@type": "Organization",
    name: "Orivraa",
    url: "https://orivraa.com",
    logo: {
      "@type": "ImageObject",
      url: "https://www.orivraa.com/logo.png",
    },
  },
  inLanguage: "ne",
  hasPart: [
    { "@type": "Clip", name: "परिचय र Overview", startOffset: 8, url: "https://www.orivraa.com/tutorial/ne#t=8" },
    { "@type": "Clip", name: "Dashboard — Live Gold & Silver Prices", startOffset: 72, url: "https://www.orivraa.com/tutorial/ne#t=72" },
    { "@type": "Clip", name: "Inventory — तौल र शुद्धताद्वारा व्यवस्थापन", startOffset: 204, url: "https://www.orivraa.com/tutorial/ne#t=204" },
    { "@type": "Clip", name: "POS — Sale बनाउने तरिका", startOffset: 345, url: "https://www.orivraa.com/tutorial/ne#t=345" },
    { "@type": "Clip", name: "GST Invoice बनाउने र Print गर्ने", startOffset: 450, url: "https://www.orivraa.com/tutorial/ne#t=450" },
    { "@type": "Clip", name: "Digital Catalogue Builder", startOffset: 540, url: "https://www.orivraa.com/tutorial/ne#t=540" },
    { "@type": "Clip", name: "Customer Management र CRM", startOffset: 670, url: "https://www.orivraa.com/tutorial/ne#t=670" },
    { "@type": "Clip", name: "कारीगर Job र Account Tracking", startOffset: 800, url: "https://www.orivraa.com/tutorial/ne#t=800" },
    { "@type": "Clip", name: "Tax Engine — GST / VAT / CGST / SGST", startOffset: 940, url: "https://www.orivraa.com/tutorial/ne#t=940" },
    { "@type": "Clip", name: "Business Reports र Analytics", startOffset: 1070, url: "https://www.orivraa.com/tutorial/ne#t=1070" },
    { "@type": "Clip", name: "AI Business Insights", startOffset: 1170, url: "https://www.orivraa.com/tutorial/ne#t=1170" },
    { "@type": "Clip", name: "Mobile App र Multi-Branch Support", startOffset: 1290, url: "https://www.orivraa.com/tutorial/ne#t=1290" },
    { "@type": "Clip", name: "Pricing Plans र Free Trial", startOffset: 1380, url: "https://www.orivraa.com/tutorial/ne#t=1380" },
  ],
};

const CHAPTERS = [
  { time: "0:08",  label: "परिचय र Overview" },
  { time: "1:12",  label: "Dashboard — Live Gold & Silver Prices" },
  { time: "3:24",  label: "Inventory — तौल र शुद्धताद्वारा व्यवस्थापन" },
  { time: "5:45",  label: "POS — Sale बनाउने तरिका" },
  { time: "7:30",  label: "GST Invoice बनाउने र Print गर्ने" },
  { time: "9:00",  label: "Digital Catalogue Builder" },
  { time: "11:10", label: "Customer Management र CRM" },
  { time: "13:20", label: "कारीगर Job र Account Tracking" },
  { time: "15:40", label: "Tax Engine — GST / VAT / CGST / SGST" },
  { time: "17:50", label: "Business Reports र Analytics" },
  { time: "19:30", label: "AI Business Insights" },
  { time: "21:30", label: "Mobile App र Multi-Branch Support" },
  { time: "23:00", label: "Pricing Plans र Free Trial" },
];

const FEATURES = [
  {
    icon: Scale,
    title: "तौल र शुद्धताद्वारा Inventory",
    desc: "प्रत्येक item लाई gram, tola वा ounce मा track गर्नुस्। Live market rate मा gold/silver को value auto-calculate हुन्छ।",
  },
  {
    icon: Receipt,
    title: "GST / VAT Billing",
    desc: "एक click मा tax-compliant invoice generate गर्नुस्। India को लागि GST, UAE/UK को लागि VAT — सबै supported छ।",
  },
  {
    icon: Store,
    title: "Fast POS",
    desc: "Barcode scan, metal-rate pricing र instant receipt printing सहित touchscreen POS।",
  },
  {
    icon: BookOpen,
    title: "Digital Catalogue",
    desc: "Photos, pricing र WhatsApp inquiry button सहित shareable online catalogue publish गर्नुस्।",
  },
  {
    icon: Users,
    title: "कारीगर Management",
    desc: "कारीगर jobs, दिएको/फिर्ता गरेको material, wages र outstanding balance — सबै track गर्नुस्।",
  },
  {
    icon: BarChart3,
    title: "Analytics र Reports",
    desc: "Daily closing, best-selling items, slow movers, profit breakdown र tax summaries एकै ठाउँमा।",
  },
  {
    icon: Sparkles,
    title: "AI Business Insights",
    desc: "आफ्नो business बारे नेपालीमा वा अङ्ग्रेजीमा प्रश्न सोध्नुस्। आफ्नै data बाट तुरुन्त जवाफ पाउनुस्।",
  },
  {
    icon: Smartphone,
    title: "सबै Devices मा काम गर्छ",
    desc: "Browser, Android, iOS र Windows desktop app। एउटै account, सबै devices।",
  },
];

const TRUST_POINTS = [
  "Live metal price — gold र silver हरेक मिनेट update हुन्छ",
  "India (GST), Nepal, UAE (VAT), UK र USA — सबै countries supported",
  "Free plan उपलब्ध — कुनै credit card चाहिँदैन",
  "Pro plans मा ३०-दिनको free trial",
  "ISO-standard security — data encrypted at rest and in transit",
  "Invoice र order updates को लागि WhatsApp notifications",
];

export default function TutorialNePage() {
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
            २४ मिनेटको सम्पूर्ण Tutorial
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            ओरिव्रा गहना पसल सफ्टवेयर —{" "}
            <span className="text-amber-400">नेपालीमा सम्पूर्ण Tutorial</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">
            हरेक feature को step-by-step walkthrough: inventory, billing, POS,
            digital catalogue, कारीगर tracking, tax reports र AI insights।
          </p>
          <p className="text-sm text-gray-500">
            ३०-सेकेन्डको overview चाहिन्छ?{" "}
            <Link href="/demo" className="text-amber-400 underline hover:text-amber-300">
              Quick demo हेर्नुस्
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
              aria-label="ओरिव्रा गहना पसल सफ्टवेयर नेपाली ट्यूटोरियल भिडियो"
            >
              <source src={TUTORIAL_VIDEO_URL} type="video/mp4" />
              तपाईंको browser ले HTML5 video support गर्दैन।{" "}
              <a href={TUTORIAL_VIDEO_URL} className="text-amber-400 underline">
                tutorial video download गर्नुस्
              </a>
              ।
            </video>
          </div>

          <div className="flex items-center gap-3 mt-4 justify-end text-sm text-gray-500 flex-wrap">
            <span>Available in:</span>
            <Link href="/tutorial" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">English</Link>
            <Link href="/tutorial/hi" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">हिन्दी</Link>
            <span className="bg-amber-500 text-gray-950 font-semibold px-2 py-0.5 rounded">नेपाली</span>
            <Link href="/tutorial/gu" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">ગુજરાતી</Link>
            <Link href="/tutorial/mr" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">मराठी</Link>
            <Link href="/tutorial/ta" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">தமிழ்</Link>
            <Link href="/tutorial/te" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">తెలుగు</Link>
            <Link href="/tutorial/kn" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">ಕನ್ನಡ</Link>
            <Link href="/tutorial/fr" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">Français</Link>
            <Link href="/tutorial/de" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">Deutsch</Link>
            <Link href="/tutorial/es" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">Español</Link>
            <Link href="/tutorial/ar" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">العربية</Link>
          </div>
        </div>
      </section>

      {/* CHAPTER INDEX */}
      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-6">
            यस tutorial मा के-के cover गरिएको छ
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
              गहना पसललाई जे चाहिन्छ — सबै एकै ठाउँमा
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              एउटै subscription मा तपाईंको पूरा पसल — weighing scale देखि GST returns सम्म।
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
            India, Nepal र UAE का गहना पसलहरूले ओरिव्रा किन रोज्छन्
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
            आफैं try गरेर हेर्नुहोस्?
          </h2>
          <p className="text-gray-400 mb-8">
            Free plan उपलब्ध छ — कुनै credit card चाहिँदैन। India को लागि Pro plans ₹299/month देखि सुरु। सबै paid plans मा ३०-दिनको full-featured trial।
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-7 py-3 rounded-xl transition-colors"
            >
              Free trial सुरु गर्नुस्
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/jewellery-shop-software"
              className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-7 py-3 rounded-xl transition-colors"
            >
              सबै features हेर्नुस्
            </Link>
          </div>
        </div>
      </section>

      {/* SEO TEXT */}
      <section className="sr-only" aria-hidden="false">
        <h2>ओरिव्रा गहना पसल सफ्टवेयर नेपाली ट्यूटोरियल भिडियो</h2>
        <p>
          ओरिव्रा एक complete गहना पसल management software हो जो India, Nepal, UAE, UK
          र USA मा gold shops, silver shops, र multi-branch jewellery stores द्वारा प्रयोग गरिन्छ।
          यो नेपाली tutorial video सबै key features को step-by-step walkthrough देखाउँछ:
          GST र VAT support सहित ज्वेलरी billing software, fast counter sales को लागि
          ज्वेलरी POS software, तौल/karat/purity ले items track गर्ने ज्वेलरी inventory software,
          collection online share गर्न digital catalogue software, artisan work orders
          र metal track गर्न कारीगर management, र AI-powered business analytics।
        </p>
        <p>
          यो 2026 को best गहना पसल सफ्टवेयर नेपाली tutorial हो सर्राफ पसल, सुनचाँदी पसल,
          र modern jewellery retailers को लागि जो mobile र desktop दुवैमा काम गर्ने software खोज्दैछन्।
          Free jewellery billing software trial available। Jewellery software India, Nepal, UAE को लागि।
        </p>
      </section>

      <DynamicFooter />
    </div>
  );
}
