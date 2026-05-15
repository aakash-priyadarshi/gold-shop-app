import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ओरिव्रा ट्यूटोरियल 2026 | गहना पसलको सम्पूर्ण नेपाली भिडियो गाइड",
  description:
    "ओरिव्रा गहना पसल सफ्टवेयरको २४ मिनेटको नेपाली ट्यूटोरियल। Inventory, GST बिलिङ, POS, Digital Catalogue, कारीगर Tracking, Tax Report र AI Insights — सबै एकै ठाउँमा।",
  keywords: [
    "गहना पसल सफ्टवेयर नेपाली",
    "सुनचाँदी पसल सफ्टवेयर",
    "सर्राफ सफ्टवेयर नेपाली",
    "jewellery software Nepal Nepali",
    "jewellery billing software Nepal",
    "GST billing software Nepal Nepali",
    "ज्वेलरी POS सफ्टवेयर नेपाल",
    "गहना इन्भेन्टरी सफ्टवेयर नेपाल",
    "karigar management software Nepal",
    "gold shop software Nepal",
    "jewellery shop software Nepal 2026",
    "ओरिव्रा ट्यूटोरियल नेपाली",
    "Orivraa tutorial Nepali",
    "Orivraa jewellery software Nepali",
    "best jewellery software Nepal 2026",
    "jewellery management software Nepal",
    "सुन चाँदी पसल app Nepal",
    "jewellery ERP Nepal Nepali",
    "digital catalogue jewellery Nepal",
    "jewellery billing GST Nepal",
    "सर्राफ पसल सफ्टवेयर",
  ],
  alternates: {
    canonical: "/tutorial/ne",
    languages: {
      ne: "/tutorial/ne",
      en: "/tutorial",
      "x-default": "/tutorial",
    },
  },
  openGraph: {
    title: "ओरिव्रा ट्यूटोरियल 2026 | गहना पसल सफ्टवेयर नेपाली भिडियो",
    description:
      "२४ मिनेटको नेपाली ट्यूटोरियल — GST बिलिङ, POS, Inventory, Digital Catalogue, कारीगर Tracking र AI Insights।",
    url: "https://www.orivraa.com/tutorial/ne",
    type: "video.other",
    videos: [
      {
        url: "https://images.orivraa.com/tutorial/ne",
        secureUrl: "https://images.orivraa.com/tutorial/ne",
        type: "video/mp4",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ओरिव्रा ट्यूटोरियल 2026 | गहना पसल सफ्टवेयर नेपाली भिडियो",
    description:
      "२४ मिनेटको नेपाली ट्यूटोरियल — GST बिलिङ, POS, Inventory, कारीगर र AI Insights।",
  },
};

export default function TutorialNeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
