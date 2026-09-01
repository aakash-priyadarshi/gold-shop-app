import { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

const BASE_URL = "https://www.orivraa.com";

export const metadata: Metadata = {
  title: absolutePageTitle("About Orivraa Jewellery Shop Software"),
  description:
    "Orivraa jewellery software for mobile POS, live gold rates, GST/VAT billing, and a marketplace that helps jewellers serve buyers worldwide.",
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
      gu: `${BASE_URL}/about/gu`,
      mr: `${BASE_URL}/about/mr`,
      ta: `${BASE_URL}/about/ta`,
      te: `${BASE_URL}/about/te`,
      kn: `${BASE_URL}/about/kn`,
      si: `${BASE_URL}/about/si`,
      he: `${BASE_URL}/about/he`,
    },
  },
  openGraph: {
    title: "About Orivraa Jewellery Shop Software",
    description:
      "The story behind Orivraa: jewellery shop software, mobile POS, live gold-rate tools, and a trusted marketplace for modern jewellers.",
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
