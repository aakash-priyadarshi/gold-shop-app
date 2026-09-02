import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "شرح أوريفرا | دليل برنامج محلات المجوهرات",
  description:
    "شرح كامل 24 دقيقة لبرنامج أوريفرا لمحلات المجوهرات: المخزون، الفوترة، نقطة البيع، الكتالوج الرقمي، إدارة الصانع والذكاء الاصطناعي.",
  path: "/tutorial/ar",
  locale: "ar_AE",
  languages: {
    ar: "/tutorial/ar",
    en: "/tutorial",
    "x-default": "/tutorial",
  },
  keywords: [
    "برنامج محلات المجوهرات عربي",
    "برنامج ذهب وفضة عربي",
    "برنامج إدارة جوهرجي",
    "برنامج محل مجوهرات",
    "نقطة بيع مجوهرات",
    "برنامج فاتورة ذهب",
    "برنامج مخزون مجوهرات",
    "برنامج إدارة محل ذهب",
    "أوريفرا شرح عربي",
    "Orivraa tutorial Arabic",
  ],
});

export default function TutorialArLayout({ children }: { children: React.ReactNode }) {
  return children;
}
