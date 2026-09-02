import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Jewellery Ecommerce Software",
  description:
    "Sell jewellery online with digital catalogues, live-rate pricing, and POS sync. No separate website required.",
  path: "/jewellery-ecommerce-software",
  keywords: [
    "jewellery ecommerce software",
    "sell jewellery online",
    "jewellery online store",
    "gold ecommerce platform",
    "jewellery marketplace software",
    "online jewellery shop",
    "jewellery website builder",
    "sell gold online",
    "diamond ecommerce",
    "jewellery digital catalogue",
    "jewellery catalogue mobile POS sync",
    "live gold rate ecommerce software",
    "jewellery online selling platform",
    "gold shop online",
  ],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
