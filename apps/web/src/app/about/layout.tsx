import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Orivraa | Trusted Jewellery Marketplace",
  description:
    "Learn about Orivraa — the premium jewellery marketplace connecting trusted artisans with discerning buyers across Nepal, India, Dubai, USA & UK. Founded in 2024, headquartered in Kathmandu.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Orivraa | Premium Jewellery Marketplace",
    description:
      "Connecting trusted jewellery artisans with buyers worldwide. Serving Nepal, India, Dubai, USA & UK.",
    url: "https://www.orivraa.com/about",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
