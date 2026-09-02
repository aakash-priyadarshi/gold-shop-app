import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "ओरिव्रा ट्यूटोरियल | ज्वेलरी सॉफ्टवेयर हिंदी गाइड",
  description:
    "ओरिव्रा ज्वेलरी शॉप सॉफ्टवेयर का 24 मिनट का हिंदी गाइड: इन्वेंटरी, GST बिलिंग, POS, डिजिटल कैटलॉग, कारीगर ट्रैकिंग और AI। फ्री ट्रायल।",
  path: "/tutorial/hi",
  locale: "hi_IN",
  languages: {
    hi: "/tutorial/hi",
    en: "/tutorial",
    "x-default": "/tutorial",
  },
  keywords: [
    "ज्वेलरी शॉप सॉफ्टवेयर ट्यूटोरियल",
    "jewellery software tutorial hindi",
    "सोना चांदी दुकान सॉफ्टवेयर",
    "सर्राफ सॉफ्टवेयर हिंदी",
    "jewellery billing software hindi",
    "GST billing software tutorial hindi",
    "ज्वेलरी POS सॉफ्टवेयर",
    "ज्वेलरी इन्वेंटरी सॉफ्टवेयर हिंदी",
    "कारीगर मैनेजमेंट सॉफ्टवेयर",
    "सोने की दुकान सॉफ्टवेयर",
    "Orivraa tutorial Hindi",
  ],
});

export default function TutorialHiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
