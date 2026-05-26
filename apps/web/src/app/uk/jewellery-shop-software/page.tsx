import type { Metadata } from "next";
import Link from "next/link";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { T } from "@/components/ui/T";
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Gem,
  Receipt,
  Landmark,
  ShoppingBag,
  PoundSterling,
  Layers,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title:
    "Jewellery Shop Software for the UK | Cloud POS, VAT & Hallmark Billing | Orivraa",
  description:
    "Cloud jewellery shop management software purpose-built for UK jewellers. Handles HMRC VAT, MTD-ready reports, hallmark fields for UK assay offices (London, Birmingham, Sheffield, Edinburgh), investment gold zero-rating, and GBP billing. Pro from £9.99/month. Free plan available.",
  alternates: {
    canonical: "https://www.orivraa.com/uk/jewellery-shop-software",
  },
  openGraph: {
    title: "Jewellery Shop Software UK | Orivraa",
    description:
      "Cloud jewellery software for UK shops. HMRC VAT, MTD-ready, UK hallmark fields, investment gold zero-rating. Pro from £9.99/mo. Free plan.",
    url: "https://www.orivraa.com/uk/jewellery-shop-software",
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
      areaServed: { "@type": "Country", name: "United Kingdom" },
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "GBP",
          description:
            "Orivraa Free plan for UK jewellery shops — up to 15 products, no credit card.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "9.99",
          priceCurrency: "GBP",
          description:
            "Orivraa Pro for UK jewellery shops — £9.99/month or £99.99/year.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "12.99",
          priceCurrency: "GBP",
          description:
            "Orivraa Pro+ for UK jewellery shops — £12.99/month or £129.99/year.",
          url: "https://www.orivraa.com/pricing",
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Does Orivraa handle UK VAT for jewellery shops?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa supports HMRC UK VAT including the standard 20% rate for worked jewellery and zero-rating for investment gold meeting purity and weight thresholds. MTD-ready summary reports can be exported for Making Tax Digital quarterly submissions.",
          },
        },
        {
          "@type": "Question",
          name: "What does Orivraa cost for UK jewellery shops?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Orivraa offers a free plan for small UK jewellery shops (up to 15 products). The Pro plan is £9.99/month (£99.99/year) and Pro+ is £12.99/month (£129.99/year). Compare that to Lightspeed Retail at £69+/month — Orivraa is purpose-built for jewellery at a fraction of the cost.",
          },
        },
        {
          "@type": "Question",
          name: "How does Orivraa compare to Lightspeed for UK jewellery shops?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Lightspeed is a generic retail POS that treats jewellery like any other widget — it has no weight-based pricing, no purity fields, no hallmark tracking, and no investment gold VAT zero-rating. Orivraa is purpose-built for jewellery with all of these features. Plus, Orivraa Pro at £9.99/month is 85% cheaper than Lightspeed Retail (£69+/mo).",
          },
        },
        {
          "@type": "Question",
          name: "Does Orivraa support UK assay office hallmark fields?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa invoices include fields for hallmark reference, purity tier (9ct, 14ct, 18ct, 22ct, 24ct), and assay office (London, Birmingham, Sheffield, Edinburgh). All four UK assay offices are supported.",
          },
        },
        {
          "@type": "Question",
          name: "Can I switch from Lightspeed or Zoho to Orivraa?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa supports CSV and JSON data import to migrate customer, inventory, and product data from Lightspeed, Zoho, or any other system. Our team assists with onboarding — most UK shops are live the same day.",
          },
        },
      ],
    },
  ],
};

const FEATURES = [
  {
    icon: Gem,
    title: "Built for Jewellery, Not Generic Retail",
    desc: "Unlike Lightspeed or Zoho, Orivraa natively handles weight × purity pricing, hallmark fields, making charges, stone deductions, and live gold/silver rates — exactly how UK jewellers price their stock.",
  },
  {
    icon: Receipt,
    title: "HMRC VAT & MTD-Ready Reports",
    desc: "20% VAT on worked jewellery, zero-rated investment gold, and MTD-ready quarterly summary exports. Configure once, and every invoice auto-calculates correct UK VAT. Share tax reports with your accountant in one click.",
  },
  {
    icon: Landmark,
    title: "UK Assay Office Hallmark Tracking",
    desc: "Record hallmark references, purity (9ct to 24ct), and assay office origin (London, Birmingham, Sheffield, Edinburgh) on every invoice — fully compliant with UK hallmarking regulations.",
  },
];

