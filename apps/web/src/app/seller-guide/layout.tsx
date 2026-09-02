import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Seller Guide for Jewellery Shops",
  description:
    "Set up an Orivraa jewellery shop, list gold and diamond products, manage inventory, and sell to buyers across supported markets.",
  path: "/seller-guide",
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
});

export default function SellerGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
