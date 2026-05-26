import type { Metadata } from "next";
import Link from "next/link";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { T } from "@/components/ui/T";
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Scale,
  Calculator,
  Globe,
  ServerCrash,
  RefreshCw,
  DollarSign,
  Database,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title:
    "Jewelry Store Software for the USA | Cloud POS, Sales Tax & Billing | Orivraa",
  description:
    "Cloud jewelry store management software built for US shops. Handles state sales tax, USD billing, weight in grams and troy ounces, live gold and silver spot prices, and custom order management. Pro plan from $12.99/month. Free plan available — no credit card.",
  alternates: {
    canonical: "https://www.orivraa.com/us/jewelry-store-software",
  },
  openGraph: {
    title: "Jewelry Store Software USA | Orivraa",
    description:
      "Cloud jewelry software for US shops. State sales tax, USD pricing, troy ounce billing, live gold rates. Pro from $12.99/mo. Free plan available.",
    url: "https://www.orivraa.com/us/jewelry-store-software",
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
      areaServed: { "@type": "Country", name: "United States" },
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description:
            "Orivraa Free plan for US jewelry shops — up to 15 products, no credit card.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "12.99",
          priceCurrency: "USD",
          description:
            "Orivraa Pro for US jewelry shops — $12.99/month or $129.99/year.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "15.99",
          priceCurrency: "USD",
          description:
            "Orivraa Pro+ for US jewelry shops — $15.99/month or $159.94/year.",
          url: "https://www.orivraa.com/pricing",
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Does Orivraa handle US state sales tax for jewelry shops?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa supports US state and local sales tax configuration. You enter your applicable tax rate and all customer invoices automatically calculate the correct sales tax. Tax-exempt resale certificate documentation is also supported for wholesale transactions.",
          },
        },
        {
          "@type": "Question",
          name: "What does Orivraa cost for US jewelry shops?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Orivraa offers a free plan for small US jewelry stores (up to 15 products). The Pro plan starts at $12.99/month ($129.99/year), and Pro+ at $15.99/month ($159.94/year). Compare that to Jewel360 at $199+/month or The Edge at $4,600+ upfront.",
          },
        },
        {
          "@type": "Question",
          name: "Is Orivraa a good alternative to Jewel360 or The Edge for US jewelry stores?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa provides weight-based billing (grams and troy ounces), live gold and silver spot prices, custom order management, digital catalogue, and a buyer marketplace. It's fully cloud-native with no server to install, works on any device, and includes a free plan — unlike Jewel360 ($199+/mo) and The Edge ($4,600+ upfront plus server hardware).",
          },
        },
        {
          "@type": "Question",
          name: "Does Orivraa support troy ounce pricing for US precious metals dealers?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa supports weight billing in both grams and troy ounces. US dealers can price gold, silver, and platinum per troy ounce, with the live spot price automatically applied to every invoice.",
          },
        },
        {
          "@type": "Question",
          name: "How does Orivraa compare to The Edge for US jewelry stores?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The Edge is an on-premise system requiring a $4,600 license, local Windows servers, and proprietary hardware ($515 tag printers, $315 barcode scanners). It uses batch-processed data backups, causing frequent overselling of one-of-a-kind inventory online. Orivraa is fully cloud-native at $12.99/month — no servers, no IT engineer, real-time sync, and works on any browser or iPad.",
          },
        },
        {
          "@type": "Question",
          name: "Can I switch from WJewel or Jewel360 to Orivraa?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa supports CSV and JSON data import to help you migrate customer, inventory, and product data from WJewel, Jewel360, or any legacy system. Our team assists with onboarding — most shops are live the same day.",
          },
        },
      ],
    },
  ],
};

const FEATURES = [
  {
    icon: Scale,
    title: "Weight-Based Billing in Grams & Troy Ounces",
    desc: "Orivraa calculates jewelry prices from weight × purity × live spot price, exactly how US precious metals dealers price gold, silver, and platinum. Both grams and troy ounces are fully supported.",
  },
  {
    icon: Calculator,
    title: "US State Sales Tax Compliance",
    desc: "Configure your state and local tax rates once. Every invoice automatically applies the correct sales tax. Tax-exempt resale certificates are supported for wholesale and B2B transactions.",
  },
  {
    icon: Globe,
    title: "Cloud POS — No Expensive Hardware Required",
    desc: "Orivraa runs on any web browser, iPad, Android tablet, or Windows/Mac computer. Unlike legacy desktop software like The Edge, there is no server to install and no IT engineer needed for setup.",
  },
];

