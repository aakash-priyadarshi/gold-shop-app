import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Become an Orivraa Jewellery Partner",
  description:
    "Partner with Orivraa to reach jewellery buyers across Nepal, India, Dubai, USA, and UK with B2B marketplace tools.",
  path: "/partner",
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
});

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
