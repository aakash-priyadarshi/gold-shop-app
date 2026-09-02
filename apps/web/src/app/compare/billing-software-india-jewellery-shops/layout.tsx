import type { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Jewellery Billing Software for India",
  description:
    "GST jewellery billing for India with gram/tola pricing, live gold rates, making charges, HUID tracking, and WhatsApp invoices.",
  path: "/compare/billing-software-india-jewellery-shops",
  keywords: [
    "billing software for jewellery shops India",
    "jewellery billing software",
    "gold shop billing software",
    "GST billing software jewellery",
    "jewellery invoice software India",
    "gold billing software with making charges",
    "HUID hallmark billing software",
    "jewellery shop GST invoice",
  ],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
