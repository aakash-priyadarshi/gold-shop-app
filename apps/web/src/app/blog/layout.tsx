import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Jewellery Business Blog and Software Guides",
  description:
    "Guides on jewellery shop software, GST billing, inventory, and growing a gold or diamond business with Orivraa.",
  path: "/blog",
  keywords: [
    "jewellery business blog",
    "jewellery shop tips",
    "gold shop software guide",
    "jewellery billing software",
    "tax reports for jewellers",
    "jewellery inventory management",
    "jewellery software comparison",
    "sell jewellery online",
    "jewellery GST guide",
    "billing software India",
    "jewellery shop management tips",
    "gold business guide",
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
