import { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Jewellery Shop Billing Software — GST/VAT Invoices, Mobile POS | Orivraa 2026",
  description:
    "Best billing software for jewellery shops. Create GST/VAT invoices from desktop or mobile POS with making charges, old gold exchange, 7-day live gold rate context, weight-based pricing, and barcode scanning. India Pro ₹299/month · Nepal NPR 399 · UK £9.99 · UAE AED 39.99 · US $12.99. Free plan always available.",
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
