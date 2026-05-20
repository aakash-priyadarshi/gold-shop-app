"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { ComparisonClusterLinks } from "@/components/marketing/ComparisonClusterLinks";
import { MobilePosSpotlight } from "@/components/home/HomeSections";
import { T } from "@/components/ui/T";
import { subscriptionPlansApi } from "@/lib/api";
import { usePlatformFeatures } from "@/hooks/usePlatformFeatures";
import {
    COUNTRIES,
    CURRENCIES,
    usePreferencesStore,
    type CountryCode,
    type CurrencyCode,
} from "@/store/preferences";
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    Check,
    Cloud,
    Crown,
    Globe,
    LayoutDashboard,
    Loader2,
    MessageSquare,
    Monitor,
    Package,
    Palette,
    Receipt,
    Scale,
    ShieldCheck,
    Smartphone,
    Sparkles,
    Store,
    TrendingUp,
    Users,
    Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

interface PlanFromAPI {
  id: string;
  name: string;
  displayName: string;
  description: string;
  country: string;
  currency: CurrencyCode;
  monthlyPrice: number;
  annualPrice: number;
  maxProducts: number | null;
  maxInvoicesPerMonth: number | null;
  maxCatalogues: number | null;
  catalogueLimit: number | null;
  maxOrdersPerMonth: number | null;
  commissionPercent: number;
  includesAi: boolean;
  monthlyAiCredits: number;
  rolloverCap: number;
  extraCreditPrice: number;
  overageBehavior: string;
  features: Record<string, boolean | string | number>;
  sortOrder: number;
  badgeText?: string | null;
  buttonColor?: string | null;
}

const BUYER_COUNTRY_COUNT = 27;

function currencySymbol(code: CurrencyCode): string {
  return CURRENCIES[code]?.symbol ?? code;
}

function formatPrice(amount: number, currency: CurrencyCode): string {
  const sym = currencySymbol(currency);
  if (amount === 0) return `${sym}0`;

  const hasDecimals = amount % 1 !== 0;
  try {
    const locale = CURRENCIES[currency]?.locale ?? "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    }).format(amount);
  } catch {
    return `${sym}${amount.toLocaleString()}`;
  }
}

function getListingLimitText(plan: PlanFromAPI | undefined): string {
  if (!plan) return "Live plan details update by market.";

  const limit = plan.catalogueLimit ?? plan.maxProducts;
  return limit
    ? `Up to ${limit.toLocaleString()} product listings.`
    : "Unlimited product listings.";
}

