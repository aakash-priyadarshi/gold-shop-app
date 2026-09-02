import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Jewellery Store Management Software",
  description:
    "Run inventory, mobile POS, live gold rates, catalogues, and analytics in one jewellery store management platform.",
  path: "/jewellery-store-management-software",
  keywords: [
    "jewellery store management software",
    "jewellery shop management system",
    "gold store management software",
    "jewellery business management",
    "jewellery store software",
    "store management for jewellers",
    "jewellery management system",
    "gold shop management system",
    "jewellery retail management",
    "jewellery store operations",
    "jewellery shop automation",
    "mobile POS store management",
    "live gold rate store software",
    "modern jewellery store software",
  ],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
