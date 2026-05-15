import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orivraa ಟ್ಯುಟೋರಿಯಲ್ 2026 | ಆಭರಣ ಅಂಗಡಿ ಸಾಫ್ಟ್‌ವೇರ್ ಸಂಪೂರ್ಣ ಮಾರ್ಗದರ್ಶಿ ಕನ್ನಡದಲ್ಲಿ",
  description:
    "Orivraa ಆಭರಣ ಅಂಗಡಿ ಸಾಫ್ಟ್‌ವೇರ್‌ನ 24-ನಿಮಿಷಗಳ ಸಂಪೂರ್ಣ ಮಾರ್ಗದರ್ಶಿ ಕನ್ನಡದಲ್ಲಿ. ದಾಸ್ತಾನು, GST ಬಿಲ್ಲಿಂಗ್, POS, ಡಿಜಿಟಲ್ ಕ್ಯಾಟಲಾಗ್, ಕಾರಿಗರ ಟ್ರ್ಯಾಕಿಂಗ್, ತೆರಿಗೆ ವರದಿಗಳು ಮತ್ತು AI — ಎಲ್ಲವೂ ಒಂದೇ ಅಪ್ಲಿಕೇಶನ್‌ನಲ್ಲಿ. 30 ದಿನಗಳ ಉಚಿತ ಪ್ರಯೋಗ.",
  keywords: [
    "ಆಭರಣ ಅಂಗಡಿ ಸಾಫ್ಟ್‌ವೇರ್ ಕನ್ನಡ",
    "ಚಿನ್ನ ಅಂಗಡಿ ಸಾಫ್ಟ್‌ವೇರ್",
    "GST ಬಿಲ್ಲಿಂಗ್ ಸಾಫ್ಟ್‌ವೇರ್",
    "Orivraa tutorial Kannada",
    "jewellery software Kannada",
    "gold shop software Karnataka",
  ],
  alternates: {
    canonical: "/tutorial/kn",
    languages: {
      kn: "/tutorial/kn",
      en: "/tutorial",
      "x-default": "/tutorial",
    },
  },
  openGraph: {
    title: "Orivraa ಟ್ಯುಟೋರಿಯಲ್ 2026 | ಆಭರಣ ಸಾಫ್ಟ್‌ವೇರ್ ಕನ್ನಡದಲ್ಲಿ",
    description: "24-ನಿಮಿಷಗಳ ಟ್ಯುಟೋರಿಯಲ್ — GST ಬಿಲ್, POS, ದಾಸ್ತಾನು, ಕ್ಯಾಟಲಾಗ್ ಮತ್ತು AI.",
    url: "https://www.orivraa.com/tutorial/kn",
    type: "video.other",
    videos: [
      {
        url: "https://images.orivraa.com/tutorial/kn",
        secureUrl: "https://images.orivraa.com/tutorial/kn",
        type: "video/mp4",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orivraa ಟ್ಯುಟೋರಿಯಲ್ 2026 | ಆಭರಣ ಸಾಫ್ಟ್‌ವೇರ್ ಕನ್ನಡದಲ್ಲಿ",
    description: "24-ನಿಮಿಷಗಳ ಟ್ಯುಟೋರಿಯಲ್ ಕನ್ನಡದಲ್ಲಿ — GST, POS, ದಾಸ್ತಾನು ಮತ್ತು AI.",
  },
};

export default function TutorialKnLayout({ children }: { children: React.ReactNode }) {
  return children;
}
