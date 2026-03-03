import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Partner | Join Orivraa's Jewellery Network",
  description:
    "Partner with Orivraa to grow your jewellery business internationally. Join our B2B marketplace network for retailers, wholesalers, manufacturers & designers. Reach buyers across Nepal, India, Dubai, USA & UK.",
  keywords: [
    "jewellery partner programme",
    "jewellery marketplace partner",
    "wholesale jewellery platform",
    "B2B jewellery marketplace",
    "gold wholesale partner",
    "jewellery business partnership",
    "sell jewellery internationally",
    "jewellery manufacturer partner",
    "jewellery retailer platform",
  ],
  alternates: { canonical: "/partner" },
  openGraph: {
    title: "Become a Partner | Orivraa Jewellery Marketplace",
    description:
      "Join Orivraa's partner network — premium tools, dedicated support, and access to jewellery buyers across 6+ countries.",
    url: "https://www.orivraa.com/partner",
    type: "article",
  },
};

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