const PAIN_POINTS = [
  {
    icon: ShoppingBag,
    title: "Built for Jewellery, Not Generic Widgets",
    desc: "Lightspeed treats a diamond ring the same as a can of beans — no weight, no purity, no hallmark fields. Orivraa is purpose-built for jewellery with weight × purity × live spot price on every line item.",
  },
  {
    icon: PoundSterling,
    title: "85% Cheaper Than Lightspeed Retail",
    desc: "Lightspeed Retail POS starts at £69/month. Orivraa Pro is £9.99/month (£99.99/year). Both are cloud-based, but only Orivraa is built for jewellery shops, not shoe shops.",
  },
  {
    icon: Layers,
    title: "Jewellery-Specific Inventory Zoho Can't Do",
    desc: "Zoho Inventory has no native fields for carat, clarity, cut, colour, or hallmark references. Orivraa tracks weight, purity, gemstone details, and assay office data natively — no custom fields to hack together.",
  },
  {
    icon: Zap,
    title: "No Sync Issues Like Lightspeed Users Report",
    desc: "Lightspeed users report cancelled orders that don't update inventory — causing ghost stock and mis-sold items. Orivraa's cloud-native architecture ensures real-time consistency across POS, web, and mobile.",
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Starting Price",
    orivraa: "Free + £9.99/mo",
    lightspeed: "£69+/mo",
    zoho: "£15+/mo per user",
  },
  {
    feature: "Built for Jewellery",
    orivraa: "✓ Purpose-built",
    lightspeed: "✗ Generic retail",
    zoho: "✗ Generic inventory",
  },
  {
    feature: "Weight × Purity Pricing",
    orivraa: "✓ Native",
    lightspeed: "✗ Not supported",
    zoho: "✗ Not supported",
  },
  {
    feature: "Live Gold/Silver Rates",
    orivraa: "✓ Auto-updated",
    lightspeed: "✗ No",
    zoho: "✗ No",
  },
  {
    feature: "Hallmark Fields (UK Assay)",
    orivraa: "✓ All 4 UK offices",
    lightspeed: "✗ No",
    zoho: "✗ No",
  },
  {
    feature: "Investment Gold Zero-Rating",
    orivraa: "✓ Automatic",
    lightspeed: "✗ Manual",
    zoho: "✗ Manual",
  },
  {
    feature: "HMRC MTD Reports",
    orivraa: "✓ Built-in",
    lightspeed: "Via integration",
    zoho: "Via integration",
  },
  {
    feature: "Mobile POS",
    orivraa: "✓ Any device",
    lightspeed: "✓ iPad app",
    zoho: "✗ No POS",
  },
  {
    feature: "Digital Catalogue & WhatsApp",
    orivraa: "✓ Built-in",
    lightspeed: "✗ No",
    zoho: "✗ No",
  },
  {
    feature: "Free Plan",
    orivraa: "✓ Always free tier",
    lightspeed: "✗ No",
    zoho: "✗ 14-day trial only",
  },
];

