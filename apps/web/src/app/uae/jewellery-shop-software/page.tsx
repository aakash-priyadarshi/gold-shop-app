import type { Metadata } from "next";
import Link from "next/link";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { FaqSection } from "@/components/ui/FaqSection";
import { T } from "@/components/ui/T";
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Building2,
  FileText,
  Languages,
  Weight,
  Wrench,
  ShoppingCart,
  CircleDollarSign,
  Zap,
  Smartphone,
} from "lucide-react";

export const metadata: Metadata = {
  title:
    "Jewellery Shop Software for UAE & Dubai | Cloud POS, FTA VAT & Arabic Invoicing | Orivraa",
  description:
    "Cloud jewellery management software purpose-built for UAE and Dubai gold shops. Handles FTA VAT 5% on worked jewellery, investment gold zero-rating, bilingual Arabic + English invoices, GCC wholesale, making charges, and AED billing. Pro from AED 39.99/month. Free plan available.",
  alternates: {
    canonical: "https://www.orivraa.com/uae/jewellery-shop-software",
  },
  openGraph: {
    title: "Jewellery Shop Software UAE & Dubai | Orivraa",
    description:
      "Cloud jewellery software for UAE gold shops. FTA VAT, Arabic invoices, investment gold zero-rating, GCC wholesale. Pro from AED 39.99/mo.",
    url: "https://www.orivraa.com/uae/jewellery-shop-software",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Orivraa",
      operatingSystem: "Web, iOS, Android, Windows, macOS",
      applicationCategory: "BusinessApplication",
      areaServed: { "@type": "Country", name: "United Arab Emirates" },
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "AED",
          description:
            "Orivraa Free plan for UAE jewellery shops — up to 15 products, no credit card.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "39.99",
          priceCurrency: "AED",
          description:
            "Orivraa Pro for UAE jewellery shops — AED 39.99/month or AED 399.99/year.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "49.99",
          priceCurrency: "AED",
          description:
            "Orivraa Pro+ for UAE jewellery shops — AED 49.99/month or AED 499.99/year.",
          url: "https://www.orivraa.com/pricing",
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Does Orivraa handle UAE FTA VAT for jewellery shops?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa supports FTA-compliant 5% VAT on worked jewellery and automatic zero-rating for investment-grade gold (99%+ purity bars and coins). All invoices include mandatory TRN, VAT amount, and bilingual Arabic + English text as required by FTA regulations.",
          },
        },
        {
          "@type": "Question",
          name: "What does Orivraa cost for Dubai and UAE gold shops?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Orivraa offers a free plan for small UAE gold shops (up to 15 products). Pro is AED 39.99/month (AED 399.99/year) and Pro+ is AED 49.99/month (AED 499.99/year). Compare that to Lightspeed or custom Tally TDL development — Orivraa is purpose-built for gold and jewellery at a fraction of the cost.",
          },
        },
        {
          "@type": "Question",
          name: "Is Orivraa better than using Tally with custom TDL for a Dubai gold shop?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Many Dubai Gold Souk traders use Tally with custom TDL — paying for expensive third-party developers to add making charges, wastage tracking, and gold rate lookups. This is fragile, breaks on Tally updates, and has no mobile POS. Orivraa has all of this built-in natively: making charges, wastage, live gold rates, Arabic invoices, investment gold zero-rating, and mobile POS — no custom development needed.",
          },
        },
        {
          "@type": "Question",
          name: "Does Orivraa generate bilingual Arabic + English invoices?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa generates FTA-compliant invoices with bilingual Arabic and English text, mandatory TRN (Tax Registration Number), VAT breakdown, and all required fields. This is a feature Lightspeed and Zoho Inventory do not natively support for the UAE market.",
          },
        },
        {
          "@type": "Question",
          name: "Does Orivraa handle investment gold zero-rating for UAE?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa automatically zero-rates qualifying investment gold (99%+ purity bars and coins) while applying 5% VAT to worked jewellery — exactly as UAE FTA regulations require. No manual tax overrides needed.",
          },
        },
      ],
    },
  ],
};

