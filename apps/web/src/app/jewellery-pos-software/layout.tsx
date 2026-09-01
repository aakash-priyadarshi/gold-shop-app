import { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Mobile Jewellery POS Software"),
  description:
    "Mobile jewellery POS for gold shops: live rates, making charges, old-gold exchange, and GST/VAT receipts from any phone.",
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
  alternates: { canonical: "/jewellery-pos-software" },
  openGraph: {
    title: "Mobile Jewellery POS Software | Orivraa",
    description:
      "Mobile jewellery POS for gold shops: live rates, making charges, old-gold exchange, and GST/VAT receipts from any phone.",
    url: "https://www.orivraa.com/jewellery-pos-software",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mobile Jewellery POS Software — Starts Free | Orivraa",
    description:
      "Point-of-sale software designed for jewellery shops. Phone billing, live rates, weight-based pricing, making charges, and GST/VAT receipts.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
