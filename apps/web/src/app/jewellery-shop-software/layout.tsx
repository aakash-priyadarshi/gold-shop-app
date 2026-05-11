import { PUBLIC_LOCAL_PRICING_SUMMARY } from "@/lib/seo/pricing-copy";
import { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Best Jewellery Shop Software in India 2026 | Orivraa from ₹299/month",
  description:
    `Orivraa is the best jewellery shop software for India and modern jewellery businesses. ${PUBLIC_LOCAL_PRICING_SUMMARY} Includes inventory by weight and purity, billing, POS, GSTIN-ready invoices, tax reports, catalogues, customer chat, and analytics.`,
  keywords: [
    "jewellery shop software",
    "jewellery software",
    "gold shop software",
    "jewellery store software",
    "jewelry store software",
    "jewellery management software",
    "jewellery ERP",
    "jewellery billing software",
    "jewellery inventory software",
    "jewellery POS software",
    "jewellery shop management",
    "gold shop management software",
    "gold jewellery software",
    "jewellery business software",
    "jewellery CRM",
    "jewellery accounting software",
    "free jewellery software",
    "online jewellery software",
    "cloud jewellery software",
    "jewellery software India",
    "jewellery software Nepal",
    "jewellery software UAE",
    "jewellery software UK",
    "jewellery software USA",
    "gold shop billing software",
    "diamond inventory software",
    "jewellery catalogue software",
    "jewellery shop app",
    "software for jewellery shops",
    "software for gold shops",
    "best jewellery software",
    "Orivraa jewellery software",
    "Zoho alternative jewellery",
    "Marg ERP alternative",
    "Vyapar alternative jewellery",
    "Jwelly ERP alternative",
    "jewellery shop management system",
    "gold shop management system",
    "karigar management software",
    "hallmark tracking software",
    "jewellery weight management",
    "jewellery purity tracking",
  ],
  alternates: { canonical: "/jewellery-shop-software" },
  openGraph: {
    title:
      "Best Jewellery Shop Software in India 2026 | Orivraa from ₹299/month",
    description:
      `Free cloud-based jewellery shop software with India pricing from ₹299/month. Manage inventory by weight and purity, billing, POS, GSTIN-ready invoices, tax reports, and digital catalogues with local pricing by country.`,
    url: "https://www.orivraa.com/jewellery-shop-software",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Jewellery Shop Software 2026 | Orivraa from ₹299/month",
    description:
      "Free jewellery shop software with India pricing from ₹299/month, billing, GSTIN-ready invoices, POS, customer chat, and analytics.",
  },
};

export default function JewelleryShopSoftwareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
