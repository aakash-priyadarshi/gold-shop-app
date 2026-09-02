import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Orivraa ટ્યુટોરિયલ | ઝવેરી દુકાન સૉફ્ટવૅર માર્ગદર્શિકા",
  description:
    "Orivraa ઝવેરી દુકાન સૉફ્ટવૅરની 24-મિનિટની માર્ગદર્શિકા ગુજરાતીમાં: ઇન્વેન્ટ્રી, GST બિલ, POS, કૅટેલૉગ અને AI. મફત ટ્રાયલ.",
  path: "/tutorial/gu",
  locale: "gu_IN",
  languages: {
    gu: "/tutorial/gu",
    en: "/tutorial",
    "x-default": "/tutorial",
  },
  keywords: [
    "ઝવેરી દુકાન સૉફ્ટવૅર ગુજરાતી",
    "સોના ચાંદી દુકાન સૉફ્ટવૅર",
    "ઝવેરી મૅનૅજમૅન્ટ સૉફ્ટવૅર",
    "GST બિલ સૉફ્ટવૅર",
    "Orivraa tutorial Gujarati",
    "jewellery software Gujarati",
    "gold shop software Gujarat",
  ],
});

export default function TutorialGuLayout({ children }: { children: React.ReactNode }) {
  return children;
}
