import { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Jewellery POS Software — Point of Sale for Gold & Diamond Shops | Orivraa 2026",
  description:
    "Best POS software for jewellery shops. Handle billing with making charges, weight-based pricing, old gold exchange, GST/VAT invoicing, and barcode scanning. India Pro ₹299/month · Nepal NPR 399 · UK £9.99 · UAE AED 39.99 · US $12.99. Free plan always available.",
  keywords: [
    "jewellery POS software",
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
    title: "Jewellery POS Software — Point of Sale for Gold Shops | Orivraa",
    description:
      "Cloud-based POS for jewellery shops. Making charges, weight-based billing, barcode scanning, old gold exchange. Free to start.",
    url: "https://www.orivraa.com/jewellery-pos-software",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jewellery POS Software — Starts Free | Orivraa",
    description:
      "Point-of-sale software designed for jewellery shops. Weight-based billing, making charges, GST compliance. 2000+ jewellers trust Orivraa.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
