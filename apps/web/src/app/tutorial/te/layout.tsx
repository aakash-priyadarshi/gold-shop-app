import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orivraa ట్యుటోరియల్ 2026 | జువెలరీ షాప్ సాఫ్ట్‌వేర్ సంపూర్ణ గైడ్ తెలుగులో",
  description:
    "Orivraa జువెలరీ షాప్ సాఫ్ట్‌వేర్ యొక్క 24-నిమిషాల సంపూర్ణ గైడ్ తెలుగులో. ఇన్వెంటరీ, GST బిల్లింగ్, POS, డిజిటల్ కాటలాగ్, కళాకారుడి ట్రాకింగ్, పన్ను నివేదికలు మరియు AI — అన్నీ ఒకే యాప్‌లో. 30 రోజుల ఉచిత ట్రయల్.",
  keywords: [
    "జువెలరీ షాప్ సాఫ్ట్‌వేర్ తెలుగు",
    "బంగారం దుకాణం సాఫ్ట్‌వేర్",
    "GST బిల్లింగ్ సాఫ్ట్‌వేర్",
    "Orivraa tutorial Telugu",
    "jewellery software Telugu",
    "gold shop software Telangana",
    "gold shop software Andhra Pradesh",
  ],
  alternates: {
    canonical: "/tutorial/te",
    languages: {
      te: "/tutorial/te",
      en: "/tutorial",
      "x-default": "/tutorial",
    },
  },
  openGraph: {
    title: "Orivraa ట్యుటోరియల్ 2026 | జువెలరీ సాఫ్ట్‌వేర్ తెలుగులో",
    description: "24-నిమిషాల ట్యుటోరియల్ — GST బిల్, POS, ఇన్వెంటరీ, కాటలాగ్ మరియు AI.",
    url: "https://www.orivraa.com/tutorial/te",
    type: "video.other",
    videos: [
      {
        url: "https://images.orivraa.com/tutorial/te",
        secureUrl: "https://images.orivraa.com/tutorial/te",
        type: "video/mp4",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orivraa ట్యుటోరియల్ 2026 | జువెలరీ సాఫ్ట్‌వేర్ తెలుగులో",
    description: "24-నిమిషాల ట్యుటోరియల్ తెలుగులో — GST, POS, ఇన్వెంటరీ మరియు AI.",
  },
};

export default function TutorialTeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
