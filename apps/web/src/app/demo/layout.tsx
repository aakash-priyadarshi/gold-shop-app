import { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Orivraa Jewellery Shop Software Demo"),
  description:
    "Watch a 30-second demo of Orivraa jewellery software: live dashboards, weight-based inventory, POS, GST invoices, and catalogues.",
  keywords: [
    "jewellery shop software demo",
    "jewellery software demo video",
    "jewellery billing software demo",
    "jewellery POS demo",
    "jewellery inventory software demo",
    "jewellery management software demo",
    "gold shop software demo",
    "gold shop billing software demo",
    "Orivraa demo",
    "Orivraa jewellery software demo",
    "Orivraa preview",
    "best jewellery shop software 2026",
    "jewellery software free trial",
    "jewellery shop software India demo",
    "jewellery software Nepal demo",
    "jewellery software UAE demo",
    "sarraf software demo",
    "sona chandi dukan software demo",
    "jewellery weight purity software preview",
    "jewellery GST billing software preview",
    "jewellery digital catalogue preview",
    "jewellery AI insights",
  ],
  alternates: { canonical: "/demo" },
  openGraph: {
    title: "Orivraa Jewellery Shop Software Demo",
    description:
      "30-second visual demo of Orivraa jewellery shop software — dashboard, inventory, POS, GST invoices, catalogues, analytics, and AI insights.",
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
    title: "Orivraa Jewellery Shop Software Demo",
    description:
      "Quick 30-second visual tour of Orivraa — inventory by weight & purity, POS, GST invoicing, catalogues, and AI insights.",
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
