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

const TUTORIAL_VIDEO_URL = "https://images.orivraa.com/tutorial/kn";

const videoSchema = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "Orivraa — ಆಭರಣ ಅಂಗಡಿ ಸಾಫ್ಟ್‌ವೇರ್ ಸಂಪೂರ್ಣ ಟ್ಯುಟೋರಿಯಲ್ ಕನ್ನಡದಲ್ಲಿ 2026",
  description:
    "Orivraa ಆಭರಣ ಅಂಗಡಿ ಸಾಫ್ಟ್‌ವೇರ್‌ನ 24-ನಿಮಿಷಗಳ ಸಂಪೂರ್ಣ ಟ್ಯುಟೋರಿಯಲ್ ಕನ್ನಡದಲ್ಲಿ. GST/VAT ಇನ್‌ವಾಯಿಸ್, POS ವ್ಯವಹಾರಗಳು, ತೂಕ ಮತ್ತು ಶುದ್ಧತೆ ಆಧಾರಿತ ದಾಸ್ತಾನು, ಡಿಜಿಟಲ್ ಕ್ಯಾಟಲಾಗ್ ಮತ್ತು AI.",
  thumbnailUrl: "https://www.orivraa.com/og-image.png",
  uploadDate: "2026-05-15",
  duration: "PT24M0S",
  contentUrl: TUTORIAL_VIDEO_URL,
  embedUrl: "https://www.orivraa.com/tutorial/kn",
  publisher: {
    "@type": "Organization",
    name: "Orivraa",
    url: "https://orivraa.com",
    logo: { "@type": "ImageObject", url: "https://www.orivraa.com/logo.png" },
  },
  inLanguage: "kn",
};

