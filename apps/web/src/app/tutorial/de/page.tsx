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

const TUTORIAL_VIDEO_URL = "https://images.orivraa.com/tutorial/de";

const videoSchema = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "Orivraa — Vollständige Juwelier-Software-Anleitung auf Deutsch 2026",
  description:
    "Vollständige 24-Minuten-Anleitung auf Deutsch für die Orivraa-Juwelier-Software. Mehrwertsteuer-Rechnungen, POS-Transaktionen, Inventar nach Gewicht und Reinheit, digitale Kataloge, Handwerker-Tracking, Steuerberichte und KI.",
  thumbnailUrl: "https://www.orivraa.com/og-image.png",
  uploadDate: "2026-05-15",
  duration: "PT24M0S",
  contentUrl: TUTORIAL_VIDEO_URL,
  embedUrl: "https://www.orivraa.com/tutorial/de",
  publisher: {
    "@type": "Organization",
    name: "Orivraa",
    url: "https://orivraa.com",
    logo: { "@type": "ImageObject", url: "https://www.orivraa.com/logo.png" },
  },
  inLanguage: "de",
  hasPart: [
    { "@type": "Clip", name: "Einführung und Überblick", startOffset: 8, url: "https://www.orivraa.com/tutorial/de#t=8" },
    { "@type": "Clip", name: "Dashboard — Gold- und Silberpreise", startOffset: 72, url: "https://www.orivraa.com/tutorial/de#t=72" },
    { "@type": "Clip", name: "Inventar nach Gewicht und Reinheit", startOffset: 204, url: "https://www.orivraa.com/tutorial/de#t=204" },
    { "@type": "Clip", name: "Kassensystem — Verkauf erstellen", startOffset: 345, url: "https://www.orivraa.com/tutorial/de#t=345" },
    { "@type": "Clip", name: "Mehrwertsteuer-Rechnung erstellen", startOffset: 450, url: "https://www.orivraa.com/tutorial/de#t=450" },
    { "@type": "Clip", name: "Digitaler Katalog", startOffset: 540, url: "https://www.orivraa.com/tutorial/de#t=540" },
    { "@type": "Clip", name: "Kundenverwaltung", startOffset: 670, url: "https://www.orivraa.com/tutorial/de#t=670" },
    { "@type": "Clip", name: "Handwerker-Tracking", startOffset: 800, url: "https://www.orivraa.com/tutorial/de#t=800" },
    { "@type": "Clip", name: "Steuermotor — MwSt.", startOffset: 940, url: "https://www.orivraa.com/tutorial/de#t=940" },
    { "@type": "Clip", name: "Berichte und Analysen", startOffset: 1070, url: "https://www.orivraa.com/tutorial/de#t=1070" },
    { "@type": "Clip", name: "KI für Ihr Geschäft", startOffset: 1170, url: "https://www.orivraa.com/tutorial/de#t=1170" },
    { "@type": "Clip", name: "Mobile App und Multi-Shop", startOffset: 1290, url: "https://www.orivraa.com/tutorial/de#t=1290" },
    { "@type": "Clip", name: "Preispläne und kostenlose Testversion", startOffset: 1380, url: "https://www.orivraa.com/tutorial/de#t=1380" },
  ],
};

const CHAPTERS = [
  { time: "0:08",  label: "Einführung und Überblick" },
  { time: "1:12",  label: "Dashboard — Gold- und Silberpreise live" },
  { time: "3:24",  label: "Inventar nach Gewicht und Reinheit" },
  { time: "5:45",  label: "Kassensystem — Verkauf erstellen" },
  { time: "7:30",  label: "Mehrwertsteuer-Rechnung erstellen und drucken" },
  { time: "9:00",  label: "Digitaler Katalog-Generator" },
  { time: "11:10", label: "Kundenverwaltung und CRM" },
  { time: "13:20", label: "Handwerker-Tracking und Buchhaltung" },
  { time: "15:40", label: "Steuermotor — MwSt. / GST" },
  { time: "17:50", label: "Berichte und Geschäftsanalysen" },
  { time: "19:30", label: "KI-Erkenntnisse für Ihr Geschäft" },
  { time: "21:30", label: "Mobile App und Multi-Shop-Verwaltung" },
  { time: "23:00", label: "Preispläne und kostenlose Testversion" },
];

