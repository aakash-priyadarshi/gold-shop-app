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

const TUTORIAL_VIDEO_URL = "https://images.orivraa.com/tutorial/es";

const videoSchema = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "Orivraa — Tutorial Completo de Software para Joyería en Español 2026",
  description:
    "Tutorial completo de 24 minutos en español de Orivraa, software para joyerías. Incluye demostración paso a paso de facturación GST/IVA, transacciones POS, inventario por peso y pureza, catálogo digital, gestión de artesanos, informes fiscales e IA para negocios.",
  thumbnailUrl: "https://www.orivraa.com/og-image.png",
  uploadDate: "2026-05-15",
  duration: "PT24M0S",
  contentUrl: TUTORIAL_VIDEO_URL,
  embedUrl: "https://www.orivraa.com/tutorial/es",
  publisher: {
    "@type": "Organization",
    name: "Orivraa",
    url: "https://orivraa.com",
    logo: {
      "@type": "ImageObject",
      url: "https://www.orivraa.com/logo.png",
    },
  },
  inLanguage: "es",
  hasPart: [
    { "@type": "Clip", name: "Introducción y descripción general", startOffset: 8, url: "https://www.orivraa.com/tutorial/es#t=8" },
    { "@type": "Clip", name: "Dashboard — precios en vivo del oro y la plata", startOffset: 72, url: "https://www.orivraa.com/tutorial/es#t=72" },
    { "@type": "Clip", name: "Inventario por peso y pureza", startOffset: 204, url: "https://www.orivraa.com/tutorial/es#t=204" },
    { "@type": "Clip", name: "Punto de venta (POS) — crear una venta", startOffset: 345, url: "https://www.orivraa.com/tutorial/es#t=345" },
    { "@type": "Clip", name: "Factura GST — generación e impresión", startOffset: 450, url: "https://www.orivraa.com/tutorial/es#t=450" },
    { "@type": "Clip", name: "Constructor de catálogo digital", startOffset: 540, url: "https://www.orivraa.com/tutorial/es#t=540" },
    { "@type": "Clip", name: "Gestión de clientes y CRM", startOffset: 670, url: "https://www.orivraa.com/tutorial/es#t=670" },
    { "@type": "Clip", name: "Gestión de artesanos (Karigar)", startOffset: 800, url: "https://www.orivraa.com/tutorial/es#t=800" },
    { "@type": "Clip", name: "Motor de impuestos — GST / IVA", startOffset: 940, url: "https://www.orivraa.com/tutorial/es#t=940" },
    { "@type": "Clip", name: "Informes y análisis empresariales", startOffset: 1070, url: "https://www.orivraa.com/tutorial/es#t=1070" },
    { "@type": "Clip", name: "Perspectivas con inteligencia artificial", startOffset: 1170, url: "https://www.orivraa.com/tutorial/es#t=1170" },
    { "@type": "Clip", name: "App móvil y soporte multisucursal", startOffset: 1290, url: "https://www.orivraa.com/tutorial/es#t=1290" },
    { "@type": "Clip", name: "Planes de precios y prueba gratuita", startOffset: 1380, url: "https://www.orivraa.com/tutorial/es#t=1380" },
  ],
};

const CHAPTERS = [
  { time: "0:08",  label: "Introducción y descripción general" },
  { time: "1:12",  label: "Dashboard — precios en vivo del oro y la plata" },
  { time: "3:24",  label: "Inventario por peso y pureza" },
  { time: "5:45",  label: "Punto de venta (POS) — crear una venta" },
  { time: "7:30",  label: "Factura GST — generación e impresión" },
  { time: "9:00",  label: "Constructor de catálogo digital" },
  { time: "11:10", label: "Gestión de clientes y CRM" },
  { time: "13:20", label: "Gestión de artesanos (Karigar)" },
  { time: "15:40", label: "Motor de impuestos — GST / IVA" },
  { time: "17:50", label: "Informes y análisis empresariales" },
  { time: "19:30", label: "Perspectivas con inteligencia artificial" },
  { time: "21:30", label: "App móvil y soporte multisucursal" },
  { time: "23:00", label: "Planes de precios y prueba gratuita" },
];

const FEATURES = [
  {
    icon: Scale,
    title: "Inventario por peso y pureza",
    desc: "Registra cada pieza por gramo, tola u onza. La app calcula automáticamente el valor del oro y la plata a precios de mercado en tiempo real.",
  },
  {
    icon: Receipt,
    title: "Facturación GST / IVA",
    desc: "Genera facturas fiscales al instante. GST para India, IVA para España/LatAm/UAE — todo incluido.",
  },
  {
    icon: Store,
    title: "POS rápido",
    desc: "Punto de venta táctil con escaneo de código de barras, precios por metal y emisión inmediata de recibos.",
  },
  {
    icon: BookOpen,
    title: "Catálogo digital",
    desc: "Publica un catálogo online compartible con fotos, precios y botón de consulta por WhatsApp.",
  },
  {
    icon: Users,
    title: "Gestión de artesanos",
    desc: "Registra trabajos, material entregado y devuelto, salarios y saldos pendientes de cada artesano.",
  },
  {
    icon: BarChart3,
    title: "Análisis e informes",
    desc: "Cierre diario, productos más vendidos, stock lento, desglose de ganancias y resúmenes fiscales.",
  },
  {
    icon: Sparkles,
    title: "IA para el negocio",
    desc: "Haz preguntas sobre tu joyería en español o inglés y obtén respuestas instantáneas de tus propios datos.",
  },
  {
    icon: Smartphone,
    title: "Funciona en todos los dispositivos",
    desc: "Navegador, Android, iOS y aplicación de escritorio para Windows. Una cuenta, todos los dispositivos.",
  },
];

