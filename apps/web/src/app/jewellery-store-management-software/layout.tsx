import { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Jewellery Store Management Software for Modern Shops | Orivraa 2026",
  description:
    "Complete jewellery store management software with inventory tracking by weight & purity, billing, POS, customer management, and analytics. Cloud-based, multi-currency, trusted by 2000+ jewellers. Starts free.",
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
    "modern jewellery store software",
  ],
  alternates: { canonical: "/jewellery-store-management-software" },
  openGraph: {
    title: "Jewellery Store Management Software | Orivraa",
    description:
      "All-in-one jewellery store management — inventory, billing, customers, and analytics in one platform. Free to start.",
    url: "https://www.orivraa.com/jewellery-store-management-software",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jewellery Store Management Software — Starts Free | Orivraa",
    description:
      "Manage your jewellery store with cloud-based software. Inventory, billing, POS, customer management. 2000+ jewellers trust Orivraa.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
