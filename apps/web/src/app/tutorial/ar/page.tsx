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

const TUTORIAL_VIDEO_URL = "https://images.orivraa.com/tutorial/ar";

const videoSchema = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "أوريفرا — الشرح الكامل لبرنامج محلات المجوهرات بالعربية 2026",
  description:
    "شرح كامل مدته 24 دقيقة بالعربية لبرنامج أوريفرا لمحلات المجوهرات. يشمل عرضاً تفصيلياً خطوة بخطوة للفوترة GST/VAT، معاملات نقطة البيع، المخزون بالوزن والنقاء، الكتالوج الرقمي، إدارة الصانع، التقارير الضريبية والذكاء الاصطناعي.",
  thumbnailUrl: "https://www.orivraa.com/og-image.png",
  uploadDate: "2026-05-15",
  duration: "PT24M0S",
  contentUrl: TUTORIAL_VIDEO_URL,
  embedUrl: "https://www.orivraa.com/tutorial/ar",
  publisher: {
    "@type": "Organization",
    name: "Orivraa",
    url: "https://orivraa.com",
    logo: {
      "@type": "ImageObject",
      url: "https://www.orivraa.com/logo.png",
    },
  },
  inLanguage: "ar",
  hasPart: [
    { "@type": "Clip", name: "مقدمة ونظرة عامة", startOffset: 8, url: "https://www.orivraa.com/tutorial/ar#t=8" },
    { "@type": "Clip", name: "لوحة التحكم — أسعار الذهب والفضة الحية", startOffset: 72, url: "https://www.orivraa.com/tutorial/ar#t=72" },
    { "@type": "Clip", name: "المخزون بالوزن والنقاء", startOffset: 204, url: "https://www.orivraa.com/tutorial/ar#t=204" },
    { "@type": "Clip", name: "نقطة البيع — إنشاء عملية بيع", startOffset: 345, url: "https://www.orivraa.com/tutorial/ar#t=345" },
    { "@type": "Clip", name: "إنشاء فاتورة GST وطباعتها", startOffset: 450, url: "https://www.orivraa.com/tutorial/ar#t=450" },
    { "@type": "Clip", name: "منشئ الكتالوج الرقمي", startOffset: 540, url: "https://www.orivraa.com/tutorial/ar#t=540" },
    { "@type": "Clip", name: "إدارة العملاء", startOffset: 670, url: "https://www.orivraa.com/tutorial/ar#t=670" },
    { "@type": "Clip", name: "تتبع عمل الصانع (كريغار)", startOffset: 800, url: "https://www.orivraa.com/tutorial/ar#t=800" },
    { "@type": "Clip", name: "محرك الضرائب — GST / VAT", startOffset: 940, url: "https://www.orivraa.com/tutorial/ar#t=940" },
    { "@type": "Clip", name: "التقارير والتحليلات", startOffset: 1070, url: "https://www.orivraa.com/tutorial/ar#t=1070" },
    { "@type": "Clip", name: "رؤى الذكاء الاصطناعي", startOffset: 1170, url: "https://www.orivraa.com/tutorial/ar#t=1170" },
    { "@type": "Clip", name: "التطبيق المحمول ودعم الفروع المتعددة", startOffset: 1290, url: "https://www.orivraa.com/tutorial/ar#t=1290" },
    { "@type": "Clip", name: "خطط الأسعار والتجربة المجانية", startOffset: 1380, url: "https://www.orivraa.com/tutorial/ar#t=1380" },
  ],
};

