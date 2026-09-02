import { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Seller Guide for Jewellery Shops"),
  description:
    "Set up an Orivraa jewellery shop, list gold and diamond products, manage inventory, and sell to buyers across supported markets.",
  keywords: [
    "sell jewellery online",
    "jewellery seller guide",
    "how to sell gold online",
    "start jewellery business online",
    "sell gold India",
    "sell jewellery UK",
    "jewellery marketplace seller",
    "gold business online Nepal",
    "B2B jewellery platform",
    "list jewellery products",
    "jewellery inventory management",
    "sell diamonds online UAE",
  ],
  alternates: { canonical: "/seller-guide" },
  openGraph: {
    title: "Seller Guide | Orivraa Jewellery Marketplace",
    description:
      "Everything you need to launch your jewellery business online — from registration to your first sale. Reach buyers across Nepal, India, Dubai, USA & UK.",
    url: "https://www.orivraa.com/seller-guide",
    type: "article",
  },
};

export default function SellerGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
