import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { BRAND } from "@/config/brand";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Cloud,
  Crown,
  Globe,
  LayoutDashboard,
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
          priceCurrency: "USD",
          name: "Free Plan",
          description:
            "Free jewellery shop software — list up to 15 products, manage inventory, accept orders. No credit card required.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "12.99",
          priceCurrency: "USD",
          name: "Pro Plan",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "12.99",
            priceCurrency: "USD",
            billingDuration: "P1M",
            unitText: "per month",
          },
          description:
            "Full CRM suite — unlimited products, inventory management, invoicing, customer management, bulk upload, advanced analytics, custom branding, and priority support. AI credits at $0.06/credit.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "24.99",
          priceCurrency: "USD",
          name: "Pro+ Plan (Most Popular)",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "24.99",
            priceCurrency: "USD",
            billingDuration: "P1M",
            unitText: "per month",
          },
          description:
            "Everything in Pro plus AI-powered design generation, smart recommendations, price optimization, demand forecasting, and monthly AI credits included.",
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
            text: "Orivraa is the best free jewellery shop software in 2026. It offers inventory management by weight and purity, digital catalogues, multi-currency pricing, built-in customer chat, sales analytics, and AI-powered tools. Unlike traditional ERP solutions that cost ₹15,000–₹80,000/year, Orivraa starts free and scales with your business. It's trusted by 2,000+ jewellers across Nepal, India, UAE, UK, and USA.",
          },
        },
        {
          "@type": "Question",
          name: "Is there free software for gold shops?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa offers a completely free plan for gold shops that includes inventory management for up to 15 products, weight and purity tracking, digital catalogue creation, customer messaging, and basic analytics. No credit card is required to get started. Upgrade to Pro for unlimited products and advanced features like AI descriptions and priority listing.",
          },
        },
        {
          "@type": "Question",
          name: "How does Orivraa compare to Zoho, Marg ERP, and Vyapar for jewellery?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Orivraa is purpose-built for jewellery businesses, unlike general-purpose tools like Zoho (starting at ₹749/month) or Vyapar. Key advantages: (1) Free plan available — Zoho and Marg charge from day one, (2) Built-in jewellery marketplace with international buyers, (3) Weight and purity tracking designed for gold/silver/diamond, (4) Digital catalogues shareable on WhatsApp and social media, (5) Multi-currency pricing for international sales, (6) AI-powered product descriptions optimised for jewellery.",
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
    desc: "Your products are automatically listed on Orivraa's marketplace, visible to thousands of buyers across 6+ countries. Priority listing available for Pro sellers.",
    icon: Store,
  },
];