/* ────────────────────────────────────────────────────────────── */
/*  STRUCTURED DATA (SoftwareApplication + FAQPage)               */
/* ────────────────────────────────────────────────────────────── */

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Orivraa — Jewellery Shop Software",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Windows, macOS, Android, iOS",
      description:
        "Free cloud-based jewellery shop management software with inventory management, billing, POS, customer chat, digital catalogues, and analytics. Manage gold, silver & diamond inventory by weight and purity.",
      url: "https://www.orivraa.com/jewellery-shop-software",
      downloadUrl: "https://www.orivraa.com/download",
      screenshot: "https://www.orivraa.com/brand/orivraa-icon.svg",
      author: {
        "@type": "Organization",
        name: "Orivraa Technologies Pvt. Ltd.",
        url: "https://www.orivraa.com",
      },
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
          name: "Free Plan",
          description:
            "Free jewellery shop software for all markets. Up to 15 products, basic inventory, and customer chat. No credit card required.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "299",
          priceCurrency: "INR",
          name: "Pro Plan — India",
          description:
            "Orivraa Pro for India: ₹299/month. Unlimited products, GST-ready invoicing, analytics, CRM, digital catalogues, and AI tools.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "399",
          priceCurrency: "NPR",
          name: "Pro Plan — Nepal",
          description:
            "Orivraa Pro for Nepal jewellers: NPR 399/month. Unlimited products, invoicing, and analytics.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "9.99",
          priceCurrency: "GBP",
          name: "Pro Plan — UK",
          description:
            "Orivraa Pro for UK jewellery shops: £9.99/month. VAT-compliant invoicing, unlimited products, and analytics.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "12.99",
          priceCurrency: "USD",
          name: "Pro Plan — USA",
          description:
            "Orivraa Pro for US jewellery businesses: $12.99/month.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "12.99",
          priceCurrency: "EUR",
          name: "Pro Plan — EU",
          description:
            "Orivraa Pro for European jewellers: €12.99/month.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "39.99",
          priceCurrency: "AED",
          name: "Pro Plan — UAE",
          description:
            "Orivraa Pro for UAE jewellery shops: AED 39.99/month.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          name: "Enterprise Plan",
          description:
            "Custom pricing for large jewellery businesses — unlimited everything, lowest commission, dedicated account manager, API access, white-label option, and multi-branch support.",
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
      featureList: [
        "Inventory management by weight & purity",
        "Digital catalogue creation",
        "Multi-currency pricing",
        "Built-in customer chat & RFQ",
        "Sales analytics dashboard",
        "AI product descriptions",
        "GST/VAT tax compliance",
        "Barcode/SKU support",
        "Multi-branch management",
        "International marketplace",
        "Mobile POS (Point of Sale)",
        "7-Day Live Gold Rate Trends",
        "Desktop & mobile app",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is the best software for jewellery shops?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Orivraa is the best jewellery shop software for modern jewellers in 2026. Free plan available (up to 15 products). Pro plans start at ₹299/month for India, NPR 399/month for Nepal, £9.99/month for UK, $12.99/month for USA, €12.99/month for EU, and AED 39.99/month for UAE. Features include inventory management by weight and purity, digital catalogues, multi-currency pricing, built-in customer chat, sales analytics, and AI-powered tools. Trusted by jewellers across Nepal, India, UAE, UK, and USA.",
          },
        },
        {
          "@type": "Question",
          name: "Is there free software for gold shops?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa offers a completely free plan for gold shops that includes inventory management for up to 15 products, weight and purity tracking, digital catalogue creation, customer messaging, and basic analytics. No credit card is required to get started. Upgrade to Pro for unlimited products and advanced features with live local pricing shown by country.",
          },
        },
        {
          "@type": "Question",
          name: "How does Orivraa compare to Zoho, Marg ERP, and Vyapar for jewellery?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Orivraa is purpose-built for jewellery businesses, unlike general-purpose tools like Zoho (starting at ₹749/month) or Vyapar (₹699–₹4,099/year). Orivraa Pro costs ₹299/month (₹3,588/year) for India — cheaper than Online Munim (₹7,670/year), Marg ERP (₹8,100–₹10,300/year), and Nebu Jewellery (₹3,692/year). Key advantages: (1) Free plan always available — Zoho, Marg, and Online Munim charge from day one, (2) Cloud-based with mobile app — Marg ERP is Windows desktop only, (3) Built-in jewellery marketplace with international buyers, (4) Weight and purity tracking for gold/silver/diamond, (5) Digital catalogues shareable on WhatsApp, (6) AI-powered product descriptions optimised for jewellery.",
          },
        },
        {
          "@type": "Question",
          name: "Is Orivraa cheaper than Online Munim and Marg ERP for jewellery businesses?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa is cheaper than both Online Munim and Marg ERP. Orivraa Pro for India costs ₹299/month (₹3,588/year). Online Munim starts at ₹7,670/year. Marg ERP Jewellery starts at ₹8,100–₹10,300/year. Orivraa also has a permanently free plan for up to 15 products — something Online Munim and Marg ERP do not offer. Orivraa additionally works on web, mobile (Android and iOS), and Windows/macOS desktop, whereas Marg ERP is Windows-only. UK pricing is £9.99/month, UAE is AED 39.99/month, and US pricing is $12.99/month.",
          },
        },
        {
          "@type": "Question",
          name: "Can Orivraa manage gold inventory by weight and purity?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa's inventory system is specifically designed for precious metals. You can track products by weight (grams), purity (24K, 22K, 18K, etc.), making charges, and stone weight. The system supports gold, silver, diamond, platinum, and gemstone inventory with real-time stock tracking.",
          },
        },
        {
          "@type": "Question",
          name: "Does Orivraa support GST and VAT for jewellery billing?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa handles tax compliance for jewellery businesses in multiple countries: GST for India (3% on gold), VAT for Nepal (13%), VAT for UAE (5%), VAT for UK (20%), and Sales Tax for USA. Tax rates are automatically applied based on the seller's and buyer's location.",
          },
        },
        {
          "@type": "Question",
          name: "Which countries does Orivraa support?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Orivraa is available for jewellery businesses in Nepal, India, UAE (Dubai), United Kingdom, United States, and Europe. The platform supports local currencies (NPR, INR, AED, GBP, USD, EUR), local payment methods, and country-specific tax compliance.",
          },
        },
      ],
    },
  ],
};

