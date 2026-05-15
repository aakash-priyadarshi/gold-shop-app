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
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  PlayCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

const CDN_BASE = "https://images.orivraa.com";

/** Parse "M:SS" or "MM:SS" → seconds (same format used in the chapter list) */
function timeToSeconds(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

type Lang = "en" | "hi" | "ne" | "gu" | "mr" | "ta" | "te" | "kn" | "fr" | "de" | "es" | "ar";

const COMING_SOON_LANGS: Lang[] = ["fr", "de", "ta", "gu", "mr", "te", "kn"];

const LANG_LABELS: Record<Lang, string> = {
  en: "English",
  hi: "हिंदी",
  ne: "नेपाली",
  gu: "ગુજરાતી",
  mr: "मराठी",
  ta: "தமிழ்",
  te: "తెలుగు",
  kn: "ಕನ್ನಡ",
  fr: "Français",
  de: "Deutsch",
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
  gu: {
    videoTitle: "સંપૂર્ણ ઉત્પાદ ટ્યુટોરિયલ",
    videoDesc: "Orivraa ની દરેક સુવિધાનો સંપૂર્ણ પ્રવાસ · ૨૩ મિનિટ",
    badgeLabel: "ગુજરાતી",
    videoAriaLabel: "Orivraa ઝવેરી દુકાન સૉફ્ટવેર સંપૂર્ણ ટ્યુટોરિયલ",
    videoError: "ટ્યુટોરિયલ ડાઉનલોડ કરો",
    videoTip: "ટિપ: વીડિયો પર રાઇટ-ક્લિક કરો અને 'Picture in Picture' પસંદ કરો.",
    chapterTitle: "ચૅપ્ટર ઇન્ડેક્સ",
    chapterDesc: "કોઈ પણ ચૅપ્ટર પર ક્લિક કરો — વીડિયો તે ક્ષણ પર જશે",
    helpTitle: "વધુ મદદ જોઈએ છે?",
    helpDesc: "અમારી સપોર્ટ ટીમ ચૅટ અથવા ટિકિટ દ્વારા ઉપલબ્ધ છે.",
    supportBtn: "સપોર્ટ ટિકિટ ખોલો",
    openBtn: "નવી ટૅબમાં વીડિયો ખોલો",
  },
  mr: {
    videoTitle: "संपूर्ण उत्पाद ट्यूटोरियल",
    videoDesc: "Orivraa च्या प्रत्येक वैशिष्ट्याचे संपूर्ण मार्गदर्शन · २३ मिनिटे",
    badgeLabel: "मराठी",
    videoAriaLabel: "Orivraa दागिना दुकान सॉफ्टवेअर संपूर्ण ट्यूटोरियल",
    videoError: "ट्यूटोरियल डाउनलोड करा",
    videoTip: "टिप: व्हिडिओवर उजवे-क्लिक करा आणि 'Picture in Picture' निवडा.",
    chapterTitle: "अध्याय अनुक्रमणिका",
    chapterDesc: "कोणत्याही अध्यायावर क्लिक करा — व्हिडिओ त्या क्षणी जाईल",
    helpTitle: "अधिक मदत हवी आहे?",
    helpDesc: "आमची सपोर्ट टीम चॅट किंवा तिकीटद्वारे उपलब्ध आहे.",
    supportBtn: "सपोर्ट तिकीट उघडा",
    openBtn: "नवीन टॅबमध्ये व्हिडिओ उघडा",
  },
  ta: {
    videoTitle: "முழுமையான தயாரிப்பு பயிற்சி",
    videoDesc: "Orivraa இன் அனைத்து அம்சங்களும் · ²³ நிமிடங்கள்",
    badgeLabel: "தமிழ்",
    videoAriaLabel: "Orivraa நகை கடை மென்பொருளின் முழுமையான பயிற்சி",
    videoError: "பயிற்சியை பதிவிறக்கவும்",
    videoTip: "குறிப்பு: வீடியோவில் வலது கிளிக் செய்து 'Picture in Picture' தேர்வு செய்யுங்கள்.",
    chapterTitle: "அத்தியாயம் அட்டவணை",
    chapterDesc: "எந்த அத்தியாயத்தையும் கிளிக் செய்யுங்கள் — வீடியோ அந்த நேரத்திற்கு செல்லும்",
    helpTitle: "மேலும் உதவி தேவையா?",
    helpDesc: "எங்கள் ஆதரவு குழு அரட்டை அல்லது சீட்டி மூலம் கிடைக்கிறது.",
    supportBtn: "ஆதரவு டிக்கெட் திறக்கவும்",
    openBtn: "புதிய தாவலில் வீடியோவைத் திறக்கவும்",
  },
  te: {
    videoTitle: "సంపూర్ణ ఉత్పత్తి ట్యుటోరియల్",
    videoDesc: "Orivraa యొక్క అన్ని లక్షణాలు · ²³ నిమిషాలు",
    badgeLabel: "తెలుగు",
    videoAriaLabel: "Orivraa జువెలరీ షాప్ సాఫ్ట్‌వేర్ సంపూర్ణ ట్యుటోరియల్",
    videoError: "ట్యుటోరియల్ డౌన్‌లోడ్ చేయండి",
    videoTip: "చిట్కా: వీడియోపై రైట్-క్లిక్ చేసి 'Picture in Picture' ఎంచుకోండి.",
    chapterTitle: "అధ్యాయం సూచిక",
    chapterDesc: "ఏదైనా అధ్యాయంపై క్లిక్ చేయండి — వీడియో ఆ క్షణంలోకి వెళ్తుంది",
    helpTitle: "మరింత సహాయం కావాలా?",
    helpDesc: "మా సపోర్ట్ టీమ్ చాట్ లేదా టిక్కెట్ ద్వారా అందుబాటులో ఉంది.",
    supportBtn: "సపోర్ట్ టిక్కెట్ తెరవండి",
    openBtn: "కొత్త ట్యాబ్‌లో వీడియో తెరవండి",
  },
  kn: {
    videoTitle: "ಸಂಪೂರ್ಣ ಉತ್ಪನ್ನ ಟ್ಯುಟೋರಿಯಲ್",
    videoDesc: "Orivraa ನ ಪ್ರತಿಯೊಂದು ವೈಶಿಷ್ಟ್ಯ · ²³ ನಿಮಿಷಗಳು",
    badgeLabel: "ಕನ್ನಡ",
    videoAriaLabel: "Orivraa ಆಭರಣ ಅಂಗಡಿ ಸಾಫ್ಟ್‌ವೇರ್ ಸಂಪೂರ್ಣ ಟ್ಯುಟೋರಿಯಲ್",
    videoError: "ಟ್ಯುಟೋರಿಯಲ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
    videoTip: "ಟಿಪ್: ವೀಡಿಯೋದ ಮೇಲೆ ರೈಟ್-ಕ್ಲಿಕ್ ಮಾಡಿ 'Picture in Picture' ಆಯ್ಕೆ ಮಾಡಿ.",
    chapterTitle: "ಅಧ್ಯಾಯ ಸೂಚಿ",
    chapterDesc: "ಯಾವುದೇ ಅಧ್ಯಾಯದ ಮೇಲೆ ಕ್ಲಿಕ್ ಮಾಡಿ — ವೀಡಿಯೋ ಆ ಕ್ಷಣಕ್ಕೆ ಹೋಗುತ್ತದೆ",
    helpTitle: "ಹೆಚ್ಚಿನ ಸಹಾಯ ಬೇಕೇ?",
    helpDesc: "ನಮ್ಮ ಬೆಂಬಲ ತಂಡ ಚಾಟ್ ಅಥವಾ ಟಿಕೆಟ್ ಮೂಲಕ ಲಭ್ಯವಿದೆ.",
    supportBtn: "ಬೆಂಬಲ ಟಿಕೆಟ್ ತೆರೆಯಿರಿ",
    openBtn: "ಹೊಸ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ವೀಡಿಯೋ ತೆರೆಯಿರಿ",
  },
  fr: {
    videoTitle: "Tutoriel complet du produit",
    videoDesc: "Guide complet de toutes les fonctions Orivraa · 23 minutes",
    badgeLabel: "Français",
    videoAriaLabel: "Tutoriel complet du logiciel Orivraa pour bijouteries",
    videoError: "Télécharger le tutoriel",
    videoTip: "Astuce : faites un clic droit sur la vidéo et choisissez \"Image dans l'image\" pour regarder en travaillant.",
    chapterTitle: "Index des chapitres",
    chapterDesc: "Cliquez sur un chapitre — la vidéo ira directement à ce moment",
    helpTitle: "Besoin d'aide supplémentaire ?",
    helpDesc: "Notre équipe de support est disponible par chat ou ticket. Utilisez la bulle de chat en bas à droite.",
    supportBtn: "Ouvrir un ticket de support",
    openBtn: "Ouvrir la vidéo dans un nouvel onglet",
  },
  de: {
    videoTitle: "Vollständiges Produkt-Tutorial",
    videoDesc: "Komplette Anleitung zu allen Orivraa-Funktionen · 23 Minuten",
    badgeLabel: "Deutsch",
    videoAriaLabel: "Vollständiges Tutorial der Orivraa-Schmucksoftware",
    videoError: "Tutorial herunterladen",
    videoTip: "Tipp: Rechtsklick auf das Video und \"Bild in Bild\" auswählen.",
    chapterTitle: "Kapitelübersicht",
    chapterDesc: "Klicken Sie auf ein Kapitel — das Video springt an diese Stelle",
    helpTitle: "Brauchen Sie mehr Hilfe?",
    helpDesc: "Unser Support-Team ist per Chat oder Ticket erreichbar. Nutzen Sie die Chat-Schaltfläche unten rechts.",
    supportBtn: "Support-Ticket öffnen",
    openBtn: "Video in neuem Tab öffnen",
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
  gu: [
    { time: "0:08",  label: "પ્રારંભ અને અવલોકન" },
    { time: "1:12",  label: "ડૅશબોર્ડ — સોના-ચાંદીના ભાવ" },
    { time: "3:24",  label: "વજન અને શુદ્ધતા આધારિત ઇન્વેન્ટ્રી" },
    { time: "5:45",  label: "POS — વેચાણ બનાવો" },
    { time: "7:30",  label: "GST ઇન્વૉઇસ બનાવો અને છાપો" },
    { time: "9:00",  label: "ડિજિટલ કૅટૅલૉગ બિલ્ડર" },
    { time: "11:10", label: "ગ્રાહક વ્યવસ્થાપન" },
    { time: "13:20", label: "કારીગર ટ્રૅકિંગ" },
    { time: "15:40", label: "ટૅક્સ એન્જિન — GST / VAT" },
    { time: "17:50", label: "ઍનૅલિટિક્સ અને રિપોર્ટ" },
    { time: "19:30", label: "AI અંતર્દૃષ્ટિ" },
    { time: "21:30", label: "મોબાઇલ ઍપ અને મલ્ટી-શૉપ" },
    { time: "23:00", label: "પ્રાઇસિંગ પ્લાન અને ફ્રી ટ્રાઇલ" },
  ],
  mr: [
    { time: "0:08",  label: "प्रस्तावना आणि आढावा" },
    { time: "1:12",  label: "डॅशबोर्ड — सोने-चांदीचे भाव" },
    { time: "3:24",  label: "वजन आणि शुद्धता आधारित इन्व्हेंटरी" },
    { time: "5:45",  label: "POS — विक्री तयार करा" },
    { time: "7:30",  label: "GST इनव्हॉइस तयार करा आणि मुद्रित करा" },
    { time: "9:00",  label: "डिजिटल कॅटलॉग बिल्डर" },
    { time: "11:10", label: "ग्राहक व्यवस्थापन" },
    { time: "13:20", label: "कारागीर ट्रॅकिंग" },
    { time: "15:40", label: "कर इंजिन — GST / VAT" },
    { time: "17:50", label: "अहवाल आणि विश्लेषण" },
    { time: "19:30", label: "AI अंतर्दृष्टी" },
    { time: "21:30", label: "मोबाइल अॅप आणि मल्टी-शॉप" },
    { time: "23:00", label: "किंमत योजना आणि मोफत चाचणी" },
  ],
  ta: [
    { time: "0:08",  label: "அறிமுகம் மற்றும் மேலோட்டம்" },
    { time: "1:12",  label: "டாஷ்போர்டு — தங்கம்-வெள்ளி நேரடி விலைகள்" },
    { time: "3:24",  label: "எடை மற்றும் தூய்மை அடிப்படையில் சரக்கு" },
    { time: "5:45",  label: "POS — விற்பனை உருவாக்கவும்" },
    { time: "7:30",  label: "GST விலைப்பட்டியல் உருவாக்கவும்" },
    { time: "9:00",  label: "டிஜிட்டல் கேட்டலாக் பில்டர்" },
    { time: "11:10", label: "வாடிக்கையாளர் மேலாண்மை" },
    { time: "13:20", label: "கலைஞர் கண்காணிப்பு" },
    { time: "15:40", label: "வரி இயந்திரம் — GST / VAT" },
    { time: "17:50", label: "அறிக்கைகள் மற்றும் பகுப்பாய்வு" },
    { time: "19:30", label: "AI நுண்ணறிவுகள்" },
    { time: "21:30", label: "மொபைல் செயலி மற்றும் பல-கடை" },
    { time: "23:00", label: "விலை திட்டங்கள் மற்றும் இலவச சோதனை" },
  ],
  te: [
    { time: "0:08",  label: "పరిచయం మరియు అవలోకనం" },
    { time: "1:12",  label: "డాష్‌బోర్డ్ — బంగారం-వెండి ధరలు" },
    { time: "3:24",  label: "బరువు మరియు స్వచ్ఛత ఆధారిత ఇన్వెంటరీ" },
    { time: "5:45",  label: "POS — అమ్మకం సృష్టించండి" },
    { time: "7:30",  label: "GST ఇన్వాయిస్ రూపొందించడం" },
    { time: "9:00",  label: "డిజిటల్ కాటలాగ్ జనరేటర్" },
    { time: "11:10", label: "కస్టమర్ మేనేజ్‌మెంట్" },
    { time: "13:20", label: "కళాకారుడి ట్రాకింగ్" },
    { time: "15:40", label: "పన్ను ఇంజిన్ — GST / VAT" },
    { time: "17:50", label: "నివేదికలు మరియు విశ్లేషణ" },
    { time: "19:30", label: "AI అంతర్దృష్టులు" },
    { time: "21:30", label: "మొబైల్ యాప్ మరియు మల్టీ-షాప్" },
    { time: "23:00", label: "ధర ప్రణాళికలు మరియు ఉచిత ట్రయల్" },
  ],
  kn: [
    { time: "0:08",  label: "ಪರಿಚಯ ಮತ್ತು ಅವಲೋಕನ" },
    { time: "1:12",  label: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ — ಚಿನ್ನ-ಬೆಳ್ಳಿ ಬೆಲೆಗಳು" },
    { time: "3:24",  label: "ತೂಕ ಮತ್ತು ಶುದ್ಧತೆ ಆಧಾರಿತ ದಾಸ್ತಾನು" },
    { time: "5:45",  label: "POS — ಮಾರಾಟ ರಚಿಸಿ" },
    { time: "7:30",  label: "GST ಇನ್‌ವಾಯಿಸ್ ರಚಿಸಿ ಮತ್ತು ಮುದ್ರಿಸಿ" },
    { time: "9:00",  label: "ಡಿಜಿಟಲ್ ಕ್ಯಾಟಲಾಗ್ ಜನರೇಟರ್" },
    { time: "11:10", label: "ಗ್ರಾಹಕ ನಿರ್ವಹಣೆ" },
    { time: "13:20", label: "ಕಾರಿಗರ ಟ್ರ್ಯಾಕಿಂಗ್" },
    { time: "15:40", label: "ತೆರಿಗೆ ಎಂಜಿನ್ — GST / VAT" },
    { time: "17:50", label: "ವರದಿಗಳು ಮತ್ತು ವಿಶ್ಲೇಷಣೆ" },
    { time: "19:30", label: "AI ಒಳನೋಟಗಳು" },
    { time: "21:30", label: "ಮೊಬೈಲ್ ಆಪ್ ಮತ್ತು ಮಲ್ಟಿ-ಶಾಪ್" },
    { time: "23:00", label: "ಬೆಲೆ ಯೋಜನೆಗಳು ಮತ್ತು ಉಚಿತ ಪ್ರಯೋಗ" },
  ],
  fr: [
    { time: "0:08",  label: "Introduction et aperçu" },
    { time: "1:12",  label: "Tableau de bord — prix or & argent en direct" },
    { time: "3:24",  label: "Inventaire par poids et pureté" },
    { time: "5:45",  label: "Point de vente — créer une vente" },
    { time: "7:30",  label: "Génération et impression de facture TVA" },
    { time: "9:00",  label: "Générateur de catalogue numérique" },
    { time: "11:10", label: "Gestion des clients" },
    { time: "13:20", label: "Suivi des artisans" },
    { time: "15:40", label: "Moteur fiscal — GST / TVA" },
    { time: "17:50", label: "Rapports et analyses" },
    { time: "19:30", label: "Insights IA" },
    { time: "21:30", label: "Application mobile et multi-boutiques" },
    { time: "23:00", label: "Plans tarifaires et essai gratuit" },
  ],
  de: [
    { time: "0:08",  label: "Einführung und Überblick" },
    { time: "1:12",  label: "Dashboard — Gold- & Silberpreise live" },
    { time: "3:24",  label: "Inventar nach Gewicht und Reinheit" },
    { time: "5:45",  label: "POS — Verkauf erstellen" },
    { time: "7:30",  label: "MwSt.-Rechnung erstellen und drucken" },
    { time: "9:00",  label: "Digitaler Katalog-Generator" },
    { time: "11:10", label: "Kundenverwaltung" },
    { time: "13:20", label: "Handwerkerverfolgung" },
    { time: "15:40", label: "Steuer-Engine — GST / MwSt." },
    { time: "17:50", label: "Berichte und Analysen" },
    { time: "19:30", label: "KI-Einblicke" },
    { time: "21:30", label: "Mobile App und Multi-Filiale" },
    { time: "23:00", label: "Preispläne und kostenlose Testversion" },
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
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Tutorial &amp; Help</h1>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      Watch the full tutorial video, jump to any chapter, or open a support ticket.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-muted-foreground">
                Watch the full walkthrough, jump to a chapter, or raise a support
                ticket — all from here.
              </p>
            </div>
            {/* Language toggle */}
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {(["en", "hi", "ne", "gu", "mr", "ta", "te", "kn", "fr", "de", "es", "ar"] as Lang[]).map((l) => (
                <Button
                  key={l}
                  variant={lang === l ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLang(l)}
                  className={COMING_SOON_LANGS.includes(l) ? "opacity-60" : ""}
                >
                  {LANG_LABELS[l]}
                  {COMING_SOON_LANGS.includes(l) && (
                    <span className="ml-1 text-[9px] font-semibold uppercase tracking-wide">soon</span>
                  )}
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
                {COMING_SOON_LANGS.includes(lang) ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-950">
                    <Clock className="w-10 h-10 text-amber-400 opacity-70" />
                    <p className="text-white font-semibold text-lg">Coming Soon</p>
                    <p className="text-gray-400 text-sm">{LANG_LABELS[lang]} video is being prepared</p>
                  </div>
                ) : (
                  /* eslint-disable-next-line jsx-a11y/media-has-caption */
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
                )}
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
              <Button variant="outline" asChild={!COMING_SOON_LANGS.includes(lang)} disabled={COMING_SOON_LANGS.includes(lang)}>
                {COMING_SOON_LANGS.includes(lang) ? (
                  <span>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {ui.openBtn}
                  </span>
                ) : (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {ui.openBtn}
                  </a>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