const COMPARISON = [
  {
    feature: "Starting Price",
    orivraa: "Free (₹0/mo)",
    zoho: "₹749/mo",
    marg: "₹15,000/yr",
    vyapar: "₹4,999/yr",
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
    orivraa: "✓ Built-in (6+ countries)",
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
    desc: "List products on Orivraa's international marketplace. Create digital catalogues for social media. Reach buyers in 6+ countries.",
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
    a: "Yes! Orivraa's Free plan includes inventory management for up to 15 products, digital catalogues, customer messaging, basic analytics, and marketplace listing. No credit card required. You only pay a small commission on sales made through the marketplace. Upgrade to Pro (starting ₹999/month) for unlimited products, AI tools, and priority listing.",
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

const STATS = [
  { value: "2,000+", label: "Active Jewellers" },
  { value: "6+", label: "Countries" },
  { value: "50,000+", label: "Products Listed" },
  { value: "₹0", label: "Starting Price" },
];

/* ────────────────────────────────────────────────────────────── */
/*  PAGE COMPONENT                                                */
/* ────────────────────────────────────────────────────────────── */

export default function JewelleryShopSoftwarePage() {
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
              Free Plan Available — No Credit Card Required
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
              The Best{" "}
              <span className="text-amber-600 dark:text-amber-400">
                Jewellery Shop Software
              </span>{" "}
              for Gold, Silver & Diamond Businesses
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Free cloud-based software to manage your jewellery shop —
              inventory by weight &amp; purity, billing, digital catalogues,
              customer chat, and analytics. Trusted by{" "}
              <strong>2,000+ jewellers</strong> across Nepal, India, Dubai, USA
              &amp; UK. Better than Zoho, Marg ERP &amp; Vyapar — and it starts{" "}
              <strong>free</strong>.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-semibold text-lg transition-colors shadow-lg shadow-amber-500/25"
              >
                Start Free — No Credit Card
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full font-semibold text-lg border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 transition-colors"
              >
                View Pricing Plans
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              No setup fees · No contracts · Cancel anytime
            </p>
          </div>
        </section>

        {/* ── Stats Bar ───────────────────────────────────── */}
        <section className="bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {s.value}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Core Features ───────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              Everything Your Jewellery Shop Needs
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Comprehensive jewellery shop management software with features
              designed specifically for gold, silver, and diamond businesses
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CORE_FEATURES.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-lg hover:shadow-amber-500/5 transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {f.desc}
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
                Orivraa vs Other Jewellery Software
              </h2>
              <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                See how Orivraa compares to Zoho, Marg ERP, and Vyapar for
                jewellery shop management
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">
                      Feature
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
                  {COMPARISON.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={`border-b border-gray-100 dark:border-gray-800 ${
                        i % 2 === 0 ? "bg-gray-50/50 dark:bg-gray-900/50" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                        {row.feature}
                      </td>
                      <td className="py-3 px-4 text-center bg-amber-50/50 dark:bg-amber-900/5 font-medium text-gray-900 dark:text-white">
                        {row.orivraa}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">
                        {row.zoho}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">
                        {row.marg}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">
                        {row.vyapar}
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
                See Full Pricing Details
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Use Cases ──────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Built for Every Type of Jewellery Business
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Whether you&apos;re a retail shop, wholesale dealer, or custom
              designer — Orivraa adapts to your workflow
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {USE_CASES.map((uc) => (
              <div
                key={uc.title}
                className="flex gap-5 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <uc.icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {uc.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {uc.desc}
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
              Get Started in Under 5 Minutes
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
                  title: "Set Up Shop",
                  desc: "Add your shop details, logo, and configure tax & banking.",
                },
                {
                  step: "3",
                  title: "Add Products",
                  desc: "Upload photos, set weight/purity, pricing, and descriptions.",
                },
                {
                  step: "4",
                  title: "Start Selling",
                  desc: "Go live on the marketplace and start receiving orders.",
                },
              ].map((s) => (
                <div key={s.step}>
                  <div className="w-10 h-10 rounded-full bg-white/20 text-white font-bold flex items-center justify-center mx-auto mb-3 text-lg">
                    {s.step}
                  </div>
                  <h3 className="text-white font-semibold">{s.title}</h3>
                  <p className="text-amber-100 text-sm mt-1">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why Jewellers Choose Orivraa ─────────────────── */}
        <section className="max-w-5xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Why 2,000+ Jewellers Choose Orivraa
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
                text: "International marketplace (6+ countries)",
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
                  {item.text}
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
                Frequently Asked Questions About Jewellery Shop Software
              </h2>
            </div>
            <div className="space-y-3">
              {FAQS.map((faq, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 overflow-hidden"
                  {...(i === 0 ? { open: true } : {})}
                >
                  <summary className="flex items-center justify-between cursor-pointer px-6 py-4 font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <span className="ml-4 text-gray-400 group-open:rotate-180 transition-transform">
                      ▾
                    </span>
                  </summary>
                  <div className="px-6 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {faq.a}
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
              Ready to Modernise Your Jewellery Shop?
            </h2>
            <p className="mt-3 text-gray-400 max-w-lg mx-auto">
              Join 2,000+ jewellers using {BRAND.name} to manage inventory,
              reach buyers, and grow sales. Free to start — no credit card, no
              contracts.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-semibold text-lg transition-colors shadow-lg shadow-amber-500/25"
              >
                Start Free Today
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/seller-guide"
                className="inline-flex items-center gap-2 px-8 py-3.5 text-white rounded-full font-semibold border border-gray-600 hover:border-amber-500 transition-colors"
              >
                Read Seller Guide
              </Link>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Free plan includes: 15 products · Marketplace listing · Customer
              chat · Digital catalogues · Analytics
            </p>
          </div>
        </section>
      </main>

      <DynamicFooter />
    </div>
  );
}
