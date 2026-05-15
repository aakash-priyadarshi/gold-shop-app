import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orivraa Tutorial 2026 | நகை கடை மென்பொருள் முழு வழிகாட்டி தமிழில்",
  description:
    "Orivraa நகை கடை மென்பொருளின் 24-நிமிட முழு வழிகாட்டி தமிழில். சரக்கு மேலாண்மை, GST/VAT ரசீது, விற்பனை நிலையம், டிஜிட்டல் கேட்டலாக், தொழிலாளர் கண்காணிப்பு, வரி அறிக்கை மற்றும் AI — ஒரே பயன்பாட்டில். 30 நாள் இலவச சோதனை.",
  keywords: [
    "நகை கடை மென்பொருள் தமிழ்",
    "நகை மேலாண்மை மென்பொருள்",
    "தங்க கடை மென்பொருள்",
    "GST பில்லிங் மென்பொருள்",
    "நகை கடை கணினி மென்பொருள்",
    "Orivraa tutorial Tamil",
    "Orivraa Tamil",
    "jewellery software Tamil",
    "gold shop software Tamil Nadu",
    "gold shop software India Tamil",
    "நகை கடை தமிழகம்",
  ],
  alternates: {
    canonical: "/tutorial/ta",
    languages: {
      ta: "/tutorial/ta",
      en: "/tutorial",
      "x-default": "/tutorial",
    },
  },
  openGraph: {
    title: "Orivraa Tutorial 2026 | நகை கடை மென்பொருள் தமிழில்",
    description:
      "24-நிமிட வழிகாட்டி — GST ரசீது, விற்பனை நிலையம், சரக்கு, கேட்டலாக் மற்றும் AI.",
    url: "https://www.orivraa.com/tutorial/ta",
    type: "video.other",
    videos: [
      {
        url: "https://images.orivraa.com/tutorial/ta",
        secureUrl: "https://images.orivraa.com/tutorial/ta",
        type: "video/mp4",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orivraa Tutorial 2026 | நகை கடை மென்பொருள் தமிழில்",
    description:
      "24-நிமிட வழிகாட்டி தமிழில் — GST, விற்பனை நிலையம், சரக்கு மற்றும் AI.",
  },
};

export default function TutorialTaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
