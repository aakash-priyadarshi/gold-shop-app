import { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Jewellery Shop Billing Software — GST/VAT Invoicing for Gold Shops | Orivraa 2026",
  description:
    "Best billing software for jewellery shops. GST/VAT-compliant invoicing with making charges, old gold exchange, weight-based pricing, barcode scanning, and multi-currency support. Cloud-based. Starts free.",
  keywords: [
    "jewellery billing software",
    "jewellery shop billing software",
    "gold shop billing software",
    "jewellery invoicing software",
    "jewellery GST billing",
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
    title: "Jewellery Shop Billing Software — GST/VAT Invoicing | Orivraa",
    description:
      "Professional billing for jewellery shops. Making charges, old gold exchange, GST/VAT compliance. Free to start.",
    url: "https://www.orivraa.com/jewellery-shop-billing-software",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jewellery Billing Software — Starts Free | Orivraa",
    description:
      "GST/VAT-compliant jewellery billing with making charges, weight-based pricing, old gold exchange. 2000+ jewellers trust Orivraa.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