/* ────────────────────────────────────────────────────────────── */
/*  PAGE DATA                                                     */
/* ────────────────────────────────────────────────────────────── */

const CORE_FEATURES = [
  {
    title: "Mobile POS & Sales",
    desc: "Complete walk-in sales from your smartphone. Share receipts instantly via WhatsApp. Auto-syncs with inventory and reflects in your analytics immediately.",
    icon: Smartphone,
  },
  {
    title: "Live Market Gold Trends",
    desc: "Built-in 7-day live gold rate tracking for multiple currencies. Lock in prices accurately during sales and confidently justify pricing to customers.",
    icon: TrendingUp,
  },
  {
    title: "Inventory Management",
    desc: "Track gold, silver, diamond & gemstone inventory by weight, purity (24K/22K/18K), and making charges. Real-time stock levels with low-stock alerts. Bulk upload via CSV.",
    icon: Package,
  },
  {
    title: "Digital Catalogues",
    desc: "Create beautiful product catalogues with photos, prices, and descriptions. Share directly on WhatsApp, Instagram, email, or embed on your website. Auto-syncs with inventory.",
    icon: BookOpen,
  },
  {
    title: "Billing & Invoicing",
    desc: "Generate professional invoices with automatic tax calculation (GST, VAT). Support for making charges, stone charges, old gold exchange, and custom line items.",
    icon: Receipt,
  },
  {
    title: "Customer Chat & RFQ",
    desc: "Built-in messaging to chat with buyers in real-time. Receive Request for Quotes (RFQ) for custom orders and respond with quotes directly from your dashboard.",
    icon: MessageSquare,
  },
  {
    title: "Sales Analytics",
    desc: "Track revenue, popular products, customer demographics, conversion rates, and growth trends. Download reports for accounting and business planning.",
    icon: BarChart3,
  },
  {
    title: "AI-Powered Tools",
    desc: "Auto-generate SEO-optimised product descriptions, get pricing suggestions based on market rates, and use smart tagging to boost discoverability on the marketplace.",
    icon: Sparkles,
  },
  {
    title: "Multi-Currency Pricing",
    desc: "Set prices in NPR, INR, AED, GBP, USD, or EUR. Automatic currency conversion for international buyers. Country-specific tax compliance handled automatically.",
    icon: Globe,
  },
  {
    title: "Shop Dashboard",
    desc: "One clean dashboard to manage everything — products, orders, messages, analytics, catalogues, and settings. No technical knowledge required. Works on desktop and mobile.",
    icon: LayoutDashboard,
  },
  {
    title: "Marketplace Listing",
    desc: `Your products are automatically listed on Orivraa's marketplace, visible to buyers across ${BUYER_COUNTRY_COUNT} countries. Priority listing available for Pro sellers.`,
    icon: Store,
  },
  {
    title: "Karigar Management",
    desc: "Track custom orders through manufacturing. Manage karigar ledgers, track gold issued, and monitor delivery timelines for custom pieces.",
    icon: Users,
  },
];

