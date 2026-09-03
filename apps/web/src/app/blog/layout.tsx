import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Jewellery Business Blog, Tax Guides & ERP Benchmarks",
  description:
    "Authoritative guides for gold & diamond jewellers: GST & Nepal 2083/84 tax compliance, jewellery billing software benchmarks, karigar workshop tracking, and retail store growth.",
  path: "/blog",
  keywords: [
    "jewellery business blog",
    "jewellery billing software India",
    "nepal jewellery tax 2083 84",
    "gold shop software guide",
    "jewellery GST billing guide",
    "tally vs vyapar vs orivraa jewellery",
    "karigar gold loss ledger",
    "jewellery inventory management",
    "huid hallmarking compliance",
    "vat on gold dubai uae",
    "jewellery store management software",
    "sell jewellery online WhatsApp",
    "jewellery ERP blog",
  ],
});

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
