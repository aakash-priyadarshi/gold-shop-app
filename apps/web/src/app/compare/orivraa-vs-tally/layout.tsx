import type { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Orivraa vs Tally for Jewellery Shops",
  description:
    "Tally is general accounting. Orivraa adds weight-based jewellery billing, live gold rates, making charges, and purity tracking. Free plan available.",
  path: "/compare/orivraa-vs-tally",
  keywords: [
    "Orivraa vs Tally",
    "Tally alternative for jewellery shop",
    "jewellery billing software vs Tally",
    "gold shop software vs Tally",
    "Tally jewellery ERP",
    "jewellery accounting software",
    "best Tally alternative jewellers",
  ],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
