export const INDIA_PRO_MONTHLY_PRICE = 299;
export const INDIA_PRO_PLUS_MONTHLY_PRICE = 599;
export const NEPAL_PRO_MONTHLY_PRICE = 399;

export const PUBLIC_LOCAL_PRICING_SUMMARY =
  "Free plan available. Paid plans start at ₹299/month in India. Local pricing varies by country and final billing is based on your shop country.";

export const GSTIN_READY_INVOICE_COPY =
  "GSTIN / VAT / PAN-ready invoices";

type PricingSeoContent = {
  title: string;
  description: string;
  openGraphTitle: string;
  openGraphDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  faqCostText: string;
  faqFreeText: string;
  faqProText: string;
  faqBestText: string;
  webPageDescription: string;
};

export function getRegionalPricingSeo(
  country?: string | null,
): PricingSeoContent {
  const normalized = typeof country === "string" ? country.toUpperCase() : "";

  if (normalized === "IN") {
    return {
      title:
        "Orivraa Pricing India 2026 | Jewellery Shop Software from ₹299/month",
      description:
        "Local pricing for India. Free plan available. India Pro starts at ₹299/month with billing, POS, GSTIN-ready invoices, tax reports, AI tools, digital catalogues, and marketplace access.",
      openGraphTitle:
        "Orivraa Pricing India | Jewellery Shop Software from ₹299/month",
      openGraphDescription:
        "India pricing for Orivraa jewellery software. Free plan available, Pro starts at ₹299/month, with GSTIN-ready invoicing, tax reports, POS, AI tools, and marketplace access.",
      twitterTitle: "Orivraa Pricing India | From ₹299/month",
      twitterDescription:
        "Free plan available. India Pro starts at ₹299/month with billing, GSTIN-ready invoices, tax reports, POS, and marketplace access.",
      faqCostText:
        "Orivraa pricing is local by country. In India, Pro starts at ₹299/month and Pro+ starts at ₹599/month. The pricing page automatically shows local currency, and final billing is verified by shop country.",
      faqFreeText:
        "Yes. Orivraa has a free plan with marketplace access and core tools. Paid plans use local country pricing, and in India the Pro plan starts at ₹299/month.",
      faqProText:
        "In India, Orivraa Pro starts at ₹299/month and includes inventory management by weight and purity, invoicing and billing, customer management, bulk upload, analytics, GSTIN-ready invoices, and priority support.",
      faqBestText:
        "For many Indian jewellery shops, Pro is the best-value paid plan because it adds CRM, billing, tax reports, GSTIN-ready invoices, analytics, and inventory workflows at ₹299/month. Upgrade to Pro+ or Enterprise if you need deeper AI automation or larger operations support.",
      webPageDescription:
        "Local India pricing for Orivraa jewellery software. Free plan available, Pro starts at ₹299/month, and pricing is verified against your shop country.",
    };
  }

  if (normalized === "NP") {
    return {
      title:
        "Orivraa Pricing Nepal 2026 | Jewellery Shop Software from NPR 399/month",
      description:
        "Local pricing for Nepal. Free plan available. Nepal Pro starts at NPR 399/month with billing, tax-ready workflows, AI tools, digital catalogues, and marketplace access.",
      openGraphTitle:
        "Orivraa Pricing Nepal | Jewellery Shop Software from NPR 399/month",
      openGraphDescription:
        "Nepal pricing for Orivraa jewellery software. Free plan available, Pro starts at NPR 399/month, with billing, reports, POS, AI tools, and marketplace access.",
      twitterTitle: "Orivraa Pricing Nepal | From NPR 399/month",
      twitterDescription:
        "Free plan available. Nepal Pro starts at NPR 399/month with billing, tax-ready workflows, POS, and marketplace access.",
      faqCostText:
        "Orivraa pricing is local by country. In Nepal, Pro starts at NPR 399/month. The pricing page automatically shows local currency, and final billing is verified by shop country.",
      faqFreeText:
        "Yes. Orivraa has a free plan with marketplace access and core tools. Paid plans use local country pricing, and in Nepal the Pro plan starts at NPR 399/month.",
      faqProText:
        "In Nepal, Orivraa Pro starts at NPR 399/month and includes inventory management by weight and purity, invoicing and billing, customer management, bulk upload, analytics, and local tax-ready workflows.",
      faqBestText:
        "For many jewellery shops in Nepal, Pro is the best-value paid plan because it adds billing, analytics, inventory workflows, and customer tools while keeping local pricing straightforward.",
      webPageDescription:
        "Local Nepal pricing for Orivraa jewellery software. Free plan available, Pro starts at NPR 399/month, and pricing is verified against your shop country.",
    };
  }

  return {
    title:
      "Orivraa Pricing 2026 | Jewellery Shop Software from ₹299/month",
    description:
      "Orivraa jewellery software pricing is local by country. Free plan available. Paid plans start at ₹299/month in India, with billing, POS, GSTIN-ready invoices, tax reports, AI tools, and marketplace access.",
    openGraphTitle:
      "Orivraa Pricing | Jewellery Software from ₹299/month",
    openGraphDescription:
      "Free plan available. Paid plans start at ₹299/month in India and pricing automatically localises by country for jewellery businesses.",
    twitterTitle: "Orivraa Pricing | From ₹299/month",
    twitterDescription:
      "Free plan available. Paid plans start at ₹299/month in India and the pricing page shows local country pricing automatically.",
    faqCostText:
      "Orivraa pricing is local by country. Paid plans start at ₹299/month in India. The pricing page automatically shows the visitor's local market and final billing is verified by shop country.",
    faqFreeText:
      "Yes. Orivraa has a free plan with marketplace access and core tools. Paid plans use local country pricing, including India Pro from ₹299/month.",
    faqProText:
      "Orivraa Pro includes inventory management by weight and purity, invoicing and billing, customer management, bulk upload, analytics, GSTIN-ready invoices, and priority support. Pricing is local by country, including India Pro from ₹299/month.",
    faqBestText:
      "For many jewellery shops, Pro is the best-value paid plan because it adds CRM, billing, tax reports, GSTIN-ready invoices, analytics, and inventory workflows at local country pricing. Choose Pro+ or Enterprise if you need deeper AI automation or larger operations support.",
    webPageDescription:
      "Compare Orivraa jewellery software plans. Free plan available and paid pricing starts at ₹299/month in India, with automatic local pricing by region.",
  };
}