const FEATURES = [
  {
    icon: FileText,
    title: "FTA-Compliant VAT Invoicing",
    desc: "5% VAT on worked jewellery, automatic zero-rating for investment-grade gold (99%+ purity). Every invoice includes mandatory TRN, VAT breakdown, and bilingual Arabic + English text — fully FTA-compliant out of the box.",
  },
  {
    icon: Languages,
    title: "Bilingual Arabic + English Invoices",
    desc: "Unlike Lightspeed or Zoho, Orivraa natively generates invoices with Arabic and English text side by side. All item descriptions, amounts, and legal fields render correctly in RTL Arabic layout.",
  },
  {
    icon: Building2,
    title: "Built for the Gold Souk — Not Generic Retail",
    desc: "Weight × purity × live spot pricing, making charges, wastage tracking, stone deductions, multi-currency (AED/USD/INR), and wholesale B2B order management — exactly how Dubai gold traders price and sell.",
  },
];

const PAIN_POINTS = [
  {
    icon: Wrench,
    title: "No Custom Tally TDL Needed",
    desc: "Many Souk traders hack Tally with custom TDL to add making charges, wastage, and gold rate lookups. This is fragile — it breaks on Tally updates and depends on expensive third-party developers. Orivraa has all of this natively.",
  },
  {
    icon: Languages,
    title: "Bilingual Arabic Invoices — Built In",
    desc: "Lightspeed and Zoho Inventory don't support Arabic invoices natively. Orivraa generates FTA-compliant bilingual Arabic + English invoices with proper RTL layout, mandatory TRN, and VAT fields — no plugins needed.",
  },
  {
    icon: CircleDollarSign,
    title: "Investment Gold Zero-Rating Automatic",
    desc: "Generic retail tools don't distinguish between worked jewellery (5% VAT) and investment gold (0% VAT). Orivraa automatically applies the correct rate based on product classification — no manual overrides.",
  },
  {
    icon: ShoppingCart,
    title: "Wholesale & B2B Ready for GCC",
    desc: "Handle bulk GCC orders, multi-currency billing (AED/USD/INR), weight-based pricing, and B2B customer management. Built for gold traders who sell wholesale — not just retail counter sales.",
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Starting Price",
    orivraa: "Free + AED 39.99/mo",
    lightspeed: "AED 250+/mo",
    zoho: "AED 55+/mo per user",
    tally: "One-time + custom TDL",
  },
  {
    feature: "Built for Gold & Jewellery",
    orivraa: "✓ Purpose-built",
    lightspeed: "✗ Generic retail",
    zoho: "✗ Generic inventory",
    tally: "~ Only with custom TDL",
  },
  {
    feature: "Arabic Invoices",
    orivraa: "✓ Native bilingual",
    lightspeed: "✗ No",
    zoho: "✗ No",
    tally: "~ Limited",
  },
  {
    feature: "Investment Gold Zero-Rating",
    orivraa: "✓ Automatic",
    lightspeed: "✗ Manual",
    zoho: "✗ Manual",
    tally: "~ Via custom TDL",
  },
  {
    feature: "Making Charges & Wastage",
    orivraa: "✓ Built-in",
    lightspeed: "✗ No",
    zoho: "✗ No",
    tally: "~ Via custom TDL",
  },
  {
    feature: "Live Gold Rates",
    orivraa: "✓ Auto-updated",
    lightspeed: "✗ No",
    zoho: "✗ No",
    tally: "✗ Manual",
  },
  {
    feature: "Cloud / Mobile POS",
    orivraa: "✓ Any device",
    lightspeed: "✓ iPad app",
    zoho: "✗ No POS",
    tally: "✗ Desktop only",
  },
  {
    feature: "FTA VAT 201 Report",
    orivraa: "✓ Built-in",
    lightspeed: "Via integration",
    zoho: "Via integration",
    tally: "~ Via custom TDL",
  },
  {
    feature: "Multi-Currency (AED/USD/INR)",
    orivraa: "✓ Native",
    lightspeed: "✓ Supported",
    zoho: "✓ Supported",
    tally: "~ Limited",
  },
  {
    feature: "Free Plan",
    orivraa: "✓ Always free tier",
    lightspeed: "✗ No",
    zoho: "✗ Trial only",
    tally: "✗ No",
  },
];

