import { CustomerFlowGuard } from "@/components/auth/CustomerFlowGuard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop Jewellery Online | Gold, Silver & Diamond from Verified Jewellers",
  description:
    "Browse ready-made gold, silver and diamond jewellery from verified local jewellers across India, Nepal, Dubai, UK & USA. See live-rate pricing, compare designs, and request custom pieces or quotes — all in one secure marketplace.",
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
