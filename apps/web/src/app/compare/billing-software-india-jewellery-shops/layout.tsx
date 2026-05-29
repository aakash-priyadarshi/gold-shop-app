import type { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Billing Software for Jewellery Shops in India | GST Invoicing | Orivraa",
  description:
    "GST-ready billing software made for jewellery shops in India. Weight-based pricing (gram/tola), live gold & silver rates, making charges & wastage, purity/hallmark/HUID tracking, old-gold exchange and instant GST invoices you can share on WhatsApp. India Pro ₹299/month. Free plan always available.",
  keywords: [
    "billing software for jewellery shops India",
    "jewellery billing software",
    "gold shop billing software",
    "GST billing software jewellery",
    "jewellery invoice software India",
    "gold billing software with making charges",
    "HUID hallmark billing software",
    "jewellery shop GST invoice",
  ],
  alternates: { canonical: "/compare/billing-software-india-jewellery-shops" },
  openGraph: {
    title: "Billing Software for Jewellery Shops in India | Orivraa",
    description:
      "GST invoicing built for jewellers: weight-based pricing, live rates, making charges, HUID/hallmark tracking and old-gold exchange. Free to start.",
    url: "https://www.orivraa.com/compare/billing-software-india-jewellery-shops",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jewellery Billing Software India — GST Ready | Orivraa",
    description:
      "Weight-based pricing, live gold rates, making charges, HUID tracking and instant GST invoices for Indian jewellery shops.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
