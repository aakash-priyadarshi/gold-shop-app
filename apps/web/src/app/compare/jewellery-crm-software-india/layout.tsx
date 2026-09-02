import type { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Jewellery CRM Software for India",
  description:
    "Jewellery CRM for Indian gold shops: customer history, savings schemes, old-gold exchange, and GST billing in one place.",
  path: "/compare/jewellery-crm-software-india",
  keywords: [
    "jewellery CRM software India",
    "jewellery CRM",
    "gold shop CRM",
    "customer management jewellery shop",
    "jewellery loyalty software",
    "jewellery customer database",
    "CRM for jewellers India",
    "jewellery savings scheme software",
  ],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
