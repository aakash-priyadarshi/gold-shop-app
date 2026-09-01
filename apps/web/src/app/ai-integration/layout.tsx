import { SITE_URL } from "@/config/site";
import {
  buildFaqJsonLd,
  buildMarketingMetadata,
  MCP_OG_IMAGE,
} from "@/lib/seo/metadata";
import { Metadata } from "next";

const CANONICAL_PATH = "/ai-integration";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Seller AI Keys & MCP for Jewellery Shops | Orivraa",
  description:
    "Create a seller AI key with inventory and order scopes. Rotate or revoke it. Writes wait for approval; sales and payments are not MCP tools.",
  path: CANONICAL_PATH,
  keywords: [
    "jewellery shop MCP",
    "ChatGPT jewellery inventory",
    "Claude POS integration",
    "seller API key jewellery software",
    "AI inventory jewellery",
    "Orivraa MCP server",
    "Model Context Protocol jewellery",
    "MCP client jewellery shop",
  ],
  ogTitle: "Connect an MCP client to your jewellery shop",
  ogDescription:
    "Scoped seller AI keys, rotatable secrets, audit-logged write proposals, and seller approval before a supported change is applied.",
  ogImage: MCP_OG_IMAGE,
});

const faqSchema = buildFaqJsonLd([
  {
    question: "What is a seller AI integration key on Orivraa?",
    answer:
      "The shop owner creates the key, chooses inventory and order scopes, and can rotate or revoke it. Tool calls and write proposals are stored in the shop audit history under that seller.",
  },
  {
    question: "Can ChatGPT or Claude take payment from my jewellery till?",
    answer:
      "No. Sales, payments, refunds, and deletions are not MCP tools. Supported inventory and order-status edits stay pending until a logged-in seller approves them in Orivraa.",
  },
  {
    question: "What does the Orivraa MCP server expose?",
    answer:
      "Only tools allowed by the key scopes. Current tools search inventory, list orders without customer phone or email, and propose selected inventory or order-status edits for seller approval.",
  },
]);

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Orivraa Seller MCP Server",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Scoped Model Context Protocol server for jewellery shops. Inventory and order tools with seller-approved writes; no payment or sales MCP tools.",
  url: `${SITE_URL}${CANONICAL_PATH}`,
  featureList: [
    "Scoped seller AI integration keys",
    "Inventory read and write proposals",
    "Order status read and write proposals",
    "Audit-logged MCP tool calls",
    "Seller approval before supported writes apply",
  ],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Included with Orivraa jewellery shop plans",
  },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      {children}
    </>
  );
}