const PAIN_POINTS = [
  {
    icon: ServerCrash,
    title: "No Expensive Servers or Hardware",
    desc: "The Edge requires a $4,600 software license, local Windows servers, $515 tag printers, and $315 barcode scanners. Orivraa is browser-based — works on your existing iPad or laptop with zero IT costs.",
  },
  {
    icon: RefreshCw,
    title: "Real-Time Omnichannel Sync",
    desc: "The Edge uses batch-processed backups and RDP for remote access, causing overselling of one-of-a-kind items online. Orivraa syncs in real time across POS, web store, and mobile.",
  },
  {
    icon: Database,
    title: "No Migration Trauma",
    desc: "Jewelers report The Edge migrations fail to cleanly port historical data — \"more components that did not migrate than were expected.\" Orivraa offers assisted CSV/JSON data import with same-day go-live.",
  },
  {
    icon: DollarSign,
    title: "15x More Affordable Than Jewel360",
    desc: "Jewel360 starts at $199+/month. The Edge costs $4,600 upfront plus server hardware. Orivraa Pro is $12.99/month with a free plan to start — no contracts, cancel anytime.",
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Starting Price",
    orivraa: "Free + $12.99/mo",
    edge: "$4,600 + servers",
    jewel360: "$199+/mo",
    wjewel: "$125/mo lease",
  },
  {
    feature: "Cloud-Native",
    orivraa: "✓ True SaaS",
    edge: "✗ On-premise",
    jewel360: "✓ Cloud",
    wjewel: "~ Hosted desktop",
  },
  {
    feature: "Mobile/iPad POS",
    orivraa: "✓ Any device",
    edge: "✗ Desktop only",
    jewel360: "✓ Web-based",
    wjewel: "✗ Desktop only",
  },
  {
    feature: "Live Spot Prices",
    orivraa: "✓ Auto-updated",
    edge: "✗ Manual",
    jewel360: "~ Limited",
    wjewel: "✗ Manual",
  },
  {
    feature: "Real-Time Inventory Sync",
    orivraa: "✓ Instant",
    edge: "✗ Batch backups",
    jewel360: "✓ Cloud sync",
    wjewel: "~ Partial",
  },
  {
    feature: "Setup Time",
    orivraa: "< 5 minutes",
    edge: "Professional install",
    jewel360: "1–2 hours",
    wjewel: "Professional install",
  },
  {
    feature: "Hardware Required",
    orivraa: "None — any browser",
    edge: "Windows server + peripherals",
    jewel360: "None",
    wjewel: "Windows PC",
  },
  {
    feature: "Free Plan",
    orivraa: "✓ Always free tier",
    edge: "✗ No",
    jewel360: "✗ No",
    wjewel: "✗ No",
  },
  {
    feature: "Built-in Marketplace",
    orivraa: "✓ 27 buyer countries",
    edge: "✗ No",
    jewel360: "✗ No",
    wjewel: "✗ No",
  },
  {
    feature: "Digital Catalogues",
    orivraa: "✓ WhatsApp/Instagram",
    edge: "✗ No",
    jewel360: "✗ No",
    wjewel: "✗ No",
  },
];

const FAQS = [
  {
    q: "Does Orivraa handle US state and local sales tax?",
    a: "Yes. Configure your state and local tax rate once, and every customer invoice automatically calculates the correct sales tax. Tax-exempt wholesale sales are supported with certificate number fields on all invoices.",
  },
  {
    q: "What is Orivraa's price in USD for US jewelry stores?",
    a: "Orivraa offers a free plan for small US shops (up to 15 products). The Pro plan starts at $12.99/month ($129.99/year), and Pro+ at $15.99/month ($159.94/year) — a fraction of what Jewel360 ($199+/mo) or The Edge ($4,600+ upfront) charge.",
  },
  {
    q: "How does Orivraa compare to The Edge for US jewelry stores?",
    a: "The Edge is an on-premise system requiring a $4,600+ license, local Windows servers, and proprietary hardware ($515 tag printers, $315 barcode scanners). It uses batch-processed backups, causing overselling of one-of-a-kind items online. Migrating data into The Edge is notoriously painful. Orivraa is fully cloud-native at $12.99/month — no servers, no IT, real-time sync, works on any browser or iPad.",
  },
  {
    q: "Is Orivraa a cloud alternative to Jewel360 and The Edge?",
    a: "Yes. Orivraa delivers weight-based billing, live gold/silver spot rates, custom order management (RFQ), digital catalogue, and a built-in buyer marketplace — fully in the cloud, on any device, with a free plan included. Unlike Jewel360 ($199+/mo), Orivraa Pro is $12.99/month.",
  },
  {
    q: "Can I switch from WJewel or Jewel360 to Orivraa?",
    a: "Yes. Orivraa supports CSV and JSON data import to migrate customer, inventory, and product data from WJewel, Jewel360, The Edge, or any legacy system. Our team assists with onboarding — most US shops are live the same day. No proprietary hardware lock-in.",
  },
  {
    q: "Does Orivraa support troy ounce weight billing for US precious metals?",
    a: "Yes. US dealers can price gold, silver, and platinum per troy ounce. Orivraa pulls live spot prices and applies them automatically to every invoice, supporting both grams and troy ounces for weight entry.",
  },
];

