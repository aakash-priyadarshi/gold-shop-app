import type { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Orivraa vs Marg ERP for Jewellery Shops",
  description:
    "Marg ERP is a legacy desktop ERP. Orivraa is cloud jewellery software with live rates, weight-based billing, and multi-region GST/VAT. Free to start.",
  path: "/compare/orivraa-vs-marg-erp",
  keywords: [
    "Orivraa vs Marg ERP",
    "Marg ERP alternative",
    "Marg jewellery software alternative",
    "cloud jewellery ERP",
    "modern jewellery billing software",
    "Marg ERP vs cloud software",
    "best jewellery ERP India",
  ],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
