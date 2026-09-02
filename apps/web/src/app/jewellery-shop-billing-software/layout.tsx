import { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Jewellery Shop Billing Software",
  description:
    "GST/VAT jewellery invoices with making charges, old-gold exchange, live rates, and mobile POS from the counter.",
  path: "/jewellery-shop-billing-software",
  keywords: [
    "jewellery billing software",
    "jewellery shop billing software",
    "gold shop billing software",
    "jewellery invoicing software",
    "jewellery GST billing",
    "mobile jewellery billing software",
    "jewellery mobile POS billing",
    "gold billing software",
    "jewellery invoice generator",
    "jewellery bill maker",
    "gold shop invoice software",
    "jewellery billing and accounting",
    "jewellery billing with making charges",
    "jewellery tax software",
  ],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
