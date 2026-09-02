import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Orivraa Jewellery Shop Software Demo",
  description:
    "Watch a 30-second demo of Orivraa jewellery software: live dashboards, weight-based inventory, POS, GST invoices, and catalogues.",
  path: "/demo",
  type: "video.other",
  videos: [
    {
      url: "https://images.orivraa.com/demo/en",
      secureUrl: "https://images.orivraa.com/demo/en",
      type: "video/mp4",
    },
  ],
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
});

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
