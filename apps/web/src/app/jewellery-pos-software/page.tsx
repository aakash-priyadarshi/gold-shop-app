"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { AiDiscoverySection } from "@/components/marketing/AskAiAboutUs";
import {
    RegionalPricingSnapshot,
} from "@/components/marketing/RegionalPricingSnapshot";
import { SampleBillByMarket } from "@/components/marketing/SampleBillByMarket";
import { FaqSection } from "@/components/ui/FaqSection";
import { T } from "@/components/ui/T";
import {
    ArrowRight,
    BarChart3,
    Calculator,
    CreditCard,
    Globe,
    MessageSquare,
    Printer,
    Receipt,
    RefreshCw,
    Scale,
    ScanBarcode,
    Smartphone,
    CheckCircle2,
    Gem,
    Layers,
} from "lucide-react";
import Link from "next/link";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Orivraa — Jewellery POS Software",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Windows, macOS, Android, iOS",
      description:
        "Mobile and cloud-based POS for jewellery shops with live gold and silver rate billing, making charges, wastage (jarti), jewellery sets, country-aware tax (GST, Skill Promotion Fee, UAE/UK/EU VAT, US sales tax, Sri Lanka VAT), old gold exchange, barcode scanning, and receipt sharing.",
      url: "https://www.orivraa.com/jewellery-pos-software",
      featureList: [
        "Live gold and silver rate billing at checkout",
        "Making charges and wastage (jarti) on separate lines",
        "Jewellery sets sold as one bundled POS line",
        "Country-aware tax — India, Nepal, UAE, UK, EU, USA, Sri Lanka",
        "Mobile POS billing from any smartphone",
        "Weight-based billing in gram, tola, ounce, and laal",
        "Old gold exchange",
        "Barcode and HUID scanning",
        "WhatsApp receipt sharing",
      ],
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
          name: "Free Plan",
          description:
            "Free jewellery POS software for all markets. Up to 15 products, weight-based billing, old gold exchange, and marketplace listing. No credit card required.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "299",
          priceCurrency: "INR",
          name: "Pro Plan — India",
          description:
            "Orivraa Pro for India: ₹299/month. Unlimited products, GST-ready invoicing, making charges, old gold exchange, and analytics.",
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
            "Orivraa Pro for UK jewellery shops: £9.99/month. VAT-compliant POS, unlimited products, and analytics.",
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
      ],
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
            text: "Orivraa's mobile POS is designed for shop counters where connectivity can drop. Offline PWA mode can keep sales locally and sync when connectivity returns, while full real-time dashboard updates require an internet connection.",
          },
        },
        {
          "@type": "Question",
          name: "How does Orivraa POS handle wastage (jarti) and making charges?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Making charges and customer wastage (jarti) appear as separate lines on every POS receipt. Making can be per gram, per piece, or a percentage; wastage recalculates when weight or live gold/silver rate changes. Tax then applies per country — e.g. split GST on metal vs making in India, Skill Promotion Fee in Nepal, 5% VAT in UAE, 20% VAT in UK/EU, state sales tax in USA, 18% VAT in Sri Lanka.",
          },
        },
        {
          "@type": "Question",
          name: "Can I sell jewellery sets as one line at POS?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Bundle necklace, bangles, and earrings into a set with an optional set discount. Checkout sells the set as one POS line while components stay linked in vault stock until the set is broken.",
          },
        },
      ],
    },
  ],
};

