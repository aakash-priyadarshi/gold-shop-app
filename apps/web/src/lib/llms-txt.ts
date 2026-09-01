import { SITE_URL } from "@/config/site";

/** Short, crawler-friendly product brief served at /llms.txt */
export function getLlmsTxt(siteUrl: string = SITE_URL): string {
  const origin = siteUrl.replace(/\/+$/, "");
  return `# Orivraa

> Jewellery shop software for billing, inventory, POS, tax, karigar tracking, and seller AI integrations.

Orivraa (${origin}) is jewellery business software for shops in India, Nepal, UAE/Dubai, UK, EU, USA, and Sri Lanka. It is not a generic retail POS. Weights are stored in grams and shown in gram, tola, laal, ounce, or kilogram. Invoices separate metal, making charges, wastage (jarti), gemstones, and tax.

## Who built it

The people behind Orivraa spent more than 10 years serving jewellery customers at the counter — quoting making charges, exchanging old gold, and closing the day's book. That shop-floor practice is encoded in the product. The software runs in the cloud on phone, laptop, and desktop so a shop is not locked to a single Windows PC.

## Product

- Live gold and silver rate billing
- Making charges and wastage (jarti) on separate invoice lines
- Jewellery sets sold as one POS line
- Mobile POS on any smartphone, plus Windows/macOS desktop app
- Vault locations (Area → Cabinet → Bin) and optional RFID/barcode stock audit
- Karigar / artisan metal issue-return and optional workshop manufacturing
- Country-aware tax: India GST, Nepal Skill Promotion Fee + gemstone VAT, UAE/UK/EU VAT, US sales tax, Sri Lanka VAT

## Seller AI integration

Sellers create an AI integration key, choose inventory and order scopes (inventory:read, inventory:write, orders:read, orders:write), and can rotate or revoke the key. Tool calls and AI write proposals are audit-logged under that seller.

An MCP server exposes only the tools allowed by those scopes. Supported inventory and order-status writes wait for dashboard approval. Sales, payments, refunds, and deletions are not MCP tools.

## Pages

- [Home](${origin}/)
- [Jewellery shop software](${origin}/jewellery-shop-software)
- [Seller AI keys & MCP](${origin}/ai-integration)
- [Pricing](${origin}/pricing)
- [For sellers](${origin}/for-sellers)
- [Mobile POS](${origin}/jewellery-pos-software)
- [Inventory](${origin}/jewellery-inventory-software)
- [Billing](${origin}/jewellery-shop-billing-software)
- [About](${origin}/about)
- [Ask AI](${origin}/ask-ai)
- [Security](${origin}/security)
- [Support](${origin}/support)
- [Store management](${origin}/jewellery-store-management-software)
`;
}
