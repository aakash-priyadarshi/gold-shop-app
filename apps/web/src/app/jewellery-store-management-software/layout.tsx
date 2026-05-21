import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jewellery Store Management Software for Modern Shops | Orivraa 2026",
  description:
    "Complete jewellery store management software with inventory tracking by weight & purity, mobile POS billing, 7-day live gold rate trends, customer management, digital catalogues, and analytics. India Pro ₹299/month · Nepal NPR 399 · UK £9.99 · UAE AED 39.99 · US $12.99. Free plan always available.",
  keywords: [
    "jewellery store management software",
    "jewellery shop management system",
    "gold store management software",
    "jewellery business management",
    "jewellery store software",
    "store management for jewellers",
    "jewellery management system",
    "gold shop management system",
    "jewellery retail management",
    "jewellery store operations",
    "jewellery shop automation",
    "mobile POS store management",
    "live gold rate store software",
    "modern jewellery store software",
  ],
  alternates: { canonical: "/jewellery-store-management-software" },
  openGraph: {
    title: "Jewellery Store Management Software | Orivraa",
    description:
      "All-in-one jewellery store management - inventory, mobile POS billing, live gold rate trends, customers, and analytics in one platform. Free to start.",
    url: "https://www.orivraa.com/jewellery-store-management-software",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jewellery Store Management Software — Starts Free | Orivraa",
    description:
      "Manage your jewellery store with cloud-based software. Inventory, mobile POS, live gold rates, billing, and customer management.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
