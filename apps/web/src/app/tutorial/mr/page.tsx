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

const TUTORIAL_VIDEO_URL = "https://images.orivraa.com/tutorial/mr";

const videoSchema = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "Orivraa — ज्वेलरी दुकान सॉफ्टवेअर संपूर्ण ट्युटोरियल मराठीत 2026",
  description:
    "Orivraa ज्वेलरी दुकान सॉफ्टवेअरची 24-मिनिटांची संपूर्ण ट्युटोरियल मराठीत. GST/VAT इन्व्हॉइस, POS व्यवहार, वजन आणि शुद्धतेवर आधारित इन्व्हेंटरी, डिजिटल कॅटलॉग, कारागीर ट्रॅकिंग आणि AI.",
  thumbnailUrl: "https://www.orivraa.com/og-image.png",
  uploadDate: "2026-05-15",
  duration: "PT24M0S",
  contentUrl: TUTORIAL_VIDEO_URL,
  embedUrl: "https://www.orivraa.com/tutorial/mr",
  publisher: {
    "@type": "Organization",
    name: "Orivraa",
    url: "https://orivraa.com",
    logo: { "@type": "ImageObject", url: "https://www.orivraa.com/logo.png" },
  },
  inLanguage: "mr",
};

const CHAPTERS = [
  { time: "0:08",  label: "प्रस्तावना आणि आढावा" },
  { time: "1:12",  label: "डॅशबोर्ड — सोने-चांदीचे थेट भाव" },
  { time: "3:24",  label: "वजन आणि शुद्धतेवर आधारित इन्व्हेंटरी" },
  { time: "5:45",  label: "POS — विक्री तयार करा" },
  { time: "7:30",  label: "GST इन्व्हॉइस तयार करणे आणि छापणे" },
  { time: "9:00",  label: "डिजिटल कॅटलॉग जनरेटर" },
  { time: "11:10", label: "ग्राहक व्यवस्थापन आणि CRM" },
  { time: "13:20", label: "कारागीर ट्रॅकिंग आणि अकाउंटिंग" },
  { time: "15:40", label: "कर इंजिन — GST / VAT" },
  { time: "17:50", label: "अहवाल आणि व्यवसाय विश्लेषण" },
  { time: "19:30", label: "AI अंतर्दृष्टी" },
  { time: "21:30", label: "मोबाइल अॅप आणि मल्टी-शॉप" },
  { time: "23:00", label: "किंमत योजना आणि मोफत चाचणी" },
];

const FEATURES = [
  { icon: Scale, title: "वजन आणि शुद्धता इन्व्हेंटरी", desc: "प्रत्येक दागिना ग्रॅम, तोळा किंवा औंसमध्ये नोंदवा. स्वयंचलित सोन्याच्या मूल्याची गणना." },
  { icon: Receipt, title: "GST / VAT इन्व्हॉइस", desc: "भारतासाठी GST, EU साठी VAT — तत्काळ इन्व्हॉइस." },
  { icon: Store, title: "जलद POS", desc: "बारकोड स्कॅनर, धातू किंमत गणना आणि तत्काळ पावती." },
  { icon: BookOpen, title: "डिजिटल कॅटलॉग", desc: "फोटो, किंमती आणि WhatsApp बटणासह शेअर करण्यायोग्य कॅटलॉग." },
  { icon: Users, title: "कारागीर ट्रॅकिंग", desc: "काम, साहित्य, पगार आणि थकबाकी रक्कम ट्रॅक करा." },
  { icon: BarChart3, title: "अहवाल", desc: "दैनंदिन बंद करणे, टॉप-सेल, कर सारांश." },
  { icon: Sparkles, title: "AI अंतर्दृष्टी", desc: "मराठी किंवा इंग्रजीत कोणताही प्रश्न विचारा." },
  { icon: Smartphone, title: "सर्व उपकरणांवर", desc: "Android, iOS, Windows डेस्कटॉप, ब्राउझर." },
];

const TRUST_POINTS = [
  "सोने-चांदीचे भाव दर मिनिटाला अपडेट",
  "भारत (GST), नेपाळ, EU (VAT), UK, USA समर्थन",
  "मोफत योजना उपलब्ध — क्रेडिट कार्डशिवाय",
  "30 दिवस मोफत चाचणी",
  "ISO स्तर सुरक्षा — एनक्रिप्टेड डेटा",
  "WhatsApp सूचना",
];

export default function TutorialMrPage() {
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
            24-मिनिटांची संपूर्ण ट्युटोरियल
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            Orivraa — ज्वेलरी सॉफ्टवेअर{" "}
            <span className="text-amber-400">मराठीत संपूर्ण ट्युटोरियल</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">
            इन्व्हेंटरी, GST इन्व्हॉइस, POS, डिजिटल कॅटलॉग, कारागीर ट्रॅकिंग, कर अहवाल आणि AI.
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
              aria-label="Orivraa ज्वेलरी सॉफ्टवेअर संपूर्ण ट्युटोरियल मराठीत"
            >
              <source src={TUTORIAL_VIDEO_URL} type="video/mp4" />
              <a href={TUTORIAL_VIDEO_URL} className="text-amber-400 underline">ट्युटोरियल डाउनलोड करा</a>
            </video>
          </div>
          <div className="flex items-center gap-3 mt-4 justify-end text-sm text-gray-500 flex-wrap">
            <span>उपलब्ध भाषा:</span>
            <Link href="/tutorial" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">English</Link>
            <Link href="/tutorial/hi" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">हिन्दी</Link>
            <Link href="/tutorial/ne" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">नेपाली</Link>
            <Link href="/tutorial/gu" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">ગુજરાતી</Link>
            <span className="bg-amber-500 text-gray-950 font-semibold px-2 py-0.5 rounded">मराठी</span>
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
          <h2 className="text-xl font-semibold text-white mb-6">ट्युटोरियल इंडेक्स</h2>
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
            <h2 className="text-3xl font-bold text-white mb-3">ज्वेलरी दुकानासाठी सर्वसमावेशक उपाय — एकाच ठिकाणी</h2>
            <p className="text-gray-400 max-w-xl mx-auto">एक सदस्यता — तराजूपासून GST अहवालापर्यंत.</p>
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
          <h2 className="text-2xl font-bold text-white mb-8 text-center">ज्वेलर्स Orivraa का निवडतात</h2>
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
          <h2 className="text-2xl font-bold text-white mb-3">वापरण्यास तयार आहात?</h2>
          <p className="text-gray-400 mb-8">
            मोफत योजना उपलब्ध — क्रेडिट कार्डशिवाय. Pro ₹299/महिना. 30 दिवस मोफत चाचणी.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-7 py-3 rounded-xl transition-colors"
            >
              मोफत सुरू करा <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/tutorial"
              className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-7 py-3 rounded-xl transition-colors"
            >
              इंग्रजीत पहा
            </Link>
          </div>
        </div>
      </section>

      <DynamicFooter />
    </div>
  );
}
