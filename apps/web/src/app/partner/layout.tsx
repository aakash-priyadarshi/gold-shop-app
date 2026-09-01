import { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Become an Orivraa Jewellery Partner"),
  description:
    "Partner with Orivraa to reach jewellery buyers across Nepal, India, Dubai, USA, and UK with B2B marketplace tools.",
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
