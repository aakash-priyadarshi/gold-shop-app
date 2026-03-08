"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  CreditCard,
  Globe,
  Printer,
  Receipt,
  RefreshCw,
  Scale,
  ScanBarcode,
} from "lucide-react";
import Link from "next/link";
import { T } from "@/components/ui/T";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Orivraa — Jewellery POS Software",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Windows, macOS, Android, iOS",
      description:
        "Cloud-based POS software for jewellery shops with weight-based billing, making charges, old gold exchange, barcode scanning, and GST/VAT compliance.",
      url: "https://www.orivraa.com/jewellery-pos-software",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free plan available. Pro from $12.99/month.",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        reviewCount: "320",
        bestRating: "5",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What makes jewellery POS software different from regular POS?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Jewellery POS software handles weight-based pricing (grams, tola, ounce), purity calculations (24K, 22K, 18K), making charges per gram, stone charges, old gold exchange rates, and jewellery-specific tax rules — features that regular POS systems don't support.",
          },
        },
        {
          "@type": "Question",
          name: "Can Orivraa POS handle old gold exchange?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa's POS module supports old gold buy-back and exchange. Enter the weight and purity of old gold, and the system automatically calculates the exchange value against the new purchase.",
          },
        },
        {
          "@type": "Question",
          name: "Does Orivraa POS work offline?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Orivraa offers a desktop app for Windows and macOS that provides essential POS functionality with local caching. The cloud-based web version requires internet connection for real-time sync.",
          },
        },
      ],
    },
  ],
};

const POS_FEATURES = [
  {
    icon: Scale,
    title: "Weight-Based Billing",
    desc: "Bill customers based on exact gold/silver weight with automatic price calculation using live metal rates. Supports grams, tola, ounce, and laal.",
  },
  {
    icon: Calculator,
    title: "Making Charges & Stone Charges",
    desc: "Add making charges per gram, per piece, or as a percentage. Separate stone/gem charges with detailed breakdowns on the invoice.",
  },
  {
    icon: RefreshCw,
    title: "Old Gold Exchange",
    desc: "Accept old gold as payment. Enter weight and purity — the system calculates exchange value and adjusts the final bill automatically.",
  },
  {
    icon: ScanBarcode,
    title: "Barcode & HUID Scanning",
    desc: "Scan product barcodes or HUID (Hallmark Unique Identification) numbers for instant product lookup and fast billing at the counter.",
  },
  {
    icon: Receipt,
    title: "GST/VAT-Compliant Invoicing",
    desc: "Generate professional invoices with proper tax breakdowns. Supports GST (India), VAT (UK/EU/UAE), and other tax structures automatically.",
  },
  {
    icon: CreditCard,
    title: "Multiple Payment Methods",
    desc: "Accept cash, card, UPI, bank transfer, and old gold exchange — all in a single transaction. Split payments across methods.",
  },
  {
    icon: Printer,
    title: "Invoice & Receipt Printing",
    desc: "Print thermal receipts and A4 invoices. Customisable templates with your logo, terms, and detailed item breakdowns.",
  },
  {
    icon: Globe,
    title: "Multi-Currency Support",
    desc: "Bill in NPR, INR, AED, GBP, USD, or EUR with automatic tax and conversion calculations for each market.",
  },
  {
    icon: BarChart3,
    title: "Daily Sales Reports",
    desc: "End-of-day cash reconciliation, daily/weekly/monthly sales summaries, top-selling items, and payment method breakdowns.",
  },
];

const WORKFLOW = [
  {
    step: "1",
    title: "Scan or Search Product",
    desc: "Scan a barcode, search by name, or browse categories to add items to the bill. Product weight and purity auto-populate.",
  },
  {
    step: "2",
    title: "Apply Charges & Discounts",
    desc: "Making charges, stone charges, and any discounts are calculated automatically. Adjust as needed for custom orders.",
  },
  {
    step: "3",
    title: "Old Gold Exchange (Optional)",
    desc: "If the customer is exchanging old gold, enter the weight and purity. The exchange value is deducted from the total.",
  },
  {
    step: "4",
    title: "Collect Payment & Print Invoice",
    desc: "Accept payment via cash, card, or UPI. Generate a GST/VAT-compliant invoice and print or share digitally.",
  },
];

