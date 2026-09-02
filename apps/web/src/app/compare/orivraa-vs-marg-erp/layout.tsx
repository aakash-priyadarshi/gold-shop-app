import type { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Orivraa vs Marg ERP for Jewellery Shops"),
  description:
    "Marg ERP is a legacy desktop ERP. Orivraa is cloud jewellery software with live rates, weight-based billing, and multi-region GST/VAT. Free to start.",
  keywords: [
    "Orivraa vs Marg ERP",
    "Marg ERP alternative",
    "Marg jewellery software alternative",
    "cloud jewellery ERP",
    "modern jewellery billing software",
    "Marg ERP vs cloud software",
    "best jewellery ERP India",
  ],
  alternates: { canonical: "/compare/orivraa-vs-marg-erp" },
  openGraph: {
    title: "Orivraa vs Marg ERP for Jewellery Shops",
    description:
      "Why jewellers move from Marg ERP to Orivraa: cloud access from any device, live rates, weight-based billing, making charges and multi-region support.",
    url: "https://www.orivraa.com/compare/orivraa-vs-marg-erp",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Orivraa vs Marg ERP for Jewellers | Orivraa",
    description:
      "Legacy desktop ERP vs a modern cloud jewellery platform with live rates, weight-based billing and making charges.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
