import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seller Guide — Start Selling Jewellery Online",
  description:
    "Complete guide for jewellery sellers on Orivraa. Learn how to set up your shop, list gold & diamond products, manage inventory, and sell to buyers in Nepal, India, Dubai, USA & UK.",
  keywords: [
    "sell jewellery online", "jewellery seller guide", "how to sell gold online",
    "start jewellery business online", "sell gold India", "sell jewellery UK",
  ],
  alternates: { canonical: "/seller-guide" },
  openGraph: {
    title: "Seller Guide | Orivraa Jewellery Marketplace",
    description:
      "Start selling jewellery online to buyers worldwide — step-by-step guide for gold, silver & diamond sellers.",
    url: "https://www.orivraa.com/seller-guide",
  },
};

export default function SellerGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
