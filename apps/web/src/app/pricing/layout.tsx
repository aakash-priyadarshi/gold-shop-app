import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing & Plans",
  description:
    "Explore Orivraa subscription plans for jewellery sellers. List your shop, manage inventory, and reach thousands of buyers with our affordable pricing.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing & Plans | Orivraa",
    description:
      "Affordable subscription plans for jewellery sellers. Start listing your products today.",
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
