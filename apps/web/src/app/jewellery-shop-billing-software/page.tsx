"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { T } from "@/components/ui/T";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  CreditCard,
  FileText,
  Printer,
  Receipt,
  RefreshCw,
  Scale,
  ScanBarcode,
} from "lucide-react";
import Link from "next/link";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Orivraa — Jewellery Shop Billing Software",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Windows, macOS, Android, iOS",
      description:
        "Professional billing software for jewellery shops with GST/VAT-compliant invoicing, making charges, old gold exchange, weight-based pricing, and barcode scanning.",
      url: "https://www.orivraa.com/jewellery-shop-billing-software",
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
          name: "What makes jewellery billing software different from regular billing software?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Jewellery billing requires weight-based pricing, purity calculations (24K, 22K, 18K), making charges per gram, stone charges, old gold exchange, and jewellery-specific tax rules (3% GST on gold in India). Regular billing software only supports fixed-price items.",
          },
        },
        {
          "@type": "Question",
          name: "Is Orivraa's billing software GST-compliant?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa generates GST-compliant invoices for India (3% on gold, 5% on making charges), VAT-compliant invoices for UK/EU/UAE, and supports tax structures for Nepal and the USA.",
          },
        },
        {
          "@type": "Question",
          name: "Can I handle old gold exchange in billing?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Enter the weight and purity of old gold, and Orivraa calculates the exchange value based on current rates. The exchange amount is deducted from the invoice total automatically.",
          },
        },
      ],
    },
  ],
};

const FEATURES = [
  {
    icon: Scale,
    title: "Weight-Based Invoice Lines",
    desc: "Each invoice line item shows metal weight, purity, rate per gram, making charges, and stone charges. Automatic calculation based on today's metal rates.",
  },
  {
    icon: Calculator,
    title: "Making Charges Flexibility",
    desc: "Support for making charges per gram, per piece, or flat fee. Different rates for different product types within the same invoice. Wastage percentage calculation included.",
  },
  {
    icon: RefreshCw,
    title: "Old Gold Exchange",
    desc: "Accept old gold or silver as partial payment. Enter weight and purity — the exchange value is calculated and deducted from the bill. Full audit trail maintained.",
  },
  {
    icon: Receipt,
    title: "GST/VAT-Compliant Invoices",
    desc: "Automatic tax calculation based on customer location. CGST + SGST for Indian domestic sales, IGST for interstate, VAT for international. Proper HSN codes included.",
  },
  {
    icon: ScanBarcode,
    title: "Barcode/HUID Quick Billing",
    desc: "Scan product barcodes or HUID numbers to instantly add items to the bill. Product weight, purity, and price populate automatically. No manual entry needed.",
  },
  {
    icon: CreditCard,
    title: "Split Payment Support",
    desc: "Accept cash, card, UPI, bank transfer, and old gold exchange in a single transaction. Record each payment method with detailed breakdown.",
  },
  {
    icon: Printer,
    title: "Professional Invoice Printing",
    desc: "Customisable invoice templates with your logo, shop details, and terms. Print on thermal printers (receipts) or A4 paper (formal invoices).",
  },
  {
    icon: FileText,
    title: "Credit Notes & Returns",
    desc: "Process returns with proper credit notes linked to original invoices. Handle exchanges, refunds, and partial returns with weight verification.",
  },
  {
    icon: BarChart3,
    title: "Tax Reports & Filing",
    desc: "Generate GST-ready reports (GSTR-1, GSTR-3B format) for India. Sales summaries, tax collected, input credit tracking, and export for CA filing.",
  },
];

const INVOICE_COMPONENTS = [
  { label: "Gold Rate Today", value: "₹7,200/gram (22K)" },
  { label: "Weight", value: "15.3 grams" },
  { label: "Gold Value", value: "₹1,10,160" },
  { label: "Making Charges (₹800/g)", value: "₹12,240" },
  { label: "Stone Charges", value: "₹5,500" },
  { label: "Sub-Total", value: "₹1,27,900" },
  { label: "GST (3% on gold)", value: "₹3,305" },
  { label: "GST (5% on making)", value: "₹612" },
  { label: "Grand Total", value: "₹1,31,817" },
  { label: "Old Gold Exchange (8.5g 22K)", value: "−₹61,200" },
  { label: "Amount Payable", value: "₹70,617" },
];

