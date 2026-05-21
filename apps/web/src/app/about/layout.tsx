import { Metadata } from "next";

const BASE_URL = "https://www.orivraa.com";

export const metadata: Metadata = {
  title: "About Orivraa | Jewellery Software, Mobile POS & Marketplace",
  description:
    "Learn about Orivraa — the jewellery software, Mobile POS, live gold-rate, AI assistant, and marketplace platform helping verified jewellers serve buyers across Nepal, India, UAE, UK, and USA.",
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
    title: "About Orivraa | Jewellery Software, Mobile POS & Marketplace",
    description:
      "The story behind Orivraa: jewellery shop software, Mobile POS, live gold-rate tools, AI assistance, and a trusted marketplace for modern jewellers.",
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
