import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orivraa ટ્યુટોરિયલ 2026 | ઝવેરી દુકાન સૉફ્ટવૅર સંપૂર્ણ માર્ગદર્શિકા ગુજરાતીમાં",
  description:
    "Orivraa ઝવેરી દુકાન સૉફ્ટવૅરની 24-મિનિટની સંપૂર્ણ માર્ગદર્શિકા ગુજરાતીમાં. ઇન્વેન્ટ્રી, GST બિલ, POS, ડિજિટલ કૅટેલૉગ, કારીગર ટ્રૅકિંગ, ટૅક્સ રિપોર્ટ અને AI — બધું એક જ ઍપ્લિકેશનમાં. 30 દિવસ મફત ટ્રાયલ.",
  keywords: [
    "ઝવેરી દુકાન સૉફ્ટવૅર ગુજરાતી",
    "સોના ચાંદી દુકાન સૉફ્ટવૅર",
    "ઝવેરી મૅનૅજમૅન્ટ સૉફ્ટવૅર",
    "GST બિલ સૉફ્ટવૅર",
    "Orivraa tutorial Gujarati",
    "jewellery software Gujarati",
    "gold shop software Gujarat",
  ],
  alternates: {
    canonical: "/tutorial/gu",
    languages: {
      gu: "/tutorial/gu",
      en: "/tutorial",
      "x-default": "/tutorial",
    },
  },
  openGraph: {
    title: "Orivraa ટ્યુટોરિયલ 2026 | ઝવેરી સૉફ્ટવૅર ગુજરાતીમાં",
    description:
      "24-મિનિટ ટ્યુટોરિયલ — GST બિલ, POS, ઇન્વેન્ટ્રી, ડિજિટલ કૅટેલૉગ અને AI.",
    url: "https://www.orivraa.com/tutorial/gu",
    type: "video.other",
    videos: [
      {
        url: "https://images.orivraa.com/tutorial/gu",
        secureUrl: "https://images.orivraa.com/tutorial/gu",
        type: "video/mp4",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orivraa ટ્યુટોરિયલ 2026 | ઝવેરી સૉફ્ટવૅર ગુજરાતીમાં",
    description: "24-મિનિટ ટ્યુટોરિયલ ગુજરાતીમાં — GST, POS, ઇન્વેન્ટ્રી અને AI.",
  },
};

export default function TutorialGuLayout({ children }: { children: React.ReactNode }) {
  return children;
}
