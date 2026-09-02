import { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Jewellery Inventory Software"),
  description:
    "Track gold, silver, and diamond stock by weight, purity, and piece, synced with mobile POS. Free jewellery inventory software to start.",
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
  alternates: { canonical: "/jewellery-inventory-software" },
  openGraph: {
    title:
      "Jewellery Inventory Software — Track Gold by Weight & Purity | Orivraa",
    description:
      "Track gold, silver, and diamond inventory by weight, purity, and category. Mobile POS stock sync, barcode scanning, stock alerts, and karigar management. Free to start.",
    url: "https://www.orivraa.com/jewellery-inventory-software",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jewellery Inventory Software — Starts Free | Orivraa",
    description:
      "Cloud-based jewellery inventory management with mobile POS sync, barcode scanning, weight, purity, and batch tracking for gold, silver, and diamond.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
