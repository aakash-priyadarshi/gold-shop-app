import { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Orivraa Pricing & Plans 2026 | Free Jewellery Shop Software — From $0/month",
  description:
    "Orivraa jewellery software pricing: Free plan ($0), Pro ($29/mo), Pro+ ($49/mo), Enterprise (custom). Includes inventory management, billing, POS, AI tools, digital catalogues & marketplace. Compare plans for jewellery sellers in Nepal, India, Dubai, USA & UK. Start free — no credit card needed.",
  keywords: [
    "orivraa pricing",
    "jewellery software pricing",
    "jewellery shop software price",
    "gold shop software cost",
    "free jewellery software",
    "jewellery ERP pricing",
    "jewellery POS pricing",
    "orivraa plans",
    "jewellery software free plan",
    "best jewellery software price comparison",
    "orivraa free plan",
    "orivraa pro plan",
    "jewellery inventory software pricing",
    "jewellery billing software price",
  ],
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Orivraa Pricing — Free Jewellery Shop Software | Plans from $0/month",
    description:
      "Compare Orivraa plans: Free ($0), Pro ($29/mo), Pro+ ($49/mo), Enterprise. Full jewellery shop management with inventory, billing, AI tools & marketplace. Start free today.",
    url: "https://www.orivraa.com/pricing",
  },
};

/** Server-rendered JSON-LD so Google/Gemini can read pricing without executing JS */
const pricingJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Orivraa — Jewellery Shop Software",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Windows, macOS, Android, iOS",
      url: "https://www.orivraa.com/pricing",
      description:
        "Free cloud-based jewellery shop management software. Manage gold, silver & diamond inventory by weight and purity. Includes billing, POS, AI design tools, digital catalogues, and international marketplace.",
      author: {
        "@type": "Organization",
        name: "Orivraa Technologies Pvt. Ltd.",
        url: "https://www.orivraa.com",
      },
      offers: [
        {
          "@type": "Offer",
          name: "Free Plan",
          price: "0",
          priceCurrency: "USD",
          description:
            "Free forever — list up to 15 products on the marketplace, manage inventory, accept orders. No credit card required. Includes basic analytics and customer messaging.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          name: "Pro Plan",
          price: "29",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "29",
            priceCurrency: "USD",
            billingDuration: "P1M",
            unitText: "per month",
          },
          description:
            "Full CRM suite — unlimited products, inventory management, invoicing & billing, customer management, bulk upload, advanced analytics, custom branding, and priority support. AI credits purchasable separately.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          name: "Pro+ Plan (Most Popular)",
          price: "49",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "49",
            priceCurrency: "USD",
            billingDuration: "P1M",
            unitText: "per month",
          },
          description:
            "Everything in Pro plus AI-powered tools: design generation, smart recommendations, price optimization, demand forecasting, and monthly AI credits included. Priority listing on marketplace.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          name: "Enterprise Plan",
          price: "0",
          priceCurrency: "USD",
          description:
            "Custom pricing for large jewellery businesses. Includes unlimited everything, lowest commission rate, dedicated account manager, API access, white-label option, multi-branch support, and custom integrations. Contact sales for a quote.",
          url: "https://www.orivraa.com/pricing",
        },
      ],
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        reviewCount: "320",
        bestRating: "5",
        worstRating: "1",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How much does Orivraa jewellery software cost?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Orivraa offers 4 plans: Free ($0/month — up to 15 products), Pro ($29/month — unlimited products, full CRM), Pro+ ($49/month — includes AI tools and priority listing), and Enterprise (custom pricing). Annual billing saves 20%. All plans include marketplace access. Local currency pricing available for Nepal (NPR), India (INR), UAE (AED), UK (GBP), and USA (USD).",
          },
        },
        {
          "@type": "Question",
          name: "Is Orivraa jewellery software free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! Orivraa has a free-forever plan that includes marketplace listing for up to 15 products, basic inventory management, customer messaging, and analytics. No credit card required. You can upgrade to Pro ($29/mo) or Pro+ ($49/mo) anytime for unlimited products and advanced features.",
          },
        },
        {
          "@type": "Question",
          name: "What is included in Orivraa Pro plan?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Orivraa Pro ($29/month) includes: unlimited product listings, full inventory management by weight & purity, invoicing & billing, customer management, bulk product upload, advanced analytics, custom branding, staff accounts, and priority support. AI credits can be purchased separately.",
          },
        },
        {
          "@type": "Question",
          name: "What is the best plan for a jewellery shop?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "For most jewellery shops, Pro+ ($49/month) is the best value — it includes everything in Pro plus AI-powered design generation, smart recommendations, price optimization, demand forecasting, and monthly AI credits. If you're just starting out, begin with the Free plan and upgrade as your business grows.",
          },
        },
      ],
    },
    {
      "@type": "WebPage",
      "@id": "https://www.orivraa.com/pricing",
      name: "Orivraa Pricing & Plans",
      description:
        "Compare Orivraa jewellery software plans. Free, Pro ($29/mo), Pro+ ($49/mo), Enterprise. Manage gold, silver & diamond inventory with AI-powered tools.",
      isPartOf: { "@id": "https://www.orivraa.com/#website" },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://www.orivraa.com",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Pricing",
            item: "https://www.orivraa.com/pricing",
          },
        ],
      },
    },
  ],
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      {children}
    </>
  );
}
