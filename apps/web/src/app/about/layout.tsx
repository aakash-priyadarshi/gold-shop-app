import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Orivraa — the premium jewellery marketplace connecting trusted artisans with discerning buyers. Founded in 2024, based in Kathmandu, Nepal.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Orivraa | Premium Jewellery Marketplace",
    description:
      "Connecting trusted jewellery artisans with discerning buyers worldwide. Learn our story.",
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
