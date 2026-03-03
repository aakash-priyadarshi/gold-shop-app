import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seller Guide — Start Selling Jewellery Online | Orivraa",
  description:
    "Complete step-by-step guide for jewellery sellers on Orivraa. Learn how to set up your online shop, list gold & diamond products, manage inventory, and sell to B2B buyers in Nepal, India, Dubai, USA & UK.",
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