const FAQS = [
  {
    q: "Does Orivraa handle UAE FTA VAT for gold and jewellery shops?",
    a: "Yes. Orivraa supports FTA-compliant 5% VAT on worked jewellery and automatic zero-rating for investment-grade gold (99%+ purity bars and coins). All invoices include mandatory TRN, VAT breakdown, and bilingual Arabic + English text. VAT 201 summary reports can be exported for FTA filing.",
  },
  {
    q: "What does Orivraa cost for UAE and Dubai gold shops?",
    a: "Orivraa offers a free plan for small UAE shops (up to 15 products). Pro is AED 39.99/month (AED 399.99/year) and Pro+ is AED 49.99/month (AED 499.99/year). No contracts, cancel anytime. Compare that to custom Tally TDL development or Lightspeed at AED 250+/month.",
  },
  {
    q: "Is Orivraa better than using Tally with custom TDL for a Dubai gold shop?",
    a: "Yes. Many Souk traders pay for expensive custom TDL development to make Tally handle making charges, wastage, and gold rate lookups. This custom code breaks on Tally updates, is expensive to maintain, and Tally has no mobile POS or cloud access. Orivraa has all of this built-in natively — plus Arabic invoices, investment gold zero-rating, and FTA reports — with no custom development needed.",
  },
  {
    q: "Does Orivraa generate bilingual Arabic + English invoices?",
    a: "Yes. Orivraa generates FTA-compliant invoices with bilingual Arabic + English text, proper RTL layout, mandatory TRN, and full VAT breakdown. Lightspeed and Zoho do not natively support Arabic invoicing.",
  },
  {
    q: "Can I use Orivraa on my phone at my Gold Souk stall?",
    a: "Yes. Orivraa works on any smartphone, tablet, or computer. For smaller stalls in the Gold Souk, you can run the full POS from your Android or iPhone — bill customers, check live gold rates, and share invoices via WhatsApp. For more details, see our mobile POS page at /jewellery-pos-software.",
  },
  {
    q: "Does Orivraa support wholesale and B2B for GCC gold traders?",
    a: "Yes. Orivraa handles bulk orders, multi-currency billing (AED/USD/INR), weight-based pricing, B2B customer management, and wholesale invoice templates. Built for gold traders who sell wholesale across the GCC, not just retail counter sales.",
  },
];

export default function UAEJewelleryShopSoftwarePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 pt-24 pb-16">
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold mb-6">
              🇦🇪 <T>For UAE &amp; Dubai gold shops</T>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight mb-6">
              <T>Jewellery Shop Software</T>{" "}
              <span className="text-amber-600 dark:text-amber-400">
                <T>Built for the UAE</T>
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10">
              <T>
                Cloud jewellery management for Dubai Gold Souk traders and UAE
                jewellers. FTA VAT compliance, bilingual Arabic + English
                invoices, investment gold zero-rating, making charges, live gold
                rates, and AED billing. Pro from AED 39.99/month. Free to start.
              </T>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-base transition-colors shadow-lg shadow-amber-500/25"
              >
                <T>Start free — no credit card</T>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/jewellery-shop-software"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-semibold text-base border border-gray-200 dark:border-gray-700 hover:border-amber-300 transition-colors"
              >
                <T>See all features</T>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
              <T>Why UAE gold shops choose Orivraa</T>
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="bg-gray-50 dark:bg-gray-950 rounded-2xl p-6 border border-gray-100 dark:border-gray-800"
                  >
                    <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      <T>{f.title}</T>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      <T>{f.desc}</T>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why Gold Shops Are Switching */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3">
                <Zap className="h-4 w-4" />
                <T>Built for the Dubai Gold Souk</T>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                <T>Tally TDL &amp; generic retail software weren&apos;t built for gold trading</T>
              </h2>
              <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                <T>
                  Stop paying for expensive custom TDL development. Orivraa has
                  everything UAE gold and jewellery shops need — natively, in the
                  cloud, on any device.
                </T>
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {PAIN_POINTS.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5 text-red-500 dark:text-red-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      <T>{p.title}</T>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      <T>{p.desc}</T>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Mobile POS Mention */}
        <section className="py-12 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex flex-col sm:flex-row items-center gap-6 bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-900/10 dark:to-amber-900/10 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-900/30">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <Smartphone className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  <T>Mobile POS for Smaller Stalls</T>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  <T>
                    Running a smaller stall in the Gold Souk? Orivraa works on
                    your smartphone — bill customers, check live gold rates, and
                    share invoices via WhatsApp. No counter PC needed.
                  </T>{" "}
                  <Link
                    href="/jewellery-pos-software"
                    className="text-amber-600 dark:text-amber-400 font-medium hover:underline"
                  >
                    <T>See mobile POS features →</T>
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3">
                🇦🇪 <T>UAE Market Comparison</T>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                <T>Orivraa vs UAE Jewellery Software</T>
              </h2>
              <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-sm">
                <T>
                  Side-by-side comparison of Orivraa with software commonly used
                  by UAE gold and jewellery shops.
                </T>
              </p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-green-700 via-emerald-600 to-red-700 text-white">
                    <th className="px-4 py-3 text-left font-semibold">
                      <T>Feature</T>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold bg-amber-500/30 border-x border-amber-400/30">
                      ✨ Orivraa
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Lightspeed
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Zoho
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Tally + TDL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={
                        i % 2 === 0
                          ? "bg-gray-50 dark:bg-gray-950"
                          : "bg-white dark:bg-gray-900"
                      }
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        <T>{row.feature}</T>
                      </td>
                      <td className="px-4 py-3 text-amber-700 dark:text-amber-400 font-medium bg-amber-50/50 dark:bg-amber-900/10 border-x border-amber-100 dark:border-amber-900/30">
                        {row.orivraa}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {row.lightspeed}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {row.zoho}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {row.tally}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
              <T>
                Competitor pricing based on publicly listed rates as of 2026.
                Orivraa Pro is AED 39.99/month or AED 399.99/year.
              </T>
            </p>
          </div>
        </section>

        {/* UAE Tax Compliance */}
        <section className="py-16 lg:py-20 bg-amber-50 dark:bg-amber-900/10">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                🇦🇪 <T>UAE FTA Tax &amp; Compliance Checklist</T>
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                <T>
                  Orivraa handles UAE FTA VAT rules for gold and jewellery shops
                  — including investment gold zero-rating and bilingual Arabic
                  invoicing — all configured out of the box.
                </T>
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "FTA 5% VAT on worked jewellery",
                "Investment gold zero-rating (99%+ purity)",
                "Bilingual Arabic + English invoices",
                "Mandatory TRN on all invoices",
                "VAT 201 return summary report",
                "Share tax reports with accountant (1 click)",
                "Multi-currency billing (AED/USD/INR)",
                "Making charges & wastage tracking",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    <T>{item}</T>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Compare links */}
        <section className="py-12 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
              <T>Comparing with other UAE jewellery software?</T>
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/compare/orivraa-vs-tally"
                className="text-sm px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-amber-600 dark:text-amber-400 hover:border-amber-400 transition-colors"
              >
                <T>Orivraa vs Tally</T>
              </Link>
              <Link
                href="/compare/orivraa-vs-lightspeed"
                className="text-sm px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-amber-600 dark:text-amber-400 hover:border-amber-400 transition-colors"
              >
                <T>Orivraa vs Lightspeed</T>
              </Link>
              <Link
                href="/compare/orivraa-vs-zoho-inventory"
                className="text-sm px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-amber-600 dark:text-amber-400 hover:border-amber-400 transition-colors"
              >
                <T>Orivraa vs Zoho Inventory</T>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
              <T>Frequently Asked Questions</T>
            </h2>
            <div className="space-y-4">
              <FaqSection faqs={FAQS} />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-20 bg-gradient-to-r from-amber-600 to-yellow-500 text-white">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">
              <T>Start your free jewellery shop software trial</T>
            </h2>
            <p className="text-lg text-amber-100 mb-8">
              <T>
                No credit card. No setup fee. Works in the browser, on mobile,
                or on desktop. Built for UAE gold and jewellery shops.
              </T>
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white text-amber-700 rounded-xl font-semibold hover:bg-amber-50 transition-all shadow-lg"
            >
              <T>Get started free</T>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <DynamicFooter />
    </div>
  );
}
