import type { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Jewellery Billing Software for India"),
  description:
    "GST jewellery billing for India with gram/tola pricing, live gold rates, making charges, HUID tracking, and WhatsApp invoices.",
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
