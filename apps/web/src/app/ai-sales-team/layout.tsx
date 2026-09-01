import { buildMarketingMetadata } from "@/lib/seo/metadata";
import { Metadata } from "next";

export const metadata: Metadata = buildMarketingMetadata({
  title: "AI Sales Team for Jewellery Shops",
  description:
    "Orivraa AI Sales Team answers jewellery leads 24/7 with live inventory, gold-rate context, CRM follow-up, and mobile POS handoff.",
  path: "/ai-sales-team",
  keywords: [
    "AI sales team for jewellery shops",
    "jewellery AI sales assistant",
    "AI voice bot for jewellers",
    "jewellery CRM AI",
    "AI jewellery customer support",
    "AI sales agent for gold shops",
    "Orivraa AI sales team",
  ],
  ogTitle: "AI Sales Team for Jewellery Shops | Orivraa",
  ogDescription:
    "AI voice and chat agents for jewellers with inventory-aware answers, live rate context, CRM follow-up, and Mobile POS handoff.",
  type: "article",
});

export default function AISalesTeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}