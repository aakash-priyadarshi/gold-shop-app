import {
    getRegionalPricingSeo,
    INDIA_PRO_MONTHLY_PRICE,
    INDIA_PRO_PLUS_MONTHLY_PRICE,
    NEPAL_PRO_MONTHLY_PRICE,
} from "@/lib/seo/pricing-copy";
import { Metadata } from "next";
import { headers } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const seo = getRegionalPricingSeo(headers().get("cf-ipcountry"));

  return {
    title: seo.title,
    description: seo.description,
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
    "gstin invoice software",
    "jewellery software india price",
  ],
    alternates: { canonical: "/pricing" },
    openGraph: {
      title: seo.openGraphTitle,
      description: seo.openGraphDescription,
      url: "https://www.orivraa.com/pricing",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.twitterTitle,
      description: seo.twitterDescription,
    },
  };
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const seo = getRegionalPricingSeo(headers().get("cf-ipcountry"));
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
          "Jewellery shop software with local country pricing, inventory by weight and purity, billing, POS, GSTIN/VAT-ready invoices, tax reports, AI tools, and marketplace access.",
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
            priceCurrency: "INR",
            description:
              "Free plan available with marketplace access and core tools. Paid plans use local country pricing.",
            url: "https://www.orivraa.com/pricing",
          },
          {
            "@type": "AggregateOffer",
            name: "Paid Plans",
            lowPrice: `${INDIA_PRO_MONTHLY_PRICE}`,
            priceCurrency: "INR",
            offerCount: "3",
            description:
              "Paid plans start at ₹299/month in India. Pricing localises by country and final billing is verified by shop country.",
            url: "https://www.orivraa.com/pricing",
          },
          {
            "@type": "Offer",
            name: "Pro Plan (India)",
            price: `${INDIA_PRO_MONTHLY_PRICE}`,
            priceCurrency: "INR",
            eligibleRegion: { "@type": "Country", name: "India" },
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: `${INDIA_PRO_MONTHLY_PRICE}`,
              priceCurrency: "INR",
              billingDuration: "P1M",
              unitText: "per month",
            },
            description:
              "India pricing for Orivraa Pro with inventory, billing, GSTIN-ready invoices, analytics, tax reports, and marketplace access.",
            url: "https://www.orivraa.com/pricing",
          },
          {
            "@type": "Offer",
            name: "Pro+ Plan (India)",
            price: `${INDIA_PRO_PLUS_MONTHLY_PRICE}`,
            priceCurrency: "INR",
            eligibleRegion: { "@type": "Country", name: "India" },
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: `${INDIA_PRO_PLUS_MONTHLY_PRICE}`,
              priceCurrency: "INR",
              billingDuration: "P1M",
              unitText: "per month",
            },
            description:
              "India pricing for Orivraa Pro+ with additional AI automation, reports, and advanced seller tools.",
            url: "https://www.orivraa.com/pricing",
          },
          {
            "@type": "Offer",
            name: "Pro Plan (Nepal)",
            price: `${NEPAL_PRO_MONTHLY_PRICE}`,
            priceCurrency: "NPR",
            eligibleRegion: { "@type": "Country", name: "Nepal" },
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: `${NEPAL_PRO_MONTHLY_PRICE}`,
              priceCurrency: "NPR",
              billingDuration: "P1M",
              unitText: "per month",
            },
            description:
              "Nepal pricing for Orivraa Pro with billing, analytics, local tax-ready workflows, and marketplace access.",
            url: "https://www.orivraa.com/pricing",
          },
          {
            "@type": "Offer",
            name: "Enterprise Plan",
            description:
              "Custom pricing for large jewellery businesses. Includes unlimited operations support, advanced integrations, dedicated account management, and multi-branch workflows.",
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
              text: seo.faqCostText,
            },
          },
          {
            "@type": "Question",
            name: "Is Orivraa jewellery software free?",
            acceptedAnswer: {
              "@type": "Answer",
              text: seo.faqFreeText,
            },
          },
          {
            "@type": "Question",
            name: "What is included in Orivraa Pro plan?",
            acceptedAnswer: {
              "@type": "Answer",
              text: seo.faqProText,
            },
          },
          {
            "@type": "Question",
            name: "What is the best plan for a jewellery shop?",
            acceptedAnswer: {
              "@type": "Answer",
              text: seo.faqBestText,
            },
          },
        ],
      },
      {
        "@type": "WebPage",
        "@id": "https://www.orivraa.com/pricing",
        name: "Orivraa Pricing & Plans",
        description: seo.webPageDescription,
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
