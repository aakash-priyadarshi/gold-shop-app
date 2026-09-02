import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Orivraa ट्युटोरियल | ज्वेलरी सॉफ्टवेअर मार्गदर्शिका",
  description:
    "Orivraa ज्वेलरी दुकान सॉफ्टवेअरची 24-मिनिटांची मार्गदर्शिका मराठीत: इन्व्हेंटरी, GST बिलिंग, POS, कारागीर आणि AI. मोफत चाचणी.",
  path: "/tutorial/mr",
  locale: "mr_IN",
  languages: {
    mr: "/tutorial/mr",
    en: "/tutorial",
    "x-default": "/tutorial",
  },
  keywords: [
    "ज्वेलरी दुकान सॉफ्टवेअर मराठी",
    "सोने चांदी दुकान सॉफ्टवेअर",
    "ज्वेलरी मॅनेजमेंट सॉफ्टवेअर",
    "GST बिलिंग सॉफ्टवेअर",
    "Orivraa tutorial Marathi",
    "jewellery software Marathi",
    "gold shop software Maharashtra",
  ],
});

export default function TutorialMrLayout({ children }: { children: React.ReactNode }) {
  return children;
}