const FEATURES = [
  {
    icon: Scale,
    title: "Inventar nach Gewicht & Reinheit",
    desc: "Erfassen Sie jedes Stück in Gramm, Tola oder Unze. Die App berechnet den Goldwert automatisch anhand aktueller Marktpreise.",
  },
  {
    icon: Receipt,
    title: "Mehrwertsteuer-Rechnungen",
    desc: "Stellen Sie sofort Steuerrechnungen aus. MwSt. für Deutschland/Österreich, GST für Indien — alles abgedeckt.",
  },
  {
    icon: Store,
    title: "Schnelles Kassensystem",
    desc: "Touch-POS mit Barcode-Scanner, Metallpreisberechnung und sofortigem Belegdruck.",
  },
  {
    icon: BookOpen,
    title: "Digitaler Katalog",
    desc: "Veröffentlichen Sie einen teilbaren Katalog mit Fotos, Preisen und WhatsApp-Anfrage-Button.",
  },
  {
    icon: Users,
    title: "Handwerker-Tracking",
    desc: "Verfolgen Sie Handwerkerarbeiten, gelieferte und zurückgegebene Materialien, Gehälter und offene Salden.",
  },
  {
    icon: BarChart3,
    title: "Analysen & Berichte",
    desc: "Tagesabschluss, meistverkaufte Produkte, langsam drehendes Inventar, Gewinndetails und Steuerübersichten.",
  },
  {
    icon: Sparkles,
    title: "KI für Ihr Geschäft",
    desc: "Stellen Sie Fragen zu Ihrem Geschäft auf Deutsch oder Englisch und erhalten Sie sofortige Antworten aus Ihren Daten.",
  },
  {
    icon: Smartphone,
    title: "Auf allen Geräten",
    desc: "Browser, Android, iOS und Windows Desktop-App. Ein Konto auf allen Geräten.",
  },
];

const TRUST_POINTS = [
  "Live-Metallpreise — Gold und Silber werden jede Minute aktualisiert",
  "Unterstützt Indien (GST), Nepal, EU (MwSt.), UK und USA",
  "Kostenloser Plan verfügbar — keine Kreditkarte erforderlich",
  "30 Tage kostenlose Testversion für Pro-Pläne",
  "ISO-Sicherheit — Daten verschlüsselt im Ruhezustand und bei der Übertragung",
  "WhatsApp-Benachrichtigungen für Rechnungen und Bestellupdates",
];

const LANG_PILLS = (
  <div className="flex items-center gap-3 mt-4 justify-end text-sm text-gray-500 flex-wrap">
    <span>Verfügbar in:</span>
    <Link href="/tutorial" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">English</Link>
    <Link href="/tutorial/hi" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">हिन्दी</Link>
    <Link href="/tutorial/ne" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">नेपाली</Link>
    <Link href="/tutorial/gu" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">ગુજરાતી</Link>
    <Link href="/tutorial/mr" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">मराठी</Link>
    <Link href="/tutorial/ta" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">தமிழ்</Link>
    <Link href="/tutorial/te" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">తెలుగు</Link>
    <Link href="/tutorial/kn" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">ಕನ್ನಡ</Link>
    <Link href="/tutorial/fr" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">Français</Link>
    <span className="bg-amber-500 text-gray-950 font-semibold px-2 py-0.5 rounded">Deutsch</span>
    <Link href="/tutorial/es" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">Español</Link>
    <Link href="/tutorial/ar" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">العربية</Link>
  </div>
);

export default function TutorialDePage() {
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
            Vollständige 24-Minuten-Anleitung
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            Orivraa — Juwelier-Software{" "}
            <span className="text-amber-400">Vollständige Anleitung auf Deutsch</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">
            Entdecken Sie jede Funktion: Inventar, Rechnungen, Kassensystem,
            digitale Kataloge, Handwerker-Tracking, Steuerberichte und Künstliche Intelligenz.
          </p>
          <p className="text-sm text-gray-500">
            <Link href="/demo" className="text-amber-400 underline hover:text-amber-300">
              Demo ansehen
            </Link>
            {" "}für eine 30-Sekunden-Vorschau
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
              aria-label="Vollständiges Video-Tutorial der Orivraa-Juwelier-Software auf Deutsch"
            >
              <source src={TUTORIAL_VIDEO_URL} type="video/mp4" />
              Ihr Browser unterstützt kein HTML5-Video.{" "}
              <a href={TUTORIAL_VIDEO_URL} className="text-amber-400 underline">
                Tutorial herunterladen
              </a>
              .
            </video>
          </div>
          {LANG_PILLS}
        </div>
      </section>

      {/* CHAPTER INDEX */}
      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-6">
            Inhalt dieses Tutorials
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
              Alles was ein Juweliergeschäft braucht — an einem Ort
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Ein einziges Abonnement deckt Ihr gesamtes Geschäft ab — von der Waage bis zu MwSt.-Berichten.
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
            Warum Juweliere Orivraa wählen
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
            Bereit zum Ausprobieren?
          </h2>
          <p className="text-gray-400 mb-8">
            Kostenloser Plan verfügbar — keine Kreditkarte erforderlich. Pro-Pläne ab ₹299/Monat. 30 Tage kostenlose Testversion für alle kostenpflichtigen Pläne.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-7 py-3 rounded-xl transition-colors"
            >
              Kostenlos starten <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/tutorial"
              className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-7 py-3 rounded-xl transition-colors"
            >
              Auf Englisch ansehen
            </Link>
          </div>
        </div>
      </section>

      <DynamicFooter />
    </div>
  );
}
