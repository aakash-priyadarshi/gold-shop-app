import { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Jewellery Shop Billing Software"),
  description:
    "GST/VAT jewellery invoices with making charges, old-gold exchange, live rates, and mobile POS from the counter.",
  keywords: [
    "jewellery billing software",
    "jewellery shop billing software",
    "gold shop billing software",
    "jewellery invoicing software",
    "jewellery GST billing",
    "mobile jewellery billing software",
    "jewellery mobile POS billing",
    "gold billing software",
    "jewellery invoice generator",
    "jewellery bill maker",
    "gold shop invoice software",
    "jewellery billing and accounting",
    "jewellery billing with making charges",
    "jewellery tax software",
  ],
  alternates: { canonical: "/jewellery-shop-billing-software" },
  openGraph: {
    title: "Jewellery Shop Billing Software — Mobile POS & GST/VAT Invoicing | Orivraa",
    description:
      "Professional billing for jewellery shops. Mobile POS receipts, making charges, old gold exchange, live rate context, and GST/VAT compliance. Free to start.",
    url: "https://www.orivraa.com/jewellery-shop-billing-software",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jewellery Billing Software — Starts Free | Orivraa",
    description:
      "GST/VAT-compliant jewellery billing with mobile POS, live rate context, making charges, weight-based pricing, and old gold exchange.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
