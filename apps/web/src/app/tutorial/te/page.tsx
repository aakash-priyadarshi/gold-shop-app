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

const TUTORIAL_VIDEO_URL = "https://images.orivraa.com/tutorial/te";

const videoSchema = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "Orivraa — జువెలరీ షాప్ సాఫ్ట్‌వేర్ సంపూర్ణ ట్యుటోరియల్ తెలుగులో 2026",
  description:
    "Orivraa జువెలరీ షాప్ సాఫ్ట్‌వేర్ యొక్క 24-నిమిషాల సంపూర్ణ ట్యుటోరియల్ తెలుగులో. GST/VAT ఇన్వాయిస్, POS లావాదేవీలు, బరువు మరియు స్వచ్ఛత ఆధారిత ఇన్వెంటరీ, డిజిటల్ కాటలాగ్, కళాకారుడి ట్రాకింగ్ మరియు AI.",
  thumbnailUrl: "https://www.orivraa.com/og-image.png",
  uploadDate: "2026-05-15",
  duration: "PT24M0S",
  contentUrl: TUTORIAL_VIDEO_URL,
  embedUrl: "https://www.orivraa.com/tutorial/te",
  publisher: {
    "@type": "Organization",
    name: "Orivraa",
    url: "https://orivraa.com",
    logo: { "@type": "ImageObject", url: "https://www.orivraa.com/logo.png" },
  },
  inLanguage: "te",
};

const CHAPTERS = [
  { time: "0:08",  label: "పరిచయం మరియు అవలోకనం" },
  { time: "1:12",  label: "డాష్‌బోర్డ్ — బంగారం మరియు వెండి నేరుగా ధరలు" },
  { time: "3:24",  label: "బరువు మరియు స్వచ్ఛత ఆధారిత ఇన్వెంటరీ" },
  { time: "5:45",  label: "POS — అమ్మకం సృష్టించండి" },
  { time: "7:30",  label: "GST ఇన్వాయిస్ రూపొందించడం మరియు ముద్రించడం" },
  { time: "9:00",  label: "డిజిటల్ కాటలాగ్ జనరేటర్" },
  { time: "11:10", label: "కస్టమర్ మేనేజ్‌మెంట్ మరియు CRM" },
  { time: "13:20", label: "కళాకారుడి ట్రాకింగ్ మరియు అకౌంటింగ్" },
  { time: "15:40", label: "పన్ను ఇంజిన్ — GST / VAT" },
  { time: "17:50", label: "నివేదికలు మరియు వ్యాపార విశ్లేషణ" },
  { time: "19:30", label: "AI అంతర్దృష్టులు" },
  { time: "21:30", label: "మొబైల్ యాప్ మరియు మల్టీ-షాప్" },
  { time: "23:00", label: "ధర ప్రణాళికలు మరియు ఉచిత ట్రయల్" },
];

const FEATURES = [
  { icon: Scale, title: "బరువు మరియు స్వచ్ఛత ఇన్వెంటరీ", desc: "ప్రతి ఆభరణాన్ని గ్రాముల్లో, తొల్లాల్లో లేదా ఔన్సుల్లో నమోదు చేయండి. స్వయంచాలకంగా బంగారం విలువ లెక్కింపు." },
  { icon: Receipt, title: "GST / VAT ఇన్వాయిస్", desc: "భారతదేశానికి GST, EU కి VAT — తక్షణ ఇన్వాయిస్." },
  { icon: Store, title: "వేగవంతమైన POS", desc: "బార్‌కోడ్ స్కానర్, లోహ ధర లెక్కింపు మరియు తక్షణ రసీదు." },
  { icon: BookOpen, title: "డిజిటల్ కాటలాగ్", desc: "ఫోటోలు, ధరలు మరియు WhatsApp బటన్‌తో షేర్ చేయగల కాటలాగ్." },
  { icon: Users, title: "కళాకారుడి ట్రాకింగ్", desc: "పని, పదార్థాలు, జీతాలు మరియు బాకీ మొత్తాలు ట్రాక్ చేయండి." },
  { icon: BarChart3, title: "నివేదికలు", desc: "రోజువారీ క్లోజింగ్, టాప్-సేల్, పన్ను సారాంశం." },
  { icon: Sparkles, title: "AI అంతర్దృష్టులు", desc: "తెలుగులో లేదా ఆంగ్లంలో ఏదైనా ప్రశ్న అడగండి." },
  { icon: Smartphone, title: "అన్ని పరికరాలలో", desc: "Android, iOS, Windows డెస్క్‌టాప్, బ్రౌజర్." },
];

