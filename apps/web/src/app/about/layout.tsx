import { Metadata } from "next";

const BASE_URL = "https://www.orivraa.com";

export const metadata: Metadata = {
  title: "About Orivraa | Trusted Jewellery Marketplace",
  description:
    "Learn about Orivraa — the premium jewellery marketplace connecting trusted artisans with discerning buyers across Nepal, India, Dubai, USA & UK. Founded in 2024, headquartered in Kathmandu.",
  alternates: {
    canonical: `${BASE_URL}/about`,
    languages: {
      en: `${BASE_URL}/about`,
      fr: `${BASE_URL}/about/fr`,
      de: `${BASE_URL}/about/de`,
      hi: `${BASE_URL}/about/hi`,
      es: `${BASE_URL}/about/es`,
      ar: `${BASE_URL}/about/ar`,
      ne: `${BASE_URL}/about/ne`,
    },
  },
  openGraph: {
    title: "About Orivraa | Premium Jewellery Marketplace",
    description:
      "Connecting trusted jewellery artisans with buyers worldwide. Serving Nepal, India, Dubai, USA & UK.",
    url: `${BASE_URL}/about`,
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