const CHAPTERS = [
  { time: "0:08",  label: "ಪರಿಚಯ ಮತ್ತು ಅವಲೋಕನ" },
  { time: "1:12",  label: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ — ಚಿನ್ನ ಮತ್ತು ಬೆಳ್ಳಿ ನೇರ ಬೆಲೆಗಳು" },
  { time: "3:24",  label: "ತೂಕ ಮತ್ತು ಶುದ್ಧತೆ ಆಧಾರಿತ ದಾಸ್ತಾನು" },
  { time: "5:45",  label: "POS — ಮಾರಾಟ ರಚಿಸಿ" },
  { time: "7:30",  label: "GST ಇನ್‌ವಾಯಿಸ್ ರಚಿಸುವುದು ಮತ್ತು ಮುದ್ರಿಸುವುದು" },
  { time: "9:00",  label: "ಡಿಜಿಟಲ್ ಕ್ಯಾಟಲಾಗ್ ಜನರೇಟರ್" },
  { time: "11:10", label: "ಗ್ರಾಹಕ ನಿರ್ವಹಣೆ ಮತ್ತು CRM" },
  { time: "13:20", label: "ಕಾರಿಗರ ಟ್ರ್ಯಾಕಿಂಗ್ ಮತ್ತು ಲೆಕ್ಕಪತ್ರ" },
  { time: "15:40", label: "ತೆರಿಗೆ ಎಂಜಿನ್ — GST / VAT" },
  { time: "17:50", label: "ವರದಿಗಳು ಮತ್ತು ವ್ಯಾಪಾರ ವಿಶ್ಲೇಷಣೆ" },
  { time: "19:30", label: "AI ಒಳನೋಟಗಳು" },
  { time: "21:30", label: "ಮೊಬೈಲ್ ಆಪ್ ಮತ್ತು ಮಲ್ಟಿ-ಶಾಪ್" },
  { time: "23:00", label: "ಬೆಲೆ ಯೋಜನೆಗಳು ಮತ್ತು ಉಚಿತ ಪ್ರಯೋಗ" },
];

const FEATURES = [
  { icon: Scale, title: "ತೂಕ ಮತ್ತು ಶುದ್ಧತೆ ದಾಸ್ತಾನು", desc: "ಪ್ರತಿ ಆಭರಣವನ್ನು ಗ್ರಾಂ, ತೊಲಾ ಅಥವಾ ಔನ್ಸ್‌ನಲ್ಲಿ ದಾಖಲಿಸಿ. ಸ್ವಯಂಚಾಲಿತ ಚಿನ್ನದ ಮೌಲ್ಯ ಲೆಕ್ಕಾಚಾರ." },
  { icon: Receipt, title: "GST / VAT ಇನ್‌ವಾಯಿಸ್", desc: "ಭಾರತಕ್ಕೆ GST, EU ಗೆ VAT — ತಕ್ಷಣದ ಇನ್‌ವಾಯಿಸ್." },
  { icon: Store, title: "ವೇಗದ POS", desc: "ಬಾರ್‌ಕೋಡ್ ಸ್ಕ್ಯಾನರ್, ಲೋಹ ಬೆಲೆ ಲೆಕ್ಕಾಚಾರ ಮತ್ತು ತಕ್ಷಣದ ರಸೀದಿ." },
  { icon: BookOpen, title: "ಡಿಜಿಟಲ್ ಕ್ಯಾಟಲಾಗ್", desc: "ಫೋಟೋಗಳು, ಬೆಲೆಗಳು ಮತ್ತು WhatsApp ಬಟನ್‌ನೊಂದಿಗೆ ಹಂಚಿಕೊಳ್ಳಬಹುದಾದ ಕ್ಯಾಟಲಾಗ್." },
  { icon: Users, title: "ಕಾರಿಗರ ಟ್ರ್ಯಾಕಿಂಗ್", desc: "ಕೆಲಸ, ವಸ್ತುಗಳು, ಸಂಬಳ ಮತ್ತು ಬಾಕಿ ಮೊತ್ತಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ." },
  { icon: BarChart3, title: "ವರದಿಗಳು", desc: "ದೈನಂದಿನ ಮುಚ್ಚುವಿಕೆ, ಟಾಪ್-ಸೇಲ್, ತೆರಿಗೆ ಸಾರಾಂಶ." },
  { icon: Sparkles, title: "AI ಒಳನೋಟಗಳು", desc: "ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಯಾವುದೇ ಪ್ರಶ್ನೆ ಕೇಳಿ." },
  { icon: Smartphone, title: "ಎಲ್ಲಾ ಸಾಧನಗಳಲ್ಲಿ", desc: "Android, iOS, Windows ಡೆಸ್ಕ್‌ಟಾಪ್, ಬ್ರೌಸರ್." },
];

const TRUST_POINTS = [
  "ಚಿನ್ನ-ಬೆಳ್ಳಿ ಬೆಲೆಗಳು ಪ್ರತಿ ನಿಮಿಷ ಅಪ್‌ಡೇಟ್",
  "ಭಾರತ (GST), ನೇಪಾಳ, EU (VAT), UK, USA ಬೆಂಬಲ",
  "ಉಚಿತ ಯೋಜನೆ ಲಭ್ಯವಿದೆ — ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ ಅಗತ್ಯವಿಲ್ಲ",
  "30 ದಿನಗಳ ಉಚಿತ ಪ್ರಯೋಗ",
  "ISO ಮಟ್ಟದ ಭದ್ರತೆ — ಎನ್‌ಕ್ರಿಪ್ಟ್ ಮಾಡಿದ ಡೇಟಾ",
  "WhatsApp ಅಧಿಸೂಚನೆಗಳು",
];

export default function TutorialKnPage() {
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
            24-ನಿಮಿಷಗಳ ಸಂಪೂರ್ಣ ಟ್ಯುಟೋರಿಯಲ್
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            Orivraa — ಆಭರಣ ಸಾಫ್ಟ್‌ವೇರ್{" "}
            <span className="text-amber-400">ಕನ್ನಡದಲ್ಲಿ ಸಂಪೂರ್ಣ ಟ್ಯುಟೋರಿಯಲ್</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">
            ದಾಸ್ತಾನು, GST ಇನ್‌ವಾಯಿಸ್, POS, ಡಿಜಿಟಲ್ ಕ್ಯಾಟಲಾಗ್, ಕಾರಿಗರ ಟ್ರ್ಯಾಕಿಂಗ್, ತೆರಿಗೆ ವರದಿಗಳು ಮತ್ತು AI.
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
              aria-label="Orivraa ಆಭರಣ ಸಾಫ್ಟ್‌ವೇರ್ ಸಂಪೂರ್ಣ ಟ್ಯುಟೋರಿಯಲ್ ಕನ್ನಡದಲ್ಲಿ"
            >
              <source src={TUTORIAL_VIDEO_URL} type="video/mp4" />
              <a href={TUTORIAL_VIDEO_URL} className="text-amber-400 underline">ಟ್ಯುಟೋರಿಯಲ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ</a>
            </video>
          </div>
          <div className="flex items-center gap-3 mt-4 justify-end text-sm text-gray-500 flex-wrap">
            <span>ಲಭ್ಯ ಭಾಷೆಗಳು:</span>
            <Link href="/tutorial" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">English</Link>
            <Link href="/tutorial/hi" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">हिन्दी</Link>
            <Link href="/tutorial/ne" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">नेपाली</Link>
            <Link href="/tutorial/gu" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">ગુજરાતી</Link>
            <Link href="/tutorial/mr" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">मराठी</Link>
            <Link href="/tutorial/ta" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">தமிழ்</Link>
            <Link href="/tutorial/te" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">తెలుగు</Link>
            <span className="bg-amber-500 text-gray-950 font-semibold px-2 py-0.5 rounded">ಕನ್ನಡ</span>
            <Link href="/tutorial/fr" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">Français</Link>
            <Link href="/tutorial/de" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">Deutsch</Link>
            <Link href="/tutorial/es" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">Español</Link>
            <Link href="/tutorial/ar" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">العربية</Link>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-6">ಟ್ಯುಟೋರಿಯಲ್ ಇಂಡೆಕ್ಸ್</h2>
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
            <h2 className="text-3xl font-bold text-white mb-3">ಆಭರಣ ಅಂಗಡಿಗೆ ಅಗತ್ಯವಿರುವ ಎಲ್ಲವೂ — ಒಂದೇ ಸ್ಥಳದಲ್ಲಿ</h2>
            <p className="text-gray-400 max-w-xl mx-auto">ಒಂದೇ ಸದಸ್ಯತ್ವ — ತಕ್ಕಡಿಯಿಂದ GST ವರದಿಗಳ ವರೆಗೆ.</p>
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
          <h2 className="text-2xl font-bold text-white mb-8 text-center">ಆಭರಣ ವ್ಯಾಪಾರಿಗಳು Orivraa ಏಕೆ ಆಯ್ಕೆ ಮಾಡಿಕೊಳ್ಳುತ್ತಾರೆ</h2>
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
          <h2 className="text-2xl font-bold text-white mb-3">ಪ್ರಯತ್ನಿಸಲು ಸಿದ್ಧರಿದ್ದೀರಾ?</h2>
          <p className="text-gray-400 mb-8">
            ಉಚಿತ ಯೋಜನೆ ಲಭ್ಯವಿದೆ — ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ ಅಗತ್ಯವಿಲ್ಲ. Pro ₹299/ತಿಂಗಳು. 30 ದಿನಗಳ ಉಚಿತ ಪ್ರಯೋಗ.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-7 py-3 rounded-xl transition-colors"
            >
              ಉಚಿತವಾಗಿ ಪ್ರಾರಂಭಿಸಿ <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/tutorial"
              className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-7 py-3 rounded-xl transition-colors"
            >
              ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ನೋಡಿ
            </Link>
          </div>
        </div>
      </section>

      <DynamicFooter />
    </div>
  );
}