const CHAPTERS = [
  { time: "0:08",  label: "مقدمة ونظرة عامة" },
  { time: "1:12",  label: "لوحة التحكم — أسعار الذهب والفضة الحية" },
  { time: "3:24",  label: "المخزون بالوزن والنقاء" },
  { time: "5:45",  label: "نقطة البيع — إنشاء عملية بيع" },
  { time: "7:30",  label: "إنشاء فاتورة GST وطباعتها" },
  { time: "9:00",  label: "منشئ الكتالوج الرقمي" },
  { time: "11:10", label: "إدارة العملاء" },
  { time: "13:20", label: "تتبع عمل الصانع (كريغار)" },
  { time: "15:40", label: "محرك الضرائب — GST / VAT" },
  { time: "17:50", label: "التقارير والتحليلات" },
  { time: "19:30", label: "رؤى الذكاء الاصطناعي" },
  { time: "21:30", label: "التطبيق المحمول ودعم الفروع المتعددة" },
  { time: "23:00", label: "خطط الأسعار والتجربة المجانية" },
];

const FEATURES = [
  {
    icon: Scale,
    title: "المخزون بالوزن والنقاء",
    desc: "سجّل كل قطعة بالجرام أو التولة أو الأونصة. يحسب التطبيق قيمة الذهب والفضة تلقائياً بأسعار السوق الحية.",
  },
  {
    icon: Receipt,
    title: "فوترة GST / VAT",
    desc: "أصدر فواتير ضريبية فورية. GST للهند، VAT للإمارات والسعودية والمملكة المتحدة — كل شيء متاح.",
  },
  {
    icon: Store,
    title: "نقطة بيع سريعة",
    desc: "نقطة بيع باللمس مع مسح الباركود وتسعير بسعر المعدن وطباعة إيصالات فورية.",
  },
  {
    icon: BookOpen,
    title: "كتالوج رقمي",
    desc: "انشر كتالوجاً إلكترونياً قابلاً للمشاركة مع الصور والأسعار وزر الاستفسار عبر واتساب.",
  },
  {
    icon: Users,
    title: "إدارة الصانع",
    desc: "تتبّع أعمال الصانع والمواد المسلّمة والمُعادة والأجور والأرصدة المستحقة.",
  },
  {
    icon: BarChart3,
    title: "التحليلات والتقارير",
    desc: "الإغلاق اليومي والمنتجات الأكثر مبيعاً والمخزون البطيء وتفصيل الأرباح والملخصات الضريبية.",
  },
  {
    icon: Sparkles,
    title: "الذكاء الاصطناعي للأعمال",
    desc: "اطرح أسئلة عن محلك بالعربية أو الإنجليزية واحصل على إجابات فورية من بياناتك.",
  },
  {
    icon: Smartphone,
    title: "يعمل على جميع الأجهزة",
    desc: "المتصفح وAndroid وiOS وتطبيق سطح المكتب لـ Windows. حساب واحد على كل الأجهزة.",
  },
];

const TRUST_POINTS = [
  "أسعار معادن حية — يتحدث الذهب والفضة كل دقيقة",
  "يدعم الهند (GST) والنيبال والإمارات (VAT) والمملكة المتحدة والولايات المتحدة",
  "خطة مجانية متاحة — دون بطاقة ائتمان",
  "تجربة مجانية 30 يوماً على خطط Pro",
  "أمان بمعيار ISO — البيانات مشفّرة أثناء التخزين والنقل",
  "إشعارات واتساب للفواتير وتحديثات الطلبات",
];