const POS_FEATURES = [
  {
    icon: Scale,
    title: "Live Rate Weight Billing",
    desc: "Today's gold and silver rates flow into every POS line — bill by gram, tola, ounce, or laal. Metal value updates when rates move, without retyping each SKU.",
  },
  {
    icon: Calculator,
    title: "Making + Wastage (Jarti)",
    desc: "Making charges (per gram, piece, or %) and customer wastage stay separate receipt lines. Change weight or rate and the whole bill recalculates at the counter.",
  },
  {
    icon: Layers,
    title: "Jewellery Sets at POS",
    desc: "Sell a bridal set — necklace, bangles, earrings — as one bundled line with an optional set discount. Components stay in vault stock until the set is broken.",
  },
  {
    icon: Gem,
    title: "Stone & Gem Charges",
    desc: "Diamond, ruby, and gemstone values on their own lines with country-correct tax — e.g. 13% gemstone VAT in Nepal, VAT on stones in UAE/UK/EU.",
  },
  {
    icon: Receipt,
    title: "Country-Aware Tax Receipts",
    desc: "GST split (India), Skill Promotion Fee + gemstone VAT (Nepal), 5% VAT (UAE), 20% VAT (UK/EU), state sales tax (USA), 18% VAT (Sri Lanka) — each shown on the receipt.",
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
    desc: "Bill in NPR, INR, AED, GBP, USD, EUR, or LKR with automatic tax rules for India, Nepal, UAE, UK, Europe, USA, and Sri Lanka.",
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
    desc: "Scan a barcode, pick a catalogue item, or add a jewellery set. Weight, purity, and live gold/silver rate auto-populate on the line.",
  },
  {
    step: "2",
    title: "Making, Wastage & Stones",
    desc: "Making charges and customer wastage (jarti) calculate as separate lines. Add stone value; tax splits per your country — GST, Skill Promotion Fee, VAT, or sales tax.",
  },
  {
    step: "3",
    title: "Old Gold Exchange (Optional)",
    desc: "If the customer is exchanging old gold, enter the weight and purity. The exchange value is deducted from the total.",
  },
  {
    step: "4",
    title: "Collect Payment & Print",
    desc: "Accept cash, card, UPI, or split payment. Print or WhatsApp a receipt with every line — metal, making, wastage, tax — visible.",
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
              <T>
                Mobile point-of-sale built for jewellery counters — live gold
                and silver rates, making charges, wastage (jarti), jewellery
                sets, and country-aware tax for India, Nepal, UAE, UK, Europe,
                USA, and Sri Lanka. Old gold exchange, barcode scanning, and
                WhatsApp receipts included.
              </T>
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

        <RegionalPricingSnapshot description="POS pricing here now follows the same live regional plan service as the main pricing page instead of a static market-specific number." />

        {/* ── The Problem ─────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
              <T>Why Generic POS Systems Fail Jewellery Shops</T>
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
              <p>
                <T>
                  Most POS systems are designed for retail stores selling items
                  at fixed prices. A grocery store scans a barcode and the price
                  pops up. Simple. But jewellery is different:
                </T>
              </p>
              <ul>
                <li>
                  <T>
                    Prices change daily — Gold and silver rates fluctuate every
                    day, sometimes multiple times a day. Your POS needs to pull
                    live rates or accept manual rate entry.
                  </T>
                </li>
                <li>
                  <T>
                    Billing is by weight, not unit — A gold necklace isn't
                    priced at "₹50,000." It's priced at "22K gold × 15.3 grams ×
                    today's rate + making charges + stone charges − old gold
                    exchange."
                  </T>
                </li>
                <li>
                  <T>
                    Making charges vary — Different items have different making
                    charges (per gram, per piece, or flat fee). A POS must
                    support all these structures.
                  </T>
                </li>
                <li>
                  <T>
                    Old gold exchange — Customers frequently trade in old
                    jewellery. The POS needs to calculate the exchange value
                    based on weight and purity, then adjust the bill.
                  </T>
                </li>
                <li>
                  <T>
                    Purity grading — You sell 24K, 22K, 18K, and 14K gold. Each
                    has a different base price. Generic POS systems have no
                    concept of this.
                  </T>
                </li>
              </ul>
              <p>
                <T>
                  Orivraa's jewellery POS handles all of this natively. No
                  workarounds. No spreadsheets. Just fast, accurate billing
                  designed for how jewellery shops actually work.
                </T>
              </p>
            </div>
          </div>
        </section>

        {/* ── Mobile-First POS Callout ───────────────────── */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 rounded-3xl p-8 lg:p-12 border border-amber-100 dark:border-gray-700 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-200/50 dark:bg-amber-900/20 blur-[80px] rounded-full"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-200/50 dark:bg-orange-900/20 blur-[80px] rounded-full"></div>
              
              <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
                <div className="flex-1 space-y-6">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-sm font-semibold">
                    <Smartphone className="h-4 w-4" />
                    <T>Mobile-First POS</T>
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-bold leading-tight text-gray-900 dark:text-white">
                    <T>Run Your Shop Without a PC.</T>
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                    <T>
                      A bulky Windows PC setup can cost $500+ and take up valuable counter space. Orivraa was built mobile-first, allowing small and medium jewellers to run their entire billing operation from an Android or iOS device.
                    </T>
                  </p>
                  <ul className="space-y-4 pt-2">
                    {[
                      "Live gold and silver rates at checkout — gram, tola, or ounce",
                      "Making charges and wastage (jarti) on separate receipt lines",
                      "Sell jewellery sets as one bundled POS line",
                      "Send digital tax invoices via WhatsApp or SMS",
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-gray-700 dark:text-gray-200 font-medium">
                          <T>{item}</T>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-4">
                    <Link
                      href="/auth/register?role=SELLER"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold transition-colors shadow-lg"
                    >
                      <T>Get the Mobile App</T>
                      <Smartphone className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
                
                <div className="flex-1 w-full max-w-sm lg:max-w-md mx-auto">
                  <div className="relative bg-gray-900 rounded-[2.5rem] border-[6px] border-gray-800 shadow-2xl overflow-hidden aspect-[9/18] flex flex-col">
                    {/* Fake Notch */}
                    <div className="absolute top-0 inset-x-0 h-5 bg-gray-800 rounded-b-xl w-28 mx-auto z-20"></div>
                    
                    {/* Fake App Header */}
                    <div className="bg-amber-600 text-white p-4 pt-8 shrink-0 z-10 flex justify-between items-center shadow-md">
                      <div className="font-bold text-lg"><T>Orivraa POS</T></div>
                      <div className="bg-white/20 px-2 py-1 rounded text-xs font-medium tracking-wide">
                        <T>Live: 22K ₹7,100/g</T>
                      </div>
                    </div>
                    
                    {/* Fake App Body */}
                    <div className="flex-1 bg-gray-50 p-4 flex flex-col gap-3 z-10 overflow-hidden">
                      {/* Barcode Scanner Button */}
                      <button className="w-full bg-blue-50 border border-blue-200 text-blue-700 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm shadow-sm">
                        <ScanBarcode className="h-5 w-5" />
                        <T>Scan Barcode with Camera</T>
                      </button>
                      
                      {/* Cart Item */}
                      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-gray-900 text-sm"><T>Gold Bangle 22K</T></div>
                            <div className="text-xs text-gray-500">12.50 g • 15% Making</div>
                          </div>
                          <div className="font-bold text-gray-900 text-sm">₹ 102,062</div>
                        </div>
                      </div>
                      
                      {/* Cart Item 2 */}
                      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-gray-900 text-sm"><T>Diamond Ring</T></div>
                            <div className="text-xs text-gray-500">2.10 g • IGI Certified</div>
                          </div>
                          <div className="font-bold text-gray-900 text-sm">₹ 45,000</div>
                        </div>
                      </div>
                      
                      {/* Bottom Total Sheet */}
                      <div className="mt-auto bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span><T>Subtotal</T></span>
                          <span>₹ 147,062</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 mb-3 pb-3 border-b border-gray-100">
                          <span><T>Tax</T></span>
                          <span>₹ 4,411</span>
                        </div>
                        <div className="flex justify-between font-bold text-gray-900 text-lg mb-4">
                          <span><T>Total</T></span>
                          <span>₹ 151,473</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-bold shadow text-sm flex items-center justify-center gap-1.5">
                            <MessageSquare className="h-4 w-4" />
                            <T>WhatsApp</T>
                          </button>
                          <button className="bg-gray-900 hover:bg-black text-white py-2.5 rounded-lg font-bold shadow text-sm flex items-center justify-center gap-1.5">
                            <Receipt className="h-4 w-4" />
                            <T>Print Bill</T>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Sample POS Bill by Market ───────────────────── */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <T>What Your POS Receipt Looks Like</T>
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-10">
              <T>
                Every market gets the right tax breakdown — switch between
                India, Nepal, UAE, UK, Europe, USA, and Sri Lanka.
              </T>
            </p>
            <SampleBillByMarket />
          </div>
        </section>

        {/* ── POS Features ────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <T>POS Features Designed for Jewellers</T>
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-12">
              <T>
                Every feature you need to bill customers accurately and
                efficiently at the jewellery counter.
              </T>
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
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900">
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
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <T>Orivraa POS vs Generic POS Systems</T>
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10">
              <T>
                Here's what you get with a jewellery-specific POS vs trying to
                make a generic system work.
              </T>
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
                    ["Live gold and silver rate billing", true, false],
                    ["Weight-based pricing", true, false],
                    ["Purity calculations (24K/22K/18K)", true, false],
                    ["Making charges per gram", true, false],
                    ["Customer wastage (jarti) line", true, false],
                    ["Jewellery sets as one POS line", true, false],
                    ["Country-aware tax (7 markets)", true, false],
                    ["Old gold exchange", true, false],
                    ["Barcode & HUID scanning", true, true],
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
              <FaqSection
                faqs={[
                  {
                    q: "What makes jewellery POS different from regular POS?",
                    a: "Jewellery POS handles live gold/silver rates, weight-based pricing, making charges, wastage (jarti), jewellery sets, and country-specific tax — e.g. split GST in India, Skill Promotion Fee in Nepal, VAT in UAE/UK/EU, state sales tax in USA, 18% VAT in Sri Lanka. Regular POS systems only support fixed-price billing.",
                  },
                  {
                    q: "How does wastage (jarti) work at the POS counter?",
                    a: "Wastage is a separate line on the receipt, calculated as a percentage of metal value (weight × live rate × purity). It is not buried inside making charges. When weight or today's rate changes, wastage recalculates automatically before you take payment.",
                  },
                  {
                    q: "Can I sell a jewellery set as one line at POS?",
                    a: "Yes. Bundle components into a set with an optional discount and checkout as one line. Vault stock keeps each piece linked until the set is broken.",
                  },
                  {
                    q: "Which countries does Orivraa POS support for tax?",
                    a: "India, Nepal, UAE, UK, Europe, USA, and Sri Lanka — each with the correct tax labels on the printed receipt (GST, Skill Promotion Fee, gemstone VAT, FTA/HMRC VAT, OSS VAT, state sales tax, or Sri Lanka VAT).",
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
                ]}
              />
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
              <T>
                Fast, accurate billing designed for gold and diamond shops. Free
                to start — no credit card required.
              </T>
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
      <AiDiscoverySection />
      <DynamicFooter />
    </>
  );
}