const TRUST_POINTS = [
  "బంగారం-వెండి ధరలు ప్రతి నిమిషం అప్‌డేట్",
  "భారతదేశం (GST), నేపాల్, EU (VAT), UK, USA మద్దతు",
  "ఉచిత ప్లాన్ అందుబాటులో ఉంది — క్రెడిట్ కార్డు అవసరం లేదు",
  "30 రోజుల ఉచిత ట్రయల్",
  "ISO స్థాయి భద్రత — ఎన్‌క్రిప్టెడ్ డేటా",
  "WhatsApp నోటిఫికేషన్లు",
];

export default function TutorialTePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }}
      />
      <Header />

      <section className="pt-20 pb-8 px-4 text-center bg-gradient-to-b from-gray-900 to-gray-950">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block bg-amber-500/10 text-amber-400 text-sm font-semibold px-3 py-1 rounded-full border border-amber-500/20 mb-4">
            24-నిమిషాల సంపూర్ణ ట్యుటోరియల్
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            Orivraa — జువెలరీ సాఫ్ట్‌వేర్{" "}
            <span className="text-amber-400">తెలుగులో సంపూర్ణ ట్యుటోరియల్</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">
            ఇన్వెంటరీ, GST ఇన్వాయిస్, POS, డిజిటల్ కాటలాగ్, కళాకారుడి ట్రాకింగ్, పన్ను నివేదికలు మరియు AI.
          </p>
        </div>
      </section>

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
              aria-label="Orivraa జువెలరీ సాఫ్ట్‌వేర్ సంపూర్ణ ట్యుటోరియల్ తెలుగులో"
            >
              <source src={TUTORIAL_VIDEO_URL} type="video/mp4" />
              <a href={TUTORIAL_VIDEO_URL} className="text-amber-400 underline">ట్యుటోరియల్ డౌన్‌లోడ్ చేయండి</a>
            </video>
          </div>
          <div className="flex items-center gap-3 mt-4 justify-end text-sm text-gray-500 flex-wrap">
            <span>అందుబాటులో ఉన్న భాషలు:</span>
            <Link href="/tutorial" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">English</Link>
            <Link href="/tutorial/hi" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">हिन्दी</Link>
            <Link href="/tutorial/ne" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">नेपाली</Link>
            <Link href="/tutorial/gu" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">ગુજરાતી</Link>
            <Link href="/tutorial/mr" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">मराठी</Link>
            <Link href="/tutorial/ta" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">தமிழ்</Link>
            <span className="bg-amber-500 text-gray-950 font-semibold px-2 py-0.5 rounded">తెలుగు</span>
            <Link href="/tutorial/kn" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">ಕನ್ನಡ</Link>
            <Link href="/tutorial/fr" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">Français</Link>
            <Link href="/tutorial/de" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">Deutsch</Link>
            <Link href="/tutorial/es" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">Español</Link>
            <Link href="/tutorial/ar" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">العربية</Link>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-6">ట్యుటోరియల్ ఇండెక్స్</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CHAPTERS.map(({ time, label }) => (
              <div key={time} className="flex items-center gap-3 bg-gray-900 rounded-lg px-4 py-3 border border-white/5">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-mono text-amber-400 text-sm w-12 shrink-0">{time}</span>
                <span className="text-gray-300 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 bg-gray-900/50">
        <div className="max-w-6xl mx-auto py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">జువెలరీ షాప్‌కు అవసరమైనవన్నీ — ఒకే చోట</h2>
            <p className="text-gray-400 max-w-xl mx-auto">ఒకే సభ్యత్వం — తూనికల నుండి GST నివేదికల వరకు.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-gray-900 rounded-xl p-5 border border-white/5 hover:border-amber-500/30 transition-colors">
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

      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">జువెలర్లు Orivraa ఎందుకు ఎంచుకుంటారు</h2>
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

      <section className="px-4 pb-24">
        <div className="max-w-2xl mx-auto text-center bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-2xl border border-amber-500/20 p-10">
          <ShieldCheck className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">ప్రయత్నించడానికి సిద్ధంగా ఉన్నారా?</h2>
          <p className="text-gray-400 mb-8">
            ఉచిత ప్లాన్ అందుబాటులో ఉంది — క్రెడిట్ కార్డు అవసరం లేదు. Pro ₹299/నెల. 30 రోజుల ఉచిత ట్రయల్.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-7 py-3 rounded-xl transition-colors"
            >
              ఉచితంగా ప్రారంభించండి <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/tutorial"
              className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-7 py-3 rounded-xl transition-colors"
            >
              ఆంగ్లంలో చూడండి
            </Link>
          </div>
        </div>
      </section>

      <DynamicFooter />
    </div>
  );
}
