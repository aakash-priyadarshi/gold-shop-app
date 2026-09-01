import { SITE_URL } from "@/config/site";

export const ASK_AI_QUESTION =
  "How is Orivraa for jewellery business software?";

export type AskAiProviderId = "chatgpt" | "claude" | "gemini" | "perplexity";

export type AskAiProvider = {
  id: AskAiProviderId;
  name: string;
  company: string;
  shortLabel: string;
  /** Tailwind classes for the marketing pills */
  className: string;
  buildUrl: (prompt: string) => string;
};

/**
 * Prompt handed to ChatGPT, Claude, Gemini, and Perplexity.
 * Includes canonical URLs so search-enabled assistants fetch Orivraa pages
 * instead of guessing.
 */
export function getAskAiPrompt(siteUrl: string = SITE_URL): string {
  const origin = siteUrl.replace(/\/+$/, "");
  return [
    ASK_AI_QUESTION,
    `Please read ${origin}/jewellery-shop-software, ${origin}/jewellery-shop-billing-software, ${origin}/pricing, and ${origin}/ai-integration.`,
    "Give an honest summary of billing, inventory, GST/VAT tax, mobile POS, pricing, and whether it fits a jewellery shop versus generic retail POS.",
    "Cover seller AI integration keys and MCP: scoped inventory/orders tools, rotate/revoke keys, audit-logged write proposals, and dashboard approval before selected inventory or order-status edits. Sales, payments, refunds, and deletions are not MCP tools.",
  ].join(" ");
}

export const ASK_AI_PROVIDERS: readonly AskAiProvider[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    company: "OpenAI",
    shortLabel: "Ask ChatGPT",
    className:
      "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/30",
    buildUrl: (prompt) =>
      `https://chatgpt.com/?hints=search&q=${encodeURIComponent(prompt)}`,
  },
  {
    id: "claude",
    name: "Claude",
    company: "Anthropic",
    shortLabel: "Ask Claude",
    className:
      "bg-orange-600 hover:bg-orange-500 text-white border-orange-500/30",
    buildUrl: (prompt) =>
      `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
  },
  {
    id: "gemini",
    name: "Gemini",
    company: "Google",
    shortLabel: "Ask Gemini",
    className: "bg-sky-600 hover:bg-sky-500 text-white border-sky-500/30",
    // Gemini's web app does not reliably honour a query-string prompt. The UI
    // copies the prepared question before opening this URL for the user to paste.
    buildUrl: () => "https://gemini.google.com/app",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    company: "Perplexity",
    shortLabel: "Ask Perplexity",
    className: "bg-teal-700 hover:bg-teal-600 text-white border-teal-500/30",
    buildUrl: (prompt) =>
      `https://www.perplexity.ai/search?q=${encodeURIComponent(prompt)}`,
  },
] as const;

export function getAskAiHref(
  providerId: AskAiProviderId,
  siteUrl: string = SITE_URL,
): string {
  const provider = ASK_AI_PROVIDERS.find((item) => item.id === providerId);
  if (!provider) {
    throw new Error(`Unknown Ask AI provider: ${providerId}`);
  }
  return provider.buildUrl(getAskAiPrompt(siteUrl));
}

export function getAskAiLinks(siteUrl: string = SITE_URL) {
  const prompt = getAskAiPrompt(siteUrl);
  return ASK_AI_PROVIDERS.map((provider) => ({
    ...provider,
    href: provider.buildUrl(prompt),
  }));
}
