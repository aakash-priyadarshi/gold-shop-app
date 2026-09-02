import { buildMarketingMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Jewellery Manufacturing & Karigar Software",
  description:
    "Jewellery manufacturing software with karigar wastage ledgers, bullion stock, and fine-metal issue versus return tracking. Free to start.",
  path: "/jewellery-manufacturing-software",
  keywords: [
    "jewellery manufacturing software",
    "karigar software",
    "karigar wastage tracking",
    "bullion inventory software",
    "gold smith ledger software",
  ],
  ogTitle: "Jewellery Manufacturing & Karigar Software | Orivraa",
  ogDescription:
    "Track metal issued to karigars, wastage, bullion stock, and finished weight in one jewellery manufacturing ledger.",
  type: "article",
});

export default function JewelleryManufacturingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
