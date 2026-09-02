import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Mobile Jewellery POS Software",
  description:
    "Mobile jewellery POS for gold shops: live rates, making charges, old-gold exchange, and GST/VAT receipts from any phone.",
  path: "/jewellery-pos-software",
  keywords: [
    "jewellery POS software",
    "mobile jewellery POS software",
    "mobile POS for gold shop",
    "jewellery POS app",
    "jewellery point of sale",
    "gold shop POS",
    "POS for jewellery shop",
    "jewellery billing POS",
    "gold billing software",
    "jewellery POS system",
    "POS system for jewellers",
    "jewellery cash register software",
    "gold shop billing POS",
    "diamond POS software",
    "jewellery checkout software",
  ],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
