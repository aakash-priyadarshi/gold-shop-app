import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orivraa vs Marg ERP | Modern Jewellery Software vs Legacy ERP",
  description:
    "Marg ERP is a legacy desktop ERP — installed per machine, India-only, and complex to set up. Orivraa is a cloud-first jewellery platform you can run from any phone or counter, with live gold rates, weight-based billing, making charges, purity tracking and multi-region GST/VAT support. Free plan available.",
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
    title: "Orivraa vs Marg ERP — Cloud Jewellery Platform vs Legacy Desktop",
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