const COMPARISON = [
  {
    feature: "Starting Price",
    orivraa: "Free + local monthly plans",
    zoho: "Per-user monthly",
    marg: "Licence + AMC",
    vyapar: "Paid annual plans",
  },
  {
    feature: "Built for Jewellery",
    orivraa: "✓ Purpose-built",
    zoho: "✗ Generic CRM",
    marg: "✓ Jewellery module",
    vyapar: "✗ General billing",
  },
  {
    feature: "Online Marketplace",
    orivraa: `✓ Built-in (${BUYER_COUNTRY_COUNT} buyer countries)`,
    zoho: "✗ No marketplace",
    marg: "✗ No marketplace",
    vyapar: "✗ No marketplace",
  },
  {
    feature: "Weight & Purity Tracking",
    orivraa: "✓ Full support",
    zoho: "✗ Manual setup",
    marg: "✓ Full support",
    vyapar: "✗ Basic only",
  },
  {
    feature: "Digital Catalogues",
    orivraa: "✓ Auto-generated",
    zoho: "✗ Not available",
    marg: "✗ Not available",
    vyapar: "✗ Not available",
  },
  {
    feature: "Customer Chat & RFQ",
    orivraa: "✓ Built-in",
    zoho: "✓ Paid add-on",
    marg: "✗ Not available",
    vyapar: "✗ Not available",
  },
  {
    feature: "AI Product Descriptions",
    orivraa: "✓ Included (Pro)",
    zoho: "✗ Not available",
    marg: "✗ Not available",
    vyapar: "✗ Not available",
  },
  {
    feature: "Multi-Currency Support",
    orivraa: "✓ 6 currencies",
    zoho: "✓ Multi-currency",
    marg: "✗ INR only",
    vyapar: "✗ INR only",
  },
  {
    feature: "International Tax (GST/VAT)",
    orivraa: "✓ Auto per country",
    zoho: "✓ GST module",
    marg: "✓ GST only",
    vyapar: "✓ GST only",
  },
  {
    feature: "Mobile App",
    orivraa: "✓ Web + Desktop app",
    zoho: "✓ Mobile app",
    marg: "✓ Mobile app",
    vyapar: "✓ Mobile app",
  },
  {
    feature: "Cloud-Based",
    orivraa: "✓ Fully cloud",
    zoho: "✓ Cloud",
    marg: "✗ Desktop + cloud",
    vyapar: "✓ Cloud",
  },
  {
    feature: "Setup Time",
    orivraa: "< 5 minutes",
    zoho: "1–2 hours",
    marg: "Professional setup",
    vyapar: "30 minutes",
  },
];

const USE_CASES = [
  {
    title: "Retail Jewellery Shops",
    desc: "Manage walk-in and online sales from a single dashboard. Track inventory across gold, silver, and diamond categories. Generate GST-compliant invoices.",
    icon: Store,
  },
  {
    title: "Wholesale Gold Dealers",
    desc: "Handle bulk orders, manage B2B pricing, track large inventories by weight and purity. Multi-branch support for chain operations.",
    icon: Scale,
  },
  {
    title: "Custom Jewellery Designers",
    desc: "Accept custom design requests via RFQ, share design concepts with clients, and track order progress from design to delivery.",
    icon: Palette,
  },
  {
    title: "Online Jewellery Sellers",
    desc: `List products on Orivraa's international marketplace. Create digital catalogues for social media. Reach buyers in ${BUYER_COUNTRY_COUNT} countries.`,
    icon: Globe,
  },
];

