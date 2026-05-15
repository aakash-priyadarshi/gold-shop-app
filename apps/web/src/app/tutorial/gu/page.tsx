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

const TUTORIAL_VIDEO_URL = "https://images.orivraa.com/tutorial/gu";

const videoSchema = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "Orivraa — ઝવેરી દુકાન સૉફ્ટવૅર સંપૂર્ણ ટ્યુટોરિયલ ગુજરાતીમાં 2026",
  description:
    "Orivraa ઝવેરી દુકાન સૉફ્ટવૅરની 24-મિનિટની સંપૂર્ણ ટ્યુટોરિયલ ગુજરાતીમાં. GST/VAT ઇન્વૉઇસ, POS ટ્રાન્ઝૅક્શન, વજન અને શુદ્ધતા આધારિત ઇન્વેન્ટ્રી, ડિજિટલ કૅટેલૉગ, કારીગર ટ્રૅકિંગ અને AI.",
  thumbnailUrl: "https://www.orivraa.com/og-image.png",
  uploadDate: "2026-05-15",
  duration: "PT24M0S",
  contentUrl: TUTORIAL_VIDEO_URL,
  embedUrl: "https://www.orivraa.com/tutorial/gu",
  publisher: {
    "@type": "Organization",
    name: "Orivraa",
    url: "https://orivraa.com",
    logo: { "@type": "ImageObject", url: "https://www.orivraa.com/logo.png" },
  },
  inLanguage: "gu",
};

const CHAPTERS = [
  { time: "0:08",  label: "પ્રસ્તાવના અને ઝાંખી" },
  { time: "1:12",  label: "ડૅશબૉર્ડ — સોના-ચાંદીના સીધા ભાવ" },
  { time: "3:24",  label: "વજન અને શુદ્ધતા આધારિત ઇન્વેન્ટ્રી" },
  { time: "5:45",  label: "POS — વેચાણ બનાવો" },
  { time: "7:30",  label: "GST ઇન્વૉઇસ બનાવવી અને છાપવી" },
  { time: "9:00",  label: "ડિજિટલ કૅટેલૉગ જનરેટર" },
  { time: "11:10", label: "ગ્રાહક મૅનૅજમૅન્ટ અને CRM" },
  { time: "13:20", label: "કારીગર ટ્રૅકિંગ અને ઍકાઉન્ટિંગ" },
  { time: "15:40", label: "ટૅક્સ એન્જિન — GST / VAT" },
  { time: "17:50", label: "રિપોર્ટ અને બિઝનૅસ ઍનૅલિટિક્સ" },
  { time: "19:30", label: "AI ઇનસાઇટ્સ" },
  { time: "21:30", label: "મોબાઇલ ઍપ અને મલ્ટી-શૉપ" },
  { time: "23:00", label: "ભાવ યોજનાઓ અને મફત ટ્રાયલ" },
];

const FEATURES = [
  { icon: Scale, title: "વજન અને શુદ્ધતા ઇન્વેન્ટ્રી", desc: "દરેક ઘરેણું ગ્રામ, તોલા અથવા ઔંસમાં નોંધો. સ્વચાલિત સોનાની કિંમત ગણતરી." },
  { icon: Receipt, title: "GST / VAT ઇન્વૉઇસ", desc: "ભારત માટે GST, EU માટે VAT — તત્કાળ ઇન્વૉઇસ." },
  { icon: Store, title: "ઝડપી POS", desc: "બારકૉડ સ્કૅનર, ધાતુ ભાવ ગણતરી અને તત્કાળ રસીદ." },
  { icon: BookOpen, title: "ડિજિટલ કૅટેલૉગ", desc: "ફોટો, ભાવ અને WhatsApp બટન સાથે શૅર કરી શકાય." },
  { icon: Users, title: "કારીગર ટ્રૅકિંગ", desc: "કામ, સામગ્રી, પગાર અને બાકી રકમ ટ્રૅક કરો." },
  { icon: BarChart3, title: "રિપોર્ટ", desc: "ડૅઇ ક્લૉઝિંગ, ટૉપ-સૅલ, ટૅક્સ સારાંશ." },
  { icon: Sparkles, title: "AI ઇનસાઇટ્સ", desc: "ગુજરાતી અથવા અંગ્રેજીમાં કોઈ પણ સવાલ પૂછો." },
  { icon: Smartphone, title: "બધા ઉપકરણ પર", desc: "Android, iOS, Windows ડૅસ્કટૉપ, બ્રાઉઝર." },
];

