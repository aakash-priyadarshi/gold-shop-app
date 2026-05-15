"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Clock,
  ExternalLink,
  LifeBuoy,
  MessageSquare,
  PlayCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

const CDN_BASE = "https://images.orivraa.com";

/** Parse "M:SS" or "MM:SS" → seconds (same format used in the chapter list) */
function timeToSeconds(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

type Lang = "en" | "hi" | "ne" | "es" | "ar";

const LANG_LABELS: Record<Lang, string> = {
  en: "English",
  hi: "हिंदी",
  ne: "नेपाली",
  es: "Español",
  ar: "العربية",
};

const UI: Record<Lang, {
  videoTitle: string; videoDesc: string; badgeLabel: string;
  videoAriaLabel: string; videoError: string; videoTip: string;
  chapterTitle: string; chapterDesc: string;
  helpTitle: string; helpDesc: string; supportBtn: string; openBtn: string;
}> = {
  en: {
    videoTitle: "Full Product Tutorial",
    videoDesc: "Complete walkthrough of every Orivraa feature · 23 minutes",
    badgeLabel: "English",
    videoAriaLabel: "Orivraa jewellery shop software complete tutorial",
    videoError: "Download the tutorial",
    videoTip: 'Tip: right-click the video and choose "Picture in Picture" to watch while you work in another tab.',
    chapterTitle: "Chapter Index",
    chapterDesc: "Click any chapter — the video will jump to that moment",
    helpTitle: "Need more help?",
    helpDesc: "Our support team is available via chat or ticket. Use the floating chat bubble at the bottom-right of any page, or open a support ticket below.",
    supportBtn: "Open a support ticket",
    openBtn: "Open video in new tab",
  },
  hi: {
    videoTitle: "पूरा प्रोडक्ट ट्यूटोरियल",
    videoDesc: "Orivraa की हर सुविधा का पूरा वॉकथ्रू · 23 मिनट",
    badgeLabel: "हिंदी",
    videoAriaLabel: "Orivraa ज्वेलरी शॉप सॉफ्टवेयर का पूरा ट्यूटोरियल",
    videoError: "यहाँ डाउनलोड करें",
    videoTip: "टिप: वीडियो पर राइट-क्लिक करें और 'Picture in Picture' चुनें ताकि काम करते हुए भी देख सकें।",
    chapterTitle: "चैप्टर इंडेक्स",
    chapterDesc: "किसी भी टॉपिक पर क्लिक करें — वीडियो उस पल पर चला जाएगा",
    helpTitle: "और मदद चाहिए?",
    helpDesc: "हमारी सपोर्ट टीम चैट या टिकट के ज़रिए उपलब्ध है। किसी भी पेज के नीचे-दाईं तरफ चैट बब्बल है, या नीचे टिकट खोलें।",
    supportBtn: "सपोर्ट टिकट खोलें",
    openBtn: "वीडियो नए टैब में खोलें",
  },
  ne: {
    videoTitle: "पूरा उत्पाद ट्युटोरियल",
    videoDesc: "Orivraa का हरेक सुविधाको पूर्ण वाकथ्रू · २३ मिनेट",
    badgeLabel: "नेपाली",
    videoAriaLabel: "Orivraa गहना पसल सफ्टवेयरको पूरा ट्युटोरियल",
    videoError: "यहाँ डाउनलोड गर्नुहोस्",
    videoTip: "टिप: भिडियोमा राइट-क्लिक गरी 'Picture in Picture' छान्नुहोस्।",
    chapterTitle: "च्याप्टर सूची",
    chapterDesc: "कुनै पनि विषयमा क्लिक गर्नुहोस् — भिडियो त्यही स्थानमा जान्छ",
    helpTitle: "थप सहायता चाहिन्छ?",
    helpDesc: "हाम्रो सपोर्ट टिम चाट वा टिकटमार्फत उपलब्ध छ। जुनसुकै पेजको तल-दाईंतर्फ च्याट बबल छ।",
    supportBtn: "सपोर्ट टिकट खोल्नुहोस्",
    openBtn: "भिडियो नयाँ ट्याबमा खोल्नुहोस्",
  },
  es: {
    videoTitle: "Tutorial completo del producto",
    videoDesc: "Guía completa de todas las funciones de Orivraa · 23 minutos",
    badgeLabel: "Español",
    videoAriaLabel: "Tutorial completo del software Orivraa para joyerías",
    videoError: "Descargar el tutorial",
    videoTip: 'Sugerencia: haz clic derecho en el video y selecciona "Imagen en imagen" para verlo mientras trabajas.',
    chapterTitle: "Índice de capítulos",
    chapterDesc: "Haz clic en cualquier capítulo — el video saltará a ese momento",
    helpTitle: "¿Necesitas más ayuda?",
    helpDesc: "Nuestro equipo de soporte está disponible por chat o ticket. Usa el botón flotante en la esquina inferior derecha de cualquier página.",
    supportBtn: "Abrir ticket de soporte",
    openBtn: "Abrir video en nueva pestaña",
  },
  ar: {
    videoTitle: "الشرح الكامل للمنتج",
    videoDesc: "جولة كاملة في كل ميزات أوريفرا · ٢٣ دقيقة",
    badgeLabel: "العربية",
    videoAriaLabel: "الشرح الكامل لبرنامج أوريفرا لمحلات المجوهرات",
    videoError: "تنزيل الشرح",
    videoTip: 'نصيحة: انقر بزر الماوس الأيمن على الفيديو واختر "صورة في صورة" للمشاهدة أثناء العمل.',
    chapterTitle: "فهرس المحاور",
    chapterDesc: "انقر على أي محور — سينتقل الفيديو إلى تلك اللحظة",
    helpTitle: "هل تحتاج مزيداً من المساعدة؟",
    helpDesc: "فريق الدعم متاح عبر الدردشة أو التذكرة. استخدم زر الدردشة العائم في أسفل يمين أي صفحة.",
    supportBtn: "فتح تذكرة دعم",
    openBtn: "فتح الفيديو في تبويب جديد",
  },
};

const CHAPTERS: Record<Lang, { time: string; label: string }[]> = {
  en: [
    { time: "0:08",  label: "Introduction & overview" },
    { time: "1:12",  label: "Dashboard — live gold & silver prices" },
    { time: "3:24",  label: "Inventory management by weight & purity" },
    { time: "5:45",  label: "Point of Sale (POS) — create a sale" },
    { time: "7:30",  label: "GST invoice generation & printing" },
    { time: "9:00",  label: "Digital catalogue builder" },
    { time: "11:10", label: "Customer management & CRM" },
    { time: "13:20", label: "Karigar (artisan) job & account tracking" },
    { time: "15:40", label: "Tax engine — GST / VAT / CGST / SGST" },
    { time: "17:50", label: "Business reports & analytics" },
    { time: "19:30", label: "AI business insights" },
    { time: "21:30", label: "Mobile app & multi-branch support" },
    { time: "23:00", label: "Pricing plans & free trial" },
  ],
  hi: [
    { time: "0:08",  label: "परिचय और अवलोकन" },
    { time: "1:12",  label: "डैशबोर्ड — लाइव सोना और चांदी के भाव" },
    { time: "3:24",  label: "इन्वेंटरी प्रबंधन — वजन और शुद्धता के अनुसार" },
    { time: "5:45",  label: "पॉइंट ऑफ सेल (POS) — बिक्री करें" },
    { time: "7:30",  label: "GST इनवॉइस तैयार करें और प्रिंट करें" },
    { time: "9:00",  label: "डिजिटल कैटलॉग बिल्डर" },
    { time: "11:10", label: "ग्राहक प्रबंधन और CRM" },
    { time: "13:20", label: "कारीगर का काम और खाता ट्रैकिंग" },
    { time: "15:40", label: "टैक्स इंजन — GST / VAT / CGST / SGST" },
    { time: "17:50", label: "बिज़नेस रिपोर्ट और एनालिटिक्स" },
    { time: "19:30", label: "AI बिज़नेस इनसाइट्स" },
    { time: "21:30", label: "मोबाइल ऐप और मल्टी-ब्रांच सपोर्ट" },
    { time: "23:00", label: "प्राइसिंग प्लान और फ्री ट्रायल" },
  ],
  ne: [
    { time: "0:08",  label: "परिचय र अवलोकन" },
    { time: "1:12",  label: "ड्यासबोर्ड — सुन र चाँदीको भाउ" },
    { time: "3:24",  label: "सामान व्यवस्थापन — तौल र शुद्धता" },
    { time: "5:45",  label: "POS — बिक्री गर्नुहोस्" },
    { time: "7:30",  label: "GST बिजक बनाउनुहोस् र प्रिन्ट गर्नुहोस्" },
    { time: "9:00",  label: "डिजिटल क्याटलग बिल्डर" },
    { time: "11:10", label: "ग्राहक व्यवस्थापन र CRM" },
    { time: "13:20", label: "कारिगर काम र खाता ट्र्याकिङ" },
    { time: "15:40", label: "ट्याक्स इन्जिन — GST / VAT" },
    { time: "17:50", label: "व्यापार रिपोर्ट र विश्लेषण" },
    { time: "19:30", label: "AI व्यापार अन्तर्दृष्टि" },
    { time: "21:30", label: "मोबाइल एप र बहु-शाखा समर्थन" },
    { time: "23:00", label: "मूल्य योजना र निःशुल्क परीक्षण" },
  ],
  es: [
    { time: "0:08",  label: "Introducción y vista general" },
    { time: "1:12",  label: "Panel — precios en vivo de oro y plata" },
    { time: "3:24",  label: "Inventario por peso y pureza" },
    { time: "5:45",  label: "Punto de venta — crear una venta" },
    { time: "7:30",  label: "Generación e impresión de factura GST" },
    { time: "9:00",  label: "Generador de catálogo digital" },
    { time: "11:10", label: "Gestión de clientes y CRM" },
    { time: "13:20", label: "Seguimiento de artesano y cuentas" },
    { time: "15:40", label: "Motor fiscal — GST / VAT" },
    { time: "17:50", label: "Reportes y análisis de negocio" },
    { time: "19:30", label: "Información de IA para el negocio" },
    { time: "21:30", label: "App móvil y soporte multi-sucursal" },
    { time: "23:00", label: "Planes de precios y prueba gratuita" },
  ],
  ar: [
    { time: "0:08",  label: "مقدمة ونظرة عامة" },
    { time: "1:12",  label: "لوحة التحكم — أسعار الذهب والفضة الحية" },
    { time: "3:24",  label: "المخزون بالوزن والنقاء" },
    { time: "5:45",  label: "نقطة البيع — إنشاء عملية بيع" },
    { time: "7:30",  label: "إنشاء فاتورة GST وطباعتها" },
    { time: "9:00",  label: "منشئ الكتالوج الرقمي" },
    { time: "11:10", label: "إدارة العملاء" },
    { time: "13:20", label: "تتبع عمل الصانع" },
    { time: "15:40", label: "محرك الضرائب — GST / VAT" },
    { time: "17:50", label: "التقارير والتحليلات" },
    { time: "19:30", label: "رؤى الذكاء الاصطناعي" },
    { time: "21:30", label: "التطبيق المحمول ودعم الفروع المتعددة" },
    { time: "23:00", label: "خطط الأسعار والتجربة المجانية" },
  ],
};

export default function HelpPage() {
  const [lang, setLang] = useState<Lang>("en");
  const ui = UI[lang];
  const videoRef = useRef<HTMLVideoElement>(null);

  const seekTo = useCallback((time: string) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = timeToSeconds(time);
    // Scroll video into view, then play
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.play().catch(() => {
      // Autoplay blocked by browser — user still sees the seeked position
    });
  }, []);

  const videoUrl = `${CDN_BASE}/tutorial/${lang}`;
  const chapters = CHAPTERS[lang];

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Page header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Tutorial &amp; Help</h1>
              <p className="text-muted-foreground">
                Watch the full walkthrough, jump to a chapter, or raise a support
                ticket — all from here.
              </p>
            </div>
            {/* Language toggle */}
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {(["en", "hi", "ne", "es", "ar"] as Lang[]).map((l) => (
                <Button
                  key={l}
                  variant={lang === l ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLang(l)}
                >
                  {LANG_LABELS[l]}
                </Button>
              ))}
            </div>
          </div>

          {/* Tutorial video card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-amber-500" />
                  {ui.videoTitle}
                </CardTitle>
                <CardDescription className="mt-1">
                  {ui.videoDesc}
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {ui.badgeLabel}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Video player — key={lang} remounts when language switches,
                  ensuring the src change takes effect cleanly */}
              <div
                className="relative w-full rounded-lg overflow-hidden bg-black"
                style={{ paddingTop: "56.25%" }}
              >
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  key={lang}
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full"
                  controls
                  preload="metadata"
                  poster="https://www.orivraa.com/og-image.png"
                  aria-label={ui.videoAriaLabel}
                >
                  <source src={videoUrl} type="video/mp4" />
                  <a href={videoUrl} className="text-amber-500 underline">{ui.videoError}</a>
                </video>
              </div>

              <p className="text-xs text-muted-foreground">
                {ui.videoTip}
              </p>
            </CardContent>
          </Card>

          {/* Chapter index */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-amber-500" />
                {ui.chapterTitle}
              </CardTitle>
              <CardDescription>
                {ui.chapterDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {chapters.map(({ time, label }) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => seekTo(time)}
                    className="flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm text-left
                               hover:bg-accent hover:border-amber-500/40 transition-colors cursor-pointer group"
                  >
                    <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="font-mono text-amber-600 dark:text-amber-400 w-12 shrink-0 tabular-nums">
                      {time}
                    </span>
                    <span className="text-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Help & support */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-amber-500" />
                {ui.helpTitle}
              </CardTitle>
              <CardDescription>
                {ui.helpDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Button asChild>
                <Link href="/dashboard/shop/support">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {ui.supportBtn}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {ui.openBtn}
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
