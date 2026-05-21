import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Sales Team for Jewellery Shops | Voice Bot, CRM & Mobile POS Follow-up",
  description:
    "Orivraa AI Sales Team answers jewellery leads 24/7, reads live inventory and gold rate context, schedules follow-ups, and helps turn ready buyers into Mobile POS or CRM orders.",
  keywords: [
    "AI sales team for jewellery shops",
    "jewellery AI sales assistant",
    "AI voice bot for jewellers",
    "jewellery CRM AI",
    "AI jewellery customer support",
    "AI sales agent for gold shops",
    "Orivraa AI sales team",
  ],
  alternates: { canonical: "/ai-sales-team" },
  openGraph: {
    title: "AI Sales Team for Jewellery Shops | Orivraa",
    description:
      "AI voice and chat agents for jewellers with inventory-aware answers, live rate context, CRM follow-up, and Mobile POS handoff.",
    url: "https://www.orivraa.com/ai-sales-team",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Sales Team for Jewellery Shops | Orivraa",
    description:
      "Inventory-aware AI voice and chat agents for jewellers, with live rate context and Mobile POS handoff.",
  },
};

export default function AISalesTeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}