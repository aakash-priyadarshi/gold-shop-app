import type { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: absolutePageTitle("Jewellery CRM Software for India"),
  description:
    "Jewellery CRM for Indian gold shops: customer history, savings schemes, old-gold exchange, and GST billing in one place.",
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
  alternates: { canonical: "/compare/jewellery-crm-software-india" },
  openGraph: {
    title: "Jewellery CRM Software for India | Orivraa",
    description:
      "Manage jewellery customers, purchase history, savings schemes and follow-ups — with live rates, weight-based billing and GST invoicing built in.",
    url: "https://www.orivraa.com/compare/jewellery-crm-software-india",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jewellery CRM Software India | Orivraa",
    description:
      "Customer history, savings schemes, festival reminders and WhatsApp follow-ups — built for Indian jewellery shops.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
