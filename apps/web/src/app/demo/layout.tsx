import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orivraa Demo 2026 | Jewellery Shop Software Full Walkthrough Video",
  description:
    "Watch the complete Orivraa demo. See how jewellery shop owners manage inventory by weight & purity, generate GST/VAT invoices, run a POS, publish digital catalogues, track karigars, and get AI business insights — all in one app. Free 30-day trial.",
  keywords: [
    // Intent: demo / video / tutorial
    "jewellery shop software demo",
    "jewellery software demo video",
    "jewellery software walkthrough",
    "jewellery shop software tutorial",
    "jewellery billing software demo",
    "jewellery POS demo",
    "jewellery inventory software demo",
    "jewellery management software demo",
    "jewellery ERP demo",
    "jewellery CRM demo",
    "gold shop software demo",
    "gold shop billing software demo",
    "gold shop software video",
    "best jewellery software demo 2026",
    "jewellery software product tour",

    // Intent: find best / compare
    "best jewellery shop software India",
    "best jewellery software 2026",
    "best gold shop software",
    "jewellery software free trial",
    "free jewellery billing software demo",

    // Brand + core
    "Orivraa demo",
    "Orivraa jewellery software",
    "Orivraa walkthrough",
    "jewellery shop software",
    "gold shop software",
    "jewellery billing software",
    "jewellery inventory software",
    "jewellery POS software",

    // Regional (where jewellery shop owners search from)
    "jewellery software India demo",
    "jewellery software Nepal demo",
    "jewellery software UAE demo",
    "sarraf software demo",
    "sona chandi dukan software",
    "jewellery shop software Hindi",

    // Feature-specific search
    "jewellery weight purity management software",
    "karigar management software demo",
    "jewellery GST billing software demo",
    "hallmark jewellery software demo",
    "jewellery catalogue software demo",
    "jewellery digital catalogue demo",
    "jewellery shop accounting software demo",
    "jewellery ecommerce software demo",
    "jewellery customer management software",
  ],
  alternates: { canonical: "/demo" },
  openGraph: {
    title: "Orivraa Demo 2026 | Jewellery Shop Software Full Walkthrough Video",
    description:
      "24-minute complete walkthrough of Orivraa jewellery shop software. Inventory, billing, POS, catalogues, karigars, tax engine, and AI insights — all shown live.",
    url: "https://www.orivraa.com/demo",
    type: "video.other",
    videos: [
      {
        url: "https://images.orivraa.com/demo/en",
        secureUrl: "https://images.orivraa.com/demo/en",
        type: "video/mp4",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orivraa Demo 2026 | Jewellery Shop Software Full Walkthrough",
    description:
      "Watch the full 24-minute Orivraa demo — GST billing, POS, inventory by weight & purity, digital catalogues, karigars, and AI insights.",
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
