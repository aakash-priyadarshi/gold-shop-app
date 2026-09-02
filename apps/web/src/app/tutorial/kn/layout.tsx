import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Orivraa ಟ್ಯುಟೋರಿಯಲ್ | ಆಭರಣ ಸಾಫ್ಟ್‌ವೇರ್ ಮಾರ್ಗದರ್ಶಿ",
  description:
    "Orivraa ಆಭರಣ ಸಾಫ್ಟ್‌ವೇರ್‌ನ 24-ನಿಮಿಷಗಳ ಮಾರ್ಗದರ್ಶಿ ಕನ್ನಡದಲ್ಲಿ: ದಾಸ್ತಾನು, GST ಬಿಲ್ಲಿಂಗ್, POS, ಕಾರಿಗರ ಟ್ರ್ಯಾಕಿಂಗ್ ಮತ್ತು AI. ಉಚಿತ ಪ್ರಯೋಗ.",
  path: "/tutorial/kn",
  locale: "kn_IN",
  languages: {
    kn: "/tutorial/kn",
    en: "/tutorial",
    "x-default": "/tutorial",
  },
  keywords: [
    "ಆಭರಣ ಅಂಗಡಿ ಸಾಫ್ಟ್‌ವೇರ್ ಕನ್ನಡ",
    "ಚಿನ್ನ ಅಂಗಡಿ ಸಾಫ್ಟ್‌ವೇರ್",
    "GST ಬಿಲ್ಲಿಂಗ್ ಸಾಫ್ಟ್‌ವೇರ್",
    "Orivraa tutorial Kannada",
    "jewellery software Kannada",
    "gold shop software Karnataka",
  ],
});

export default function TutorialKnLayout({ children }: { children: React.ReactNode }) {
  return children;
}
