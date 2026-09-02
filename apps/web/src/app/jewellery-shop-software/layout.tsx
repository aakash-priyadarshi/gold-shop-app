import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Jewellery Shop Software with Mobile POS",
  description:
    "Cloud jewellery shop software with mobile POS, live gold rates, weight-based inventory, and GST/VAT billing. Free plan available.",
  path: "/jewellery-shop-software",
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
    "mobile POS for jewellery shop",
    "live gold rate jewellery software",
    "7 day gold rate history",
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
});

export default function JewelleryShopSoftwareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
