import type { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Orivraa vs Tally for Jewellery Shops"),
  description:
    "Tally is general accounting. Orivraa adds weight-based jewellery billing, live gold rates, making charges, and purity tracking. Free plan available.",
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
    title: "Orivraa vs Tally for Jewellery Shops",
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
