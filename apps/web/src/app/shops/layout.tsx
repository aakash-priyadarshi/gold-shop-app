import { CustomerFlowGuard } from "@/components/auth/CustomerFlowGuard";
import { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Browse Verified Jewellery Shops"),
  description:
    "Discover verified jewellery shops from Nepal, India, Dubai, USA and UK. Browse gold, silver, diamond and gemstone jewellers.",
  keywords: [
    "jewellery shops",
    "gold shops",
    "verified jewellers",
    "jewellers near me",
    "gold shop Nepal",
    "jewellery shop India",
    "gold souk Dubai",
    "jewelry store USA",
    "jewellery shop UK",
  ],
  alternates: { canonical: "/shops" },
  openGraph: {
    title: "Browse Verified Jewellery Shops | Orivraa",
    description:
      "Explore hundreds of verified jewellery shops worldwide. Gold, silver, diamond & gemstone jewellers in Nepal, India, Dubai, USA & UK.",
    url: "https://www.orivraa.com/shops",
  },
};

export default function ShopsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerFlowGuard>{children}</CustomerFlowGuard>;
}