export default function JewelleryPosSoftwarePage() {
  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen bg-white dark:bg-gray-950">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-16 lg:py-24">
          <div className="container mx-auto px-4 max-w-6xl text-center">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-amber-700 dark:text-gold-400 mb-4">
              <T>Point of Sale</T>
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
              <T>Jewellery POS Software</T>{" "}
              <span className="text-amber-600 dark:text-gold-400">
                <T>Built for Gold & Diamond Shops</T>
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
              <T>Stop struggling with generic POS systems. Orivraa's point-of-sale module handles weight-based billing, making charges, old gold exchange, barcode scanning, and GST/VAT-compliant invoicing — all designed specifically for jewellery businesses.</T>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register?role=SELLER"
                className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-base transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <T>Try Free POS</T> <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-base hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <T>View Pricing</T>
              </Link>
            </div>
          </div>
        </section>

        {/* ── The Problem ─────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
              <T>Why Generic POS Systems Fail Jewellery Shops</T>
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
              <p>
                <T>Most POS systems are designed for retail stores selling items at fixed prices. A grocery store scans a barcode and the price pops up. Simple. But jewellery is different:</T>
              </p>
              <ul>
                <li>
                  <T>Prices change daily — Gold and silver rates fluctuate every day, sometimes multiple times a day. Your POS needs to pull live rates or accept manual rate entry.</T>
                </li>
                <li>
                  <T>Billing is by weight, not unit — A gold necklace isn't priced at "₹50,000." It's priced at "22K gold × 15.3 grams × today's rate + making charges + stone charges − old gold exchange."</T>
                </li>
                <li>
                  <T>Making charges vary — Different items have different making charges (per gram, per piece, or flat fee). A POS must support all these structures.</T>
                </li>
                <li>
                  <T>Old gold exchange — Customers frequently trade in old jewellery. The POS needs to calculate the exchange value based on weight and purity, then adjust the bill.</T>
                </li>
                <li>
                  <T>Purity grading — You sell 24K, 22K, 18K, and 14K gold. Each has a different base price. Generic POS systems have no concept of this.</T>
                </li>
              </ul>
              <p>
                <T>Orivraa's jewellery POS handles all of this natively. No workarounds. No spreadsheets. Just fast, accurate billing designed for how jewellery shops actually work.</T>
              </p>
            </div>
          </div>
        </section>

        {/* ── POS Features ────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <T>POS Features Designed for Jewellers</T>
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-12">
              <T>Every feature you need to bill customers accurately and efficiently at the jewellery counter.</T>
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {POS_FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700"
                >
                  <f.icon className="h-8 w-8 text-amber-600 dark:text-gold-400 mb-3" />
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                    <T>{f.title}</T>
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <T>{f.desc}</T>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Billing Workflow ─────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              <T>How Jewellery Billing Works in Orivraa</T>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {WORKFLOW.map((s) => (
                <div key={s.step} className="text-center">
                  <div className="w-12 h-12 bg-amber-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                    {s.step}
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                    <T>{s.title}</T>
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <T>{s.desc}</T>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comparison ──────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <T>Orivraa POS vs Generic POS Systems</T>
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10">
              <T>Here's what you get with a jewellery-specific POS vs trying to make a generic system work.</T>
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">
                      <T>Capability</T>
                    </th>
                    <th className="px-4 py-3 font-semibold text-amber-700 dark:text-gold-400">
                      <T>Orivraa POS</T>
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-500">
                      <T>Generic POS</T>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Weight-based pricing", true, false],
                    ["Purity calculations (24K/22K/18K)", true, false],
                    ["Making charges per gram", true, false],
                    ["Old gold exchange", true, false],
                    ["Barcode & HUID scanning", true, true],
                    ["GST/VAT jewellery tax rules", true, false],
                    ["Multi-currency billing", true, false],
                    ["Stone & gem charges", true, false],
                    ["Split payments", true, true],
                    ["Daily sales reports", true, true],
                    ["Cloud sync across devices", true, false],
                    ["Free plan available", true, false],
                  ].map(([feature, orivraa, generic], i) => (
                    <tr
                      key={feature as string}
                      className={
                        i % 2 === 0
                          ? "bg-white dark:bg-gray-950"
                          : "bg-gray-50/50 dark:bg-gray-900/50"
                      }
                    >
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        <T>{feature as string}</T>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {orivraa ? "✅" : "❌"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {generic ? "✅" : "❌"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
              <T>Frequently Asked Questions</T>
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "What makes jewellery POS different from regular POS?",
                  a: "Jewellery POS handles weight-based pricing, purity calculations, making charges per gram, old gold exchange, and jewellery-specific tax rules (e.g., 3% GST on gold in India). Regular POS systems only support fixed-price billing.",
                },
                {
                  q: "Can I use Orivraa POS on a tablet at the counter?",
                  a: "Yes. Orivraa is fully responsive and works on tablets, laptops, and desktops. The POS interface is optimised for touch screens as well as mouse/keyboard.",
                },
                {
                  q: "Does it handle HUID number tracking?",
                  a: "Yes. You can store HUID (Hallmark Unique Identification) numbers for each product and scan them during billing for instant product lookup and compliance tracking.",
                },
                {
                  q: "Can I accept multiple payment methods in one transaction?",
                  a: "Absolutely. Split a bill between cash, card, UPI, bank transfer, and old gold exchange — all in a single transaction.",
                },
                {
                  q: "Is there an offline mode?",
                  a: "The Orivraa desktop app (Windows/macOS) supports local caching for essential POS functionality. However, full features require internet connectivity for real-time sync.",
                },
                {
                  q: "How do I handle returns and exchanges?",
                  a: "Orivraa POS supports full return processing with weight verification, exchange calculations, and refund tracking. Returns are linked to the original invoice for audit trails.",
                },
              ].map((faq) => (
                <details
                  key={faq.q}
                  className="group bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <summary className="flex items-center justify-between px-6 py-4 cursor-pointer font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-750">
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

        {/* ── CTA ─────────────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-gradient-to-r from-amber-600 to-yellow-500 text-white">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">
              <T>Upgrade Your Jewellery Shop Counter</T>
            </h2>
            <p className="text-lg text-amber-100 mb-8">
              <T>Fast, accurate billing designed for gold and diamond shops. Free to start — no credit card required.</T>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register?role=SELLER"
                className="px-8 py-3 bg-white text-amber-700 rounded-xl font-semibold hover:bg-amber-50 transition-all shadow-lg flex items-center gap-2"
              >
                <T>Start Free Today</T> <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/jewellery-shop-software"
                className="px-8 py-3 border-2 border-white/50 text-white rounded-xl font-semibold hover:bg-white/10 transition-all"
              >
                <T>Full Feature List</T>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <DynamicFooter />
    </>
  );
}
