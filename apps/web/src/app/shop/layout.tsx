import { CustomerFlowGuard } from "@/components/auth/CustomerFlowGuard";
import type { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Shop Jewellery Online from Jewellers"),
  description:
    "Browse gold, silver, and diamond jewellery from verified jewellers with live-rate pricing across India, Nepal, Dubai, UK and USA.",
  keywords: [
    "shop jewellery online",
    "buy gold jewellery online",
    "gold jewellery marketplace",
    "diamond jewellery online",
    "silver jewellery online",
    "verified jewellers",
    "custom jewellery online",
  ],
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop Jewellery Online | Orivraa Marketplace",
    description:
      "Ready-made and custom gold, silver & diamond jewellery from verified jewellers, with live-rate pricing across India, Nepal, Dubai, UK & USA.",
    url: "https://www.orivraa.com/shop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop Jewellery Online | Orivraa",
    description:
      "Browse gold, silver & diamond jewellery from verified jewellers with live-rate pricing.",
  },
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerFlowGuard>{children}</CustomerFlowGuard>;
}
