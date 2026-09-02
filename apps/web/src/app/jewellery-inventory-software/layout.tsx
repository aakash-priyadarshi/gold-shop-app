import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Jewellery Inventory Software",
  description:
    "Track gold, silver, and diamond stock by weight, purity, and piece, synced with mobile POS. Free jewellery inventory software to start.",
  path: "/jewellery-inventory-software",
  keywords: [
    "jewellery inventory software",
    "jewellery inventory management",
    "gold inventory software",
    "diamond inventory management",
    "jewellery stock management",
    "gold stock tracking software",
    "mobile POS inventory sync",
    "barcode jewellery inventory software",
    "jewellery inventory system",
    "gold shop inventory",
    "jewellery warehouse management",
    "silver inventory tracking",
    "purity tracking software",
    "karigar inventory management",
  ],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
