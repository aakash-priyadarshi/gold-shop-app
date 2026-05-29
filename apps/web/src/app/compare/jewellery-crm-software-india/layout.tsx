import type { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Jewellery CRM Software India | Customer & Loyalty Management | Orivraa",
  description:
    "Jewellery CRM software built for Indian gold & diamond shops — track customers, purchase history, savings/committee schemes, old-gold exchange, festival reminders and WhatsApp follow-ups in one place. Live gold rates, weight-based billing and GST invoicing included. Free plan available.",
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
