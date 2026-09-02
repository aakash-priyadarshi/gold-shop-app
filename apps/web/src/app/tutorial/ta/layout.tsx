import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Orivraa டுடோரியல் | நகை கடை மென்பொருள் வழிகாட்டி",
  description:
    "Orivraa நகை கடை மென்பொருளின் 24-நிமிட முழு வழிகாட்டி தமிழில்: சரக்கு, GST பில்லிங், POS, கேட்டலாக் மற்றும் AI. இலவச சோதனை.",
  path: "/tutorial/ta",
  locale: "ta_IN",
  type: "video.other",
  videos: [
    {
      url: "https://images.orivraa.com/tutorial/ta",
      secureUrl: "https://images.orivraa.com/tutorial/ta",
      type: "video/mp4",
    },
  ],
  languages: {
    ta: "/tutorial/ta",
    en: "/tutorial",
    "x-default": "/tutorial",
  },
  keywords: [
    "நகை கடை மென்பொருள் தமிழ்",
    "நகை மேலாண்மை மென்பொருள்",
    "தங்க கடை மென்பொருள்",
    "GST பில்லிங் மென்பொருள்",
    "நகை கடை கணினி மென்பொருள்",
    "Orivraa tutorial Tamil",
    "jewellery software Tamil",
    "gold shop software Tamil Nadu",
  ],
});

export default function TutorialTaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
