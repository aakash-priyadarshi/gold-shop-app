import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing & Plans for Jewellery Sellers",
  description:
    "Explore Orivraa subscription plans for jewellery sellers in Nepal, India, Dubai, USA & UK. List your shop, manage inventory, and reach thousands of international buyers with affordable pricing.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing & Plans | Orivraa Jewellery Marketplace",
    description:
      "Affordable plans for jewellery sellers worldwide. Start listing your gold, silver & diamond products today.",
    url: "https://www.orivraa.com/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
