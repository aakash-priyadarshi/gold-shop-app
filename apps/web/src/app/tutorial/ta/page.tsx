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

const TUTORIAL_VIDEO_URL = "https://images.orivraa.com/tutorial/ta";

const videoSchema = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "Orivraa — நகை கடை மென்பொருள் முழு வழிகாட்டி தமிழில் 2026",
  description:
    "Orivraa நகை கடை மென்பொருளின் 24-நிமிட முழு வழிகாட்டி தமிழில். GST/VAT ரசீது, POS பரிவர்த்தனைகள், எடை மற்றும் தூய்மை அடிப்படையிலான சரக்கு, டிஜிட்டல் கேட்டலாக், தொழிலாளர் கண்காணிப்பு மற்றும் AI.",
  thumbnailUrl: "https://www.orivraa.com/og-image.png",
  uploadDate: "2026-05-15",
  duration: "PT24M0S",
  contentUrl: TUTORIAL_VIDEO_URL,
  embedUrl: "https://www.orivraa.com/tutorial/ta",
  publisher: {
    "@type": "Organization",
    name: "Orivraa",
    url: "https://orivraa.com",
    logo: { "@type": "ImageObject", url: "https://www.orivraa.com/logo.png" },
  },
  inLanguage: "ta",
};

const CHAPTERS = [
  { time: "0:08",  label: "அறிமுகம் மற்றும் கண்ணோட்டம்" },
  { time: "1:12",  label: "டாஷ்போர்ட் — தங்கம் மற்றும் வெள்ளி நேரடி விலை" },
  { time: "3:24",  label: "எடை மற்றும் தூய்மை அடிப்படையிலான சரக்கு" },
  { time: "5:45",  label: "விற்பனை நிலையம் — விற்பனை உருவாக்குதல்" },
  { time: "7:30",  label: "GST ரசீது உருவாக்கம் மற்றும் அச்சிடல்" },
  { time: "9:00",  label: "டிஜிட்டல் கேட்டலாக் உருவாக்கி" },
  { time: "11:10", label: "வாடிக்கையாளர் மேலாண்மை மற்றும் CRM" },
  { time: "13:20", label: "தொழிலாளர் கண்காணிப்பு மற்றும் கணக்கியல்" },
  { time: "15:40", label: "வரி இயந்திரம் — GST / VAT" },
  { time: "17:50", label: "அறிக்கைகள் மற்றும் வணிக பகுப்பாய்வு" },
  { time: "19:30", label: "உங்கள் வணிகத்திற்கான AI நுண்ணறிவு" },
  { time: "21:30", label: "மொபைல் பயன்பாடு மற்றும் பல கடை மேலாண்மை" },
  { time: "23:00", label: "விலை திட்டங்கள் மற்றும் இலவச சோதனை" },
];

const FEATURES = [
  {
    icon: Scale,
    title: "எடை மற்றும் தூய்மை அடிப்படையிலான சரக்கு",
    desc: "ஒவ்வொரு பொருளையும் கிராம், தோலா அல்லது அவுன்சில் பதிவு செய்யுங்கள். நேரடி சந்தை விலையில் தங்க மதிப்பை தானாக கணக்கிடுகிறது.",
  },
  {
    icon: Receipt,
    title: "GST / VAT ரசீதுகள்",
    desc: "உடனடியாக வரி ரசீதுகளை வழங்குங்கள். இந்தியாவிற்கு GST, ஐரோப்பிய நாடுகளுக்கு VAT — அனைத்தும் உள்ளடக்கப்பட்டுள்ளது.",
  },
  {
    icon: Store,
    title: "வேகமான விற்பனை நிலையம்",
    desc: "பார்கோட் ஸ்கேனர், உலோக விலை கணக்கீடு மற்றும் உடனடி ரசீது அச்சிடல் கொண்ட தொட்டுணர் POS.",
  },
  {
    icon: BookOpen,
    title: "டிஜிட்டல் கேட்டலாக்",
    desc: "புகைப்படங்கள், விலைகள் மற்றும் WhatsApp கோரிக்கை பொத்தானுடன் பகிரக்கூடிய கேட்டலாக் வெளியிடுங்கள்.",
  },
  {
    icon: Users,
    title: "தொழிலாளர் கண்காணிப்பு",
    desc: "தொழிலாளர் வேலை, வழங்கப்பட்ட மற்றும் திரும்பப்பெற்ற பொருட்கள், சம்பளங்கள் மற்றும் நிலுவை தொகைகளை கண்காணியுங்கள்.",
  },
  {
    icon: BarChart3,
    title: "அறிக்கைகள் மற்றும் பகுப்பாய்வு",
    desc: "தினசரி மூடல், அதிகம் விற்கப்படும் பொருட்கள், மெதுவான சரக்கு, இலாப விவரங்கள் மற்றும் வரி சுருக்கங்கள்.",
  },
  {
    icon: Sparkles,
    title: "உங்கள் வணிகத்திற்கான AI",
    desc: "தமிழில் அல்லது ஆங்கிலத்தில் உங்கள் கடையைப் பற்றி கேள்விகள் கேளுங்கள், உங்கள் தரவிலிருந்து உடனடி பதில்கள் பெறுங்கள்.",
  },
  {
    icon: Smartphone,
    title: "அனைத்து சாதனங்களிலும் இயங்குகிறது",
    desc: "உலாவி, Android, iOS மற்றும் Windows டெஸ்க்டாப் பயன்பாடு. அனைத்து சாதனங்களிலும் ஒரே கணக்கு.",
  },
];

