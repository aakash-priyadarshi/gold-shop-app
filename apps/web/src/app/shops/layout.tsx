import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Jewellery Shops",
  description:
    "Discover verified jewellery shops on Orivraa. Browse gold, silver, and diamond shops from trusted artisans in Nepal, India, and worldwide.",
  alternates: { canonical: "/shops" },
  openGraph: {
    title: "Browse Jewellery Shops | Orivraa",
    description:
      "Explore hundreds of verified jewellery shops. Find gold, silver, and gemstone jewellers near you.",
    url: "https://www.orivraa.com/shops",
  },
};

export default function ShopsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
