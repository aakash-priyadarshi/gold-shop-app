"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
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

const TUTORIAL_VIDEO_URL = "https://images.orivraa.com/tutorial/hi";

const videoSchema = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "ओरिव्रा — ज्वेलरी शॉप सॉफ्टवेयर पूरा हिंदी ट्यूटोरियल 2026",
  description:
    "ओरिव्रा ज्वेलरी शॉप सॉफ्टवेयर का 24 मिनट का हिंदी ट्यूटोरियल। GST/VAT बिलिंग, POS ट्रांजेक्शन, वजन व शुद्धता से इन्वेंटरी, डिजिटल कैटलॉग, कारीगर ट्रैकिंग, टैक्स रिपोर्ट और AI बिजनेस इनसाइट्स का step-by-step demo।",
  thumbnailUrl: "https://www.orivraa.com/og-image.png",
  uploadDate: "2026-05-15",
  duration: "PT24M0S",
  contentUrl: TUTORIAL_VIDEO_URL,
  embedUrl: "https://www.orivraa.com/tutorial/hi",
  publisher: {
    "@type": "Organization",
    name: "Orivraa",
    url: "https://orivraa.com",
    logo: {
      "@type": "ImageObject",
      url: "https://www.orivraa.com/logo.png",
    },
  },
  inLanguage: "hi",
  hasPart: [
    { "@type": "Clip", name: "परिचय और Overview", startOffset: 8, url: "https://www.orivraa.com/tutorial/hi#t=8" },
    { "@type": "Clip", name: "Dashboard — Live Gold & Silver Prices", startOffset: 72, url: "https://www.orivraa.com/tutorial/hi#t=72" },
    { "@type": "Clip", name: "Inventory Management — वजन और शुद्धता", startOffset: 204, url: "https://www.orivraa.com/tutorial/hi#t=204" },
    { "@type": "Clip", name: "POS — Sale कैसे बनाएं", startOffset: 345, url: "https://www.orivraa.com/tutorial/hi#t=345" },
    { "@type": "Clip", name: "GST Invoice बनाना और Print करना", startOffset: 450, url: "https://www.orivraa.com/tutorial/hi#t=450" },
    { "@type": "Clip", name: "Digital Catalogue Builder", startOffset: 540, url: "https://www.orivraa.com/tutorial/hi#t=540" },
    { "@type": "Clip", name: "Customer Management & CRM", startOffset: 670, url: "https://www.orivraa.com/tutorial/hi#t=670" },
    { "@type": "Clip", name: "कारीगर Job & Account Tracking", startOffset: 800, url: "https://www.orivraa.com/tutorial/hi#t=800" },
    { "@type": "Clip", name: "Tax Engine — GST / VAT / CGST / SGST", startOffset: 940, url: "https://www.orivraa.com/tutorial/hi#t=940" },
    { "@type": "Clip", name: "Business Reports & Analytics", startOffset: 1070, url: "https://www.orivraa.com/tutorial/hi#t=1070" },
    { "@type": "Clip", name: "AI Business Insights", startOffset: 1170, url: "https://www.orivraa.com/tutorial/hi#t=1170" },
    { "@type": "Clip", name: "Mobile App & Multi-Branch Support", startOffset: 1290, url: "https://www.orivraa.com/tutorial/hi#t=1290" },
    { "@type": "Clip", name: "Pricing Plans & Free Trial", startOffset: 1380, url: "https://www.orivraa.com/tutorial/hi#t=1380" },
  ],
};

const CHAPTERS = [
  { time: "0:08",  label: "परिचय और Overview" },
  { time: "1:12",  label: "Dashboard — Live Gold & Silver Prices" },
  { time: "3:24",  label: "Inventory — वजन और शुद्धता से मैनेजमेंट" },
  { time: "5:45",  label: "POS — Sale बनाना" },
  { time: "7:30",  label: "GST Invoice बनाना और Print करना" },
  { time: "9:00",  label: "Digital Catalogue Builder" },
  { time: "11:10", label: "Customer Management & CRM" },
  { time: "13:20", label: "कारीगर Job & Account Tracking" },
  { time: "15:40", label: "Tax Engine — GST / VAT / CGST / SGST" },
  { time: "17:50", label: "Business Reports & Analytics" },
  { time: "19:30", label: "AI Business Insights" },
  { time: "21:30", label: "Mobile App & Multi-Branch Support" },
  { time: "23:00", label: "Pricing Plans & Free Trial" },
];

