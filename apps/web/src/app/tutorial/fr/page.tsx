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

const TUTORIAL_VIDEO_URL = "https://images.orivraa.com/tutorial/fr";

const videoSchema = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "Orivraa — Tutoriel Complet du Logiciel de Bijouterie en Français 2026",
  description:
    "Tutoriel complet de 24 minutes en français du logiciel Orivraa pour bijouteries. Facturation TVA, transactions POS, inventaire par poids et pureté, catalogue numérique, suivi artisan, rapports fiscaux et IA.",
  thumbnailUrl: "https://www.orivraa.com/og-image.png",
  uploadDate: "2026-05-15",
  duration: "PT24M0S",
  contentUrl: TUTORIAL_VIDEO_URL,
  embedUrl: "https://www.orivraa.com/tutorial/fr",
  publisher: {
    "@type": "Organization",
    name: "Orivraa",
    url: "https://orivraa.com",
    logo: { "@type": "ImageObject", url: "https://www.orivraa.com/logo.png" },
  },
  inLanguage: "fr",
  hasPart: [
    { "@type": "Clip", name: "Introduction et vue d'ensemble", startOffset: 8, url: "https://www.orivraa.com/tutorial/fr#t=8" },
    { "@type": "Clip", name: "Tableau de bord — prix de l'or et de l'argent", startOffset: 72, url: "https://www.orivraa.com/tutorial/fr#t=72" },
    { "@type": "Clip", name: "Inventaire par poids et pureté", startOffset: 204, url: "https://www.orivraa.com/tutorial/fr#t=204" },
    { "@type": "Clip", name: "Point de vente — créer une vente", startOffset: 345, url: "https://www.orivraa.com/tutorial/fr#t=345" },
    { "@type": "Clip", name: "Génération de facture TVA", startOffset: 450, url: "https://www.orivraa.com/tutorial/fr#t=450" },
    { "@type": "Clip", name: "Catalogue numérique", startOffset: 540, url: "https://www.orivraa.com/tutorial/fr#t=540" },
    { "@type": "Clip", name: "Gestion des clients", startOffset: 670, url: "https://www.orivraa.com/tutorial/fr#t=670" },
    { "@type": "Clip", name: "Suivi artisan", startOffset: 800, url: "https://www.orivraa.com/tutorial/fr#t=800" },
    { "@type": "Clip", name: "Moteur fiscal — TVA", startOffset: 940, url: "https://www.orivraa.com/tutorial/fr#t=940" },
    { "@type": "Clip", name: "Rapports et analytique", startOffset: 1070, url: "https://www.orivraa.com/tutorial/fr#t=1070" },
    { "@type": "Clip", name: "IA pour les affaires", startOffset: 1170, url: "https://www.orivraa.com/tutorial/fr#t=1170" },
    { "@type": "Clip", name: "Application mobile et multi-boutiques", startOffset: 1290, url: "https://www.orivraa.com/tutorial/fr#t=1290" },
    { "@type": "Clip", name: "Plans tarifaires et essai gratuit", startOffset: 1380, url: "https://www.orivraa.com/tutorial/fr#t=1380" },
  ],
};

const CHAPTERS = [
  { time: "0:08",  label: "Introduction et vue d'ensemble" },
  { time: "1:12",  label: "Tableau de bord — prix de l'or et de l'argent" },
  { time: "3:24",  label: "Inventaire par poids et pureté" },
  { time: "5:45",  label: "Point de vente — créer une vente" },
  { time: "7:30",  label: "Génération et impression de facture TVA" },
  { time: "9:00",  label: "Générateur de catalogue numérique" },
  { time: "11:10", label: "Gestion des clients et CRM" },
  { time: "13:20", label: "Suivi artisan et comptabilité" },
  { time: "15:40", label: "Moteur fiscal — TVA / GST" },
  { time: "17:50", label: "Rapports et analyses commerciales" },
  { time: "19:30", label: "Insights IA pour votre business" },
  { time: "21:30", label: "Application mobile et multi-boutiques" },
  { time: "23:00", label: "Plans tarifaires et essai gratuit" },
];

