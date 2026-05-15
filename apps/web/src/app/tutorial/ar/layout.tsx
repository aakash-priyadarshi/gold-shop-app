import { Metadata } from "next";

export const metadata: Metadata = {
  title: "شرح أوريفرا 2026 | الدليل الكامل لبرنامج محلات المجوهرات بالعربية",
  description:
    "شرح كامل مدته 24 دقيقة بالعربية لبرنامج أوريفرا لمحلات المجوهرات. المخزون، الفوترة GST، نقطة البيع، الكتالوج الرقمي، إدارة الصانع، التقارير الضريبية والذكاء الاصطناعي — كل شيء في مكان واحد.",
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
    "Orivraa jewellery software Arabic",
    "أفضل برنامج مجوهرات 2026",
    "برنامج جوهرجي الإمارات",
    "برنامج مجوهرات السعودية",
    "برنامج تجار الذهب",
    "برنامج كتالوج مجوهرات رقمي",
    "برنامج ضريبة GST مجوهرات",
    "برنامج مجوهرات مجاني",
    "jewellery software UAE Arabic",
    "gold shop software Arabic",
    "برنامج بيع الذهب",
    "برنامج سعر الذهب الفوري",
  ],
  alternates: {
    canonical: "/tutorial/ar",
    languages: {
      ar: "/tutorial/ar",
      en: "/tutorial",
      "x-default": "/tutorial",
    },
  },
  openGraph: {
    title: "شرح أوريفرا 2026 | برنامج محلات المجوهرات بالعربية",
    description:
      "شرح كامل 24 دقيقة — فوترة GST، نقطة البيع، المخزون، الكتالوج الرقمي، إدارة الصانع والذكاء الاصطناعي.",
    url: "https://www.orivraa.com/tutorial/ar",
    type: "video.other",
    videos: [
      {
        url: "https://images.orivraa.com/tutorial/ar",
        secureUrl: "https://images.orivraa.com/tutorial/ar",
        type: "video/mp4",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "شرح أوريفرا 2026 | برنامج محلات المجوهرات بالعربية",
    description:
      "شرح 24 دقيقة بالعربية — فوترة، نقطة بيع، مخزون وذكاء اصطناعي لمحلات المجوهرات.",
  },
};

export default function TutorialArLayout({ children }: { children: React.ReactNode }) {
  return children;
}
