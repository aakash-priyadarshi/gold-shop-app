import { CustomerFlowGuard } from "@/components/auth/CustomerFlowGuard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Verified Jewellery Shops | Gold & Diamond Jewellers",
  description:
    "Discover verified jewellery shops from Nepal, India, Dubai, USA & UK on Orivraa. Browse gold, silver, diamond & gemstone shops from trusted artisans. Find the best jewellers near you.",
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
