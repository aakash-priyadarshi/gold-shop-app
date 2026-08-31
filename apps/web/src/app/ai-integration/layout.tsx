import { SITE_URL } from "@/config/site";
import { Metadata } from "next";

const CANONICAL = `${SITE_URL}/ai-integration`;

export const metadata: Metadata = {
  title: "Seller AI Keys & MCP for Jewellery Shops | Orivraa",
  description:
    "Create a seller AI integration key with inventory:read, inventory:write, orders:read, or orders:write. Rotate or revoke it. Every AI write is audit-logged. MCP tools require confirmation for sales, payments, and refunds.",
  keywords: [
    "jewellery shop MCP",
    "ChatGPT jewellery inventory",
    "Claude POS integration",
    "seller API key jewellery software",
    "AI inventory jewellery",
    "Orivraa MCP server",
  ],
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: "Connect Claude, ChatGPT or Gemini to your jewellery shop",
    description:
      "Scoped seller AI keys, rotatable secrets, audit-logged writes, and MCP tools that cannot move money without confirmation.",
    url: CANONICAL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Seller AI keys & MCP | Orivraa",
    description:
      "Inventory and order scopes for shop AI. Sales, payments, and refunds need an explicit confirm step.",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a seller AI integration key on Orivraa?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The shop owner creates the key, chooses scopes such as inventory:read, inventory:write, orders:read, or orders:write, and can rotate or revoke it. Every AI write is stored in the shop audit log under that seller.",
      },
    },
    {
      "@type": "Question",
      name: "Can ChatGPT or Claude take payment from my jewellery till?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No unrestricted financial write tool is exposed. Sales, payments, and refunds require an explicit confirmation step in addition to orders:write.",
      },
    },
    {
      "@type": "Question",
      name: "What does the Orivraa MCP server expose?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Only tools allowed by the key scopes. Typical tools include reading vault stock, updating catalogue fields the seller permitted, and reading order status. Money movement is gated behind confirmation.",
      },
    },
  ],
};

export default function AiIntegrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  );
}
