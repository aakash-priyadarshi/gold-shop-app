import type { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Contact Orivraa Support and Sales",
  description:
    "Contact Orivraa for jewellery software demos and support. Email support@orivraa.com or call +91 62039 65557.",
  path: "/contact",
  keywords: [
    "contact Orivraa",
    "Orivraa support",
    "jewellery software demo",
    "jewellery POS support",
    "Orivraa sales",
    "jewellery shop software contact",
  ],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
