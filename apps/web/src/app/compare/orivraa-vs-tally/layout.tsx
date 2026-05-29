import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orivraa vs Tally | Jewellery ERP & Billing vs General Accounting",
  description:
    "Tally is powerful accounting software, but it was never built for jewellery shops — no weight-based billing, no purity tracking, no live gold rates, and no making-charge logic. Orivraa is purpose-built for gold, silver & diamond retailers in India, Nepal, UAE, UK and US. Free plan available.",
  keywords: [
    "Orivraa vs Tally",
    "Tally alternative for jewellery shop",
    "jewellery billing software vs Tally",
    "gold shop software vs Tally",
    "Tally jewellery ERP",
    "jewellery accounting software",
    "best Tally alternative jewellers",
  ],
  alternates: { canonical: "/compare/orivraa-vs-tally" },
  openGraph: {
    title: "Orivraa vs Tally — Jewellery-First ERP vs General Accounting",
    description:
      "See why jewellers switch from Tally to Orivraa: weight-based billing, live gold rates, making charges, purity & hallmark tracking, and old-gold exchange built in.",
    url: "https://www.orivraa.com/compare/orivraa-vs-tally",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Orivraa vs Tally for Jewellery Shops | Orivraa",
    description:
      "Tally does accounting. Orivraa runs your jewellery shop — billing, live rates, making charges, purity tracking, and old-gold exchange.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