const FAQS = [
  {
    q: "What is the best software for jewellery shops?",
    a: "Orivraa is a comprehensive cloud-based jewellery shop software that includes inventory management, billing, digital catalogues, customer chat, and analytics — all starting free. Unlike traditional ERP solutions that cost ₹15,000–₹80,000/year, Orivraa offers a free plan with the option to upgrade as your business grows. It's purpose-built for jewellery businesses and includes a built-in marketplace to reach international buyers.",
  },
  {
    q: "Is Orivraa free for jewellery shops?",
    a: "Yes. Orivraa has a free plan for jewellery shops with marketplace access, catalogues, customer messaging, and core business tools. No credit card is required. Paid plans use local country pricing and unlock higher limits, billing workflows, advanced reports, and priority features as your business grows.",
  },
  {
    q: "How does Orivraa compare to Zoho for jewellery businesses?",
    a: "While Zoho is a general-purpose CRM (starting at ₹749/month), Orivraa is purpose-built for jewellery. Key differences: Orivraa has a free plan (Zoho doesn't for business use), Orivraa includes weight/purity tracking designed for gold and diamonds, Orivraa has a built-in international marketplace (Zoho has no marketplace), and Orivraa offers AI-powered jewellery-specific product descriptions. If you specifically need jewellery shop management, Orivraa is the more specialised and affordable choice.",
  },
  {
    q: "Can I manage gold inventory by weight and purity?",
    a: "Absolutely. Orivraa's inventory system tracks products by weight (grams/tola), purity (24K, 22K, 18K, 14K), making charges, stone weight, and HUID/hallmark numbers. You can categorise inventory across gold, silver, diamond, platinum, and gemstone categories with real-time stock updates.",
  },
  {
    q: "Does Orivraa support GST billing for jewellery?",
    a: "Yes. Orivraa handles GST compliance for Indian jewellers (3% on gold, 5% on making charges), VAT for Nepal (13%), UAE (5%), and UK (20%), and varying Sales Tax for USA. Tax is automatically calculated based on the seller and buyer locations.",
  },
  {
    q: "Can I use Orivraa for multiple branches?",
    a: "Yes. Pro and Enterprise plans support multi-branch management. You can manage inventory, orders, and analytics across all your locations from a single dashboard with branch-level reporting.",
  },
  {
    q: "Is Orivraa cloud-based or desktop?",
    a: "Orivraa is primarily cloud-based — access it from any browser. We also offer a free desktop app (Windows/macOS) for offline access. Your data syncs automatically between cloud and desktop.",
  },
  {
    q: "How is Orivraa different from Marg ERP and Jwelly ERP?",
    a: "Marg ERP and Jwelly ERP are traditional desktop ERPs that require professional installation and cost ₹15,000–₹80,000+. Orivraa is cloud-based, starts free, requires zero setup, and includes unique features like a built-in international marketplace, digital catalogues shareable on WhatsApp, and AI-powered product descriptions. Orivraa is ideal for shops wanting a modern, easy-to-use platform without heavy upfront costs.",
  },
  {
    q: "Can I sell jewellery internationally using Orivraa?",
    a: "Yes. Every product you list is visible to buyers in Nepal, India, UAE, UK, USA, and Europe. Orivraa handles multi-currency pricing (NPR, INR, AED, GBP, USD, EUR) and international tax compliance automatically. You can also create digital catalogues to share with international buyers on WhatsApp or social media.",
  },
  {
    q: "Does Orivraa have karigar (artisan) management?",
    a: "Orivraa supports custom order management where you can track orders from request through manufacturing to delivery. While it doesn't have a dedicated karigar ledger like traditional ERPs, the RFQ and order tracking system covers the workflow for jewellery manufacturing and custom designs.",
  },
];

/* ────────────────────────────────────────────────────────────── */
/*  PAGE COMPONENT                                                */
/* ────────────────────────────────────────────────────────────── */