export default function USJewelryStoreSoftwarePage() {
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
              🇺🇸 <T>For US jewelry shops</T>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight mb-6">
              <T>Jewelry Store Software</T>{" "}
              <span className="text-amber-600 dark:text-amber-400">
                <T>Built for the USA</T>
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10">
              <T>
                Cloud-based jewelry store management for US shops. Handle state
                sales tax, USD pricing, troy ounce weight billing, live gold
                and silver spot prices, and custom order management — all from
                one platform. Pro from $12.99/month. Free to start.
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
              <T>Why US jewelry shops choose Orivraa</T>
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

        {/* Why Jewelers Are Switching */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3">
                <Zap className="h-4 w-4" />
                <T>Why jewelers are switching</T>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                <T>The Edge & Jewel360 weren&apos;t built for modern jewelry retail</T>
              </h2>
              <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                <T>
                  Legacy software traps US jewelers with expensive servers,
                  painful migrations, and outdated interfaces. Orivraa eliminates
                  all of that.
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
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3">
                🇺🇸 <T>US Market Comparison</T>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                <T>Orivraa vs US Jewelry Software</T>
              </h2>
              <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-sm">
                <T>
                  Side-by-side comparison of Orivraa with the most popular
                  jewelry store software used in the United States.
                </T>
              </p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-700 via-blue-600 to-red-600 text-white">
                    <th className="px-4 py-3 text-left font-semibold">
                      <T>Feature</T>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold bg-amber-500/30 border-x border-amber-400/30">
                      ✨ Orivraa
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      The Edge
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Jewel360
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      WJewel
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
                        {row.edge}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {row.jewel360}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {row.wjewel}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
              <T>
                Competitor pricing based on publicly listed rates as of 2026.
                Orivraa Pro is $12.99/month or $129.99/year.
              </T>
            </p>
          </div>
        </section>

        {/* US tax compliance */}
        <section className="py-16 lg:py-20 bg-amber-50 dark:bg-amber-900/10">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                🇺🇸 <T>US Tax &amp; Compliance Checklist</T>
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                <T>
                  Jewelry sales tax in the USA varies by state and locality.
                  Orivraa gives you the tools to configure your rates, generate
                  compliant invoices, and manage tax-exempt wholesale sales.
                </T>
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "State + local sales tax configuration",
                "Tax-exempt resale certificate support",
                "USD invoice templates",
                "Troy ounce + gram weight billing",
                "Live gold & silver spot price (USD)",
                "GIA certificate reference fields on invoices",
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
              <T>Comparing with other US jewelry software?</T>
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/compare/orivraa-vs-jewel360"
                className="text-sm px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-amber-600 dark:text-amber-400 hover:border-amber-400 transition-colors"
              >
                <T>Orivraa vs Jewel360</T>
              </Link>
              <Link
                href="/compare/orivraa-vs-the-edge"
                className="text-sm px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-amber-600 dark:text-amber-400 hover:border-amber-400 transition-colors"
              >
                <T>Orivraa vs The Edge</T>
              </Link>
              <Link
                href="/compare/orivraa-vs-lightspeed"
                className="text-sm px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-amber-600 dark:text-amber-400 hover:border-amber-400 transition-colors"
              >
                <T>Orivraa vs Lightspeed</T>
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
              <T>Start your free jewelry store software trial</T>
            </h2>
            <p className="text-lg text-amber-100 mb-8">
              <T>
                No credit card. No setup fee. Works in the browser, on iPad, or
                on desktop.
              </T>
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white text-amber-700 rounded-xl font-semibold hover:bg-amber-50 transition-all shadow-lg"
            >
              <T>Get started free</T>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-sm text-amber-100">
              <T>Also read:</T>{" "}
              <Link
                href="/blog/jewellery-shop-software-usa-sales-tax-guide"
                className="underline hover:text-white"
              >
                <T>USA Sales Tax Guide for Jewelry Shops</T>
              </Link>
            </p>
          </div>
        </section>
      </main>
      <DynamicFooter />
    </div>
  );
}
