import { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Orivraa Tutorial for Jewellery Software"),
  description:
    "Watch the Orivraa walkthrough for jewellery inventory, GST/VAT invoices, POS, catalogues, karigar tracking, and AI insights.",
  keywords: [
    "jewellery shop software tutorial",
    "jewellery software tutorial video",
    "jewellery software walkthrough",
    "how to use jewellery shop software",
    "jewellery billing software tutorial",
    "jewellery POS tutorial",
    "jewellery inventory software tutorial",
    "jewellery management software tutorial",
    "jewellery ERP tutorial",
    "jewellery CRM tutorial",
    "gold shop software tutorial",
    "gold shop billing software tutorial",
    "gold shop software training video",
    "best jewellery software tutorial 2026",
    "jewellery software product training",
    "jewellery shop software guide",
    "jewellery software user guide video",
    "best jewellery shop software India",
    "best jewellery software 2026",
    "best gold shop software",
    "jewellery software free trial",
    "Orivraa tutorial",
    "Orivraa walkthrough",
    "Orivraa training video",
    "Orivraa jewellery software",
    "jewellery shop software",
    "gold shop software",
    "jewellery billing software",
    "jewellery inventory software",
    "jewellery POS software",
    "jewellery software India tutorial",
    "jewellery software Nepal tutorial",
    "jewellery software UAE tutorial",
    "sarraf software tutorial",
    "sona chandi dukan software",
    "jewellery shop software Hindi",
    "jewellery weight purity management software",
    "karigar management software tutorial",
    "jewellery GST billing software tutorial",
    "hallmark jewellery software tutorial",
    "jewellery catalogue software tutorial",
    "jewellery shop accounting software tutorial",
    "jewellery ecommerce software tutorial",
    "jewellery customer management software",
  ],
  alternates: {
    canonical: "/tutorial",
    languages: {
      "en": "/tutorial",
      "hi": "/tutorial/hi",
      "ne": "/tutorial/ne",
      "gu": "/tutorial/gu",
      "mr": "/tutorial/mr",
      "ta": "/tutorial/ta",
      "te": "/tutorial/te",
      "kn": "/tutorial/kn",
      "fr": "/tutorial/fr",
      "de": "/tutorial/de",
      "es": "/tutorial/es",
      "ar": "/tutorial/ar",
      "x-default": "/tutorial",
    },
  },
  openGraph: {
    title: "Orivraa Tutorial for Jewellery Software",
    description:
      "Full 24-minute step-by-step tutorial of Orivraa jewellery shop software. Inventory, billing, POS, catalogues, karigars, tax engine, and AI insights — all shown live.",
    url: "https://www.orivraa.com/tutorial",
    type: "video.other",
    videos: [
      {
        url: "https://images.orivraa.com/tutorial/en",
        secureUrl: "https://images.orivraa.com/tutorial/en",
        type: "video/mp4",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orivraa Tutorial for Jewellery Software",
    description:
      "Watch the full 24-minute Orivraa tutorial — GST billing, POS, inventory by weight & purity, digital catalogues, karigars, and AI insights.",
  },
};

export default function TutorialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
