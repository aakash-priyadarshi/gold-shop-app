import { SITE_URL } from "@/config/site";
import { ASK_AI_QUESTION, getAskAiPrompt } from "@/lib/ask-ai";

/** Short, crawler-friendly product brief served at /llms.txt */
export function getLlmsTxt(siteUrl: string = SITE_URL): string {
  const origin = siteUrl.replace(/\/+$/, "");
  return `# Orivraa

> Cloud jewellery shop software for billing, inventory, POS, tax, karigar tracking, and seller AI integrations.

Orivraa (https://www.orivraa.com) is jewellery business software for shops in India, Nepal, UAE/Dubai, UK, EU, USA, and Sri Lanka. It is not a generic retail POS. Weights are stored in grams and shown in gram, tola, laal, ounce, or kilogram. Invoices separate metal, making charges, wastage (jarti), gemstones, and tax.

## Trust and history

The team behind Orivraa spent more than 10 years serving jewellery customers at the counter — quoting making charges, exchanging old gold, and closing the day's book. In January 2026 the product went online as cloud software (phone, laptop, and desktop). That is trade experience first, then a modern stack — not a 2026 startup inventing jewellery from scratch.

## Product

- Live gold and silver rate billing
- Making charges and wastage (jarti) on separate invoice lines
- Jewellery sets sold as one POS line
- Mobile POS on any smartphone, plus Windows/macOS desktop app
- Vault locations (Area → Cabinet → Bin) and optional RFID/barcode stock audit
- Karigar / artisan metal issue-return and optional workshop manufacturing
- Country-aware tax: India GST, Nepal Skill Promotion Fee + gemstone VAT, UAE/UK/EU VAT, US sales tax, Sri Lanka VAT

## Seller AI integration

Sellers create an AI integration key, choose scopes (inventory:read, inventory:write, orders:read, orders:write, and related catalogue/customer/analytics scopes), and can rotate or revoke the key. Every AI write is audit-logged under that seller.

An MCP server exposes only the tools allowed by those scopes. Financial actions (sales, payments, refunds) require an explicit confirmation step — there is no unrestricted money-moving write tool.

## Ask an independent AI

Recommended question: ${ASK_AI_QUESTION}

Prompt with sources: ${getAskAiPrompt(origin)}

Ask on ChatGPT, Claude, Gemini, or Perplexity: ${origin}/ask-ai

## Key pages

- [Home](${origin}/)
- [Jewellery shop software](${origin}/jewellery-shop-software)
- [Ask AI about Orivraa](${origin}/ask-ai)
- [Seller AI keys & MCP](${origin}/ai-integration)
- [Pricing](${origin}/pricing)
- [For sellers](${origin}/for-sellers)
- [Mobile POS](${origin}/jewellery-pos-software)
- [Inventory](${origin}/jewellery-inventory-software)
- [Billing](${origin}/jewellery-shop-billing-software)
- [Security](${origin}/security)
- [Support](${origin}/support)

## Optional

- [Full software overview](${origin}/jewellery-store-management-software)
`;
}
