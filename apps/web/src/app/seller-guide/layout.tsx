import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seller Guide",
  description:
    "Complete guide for jewellery sellers on Orivraa. Learn how to set up your shop, list products, manage inventory, and grow your business online.",
  alternates: { canonical: "/seller-guide" },
  openGraph: {
    title: "Seller Guide | Orivraa Jewellery Marketplace",
    description:
      "Start selling jewellery online — step-by-step guide for gold, silver, and gem sellers.",
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