const FEATURES = [
  {
    icon: Scale,
    title: "वजन और शुद्धता से Inventory",
    desc: "हर item को gram, tola या ounce में track करें। Live market rates पर gold/silver की value auto-calculate होती है।",
  },
  {
    icon: Receipt,
    title: "GST / VAT Billing",
    desc: "एक click में tax-compliant invoice generate करें। India के लिए GST, UAE/UK के लिए VAT — सब supported।",
  },
  {
    icon: Store,
    title: "Fast POS",
    desc: "Barcode scan, metal-rate pricing और instant receipt printing के साथ तेज़ touchscreen POS।",
  },
  {
    icon: BookOpen,
    title: "Digital Catalogue",
    desc: "Photos, pricing और WhatsApp inquiry button के साथ shareable online catalogue publish करें।",
  },
  {
    icon: Users,
    title: "कारीगर Management",
    desc: "Artisan jobs, दिया/वापस लिया गया material, wages और outstanding balance — सब track करें।",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    desc: "Daily closing, best-selling items, slow movers, profit breakdown और tax summaries एक जगह।",
  },
  {
    icon: Sparkles,
    title: "AI Business Insights",
    desc: "अपने business के बारे में Hindi या English में सवाल पूछें। अपने data से instant जवाब पाएं।",
  },
  {
    icon: Smartphone,
    title: "सभी Devices पर काम करता है",
    desc: "Browser, Android, iOS और Windows desktop app। एक account, सभी devices।",
  },
];

const TRUST_POINTS = [
  "Live metal price — gold & silver हर मिनट update होते हैं",
  "India (GST), Nepal, UAE (VAT), UK और USA — सभी countries supported",
  "Free plan available — कोई credit card नहीं चाहिए",
  "Pro plans पर 30-दिन का free trial",
  "ISO-standard security — data encrypted at rest and in transit",
  "Invoice और order updates के लिए WhatsApp notifications",
];

export default function TutorialHiPage() {
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
            24 मिनट का पूरा Tutorial
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            ओरिव्रा ज्वेलरी शॉप सॉफ्टवेयर —{" "}
            <span className="text-amber-400">हिंदी में पूरा Tutorial</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">
            हर feature का step-by-step walkthrough: inventory, billing, POS,
            digital catalogue, कारीगर tracking, tax reports और AI insights।
          </p>
          <p className="text-sm text-gray-500">
            30-second overview चाहिए?{" "}
            <Link href="/demo" className="text-amber-400 underline hover:text-amber-300">
              Quick demo देखें
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
              aria-label="ओरिव्रा ज्वेलरी शॉप सॉफ्टवेयर का हिंदी ट्यूटोरियल वीडियो"
            >
              <source src={TUTORIAL_VIDEO_URL} type="video/mp4" />
              आपका browser HTML5 video support नहीं करता।{" "}
              <a href={TUTORIAL_VIDEO_URL} className="text-amber-400 underline">
                tutorial video download करें
              </a>
              ।
            </video>
          </div>

          <div className="flex items-center gap-3 mt-4 justify-end text-sm text-gray-500 flex-wrap">
            <span>Available in:</span>
            <Link
              href="/tutorial"
              className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors"
            >
              English
            </Link>
            <span className="bg-amber-500 text-gray-950 font-semibold px-2 py-0.5 rounded">
              हिन्दी
            </span>
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
            इस tutorial में क्या-क्या cover किया गया है
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
              ज्वेलरी शॉप को जो चाहिए — सब एक जगह
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              एक subscription में आपकी पूरी दुकान — weighing scale से GST returns तक।
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
            India, Nepal और UAE के ज्वेलरी शॉप ओरिव्रा क्यों choose करते हैं
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
            खुद try करके देखें?
          </h2>
          <p className="text-gray-400 mb-8">
            Free plan उपलब्ध है — कोई credit card नहीं चाहिए। India के लिए Pro plans ₹299/month से शुरू। सभी paid plans पर 30-दिन का full-featured trial।
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-7 py-3 rounded-xl transition-colors"
            >
              Free trial शुरू करें
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/jewellery-shop-software"
              className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-7 py-3 rounded-xl transition-colors"
            >
              सभी features देखें
            </Link>
          </div>
        </div>
      </section>

      {/* SEO TEXT */}
      <section className="sr-only" aria-hidden="false">
        <h2>ओरिव्रा ज्वेलरी शॉप सॉफ्टवेयर हिंदी ट्यूटोरियल वीडियो</h2>
        <p>
          ओरिव्रा एक complete ज्वेलरी शॉप management software है जो India, Nepal, UAE, UK
          और USA में gold shops, silver shops, और multi-branch jewellery stores द्वारा उपयोग किया जाता है।
          यह हिंदी tutorial video सभी key features का step-by-step walkthrough दिखाता है:
          GST और VAT support के साथ ज्वेलरी billing software, fast counter sales के लिए
          ज्वेलरी POS software, वजन/karat/purity से items track करने वाला ज्वेलरी inventory software,
          collection online share करने के लिए digital catalogue software, artisan work orders
          और metal track करने के लिए कारीगर management, और AI-powered business analytics।
        </p>
        <p>
          यह 2026 का best ज्वेलरी शॉप सॉफ्टवेयर हिंदी tutorial है सोना चांदी शॉप, सर्राफ शॉप,
          और modern jewellery retailers के लिए जो Marg ERP alternative, Vyapar alternative,
          या Jwelly ERP alternative ढूंढ रहे हैं जो mobile और desktop दोनों पर काम करे।
          Free ज्वेलरी billing software trial available। Jewellery software India, Nepal, UAE के लिए।
        </p>
      </section>

      <DynamicFooter />
    </div>
  );
}