const FEATURES = [
  {
    icon: Scale,
    title: "Inventaire par poids et pureté",
    desc: "Enregistrez chaque pièce en grammes, tola ou once. L'application calcule automatiquement la valeur de l'or et de l'argent aux prix du marché en direct.",
  },
  {
    icon: Receipt,
    title: "Facturation TVA / GST",
    desc: "Émettez des factures fiscales instantanées. TVA pour la France et l'UE, GST pour l'Inde — tout est disponible.",
  },
  {
    icon: Store,
    title: "Point de vente rapide",
    desc: "POS tactile avec scan de code-barres, tarification au prix du métal et impression instantanée de reçus.",
  },
  {
    icon: BookOpen,
    title: "Catalogue numérique",
    desc: "Publiez un catalogue partageable avec photos, prix et bouton de demande via WhatsApp.",
  },
  {
    icon: Users,
    title: "Suivi artisan",
    desc: "Suivez le travail de l'artisan, les matériaux livrés et retournés, les salaires et les soldes dus.",
  },
  {
    icon: BarChart3,
    title: "Analyses et rapports",
    desc: "Clôture journalière, produits les plus vendus, stock lent, détail des bénéfices et récapitulatifs fiscaux.",
  },
  {
    icon: Sparkles,
    title: "IA pour les affaires",
    desc: "Posez des questions sur votre boutique en français ou en anglais et obtenez des réponses instantanées depuis vos données.",
  },
  {
    icon: Smartphone,
    title: "Fonctionne sur tous les appareils",
    desc: "Navigateur, Android, iOS et application bureau Windows. Un compte sur tous les appareils.",
  },
];

const TRUST_POINTS = [
  "Prix des métaux en direct — or et argent mis à jour chaque minute",
  "Supporte l'Inde (GST), le Népal, l'UE (TVA), le Royaume-Uni et les USA",
  "Plan gratuit disponible — sans carte de crédit",
  "Essai gratuit 30 jours sur les plans Pro",
  "Sécurité de niveau ISO — données chiffrées au repos et en transit",
  "Notifications WhatsApp pour les factures et mises à jour des commandes",
];

const LANG_PILLS = (
  <div className="flex items-center gap-3 mt-4 justify-end text-sm text-gray-500 flex-wrap">
    <span>Disponible en :</span>
    <Link href="/tutorial" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">English</Link>
    <Link href="/tutorial/hi" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">हिन्दी</Link>
    <Link href="/tutorial/ne" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">नेपाली</Link>
    <Link href="/tutorial/gu" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">ગુજરાતી</Link>
    <Link href="/tutorial/mr" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">मराठी</Link>
    <Link href="/tutorial/ta" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">தமிழ்</Link>
    <Link href="/tutorial/te" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">తెలుగు</Link>
    <Link href="/tutorial/kn" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">ಕನ್ನಡ</Link>
    <span className="bg-amber-500 text-gray-950 font-semibold px-2 py-0.5 rounded">Français</span>
    <Link href="/tutorial/de" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">Deutsch</Link>
    <Link href="/tutorial/es" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">Español</Link>
    <Link href="/tutorial/ar" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">العربية</Link>
  </div>
);

export default function TutorialFrPage() {
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
            Tutoriel complet de 24 minutes
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            Orivraa — Logiciel de Bijouterie{" "}
            <span className="text-amber-400">Tutoriel Complet en Français</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">
            Découvrez chaque fonctionnalité : inventaire, facturation, point de vente,
            catalogues numériques, suivi artisan, rapports fiscaux et intelligence artificielle.
          </p>
          <p className="text-sm text-gray-500">
            <Link href="/demo" className="text-amber-400 underline hover:text-amber-300">
              Voir la démo rapide
            </Link>
            {" "}pour un aperçu de 30 secondes
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
              aria-label="Tutoriel vidéo complet du logiciel Orivraa pour bijouteries en français"
            >
              <source src={TUTORIAL_VIDEO_URL} type="video/mp4" />
              Votre navigateur ne supporte pas HTML5 video.{" "}
              <a href={TUTORIAL_VIDEO_URL} className="text-amber-400 underline">
                Télécharger le tutoriel
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
            Contenu de ce tutoriel
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
              Tout ce dont une bijouterie a besoin — en un seul endroit
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Un seul abonnement couvre l&apos;ensemble de votre activité — de la balance aux rapports TVA.
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
            Pourquoi les bijoutiers choisissent Orivraa
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
            Prêt à l&apos;essayer ?
          </h2>
          <p className="text-gray-400 mb-8">
            Plan gratuit disponible — sans carte de crédit. Plans Pro à partir de ₹299/mois. Essai gratuit 30 jours sur tous les plans payants.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-7 py-3 rounded-xl transition-colors"
            >
              Commencer gratuitement <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/tutorial"
              className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-7 py-3 rounded-xl transition-colors"
            >
              Voir en anglais
            </Link>
          </div>
        </div>
      </section>

      <DynamicFooter />
    </div>
  );
}