const TRUST_POINTS = [
  "நேரடி உலோக விலைகள் — தங்கம் மற்றும் வெள்ளி ஒவ்வொரு நிமிடமும் புதுப்பிக்கப்படுகிறது",
  "இந்தியா (GST), நேபாளம், ஐரோப்பா (VAT), இங்கிலாந்து மற்றும் அமெரிக்காவை ஆதரிக்கிறது",
  "இலவச திட்டம் கிடைக்கிறது — கிரெடிட் கார்டு தேவையில்லை",
  "Pro திட்டங்களில் 30 நாள் இலவச சோதனை",
  "ISO பாதுகாப்பு — ஓய்வு மற்றும் பரிமாற்றத்தில் தரவு மறைகுறியாக்கப்பட்டுள்ளது",
  "ரசீதுகள் மற்றும் ஆர்டர் புதுப்பிப்புகளுக்கு WhatsApp அறிவிப்புகள்",
];

export default function TutorialTaPage() {
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
            24-நிமிட முழு வழிகாட்டி
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            Orivraa — நகை கடை மென்பொருள்{" "}
            <span className="text-amber-400">தமிழில் முழு வழிகாட்டி</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">
            ஒவ்வொரு அம்சத்தையும் கண்டுபிடியுங்கள்: சரக்கு, ரசீதுகள், விற்பனை நிலையம்,
            டிஜிட்டல் கேட்டலாக்கள், தொழிலாளர் கண்காணிப்பு, வரி அறிக்கைகள் மற்றும் செயற்கை நுண்ணறிவு.
          </p>
          <p className="text-sm text-gray-500">
            <Link href="/demo" className="text-amber-400 underline hover:text-amber-300">
              விரைவு டெமோவைப் பாருங்கள்
            </Link>
            {" "}30-வினாடி மேலோட்டத்திற்கு
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
              aria-label="Orivraa நகை கடை மென்பொருளின் முழு வீடியோ வழிகாட்டி தமிழில்"
            >
              <source src={TUTORIAL_VIDEO_URL} type="video/mp4" />
              உங்கள் உலாவி HTML5 வீடியோவை ஆதரிக்கவில்லை.{" "}
              <a href={TUTORIAL_VIDEO_URL} className="text-amber-400 underline">
                வழிகாட்டியை பதிவிறக்கவும்
              </a>
              .
            </video>
          </div>
          <div className="flex items-center gap-3 mt-4 justify-end text-sm text-gray-500 flex-wrap">
            <span>மொழிகள்:</span>
            <Link href="/tutorial" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">English</Link>
            <Link href="/tutorial/hi" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">हिन्दी</Link>
            <Link href="/tutorial/ne" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">नेपाली</Link>
            <Link href="/tutorial/gu" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">ગુજરાતી</Link>
            <Link href="/tutorial/mr" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">मराठी</Link>
            <span className="bg-amber-500 text-gray-950 font-semibold px-2 py-0.5 rounded">தமிழ்</span>
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
            இந்த வழிகாட்டியில் உள்ளடக்கம்
          </h2>
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

      {/* FEATURE GRID */}
      <section className="px-4 pb-20 bg-gray-900/50">
        <div className="max-w-6xl mx-auto py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">
              ஒரு நகை கடைக்கு தேவையான அனைத்தும் — ஒரே இடத்தில்
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              ஒரே சந்தா உங்கள் முழு வணிகத்தை உள்ளடக்குகிறது — தராசிலிருந்து GST அறிக்கைகள் வரை.
            </p>
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

      {/* TRUST */}
      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            ஏன் நகை வியாபாரிகள் Orivraa-ஐ தேர்வு செய்கிறார்கள்
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
            முயற்சிக்க தயாரா?
          </h2>
          <p className="text-gray-400 mb-8">
            இலவச திட்டம் கிடைக்கிறது — கிரெடிட் கார்டு தேவையில்லை. Pro திட்டங்கள் ₹299/மாதம் முதல். அனைத்து பணம் செலுத்தும் திட்டங்களிலும் 30 நாள் இலவச சோதனை.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-7 py-3 rounded-xl transition-colors"
            >
              இலவசமாக தொடங்குங்கள் <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/tutorial"
              className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-7 py-3 rounded-xl transition-colors"
            >
              ஆங்கிலத்தில் பாருங்கள்
            </Link>
          </div>
        </div>
      </section>

      <DynamicFooter />
    </div>
  );
}
