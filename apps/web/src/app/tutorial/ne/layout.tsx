import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "ओरिव्रा ट्यूटोरियल | गहना पसल सफ्टवेयर गाइड",
  description:
    "ओरिव्रा गहना पसल सफ्टवेयरको २४ मिनेटको नेपाली गाइड: इन्भेन्टरी, बिलिङ, POS, डिजिटल क्याटलग र कारीगर। नि:शुल्क सुरु गर्नुहोस्।",
  path: "/tutorial/ne",
  locale: "ne_NP",
  languages: {
    ne: "/tutorial/ne",
    en: "/tutorial",
    "x-default": "/tutorial",
  },
  keywords: [
    "गहना पसल सफ्टवेयर नेपाली",
    "सुनचाँदी पसल सफ्टवेयर",
    "सर्राफ सफ्टवेयर नेपाली",
    "jewellery software Nepal Nepali",
    "jewellery billing software Nepal",
    "GST billing software Nepal Nepali",
    "ज्वेलरी POS सफ्टवेयर नेपाल",
    "गहना इन्भेन्टरी सफ्टवेयर नेपाल",
    "Orivraa tutorial Nepali",
  ],
});

export default function TutorialNeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