const FAQS = [
  {
    q: "Does Orivraa handle UK HMRC VAT for jewellery shops?",
    a: "Yes. Orivraa supports the standard 20% UK VAT on worked jewellery and automatic zero-rating for qualifying investment gold (bars and coins meeting purity thresholds). MTD-ready quarterly summary reports can be exported and shared with your accountant.",
  },
  {
    q: "What does Orivraa cost for UK jewellery shops?",
    a: "Orivraa offers a free plan for small UK shops (up to 15 products). Pro is £9.99/month (£99.99/year) and Pro+ is £12.99/month (£129.99/year). Compare that to Lightspeed Retail at £69+/month — Orivraa is purpose-built for jewellery at a fraction of the cost.",
  },
  {
    q: "How does Orivraa compare to Lightspeed for UK jewellery shops?",
    a: "Lightspeed is a horizontal retail POS designed for any shop — it has no weight × purity pricing, no hallmark tracking, no investment gold VAT zero-rating, and no live gold/silver spot rates. Orivraa is purpose-built for jewellery. Plus, Orivraa Pro (£9.99/mo) is 85% cheaper than Lightspeed Retail (£69+/mo). Lightspeed users also report inventory sync issues where cancelled orders don't update stock — Orivraa's cloud-native architecture prevents this.",
  },
  {
    q: "Does Orivraa support UK assay office hallmark fields?",
    a: "Yes. Orivraa invoices include fields for hallmark reference, purity tier (9ct, 14ct, 18ct, 22ct, 24ct), and assay office of origin — supporting all four UK assay offices: London, Birmingham, Sheffield, and Edinburgh.",
  },
  {
    q: "Can I switch from Lightspeed or Zoho Inventory to Orivraa?",
    a: "Yes. Orivraa supports CSV and JSON data import to migrate customer, inventory, and product data from Lightspeed, Zoho, or any other system. Our team assists with onboarding — most UK shops are live the same day. No proprietary hardware lock-in.",
  },
  {
    q: "Is Orivraa suitable for UK jewellers who sell investment gold?",
    a: "Yes. Orivraa automatically zero-rates qualifying investment gold (bars and coins meeting purity and weight thresholds) while applying 20% VAT to worked jewellery. No manual tax overrides needed — the system handles the distinction automatically based on product classification.",
  },
];

export default function UKJewelleryShopSoftwarePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 pt-24 pb-16">
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-semibold mb-6">
              🇬🇧 <T>For UK jewellery shops</T>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight mb-6">
              <T>Jewellery Shop Software</T>{" "}
              <span className="text-amber-600 dark:text-amber-400">
                <T>Built for the UK</T>
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10">
              <T>
                Cloud jewellery shop management for UK high-street jewellers.
                HMRC VAT, MTD-ready reports, UK assay office hallmark tracking,
                investment gold zero-rating, and GBP billing — all in one
                platform. Pro from £9.99/month. Free to start.
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
              <T>Why UK jewellers choose Orivraa</T>
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

        {/* Why Jewellers Are Switching */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3">
                <Zap className="h-4 w-4" />
                <T>Why jewellers are switching</T>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                <T>Generic retail software wasn&apos;t built for jewellery</T>
              </h2>
              <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                <T>
                  Lightspeed and Zoho treat a diamond ring the same as a pair of
                  trainers. Orivraa is the only cloud POS that understands how UK
                  jewellers actually price, hallmark, and sell their stock.
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

        {/* Comparison Table */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3">
                🇬🇧 <T>UK Market Comparison</T>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                <T>Orivraa vs UK Jewellery Software</T>
              </h2>
              <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-sm">
                <T>
                  Side-by-side comparison of Orivraa with popular retail
                  software used by UK jewellers.
                </T>
              </p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-800 via-blue-700 to-red-700 text-white">
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
                      Zoho Inventory
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
              <T>
                Competitor pricing based on publicly listed rates as of 2026.
                Orivraa Pro is £9.99/month or £99.99/year.
              </T>
            </p>
          </div>
        </section>

        {/* UK Tax Compliance */}
        <section className="py-16 lg:py-20 bg-amber-50 dark:bg-amber-900/10">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                🇬🇧 <T>UK Tax &amp; Compliance Checklist</T>
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                <T>
                  Orivraa helps UK jewellers stay compliant with HMRC VAT rules,
                  investment gold zero-rating, and hallmark regulations — all
                  configured out of the box.
                </T>
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "HMRC VAT at 20% on worked jewellery",
                "Investment gold zero-rating (automatic)",
                "MTD-ready quarterly summary reports",
                "UK assay office hallmark fields",
                "GBP invoices with tax breakdown",
                "Share tax reports with accountant (1 click)",
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
              <T>Comparing with other UK jewellery software?</T>
            </p>
            <div className="flex flex-wrap justify-center gap-3">
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
              {FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <summary className="flex items-center justify-between px-6 py-4 cursor-pointer font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                    <T>{faq.q}</T>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-open:rotate-90 transition-transform shrink-0 ml-4" />
                  </summary>
                  <p className="px-6 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <T>{faq.a}</T>
                  </p>
                </details>
              ))}
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
                No credit card. No setup fee. Works in the browser, on iPad, or
                on desktop. Purpose-built for UK jewellers.
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
