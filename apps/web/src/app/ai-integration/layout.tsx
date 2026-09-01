import { SITE_URL } from "@/config/site";
import { Metadata } from "next";

const CANONICAL = `${SITE_URL}/ai-integration`;

export const metadata: Metadata = {
  title: "Seller AI Keys & MCP for Jewellery Shops | Orivraa",
  description:
    "Create a seller AI integration key with inventory:read, inventory:write, orders:read, or orders:write. Rotate or revoke it. Supported writes wait for seller approval; sales, payments, refunds, and deletions are not MCP tools.",
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
    title: "Connect an MCP client to your jewellery shop",
    description:
      "Scoped seller AI keys, rotatable secrets, audit-logged write proposals, and seller approval before a supported change is applied.",
    url: CANONICAL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Seller AI keys & MCP | Orivraa",
    description:
      "Inventory and order scopes for shop AI. Sales, payments, refunds, and deletions are not MCP tools.",
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
        text: "The shop owner creates the key, chooses inventory and order scopes, and can rotate or revoke it. Tool calls and write proposals are stored in the shop audit history under that seller.",
      },
    },
    {
      "@type": "Question",
      name: "Can ChatGPT or Claude take payment from my jewellery till?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Sales, payments, refunds, and deletions are not MCP tools. Supported inventory and order-status edits stay pending until a logged-in seller approves them in Orivraa.",
      },
    },
    {
      "@type": "Question",
      name: "What does the Orivraa MCP server expose?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Only tools allowed by the key scopes. Current tools search inventory, list orders without customer phone or email, and propose selected inventory or order-status edits for seller approval.",
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
