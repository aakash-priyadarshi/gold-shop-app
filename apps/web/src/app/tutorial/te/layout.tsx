import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Orivraa ట్యుటోరియల్ | జువెలరీ సాఫ్ట్‌వేర్ గైడ్",
  description:
    "Orivraa జువెలరీ సాఫ్ట్‌వేర్ యొక్క 24-నిమిషాల గైడ్ తెలుగులో: ఇన్వెంటరీ, GST బిల్లింగ్, POS, కాటలాగ్ మరియు AI. ఉచిత ట్రయల్.",
  path: "/tutorial/te",
  locale: "te_IN",
  languages: {
    te: "/tutorial/te",
    en: "/tutorial",
    "x-default": "/tutorial",
  },
  keywords: [
    "జువెలరీ షాప్ సాఫ్ట్‌వేర్ తెలుగు",
    "బంగారం దుకాణం సాఫ్ట్‌వేర్",
    "GST బిల్లింగ్ సాఫ్ట్‌వేర్",
    "Orivraa tutorial Telugu",
    "jewellery software Telugu",
    "gold shop software Telangana",
    "gold shop software Andhra Pradesh",
  ],
});

export default function TutorialTeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
