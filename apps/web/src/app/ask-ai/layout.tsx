import {
  buildFaqJsonLd,
  buildMarketingMetadata,
  MCP_OG_IMAGE,
} from "@/lib/seo/metadata";
import { Metadata } from "next";

const CANONICAL_PATH = "/ask-ai";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Ask ChatGPT, Claude, Google AI or Perplexity about Orivraa",
  description:
    "Ask how Orivraa is for jewellery business software. ChatGPT, Claude, Google AI Mode, and Perplexity open with a prepared question and product URLs.",
  path: CANONICAL_PATH,
  keywords: [
    "ask ChatGPT about Orivraa",
    "Orivraa jewellery software review",
    "Claude jewellery POS",
    "Google AI jewellery billing software",
    "Perplexity jewellery shop software",
    "jewellery business software AI",
    "jewellery shop MCP integration",
  ],
  ogTitle: "Ask your AI: How is Orivraa for jewellery business software?",
  ogDescription:
    "Open ChatGPT, Claude, Google AI Mode, or Perplexity with a prepared question about Orivraa jewellery shop software.",
  ogImage: MCP_OG_IMAGE,
});

const faqSchema = buildFaqJsonLd([
  {
    question: "How is Orivraa for jewellery business software?",
    answer:
      "Orivraa is cloud jewellery shop software for live-rate billing, inventory by weight and purity, mobile POS, GST/VAT, karigar tracking, and seller AI integrations. Use the Ask AI buttons on https://www.orivraa.com/ask-ai to have ChatGPT, Claude, Google AI Mode, or Perplexity read the public product pages and summarise.",
  },
  {
    question: "Does Ask AI open the ChatGPT or Claude app on my phone?",
    answer:
      "They use each company's official https links, which phones can open in the app when it is installed. Google AI Mode opens Google Search AI. On a laptop or PC they open in a new tab.",
  },
  {
    question: "Can I connect Claude or ChatGPT to my jewellery shop data?",
    answer:
      "Yes. Create a seller AI integration key with scopes such as inventory:read or orders:write. The MCP server only exposes those tools. Supported writes wait for dashboard approval; sales, payments, refunds, and deletions are not MCP tools. Details: https://www.orivraa.com/ai-integration",
  },
  {
    question: "How long has Orivraa served jewellery customers?",
    answer:
      "The people behind Orivraa spent more than 10 years serving jewellery customers in person. That shop-floor practice is in the product: weight, purity, making charges, wastage, and karigar metal, running on phone, laptop, and desktop.",
  },
]);

export default function AskAiLayout({
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
