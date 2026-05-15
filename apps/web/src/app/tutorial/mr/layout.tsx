import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orivraa ट्युटोरियल 2026 | ज्वेलरी दुकान सॉफ्टवेअर संपूर्ण मार्गदर्शिका मराठीत",
  description:
    "Orivraa ज्वेलरी दुकान सॉफ्टवेअरची 24-मिनिटांची संपूर्ण मार्गदर्शिका मराठीत. इन्व्हेंटरी, GST बिलिंग, POS, डिजिटल कॅटलॉग, कारागीर ट्रॅकिंग, कर अहवाल आणि AI — सर्व एकाच ऍपमध्ये. 30 दिवस मोफत चाचणी.",
  keywords: [
    "ज्वेलरी दुकान सॉफ्टवेअर मराठी",
    "सोने चांदी दुकान सॉफ्टवेअर",
    "ज्वेलरी मॅनेजमेंट सॉफ्टवेअर",
    "GST बिलिंग सॉफ्टवेअर",
    "Orivraa tutorial Marathi",
    "jewellery software Marathi",
    "gold shop software Maharashtra",
  ],
  alternates: {
    canonical: "/tutorial/mr",
    languages: {
      mr: "/tutorial/mr",
      en: "/tutorial",
      "x-default": "/tutorial",
    },
  },
  openGraph: {
    title: "Orivraa ट्युटोरियल 2026 | ज्वेलरी सॉफ्टवेअर मराठीत",
    description: "24-मिनिटांचे ट्युटोरियल — GST बिल, POS, इन्व्हेंटरी, कॅटलॉग आणि AI.",
    url: "https://www.orivraa.com/tutorial/mr",
    type: "video.other",
    videos: [
      {
        url: "https://images.orivraa.com/tutorial/mr",
        secureUrl: "https://images.orivraa.com/tutorial/mr",
        type: "video/mp4",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orivraa ट्युटोरियल 2026 | ज्वेलरी सॉफ्टवेअर मराठीत",
    description: "24-मिनिटांचे ट्युटोरियल मराठीत — GST, POS, इन्व्हेंटरी आणि AI.",
  },
};

export default function TutorialMrLayout({ children }: { children: React.ReactNode }) {
  return children;
}
