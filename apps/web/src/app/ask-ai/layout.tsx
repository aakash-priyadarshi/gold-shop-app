import { SITE_URL } from "@/config/site";
import { Metadata } from "next";

const CANONICAL = `${SITE_URL}/ask-ai`;

export const metadata: Metadata = {
  title: "Ask ChatGPT, Claude, Gemini or Perplexity about Orivraa",
  description:
    "Ask your AI how Orivraa is for jewellery business software. ChatGPT, Claude, and Perplexity receive a prepared question; Gemini opens with it copied for you to paste.",
  keywords: [
    "ask ChatGPT about Orivraa",
    "Orivraa jewellery software review",
    "Claude jewellery POS",
    "Gemini jewellery billing software",
    "Perplexity jewellery shop software",
    "jewellery business software AI",
  ],
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: "Ask your AI: How is Orivraa for jewellery business software?",
    description:
      "Open ChatGPT, Claude, Gemini, or Perplexity with a prepared question about Orivraa jewellery shop software. Gemini copies the question for you to paste.",
    url: CANONICAL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ask ChatGPT, Claude, Gemini or Perplexity about Orivraa",
    description:
      "Independent AI answers about Orivraa jewellery billing, POS, tax, and inventory software.",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How is Orivraa for jewellery business software?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Orivraa is cloud jewellery shop software for live-rate billing, inventory by weight and purity, mobile POS, GST/VAT, karigar tracking, and seller AI integrations. Use the Ask AI buttons on https://www.orivraa.com/ask-ai to have ChatGPT, Claude, Gemini, or Perplexity read the public product pages and summarise.",
      },
    },
    {
      "@type": "Question",
      name: "Does Ask AI open the ChatGPT or Claude app on my phone?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "They use each company's official https links, which phones can open in the app when it is installed. Gemini copies the prepared question for you to paste after it opens. On a laptop or PC they open the website in a new tab.",
      },
    },
    {
      "@type": "Question",
      name: "Can I connect Claude or ChatGPT to my jewellery shop data?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Create a seller AI integration key with scopes such as inventory:read or orders:write. The MCP server only exposes those tools. Supported writes wait for dashboard approval; sales, payments, refunds, and deletions are not MCP tools. Details: https://www.orivraa.com/ai-integration",
      },
    },
    {
      "@type": "Question",
      name: "How long has Orivraa served jewellery customers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The people behind Orivraa spent more than ten years serving jewellery customers in person. That shop-floor practice is in the product: weight, purity, making charges, wastage, and karigar metal, running on phone, laptop, and desktop.",
      },
    },
  ],
};

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