const TRUST_POINTS = [
  "સોના-ચાંદીના ભાવ દર મિનિટે અપડૅટ",
  "ભારત (GST), નેપાળ, EU (VAT), UK, USA ટ્રૅક્સ",
  "ફ્રી પ્લૅન ઉપલબ્ધ — ક્રૅડિટ કાર્ડ વગર",
  "30 દિવસ મફત ટ્રાયલ",
  "ISO સ્તર સુરક્ષા — ઍન્ક્રિપ્ટ ડૅટા",
  "WhatsApp નૉટિફિકૅશન",
];

export default function TutorialGuPage() {
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
            24-મિનિટ સંપૂર્ણ ટ્યુટોરિયલ
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            Orivraa — ઝવેરી સૉફ્ટવૅર{" "}
            <span className="text-amber-400">ગુજરાતીમાં સંપૂર્ણ ટ્યુટોરિયલ</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">
            ઇન્વેન્ટ્રી, GST ઇન્વૉઇસ, POS, ડિજિટલ કૅટેલૉગ, કારીગર ટ્રૅકિંગ, ટૅક્સ રિપોર્ટ અને AI.
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
              aria-label="Orivraa ઝવેરી સૉફ્ટવૅર સંપૂર્ણ ટ્યુટોરિયલ ગુજરાતીમાં"
            >
              <source src={TUTORIAL_VIDEO_URL} type="video/mp4" />
              <a href={TUTORIAL_VIDEO_URL} className="text-amber-400 underline">ટ્યુટોરિયલ ડાઉનલૉડ કરો</a>
            </video>
          </div>
          <div className="flex items-center gap-3 mt-4 justify-end text-sm text-gray-500 flex-wrap">
            <span>ઉપલબ્ધ ભાષા:</span>
            <Link href="/tutorial" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">English</Link>
            <Link href="/tutorial/hi" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">हिन्दी</Link>
            <Link href="/tutorial/ne" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">नेपाली</Link>
            <span className="bg-amber-500 text-gray-950 font-semibold px-2 py-0.5 rounded">ગુજરાતી</span>
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

      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-6">ટ્યુટોરિયલ ઇન્ડૅક્સ</h2>
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
            <h2 className="text-3xl font-bold text-white mb-3">ઝવેરી દુકાન માટે સર્વ-ઉકેલ — એક જ સ્થળે</h2>
            <p className="text-gray-400 max-w-xl mx-auto">એક સબ્સ્ક્રિપ્શน — ત્રાજવાથી GST રિપોર્ટ સુધી.</p>
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
          <h2 className="text-2xl font-bold text-white mb-8 text-center">ઝવેરી Orivraa કેમ પસંદ કરે છે</h2>
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
          <h2 className="text-2xl font-bold text-white mb-3">અજમાવવા માટે તૈયાર?</h2>
          <p className="text-gray-400 mb-8">
            ફ્રી પ્લૅન ઉપલબ્ધ — ક્રૅડિટ કાર્ડ વગર. Pro ₹299/મહિનો. 30 દિવસ મફત ટ્રાયલ.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-7 py-3 rounded-xl transition-colors"
            >
              મફત શરૂ કરો <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/tutorial"
              className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-7 py-3 rounded-xl transition-colors"
            >
              અંગ્રેજીમાં જુઓ
            </Link>
          </div>
        </div>
      </section>

      <DynamicFooter />
    </div>
  );
}