const TRUST_POINTS = [
  "Precios en vivo del metal — el oro y la plata se actualizan cada minuto",
  "Compatible con India (GST), Nepal, UAE (IVA), Reino Unido y EE.UU.",
  "Plan gratuito disponible — sin tarjeta de crédito",
  "Prueba gratuita de 30 días en planes Pro",
  "Seguridad estándar ISO — datos cifrados en reposo y en tránsito",
  "Notificaciones por WhatsApp para facturas y actualizaciones de pedidos",
];

export default function TutorialEsPage() {
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
            Tutorial completo de 24 minutos
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            Orivraa Software para Joyería —{" "}
            <span className="text-amber-400">Tutorial Completo en Español</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">
            Recorrido paso a paso por cada función: inventario, facturación, POS,
            catálogos digitales, artesanos, informes fiscales e IA.
          </p>
          <p className="text-sm text-gray-500">
            ¿Prefieres el resumen de 30 segundos?{" "}
            <Link href="/demo" className="text-amber-400 underline hover:text-amber-300">
              Ver el demo rápido
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
              aria-label="Vídeo tutorial completo de Orivraa software para joyería en español"
            >
              <source src={TUTORIAL_VIDEO_URL} type="video/mp4" />
              Tu navegador no soporta HTML5 video. Por favor,{" "}
              <a href={TUTORIAL_VIDEO_URL} className="text-amber-400 underline">
                descarga el vídeo tutorial
              </a>
              .
            </video>
          </div>

          <div className="flex items-center gap-3 mt-4 justify-end text-sm text-gray-500 flex-wrap">
            <span>Disponible en:</span>
            <Link href="/tutorial" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">English</Link>
            <Link href="/tutorial/hi" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">हिन्दी</Link>
            <Link href="/tutorial/ne" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">नेपाली</Link>
            <Link href="/tutorial/gu" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">ગુજરાતી</Link>
            <Link href="/tutorial/mr" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">मराठी</Link>
            <Link href="/tutorial/ta" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">தமிழ்</Link>
            <Link href="/tutorial/te" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">తెలుగు</Link>
            <Link href="/tutorial/kn" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">ಕನ್ನಡ</Link>
            <Link href="/tutorial/fr" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">Français</Link>
            <Link href="/tutorial/de" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">Deutsch</Link>
            <span className="bg-amber-500 text-gray-950 font-semibold px-2 py-0.5 rounded">Español</span>
            <Link href="/tutorial/ar" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">العربية</Link>
          </div>
        </div>
      </section>

      {/* CHAPTER INDEX */}
      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-6">
            Contenido de este tutorial
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
              Todo lo que necesita una joyería, en un solo lugar
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Una sola suscripción cubre todo tu negocio — desde la balanza hasta la declaración de impuestos.
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
            Por qué las joyerías de India, Nepal y UAE eligen Orivraa
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
            ¿Quieres probarlo tú mismo?
          </h2>
          <p className="text-gray-400 mb-8">
            Plan gratuito disponible — sin tarjeta de crédito. Planes Pro para India desde ₹299/mes. Prueba gratuita de 30 días en todos los planes de pago.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-7 py-3 rounded-xl transition-colors"
            >
              Iniciar prueba gratuita
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/jewellery-shop-software"
              className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-7 py-3 rounded-xl transition-colors"
            >
              Ver todas las funciones
            </Link>
          </div>
        </div>
      </section>

      {/* SEO TEXT */}
      <section className="sr-only" aria-hidden="false">
        <h2>Tutorial en español de Orivraa — software para joyería</h2>
        <p>
          Orivraa es un software completo de gestión para joyerías utilizado en India, Nepal, UAE,
          Reino Unido y EE.UU. por tiendas de oro, plata y joyerías con múltiples sucursales.
          Este tutorial en español muestra paso a paso todas las funciones clave:
          software de facturación para joyería con GST e IVA, software POS para joyería,
          software de inventario de joyería por peso y pureza, software de catálogo digital,
          gestión de artesanos y análisis con inteligencia artificial.
        </p>
        <p>
          Este es el mejor tutorial de software para joyería en español 2026 para propietarios
          de joyerías, tiendas de oro y plata, y minoristas modernos que buscan una alternativa
          a programas de facturación tradicionales — compatible con móvil, tablet y escritorio.
          Prueba gratuita de software para joyería disponible. Compatible con México, Colombia,
          España, Argentina y toda América Latina.
        </p>
      </section>

      <DynamicFooter />
    </div>
  );
}