export default function TutorialArPage() {
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
            شرح كامل مدته 24 دقيقة
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4" dir="rtl">
            أوريفرا — برنامج محلات المجوهرات{" "}
            <span className="text-amber-400">الشرح الكامل بالعربية</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4" dir="rtl">
            جولة تفصيلية خطوة بخطوة في كل ميزة: المخزون، الفوترة، نقطة البيع،
            الكتالوجات الرقمية، إدارة الصانع، التقارير الضريبية والذكاء الاصطناعي.
          </p>
          <p className="text-sm text-gray-500">
            <Link href="/demo" className="text-amber-400 underline hover:text-amber-300">
              شاهد العرض السريع
            </Link>
            {" "}إذا كنت تريد نظرة سريعة
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
              aria-label="فيديو شرح برنامج أوريفرا لمحلات المجوهرات بالعربية"
            >
              <source src={TUTORIAL_VIDEO_URL} type="video/mp4" />
              متصفحك لا يدعم HTML5 video. يرجى{" "}
              <a href={TUTORIAL_VIDEO_URL} className="text-amber-400 underline">
                تنزيل فيديو الشرح
              </a>
              .
            </video>
          </div>

          <div className="flex items-center gap-3 mt-4 justify-end text-sm text-gray-500 flex-wrap">
            <span dir="rtl">متاح بـ:</span>
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
            <Link href="/tutorial/es" className="text-gray-400 hover:text-amber-400 px-2 py-0.5 rounded transition-colors">Español</Link>
            <span className="bg-amber-500 text-gray-950 font-semibold px-2 py-0.5 rounded">العربية</span>
          </div>
        </div>
      </section>

      {/* CHAPTER INDEX */}
      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-6" dir="rtl">
            محتوى هذا الشرح
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
                <span className="text-gray-300 text-sm" dir="rtl">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE GRID */}
      <section className="px-4 pb-20 bg-gray-900/50">
        <div className="max-w-6xl mx-auto py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3" dir="rtl">
              كل ما يحتاجه محل المجوهرات — في مكان واحد
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto" dir="rtl">
              اشتراك واحد يغطي عملك بالكامل — من الميزان حتى تقارير ضريبة القيمة المضافة.
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
                <h3 className="font-semibold text-white mb-2" dir="rtl">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed" dir="rtl">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center" dir="rtl">
            لماذا يختار تجار المجوهرات في الهند ونيبال والإمارات أوريفرا
          </h2>
          <ul className="space-y-3">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-gray-300" dir="rtl">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24">
        <div className="max-w-2xl mx-auto text-center bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-2xl border border-amber-500/20 p-10">
          <ShieldCheck className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3" dir="rtl">
            هل تريد تجربته بنفسك؟
          </h2>
          <p className="text-gray-400 mb-8" dir="rtl">
            خطة مجانية متاحة — دون بطاقة ائتمان. خطط Pro للهند تبدأ من ₹299 شهرياً. تجربة مجانية كاملة 30 يوماً على جميع الخطط المدفوعة.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-7 py-3 rounded-xl transition-colors"
            >
              ابدأ التجربة المجانية
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/jewellery-shop-software"
              className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-7 py-3 rounded-xl transition-colors"
            >
              عرض جميع الميزات
            </Link>
          </div>
        </div>
      </section>

      {/* SEO TEXT */}
      <section className="sr-only" aria-hidden="false">
        <h2>شرح أوريفرا بالعربية — برنامج محلات المجوهرات</h2>
        <p>
          أوريفرا برنامج متكامل لإدارة محلات المجوهرات يُستخدم في الهند ونيبال والإمارات
          والمملكة المتحدة والولايات المتحدة من قِبل محلات الذهب والفضة والمجوهرات متعددة الفروع.
          يعرض هذا الشرح بالعربية كل الميزات الرئيسية خطوة بخطوة:
          برنامج فوترة مجوهرات مع GST وVAT، برنامج نقطة بيع مجوهرات سريع،
          برنامج مخزون مجوهرات بالوزن والنقاء، برنامج كتالوج رقمي،
          إدارة عمل الصانع والتحليلات المدعومة بالذكاء الاصطناعي.
        </p>
        <p>
          هذا هو أفضل شرح لبرنامج محلات المجوهرات بالعربية 2026 لأصحاب محلات الذهب والفضة
          والمجوهرات الحديثة الباحثين عن بديل لبرامج الفوترة التقليدية — يعمل على الجوال
          والكمبيوتر اللوحي وسطح المكتب. تجربة مجانية للبرنامج متاحة.
          مناسب للإمارات والسعودية والكويت والبحرين وعموم منطقة الخليج العربي.
        </p>
      </section>

      <DynamicFooter />
    </div>
  );
}
