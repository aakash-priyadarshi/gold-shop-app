import { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Mobile Jewellery POS Software — Billing for Gold & Diamond Shops | Orivraa 2026",
  description:
    "Mobile POS software for jewellery shops. Bill from any phone with live gold rate history, making charges, old gold exchange, GST/VAT invoicing, barcode scanning, and receipt sharing. India Pro ₹299/month · Nepal NPR 399 · UK £9.99 · UAE AED 39.99 · US $12.99. Free plan always available.",
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
    title: "Mobile Jewellery POS Software for Gold Shops | Orivraa",
    description:
      "Cloud-based mobile POS for jewellery shops. Live rate history, making charges, barcode scanning, old gold exchange, and GST/VAT receipts. Free to start.",
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