export default function JewelleryShopSoftwarePage() {
  const { features: platformFeatures } = usePlatformFeatures();
  const customerFlowEnabled = platformFeatures.customerFlowEnabled;

  const [plans, setPlans] = useState<PlanFromAPI[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const country = usePreferencesStore((s) => s.country);
  const detectedCountry = usePreferencesStore((s) => s.detectedCountry);
  const pricingCountry =
    detectedCountry && COUNTRIES[detectedCountry] ? detectedCountry : country;

  const fetchPlans = useCallback(async (market: CountryCode) => {
    try {
      setLoadingPlans(true);
      const res = await subscriptionPlansApi.getAvailable(market);
      const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setPlans(data);
    } catch {
      setPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans(pricingCountry);
  }, [fetchPlans, pricingCountry]);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.sortOrder - b.sortOrder),
    [plans],
  );

  const freePlan = sortedPlans.find((plan) => plan.name === "FREE");
  const proPlan = sortedPlans.find((plan) => plan.name === "PRO");
  const proPlusPlan = sortedPlans.find((plan) => plan.name === "PRO_PLUS");
  const pricingMarketLabel = COUNTRIES[pricingCountry]?.name ?? pricingCountry;
  const liveCurrency =
    freePlan?.currency ??
    proPlan?.currency ??
    proPlusPlan?.currency ??
    (COUNTRIES[pricingCountry]?.defaultCurrency as CurrencyCode) ??
    "USD";
  const liveProPrice = proPlan
    ? formatPrice(proPlan.monthlyPrice, proPlan.currency)
    : null;
  const liveProPlusPrice = proPlusPlan
    ? formatPrice(proPlusPlan.monthlyPrice, proPlusPlan.currency)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />

      <Header />

      <main className="flex-1">
        {/* ── Hero ────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 pt-24 pb-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100/40 via-transparent to-transparent dark:from-amber-900/10" />
          <div className="relative max-w-5xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              <T>Free plan available</T>
              <span className="text-green-500 dark:text-green-300">•</span>
              {liveProPrice ? (
                <span>
                  {pricingMarketLabel} <T>Pro from</T> {liveProPrice}
                  <T>/month</T>
                </span>
              ) : (
                <T>Live local pricing by country</T>
              )}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
              <T>
                The Best Jewellery Shop Software for Gold, Silver and Diamond
                Businesses
              </T>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              <T>
                Free cloud-based software to manage your jewellery shop —
                inventory by weight and purity, billing, digital catalogues,
                customer chat, and analytics. Trusted by jewellers across
                Nepal, India, Dubai, USA and UK. Better than Zoho, Marg ERP and
                Vyapar. Start free, then upgrade with live local pricing that
                adapts to your market.
              </T>
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-semibold text-lg transition-colors shadow-lg shadow-amber-500/25"
              >
                <T>Start Free — No Credit Card</T>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full font-semibold text-lg border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 transition-colors"
              >
                <T>View Pricing Plans</T>
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              <T>No setup fees · No contracts · Cancel anytime</T>
              {liveProPrice && (
                <>
                  <span className="mx-2">·</span>
                  <T>Showing live</T> {pricingMarketLabel} <T>pricing in</T>{" "}
                  {currencySymbol(liveCurrency)} ({liveCurrency})
                </>
              )}
            </p>
          </div>
        </section>

        {/* ── Live Pricing Snapshot ───────────────────────── */}
        <section className="bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-4 py-10">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-8">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
                  <T>Live pricing snapshot</T>
                </p>
                <h2 className="mt-2 text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  <T>Current plans for</T> {pricingMarketLabel}
                </h2>
              </div>

              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
              >
                <T>Open full pricing page</T>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {loadingPlans ? (
              <div className="flex items-center justify-center rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-950/70 py-14">
                <div className="inline-flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                  <T>Loading live regional pricing…</T>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-emerald-600 shadow-sm dark:bg-emerald-900/40 dark:text-emerald-300">
                    <Store className="h-5 w-5" />
                  </div>
                  <p className="mt-5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    <T>Free plan</T>
                  </p>
                  <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {freePlan ? formatPrice(freePlan.monthlyPrice, freePlan.currency) : <T>Free</T>}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    <T>{customerFlowEnabled ? "Marketplace access, catalogues, messaging, and core shop tools." : "Catalogues, messaging, and core shop tools."}</T>
                  </p>
                </div>

                <div className="rounded-3xl border border-amber-300 bg-white p-6 shadow-sm dark:border-amber-700 dark:bg-gray-950">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                    <Crown className="h-5 w-5" />
                  </div>
                  <p className="mt-5 text-sm font-semibold text-amber-700 dark:text-amber-300">
                    {proPlan?.displayName.replace(/\s*\(.*?\)\s*$/, "") ?? "Pro"}
                  </p>
                  <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {proPlan ? formatPrice(proPlan.monthlyPrice, proPlan.currency) : <T>Unavailable</T>}
                    {proPlan && <span className="ml-1 text-base font-medium text-gray-500 dark:text-gray-400"><T>/month</T></span>}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {proPlan ? getListingLimitText(proPlan) : "Live Pro pricing is not available for this market yet."}
                  </p>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <p className="mt-5 text-sm font-semibold text-violet-700 dark:text-violet-300">
                    {proPlusPlan?.displayName.replace(/\s*\(.*?\)\s*$/, "") ?? "Pro+"}
                  </p>
                  <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {proPlusPlan ? formatPrice(proPlusPlan.monthlyPrice, proPlusPlan.currency) : <T>Unavailable</T>}
                    {proPlusPlan && <span className="ml-1 text-base font-medium text-gray-500 dark:text-gray-400"><T>/month</T></span>}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {proPlusPlan?.includesAi
                      ? `${proPlusPlan.monthlyAiCredits.toLocaleString()} AI credits/month with advanced automation.`
                      : "Advanced automation, analytics, and higher limits for growing shops."}
                  </p>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
                    <Globe className="h-5 w-5" />
                  </div>
                  <p className="mt-5 text-sm font-semibold text-sky-700 dark:text-sky-300">
                    <T>Marketplace reach</T>
                  </p>
                  <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {BUYER_COUNTRY_COUNT}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    <T>Buyer countries actively browsing Orivraa product listings and enquiries.</T>
                  </p>
                </div>
              </div>
            )}

            <div className="mt-5 inline-flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-amber-500" />
                <T>Final billing is verified against your shop country.</T>
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-amber-500" />
                <T>Annual plans and full feature comparisons stay on the pricing page.</T>
              </span>
            </div>
          </div>
        </section>

        {/* ── Mobile POS Integration ───────────────────── */}
        <MobilePosSpotlight />

        {/* ── Core Features ───────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              <T>Everything Your Jewellery Shop Needs</T>
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              <T>
                Comprehensive jewellery shop management software with features
                designed specifically for gold, silver, and diamond businesses
              </T>
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CORE_FEATURES.filter(f => customerFlowEnabled || f.title !== "Marketplace Listing").map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-lg hover:shadow-amber-500/5 transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  <T>{f.title}</T>
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  <T>{f.desc}</T>
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Comparison Table ─────────────────────────────── */}
        <section className="bg-white dark:bg-gray-900/50 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-4 py-20">
            <div className="text-center mb-14">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                <T>Orivraa vs Other Jewellery Software</T>
              </h2>
              <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                <T>
                  See how Orivraa compares to Zoho, Marg ERP, and Vyapar for
                  jewellery shop management
                </T>
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">
                      <T>Feature</T>
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 rounded-t-lg min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <Crown className="h-4 w-4" />
                        Orivraa
                      </div>
                    </th>
                    <th className="text-center py-4 px-4 font-medium text-gray-600 dark:text-gray-400 min-w-[120px]">
                      Zoho
                    </th>
                    <th className="text-center py-4 px-4 font-medium text-gray-600 dark:text-gray-400 min-w-[120px]">
                      Marg ERP
                    </th>
                    <th className="text-center py-4 px-4 font-medium text-gray-600 dark:text-gray-400 min-w-[120px]">
                      Vyapar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.filter(row => customerFlowEnabled || row.feature !== "Online Marketplace").map((row, i) => (
                    <tr
                      key={row.feature}
                      className={`border-b border-gray-100 dark:border-gray-800 ${
                        i % 2 === 0 ? "bg-gray-50/50 dark:bg-gray-900/50" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                        <T>{row.feature}</T>
                      </td>
                      <td className="py-3 px-4 text-center bg-amber-50/50 dark:bg-amber-900/5 font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center justify-center gap-2">
                          <T>{row.orivraa.split(' (')[0]}</T>
                          {row.orivraa.includes('(Pro)') && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
                              Pro
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">
                        <T>{row.zoho}</T>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">
                        <T>{row.marg}</T>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">
                        <T>{row.vyapar}</T>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-center mt-8">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-semibold transition-colors shadow-lg shadow-amber-500/25"
              >
                <T>See Full Pricing Details</T>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <ComparisonClusterLinks
          title="Looking at CRM or billing software too?"
          description="These pages separate two different buying intents: generic CRM tools for customer management, and Indian billing software for GST-ready operations."
        />

        {/* ── Use Cases ──────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              <T>Built for Every Type of Jewellery Business</T>
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              <T>
                Whether you are a retail shop, wholesale dealer, or custom
                designer — Orivraa adapts to your workflow
              </T>
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {USE_CASES.filter(uc => customerFlowEnabled || uc.title !== "Online Jewellery Sellers").map((uc) => (
              <div
                key={uc.title}
                className="flex gap-5 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <uc.icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    <T>{uc.title}</T>
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <T>{uc.desc}</T>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works ────────────────────────────────── */}
        <section className="bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700">
          <div className="max-w-5xl mx-auto px-4 py-16">
            <h2 className="text-2xl lg:text-3xl font-bold text-white text-center mb-10">
              <T>Get Started in Under 5 Minutes</T>
            </h2>
            <div className="grid md:grid-cols-4 gap-8 text-center">
              {[
                {
                  step: "1",
                  title: "Sign Up Free",
                  desc: "Create your account in 2 minutes. No credit card needed.",
                },
                {
                  step: "2",
                  title: "Shop Verification (KYC)",
                  desc: "Verify your shop details securely to get started.",
                },
                {
                  step: "3",
                  title: "Setup & Add Products",
                  desc: "Configure tax & banking, upload photos, set weights.",
                },
                {
                  step: "4",
                  title: "Start Selling",
                  desc: "Manage orders and create tax-compliant bills.",
                },
              ].map((s) => (
                <div key={s.step}>
                  <div className="w-10 h-10 rounded-full bg-white/20 text-white font-bold flex items-center justify-center mx-auto mb-3 text-lg">
                    {s.step}
                  </div>
                  <h3 className="text-white font-semibold">
                    <T>{s.title}</T>
                  </h3>
                  <p className="text-amber-100 text-sm mt-1">
                    <T>{s.desc}</T>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why Jewellers Choose Orivraa ─────────────────── */}
        <section className="max-w-5xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              <T>Why Smart Jewellers Choose Orivraa</T>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Zap,
                text: "Free to start — no hidden fees",
              },
              {
                icon: Cloud,
                text: "Cloud-based — access from anywhere",
              },
              {
                icon: Monitor,
                text: "Desktop app for offline access",
              },
              {
                icon: Scale,
                text: "Weight & purity tracking for precious metals",
              },
              {
                icon: Globe,
                text: `International marketplace (${BUYER_COUNTRY_COUNT} countries)`,
              },
              {
                icon: Sparkles,
                text: "AI-powered product descriptions",
              },
              {
                icon: ShieldCheck,
                text: "GST, VAT & Sales Tax compliance",
              },
              {
                icon: BookOpen,
                text: "Digital catalogues for WhatsApp & social",
              },
              {
                icon: TrendingUp,
                text: "Real-time analytics & reporting",
              },
              {
                icon: MessageSquare,
                text: "Built-in customer chat & RFQ",
              },
              {
                icon: Users,
                text: "Dedicated support for Pro sellers",
              },
              {
                icon: Smartphone,
                text: "Works beautifully on mobile",
              },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-900/50 transition-colors"
              >
                <item.icon className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  <T>{item.text}</T>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ (SEO-critical) ───────────────────────────── */}
        <section className="bg-white dark:bg-gray-900/50 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-3xl mx-auto px-4 py-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                <T>Frequently Asked Questions About Jewellery Shop Software</T>
              </h2>
            </div>
            <div className="space-y-3">
              {FAQS.filter(faq => customerFlowEnabled || (!faq.q.includes("internationally") && !faq.a.includes("marketplace"))).map((faq, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 overflow-hidden"
                  {...(i === 0 ? { open: true } : {})}
                >
                  <summary className="flex items-center justify-between cursor-pointer px-6 py-4 font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                    <T>{faq.q}</T>
                    <span className="ml-4 text-gray-400 group-open:rotate-180 transition-transform">
                      ▾
                    </span>
                  </summary>
                  <div className="px-6 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <T>{faq.a}</T>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="p-10 lg:p-14 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 border border-gray-700">
            <Store className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl lg:text-3xl font-bold text-white">
              <T>Ready to Modernise Your Jewellery Shop?</T>
            </h2>
            <p className="mt-3 text-gray-400 max-w-lg mx-auto">
              <T>
                Jewellers across Nepal, India, Dubai, USA and UK use Orivraa to
                manage inventory, reach buyers, and grow sales. Free to start —
                no credit card, no contracts.
              </T>
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-semibold text-lg transition-colors shadow-lg shadow-amber-500/25"
              >
                <T>Start Free Today</T>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/seller-guide"
                className="inline-flex items-center gap-2 px-8 py-3.5 text-white rounded-full font-semibold border border-gray-600 hover:border-amber-500 transition-colors"
              >
                <T>Read Seller Guide</T>
              </Link>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              <T>
                Free plan includes marketplace listing, customer chat, digital
                catalogues, and analytics.
              </T>
            </p>
          </div>
        </section>
      </main>

      <DynamicFooter />
    </div>
  );
}
