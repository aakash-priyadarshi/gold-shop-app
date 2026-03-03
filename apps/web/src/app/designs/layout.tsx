import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Jewellery Designs",
  description:
    "Explore AI-generated jewellery design ideas on Orivraa. Get inspired with unique gold, silver, and diamond designs created with artificial intelligence.",
  alternates: { canonical: "/designs" },
  openGraph: {
    title: "AI Jewellery Designs | Orivraa",
    description:
      "Discover unique AI-generated jewellery design inspirations — rings, necklaces, earrings, and more.",
    url: "https://www.orivraa.com/designs",
  },
};

export default function DesignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