export default function JewellerBillingSoftwarePage() {
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
              <T>Billing & Invoicing</T>
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
              <T>Jewellery Shop Billing Software</T>{" "}
              <span className="text-amber-600 dark:text-gold-400">
                <T>— Accurate Invoices, Faster Checkout</T>
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
              <T>
                Generate professional GST/VAT-compliant invoices with making
                charges, old gold exchange, weight-based pricing, and barcode
                scanning. Designed specifically for gold, silver, and diamond
                jewellery shops.
              </T>{" "}
              <T>Used by jewellers across 6 countries. Starts free.</T>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register?role=SELLER"
                className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-base transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <T>Start Free Billing</T> <ArrowRight className="h-4 w-4" />
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

        {/* ── Sample Invoice Breakdown ────────────────────── */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <T>How a Jewellery Invoice Actually Works</T>
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-10">
              <T>
                Here's a real example of a 22K gold necklace invoice — this is
                what Orivraa generates automatically.
              </T>
            </p>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-amber-600 text-white px-6 py-3 text-sm font-semibold">
                <T>Sample Invoice — 22K Gold Necklace</T>
              </div>
              <div className="p-6 space-y-3">
                {INVOICE_COMPONENTS.map((row, i) => (
                  <div
                    key={row.label}
                    className={`flex justify-between items-center py-2 ${
                      i === INVOICE_COMPONENTS.length - 1
                        ? "border-t-2 border-amber-500 pt-3 font-bold text-lg text-amber-700 dark:text-gold-400"
                        : i === INVOICE_COMPONENTS.length - 2
                          ? "text-red-600 dark:text-red-400"
                          : i === 5
                            ? "border-t border-gray-300 dark:border-gray-600 pt-2 font-semibold"
                            : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span className="text-sm">
                      <T>{row.label}</T>
                    </span>
                    <span className="text-sm font-mono">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-center text-gray-400 mt-4">
              <T>
                Orivraa calculates all of this automatically — just scan the
                product and enter old gold details.
              </T>
            </p>
          </div>
        </section>

        {/* ── Core Features ───────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <T>Billing Features Built for Jewellers</T>
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-12">
              <T>
                Every billing scenario your jewellery shop faces — handled
                natively.
              </T>
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
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

        {/* ── Tax Compliance by Country ────────────────────── */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <T>Tax-Compliant Billing for Every Market</T>
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10">
              <T>
                Orivraa automatically applies the correct tax rules based on
                your shop's location.
              </T>
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  flag: "🇮🇳",
                  country: "India",
                  tax: "GST",
                  details:
                    "3% on gold value, 5% on making charges. CGST + SGST for intra-state, IGST for interstate. HSN codes included.",
                },
                {
                  flag: "🇳🇵",
                  country: "Nepal",
                  tax: "VAT",
                  details:
                    "13% VAT on jewellery sales. Proper invoicing with PAN and VAT registration numbers.",
                },
                {
                  flag: "🇦🇪",
                  country: "UAE",
                  tax: "VAT",
                  details:
                    "5% VAT on jewellery. TRN-compliant invoicing with proper Arabic/English formats.",
                },
                {
                  flag: "🇬🇧",
                  country: "UK",
                  tax: "VAT",
                  details:
                    "20% VAT on jewellery sales. VAT-registered seller invoicing with proper VAT breakdowns.",
                },
                {
                  flag: "🇪🇺",
                  country: "Europe",
                  tax: "VAT",
                  details:
                    "Variable VAT rates by country. EU-compliant invoicing with proper VAT ID and cross-border rules.",
                },
                {
                  flag: "🇺🇸",
                  country: "USA",
                  tax: "Sales Tax",
                  details:
                    "State-level sales tax on jewellery. Tax-exempt resale supported with proper documentation.",
                },
              ].map((c) => (
                <div
                  key={c.country}
                  className="p-5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{c.flag}</span>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      <T>{c.country}</T>
                    </h3>
                    <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-gold-400 px-2 py-0.5 rounded-full font-semibold">
                      {c.tax}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <T>{c.details}</T>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
              <T>Frequently Asked Questions</T>
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "What makes jewellery billing different from regular billing?",
                  a: "Jewellery billing involves weight × rate × purity calculations, making charges (per gram or per piece), stone charges, old gold exchange deductions, and jewellery-specific tax rules. Regular billing software can't handle these calculations.",
                },
                {
                  q: "Can I customise the invoice template?",
                  a: "Yes. Add your shop logo, business details, terms & conditions, and choose from multiple invoice layouts. Print on thermal printers or A4 paper.",
                },
                {
                  q: "How does old gold exchange work in billing?",
                  a: "When a customer brings old gold, you enter the weight and test the purity. Orivraa calculates the value at current rates and deducts it from the new purchase total. Both old and new items appear on the invoice.",
                },
                {
                  q: "Does it generate GST returns data?",
                  a: "Yes. Orivraa generates reports in GSTR-1 and GSTR-3B format for Indian GST filing. Export the data directly for your chartered accountant or upload to the GST portal.",
                },
                {
                  q: "Can I handle advance payments and layaway?",
                  a: "Yes. Record partial payments, track outstanding balances, and generate final invoices when customers complete payment. Full payment history is maintained per customer.",
                },
                {
                  q: "Is there a free plan for billing?",
                  a: "Yes. The free plan includes billing for up to 15 products with full tax compliance. The Pro plan ($12.99/month) unlocks unlimited products, advanced reports, and customisation.",
                },
              ].map((faq) => (
                <details
                  key={faq.q}
                  className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <summary className="flex items-center justify-between px-6 py-4 cursor-pointer font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-750">
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
              <T>Professional Billing for Your Jewellery Shop</T>
            </h2>
            <p className="text-lg text-amber-100 mb-8">
              <T>
                GST/VAT-compliant invoices with making charges, old gold
                exchange, and barcode scanning. Free to start.
              </T>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register?role=SELLER"
                className="px-8 py-3 bg-white text-amber-700 rounded-xl font-semibold hover:bg-amber-50 transition-all shadow-lg flex items-center gap-2"
              >
                <T>Start Free Billing</T> <ArrowRight className="h-4 w-4" />
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
