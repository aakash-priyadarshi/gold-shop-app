import type { Metadata } from "next";
import Link from "next/link";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { T } from "@/components/ui/T";
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Scale,
  FileText,
  Smartphone,
  Wrench,
  CircleDollarSign,
  Monitor,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title:
    "Jewellery Shop Software Nepal | Tola Billing, NRB Gold Rate & 13% VAT | Orivraa",
  description:
    "Jewellery billing software for Nepal. Nepal Rastra Bank (NRB) daily gold rate integration, tola and gram weight billing, NPR currency, 13% VAT with IRD-compatible invoices, PAN-linked records, and mobile POS that works on any Android phone. Pro from NPR 399/month. Free plan available — better than Tally, Marg ERP, or Vyapar.",
  alternates: {
    canonical: "https://www.orivraa.com/np/jewellery-shop-software",
  },
  openGraph: {
    title:
      "Jewellery Software Nepal | NRB Rate, Tola Billing & 13% VAT | Orivraa",
    description:
      "Nepal jewellery billing software with NRB gold rates, tola weight, NPR billing, mobile POS, and IRD VAT compliance. Better than Tally. Free to start.",
    url: "https://www.orivraa.com/np/jewellery-shop-software",
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
      areaServed: { "@type": "Country", name: "Nepal" },
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "NPR",
          description:
            "Orivraa Free plan for Nepal jewellery shops — up to 15 products, no credit card.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "399",
          priceCurrency: "NPR",
          description:
            "Orivraa Pro for Nepal jewellery shops — NPR 399/month or NPR 3,990/year.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "799",
          priceCurrency: "NPR",
          description:
            "Orivraa Pro+ for Nepal jewellery shops — NPR 799/month or NPR 7,990/year.",
          url: "https://www.orivraa.com/pricing",
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Does Orivraa integrate with Nepal Rastra Bank (NRB) daily gold rates?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa integrates with Nepal Rastra Bank published daily gold rates. When you open the billing terminal, today's NRB rate is automatically applied to calculate the price of 24K, 22K, and 18K gold items without manual entry. Unlike Tally and Vyapar, which require you to type in today's rate manually every morning, Orivraa does this automatically.",
          },
        },
        {
          "@type": "Question",
          name: "Does Orivraa support tola weight billing for Nepal jewellery shops?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa fully supports tola weight (1 tola = 11.664 grams) alongside grams for Nepal jewellery billing. All invoices can display weight in tola, grams, or both, matching how Nepali jewellers price and sell gold. Tally and Marg ERP require custom TDL development for tola support — Orivraa has it built-in.",
          },
        },
        {
          "@type": "Question",
          name: "Is Orivraa compatible with Nepal IRD VAT requirements?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa generates IRD-compatible invoices with PAN number, 13% VAT breakdown, and all mandatory fields required by the Inland Revenue Department of Nepal. VAT return data can be exported for your accountant.",
          },
        },
        {
          "@type": "Question",
          name: "What does Orivraa cost for Nepal jewellery shops in NPR?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Orivraa offers a free plan for small Nepal jewellery shops with no time limit. The Pro plan is NPR 399/month (NPR 3,990/year) and Pro+ is NPR 799/month (NPR 7,990/year). Compare that to a Tally perpetual license at NPR 12,000+ plus custom TDL costs — Orivraa is cheaper and includes features Tally doesn't have.",
          },
        },
        {
          "@type": "Question",
          name: "Why is Orivraa better than Tally for Nepal jewellers?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Tally requires expensive custom TDL development for making charges, tola weight billing, wastage tracking, and NRB gold rate integration — this custom code is fragile and breaks on Tally updates. Orivraa has all of this built-in natively. Plus, Tally is desktop-only (requires a Windows PC), while Orivraa works on any Android phone — critical for small Nepal jewellers who can't afford a dedicated PC.",
          },
        },
        {
          "@type": "Question",
          name: "Can I run Orivraa on my phone without a PC?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa is built mobile-first. You can generate IRD-compatible invoices, check live NRB gold rates, scan barcodes using your phone camera, track inventory, and share bills via WhatsApp or Viber — all from any Android or iOS smartphone. No PC, no laptop, no special hardware needed.",
          },
        },
      ],
    },
  ],
};

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Nepal Rastra Bank Daily Gold Rate Integration",
    desc: "Orivraa automatically pulls the NRB published daily gold rate. Every bill you generate uses today's official rate for 24K, 22K, and 18K gold — no manual rate entry required. Unlike Tally or Vyapar, you never have to type in today's rate.",
  },
  {
    icon: Scale,
    title: "Tola Weight Billing + NPR Currency",
    desc: "Bill by tola (1 tola = 11.664g) or grams — exactly how Nepali jewellers sell gold. All invoices are issued in NPR (Nepalese Rupee) with correct weight display. No custom TDL development needed like with Tally.",
  },
  {
    icon: FileText,
    title: "13% VAT & IRD Compliance — from NPR 399/month",
    desc: "Orivraa generates IRD-compatible invoices with PAN number, 13% VAT calculation, and all mandatory fields. Export VAT return data for your accountant. Pro plan from NPR 399/month (NPR 3,990/year).",
  },
];

const PAIN_POINTS = [
  {
    icon: Wrench,
    title: "No Custom TDL Needed — Unlike Tally",
    desc: "Tally requires expensive third-party developers to add making charges, tola weight billing, wastage tracking, and NRB gold rate lookups via custom TDL. This code is fragile, breaks on Tally updates, and costs thousands. Orivraa has all of this built-in from day one.",
  },
  {
    icon: TrendingUp,
    title: "NRB Gold Rate Auto-Pulled — Not Manual",
    desc: "Tally and Vyapar require you to manually type in today's gold rate every morning. If you forget or make a typo, your invoices are wrong. Orivraa auto-pulls the NRB published rate daily — zero manual entry, zero rate errors.",
  },
  {
    icon: Monitor,
    title: "Works on Your Phone — No Windows PC Needed",
    desc: "Tally and Marg ERP require a dedicated Windows PC. Many small Nepal jewellers can't afford or don't have space for a PC setup. Orivraa works on any Android phone — generate bills, check rates, track stock, all from your pocket.",
  },
  {
    icon: CircleDollarSign,
    title: "10x Cheaper Than Tally + Custom TDL",
    desc: "A Tally perpetual license costs NPR 12,000+ and custom TDL development can cost NPR 5,000-15,000 more. Orivraa Pro is NPR 399/month (NPR 3,990/year) with a free plan to start — and includes features Tally's TDL can't match.",
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Starting Price",
    orivraa: "Free + NPR 399/mo",
    tally: "NPR 12,000+ perpetual",
    marg: "₹8,100+/yr (INR only)",
    vyapar: "NPR 700+/yr",
  },
  {
    feature: "NRB Gold Rate Auto-Pull",
    orivraa: "✓ Daily automatic",
    tally: "✗ Manual entry only",
    marg: "✗ Manual entry only",
    vyapar: "✗ No gold rates",
  },
  {
    feature: "Tola Weight Billing",
    orivraa: "✓ Native support",
    tally: "~ Via custom TDL only",
    marg: "✗ Not supported",
    vyapar: "✗ Not supported",
  },
  {
    feature: "Making Charges & Wastage",
    orivraa: "✓ Built-in",
    tally: "~ Via custom TDL only",
    marg: "~ Limited",
    vyapar: "✗ Not supported",
  },
  {
    feature: "Works on Phone (No PC)",
    orivraa: "✓ Any Android/iOS",
    tally: "✗ Windows PC only",
    marg: "✗ Windows PC only",
    vyapar: "✓ Mobile app",
  },
  {
    feature: "13% VAT / IRD Invoices",
    orivraa: "✓ IRD-compliant",
    tally: "✓ With setup",
    marg: "~ India GST focused",
    vyapar: "~ Basic tax only",
  },
  {
    feature: "Cloud & Real-Time Sync",
    orivraa: "✓ Instant cloud sync",
    tally: "✗ Desktop only",
    marg: "✗ Desktop only",
    vyapar: "✓ Cloud sync",
  },
  {
    feature: "WhatsApp Bill Sharing",
    orivraa: "✓ One-tap share",
    tally: "✗ No",
    marg: "✗ No",
    vyapar: "✓ Supported",
  },
  {
    feature: "Digital Catalogue",
    orivraa: "✓ Built-in",
    tally: "✗ No",
    marg: "✗ No",
    vyapar: "✗ No",
  },
  {
    feature: "Free Plan (No Time Limit)",
    orivraa: "✓ Always free tier",
    tally: "✗ No",
    marg: "✗ No",
    vyapar: "✗ Trial only",
  },
];

const FAQS = [
  {
    q: "Does Orivraa integrate with NRB daily gold rates for Nepal?",
    a: "Yes. Orivraa pulls the Nepal Rastra Bank published daily gold rate automatically. When you open a bill, today's official NRB rate is applied to price 24K, 22K, and 18K gold items — no manual entry, no rate errors. Unlike Tally and Vyapar which require manual rate entry every morning.",
  },
  {
    q: "How does tola weight billing work in Orivraa for Nepal?",
    a: "Orivraa supports tola (1 tola = 11.664 grams) as a native weight unit alongside grams. You can enter weight in tola and the invoice will display it in tola, grams, or both. Making charges can also be set per tola. Tally requires expensive custom TDL development for tola support — Orivraa has it built-in.",
  },
  {
    q: "Is Orivraa IRD and VAT compliant for Nepal jewellery shops?",
    a: "Yes. Orivraa generates IRD-compatible VAT invoices with PAN number, 13% VAT amount, taxable base, and all mandatory fields required by the Inland Revenue Department of Nepal. VAT return data can be exported quarterly for filing.",
  },
  {
    q: "What is the price for Nepal jewellery shops in NPR?",
    a: "Orivraa offers a free plan for small Nepal shops with no time limit. The Pro plan is NPR 399/month (NPR 3,990/year) and Pro+ is NPR 799/month (NPR 7,990/year). Compare that to a Tally perpetual license at NPR 12,000+ plus custom TDL costs — Orivraa is cheaper and includes more features.",
  },
  {
    q: "Why is Orivraa better than Tally for Nepal jewellers?",
    a: "Tally requires expensive custom TDL development for making charges, tola billing, wastage, and NRB gold rate integration — this custom code is fragile and breaks on Tally updates. Plus, Tally is Windows-desktop-only. Orivraa has all of this built-in natively and works on any Android phone — critical for Nepal jewellers who can't afford a dedicated PC.",
  },
  {
    q: "Can I run Orivraa on my phone without a PC?",
    a: "Yes. Orivraa is built mobile-first. Generate IRD-compatible invoices, check live NRB gold rates, scan barcodes using your phone camera, track inventory, and share bills via WhatsApp or Viber — all from any Android or iOS smartphone. For more details, see our mobile POS page.",
  },
  {
    q: "Can I switch from Tally or Vyapar to Orivraa?",
    a: "Yes. Orivraa supports CSV and JSON data import to migrate customer, inventory, and product data from Tally, Vyapar, or any other system. Our team assists with onboarding — most Nepal shops are live the same day. No Windows PC required.",
  },
];

export default function NepalJewelleryShopSoftwarePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-red-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 pt-24 pb-16">
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-semibold mb-6">
              🇳🇵 <T>For Nepal jewellery shops</T>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight mb-6">
              <T>Jewellery Software</T>{" "}
              <span className="text-amber-600 dark:text-amber-400">
                <T>Built for Nepal</T>
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10">
              <T>
                Cloud-based jewellery billing software for Nepal. Nepal Rastra
                Bank (NRB) daily gold rate integration, tola and gram weight
                billing, NPR currency, 13% VAT with IRD-compatible invoices,
                and mobile POS that works on any Android phone — no PC needed.
                Pro from NPR 399/month. Free to start.
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
              <T>Why Nepal jewellery shops choose Orivraa</T>
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
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400 mb-3">
                <Zap className="h-4 w-4" />
                <T>Why jewellers are switching</T>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                <T>Tally &amp; Vyapar weren&apos;t built for Nepal jewellers</T>
              </h2>
              <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                <T>
                  Stop paying for expensive custom TDL development and manual
                  gold rate entry. Orivraa has everything Nepal jewellers need —
                  natively, in the cloud, on your Android phone.
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

        {/* Mobile POS Section (preserved from original) */}
        <section className="py-16 lg:py-24 bg-gray-900 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 to-transparent pointer-events-none"></div>
          <div className="container mx-auto px-4 max-w-5xl relative z-10">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-sm font-semibold">
                  <Smartphone className="h-4 w-4" />
                  <T>Mobile-First POS</T>
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold leading-tight">
                  <T>
                    No PC? No Problem. Run your jewellery shop entirely from your
                    phone.
                  </T>
                </h2>
                <p className="text-gray-300 text-lg leading-relaxed">
                  <T>
                    We know that many small sellers in Nepal cannot afford or do
                    not have space for a dedicated PC setup. That&apos;s why we
                    built Orivraa to work flawlessly as a mobile POS. Generate
                    IRD-compatible invoices, check NRB gold rates, and track your
                    stock—all from your smartphone.
                  </T>
                </p>
                <ul className="space-y-4 pt-4">
                  {[
                    "Works on any Android or iOS device",
                    "Scan barcodes using your phone camera",
                    "Share PDF bills directly via WhatsApp or Viber",
                    "Real-time backup and instant sync",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-amber-400" />
                      </div>
                      <span className="text-gray-200">
                        <T>{item}</T>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-3 pt-6">
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-amber-500/25"
                  >
                    <T>Try Mobile POS Free</T>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/jewellery-pos-software"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-colors"
                  >
                    <T>See all POS features →</T>
                  </Link>
                </div>
              </div>
              <div className="relative mx-auto w-full max-w-[300px] md:max-w-none">
                {/* A glowing effect behind the phone */}
                <div className="absolute inset-0 bg-amber-500/30 blur-[100px] rounded-full"></div>

                {/* Mockup frame container */}
                <div className="relative bg-gray-800 rounded-[3rem] border-[8px] border-gray-700 shadow-2xl overflow-hidden aspect-[9/19] w-full max-w-[300px] mx-auto flex flex-col">
                  {/* Fake notch */}
                  <div className="absolute top-0 inset-x-0 h-6 bg-gray-700 rounded-b-2xl w-32 mx-auto z-20"></div>

                  {/* Fake UI Header */}
                  <div className="bg-amber-500 text-white p-4 pt-8 shrink-0 z-10">
                    <div className="flex justify-between items-center mb-4">
                      <div className="font-bold text-lg">
                        <T>Orivraa POS</T>
                      </div>
                      <div className="text-xs bg-amber-600 px-2 py-1 rounded">
                        <T>NRB Rate: ₹ 142,000</T>
                      </div>
                    </div>
                  </div>

                  {/* Fake UI Content */}
                  <div className="flex-1 bg-gray-50 p-4 flex flex-col gap-3 overflow-hidden z-10">
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">
                          <T>24K Gold Ring</T>
                        </div>
                        <div className="text-xs text-gray-500">
                          0.5 Tola • HUID: 8A9B
                        </div>
                      </div>
                      <div className="font-bold text-gray-800">₹ 71,000</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">
                          <T>Making Charges</T>
                        </div>
                        <div className="text-xs text-gray-500">12%</div>
                      </div>
                      <div className="font-bold text-gray-800">₹ 8,520</div>
                    </div>

                    <div className="mt-auto bg-gray-100 p-4 -mx-4 -mb-4 border-t border-gray-200">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>
                          <T>Subtotal</T>
                        </span>
                        <span>₹ 79,520</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mb-3">
                        <span>
                          <T>VAT (13%)</T>
                        </span>
                        <span>₹ 10,337</span>
                      </div>
                      <div className="flex justify-between font-bold text-gray-900 text-lg mb-4">
                        <span>
                          <T>Total</T>
                        </span>
                        <span>₹ 89,857</span>
                      </div>
                      <button className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-md shadow-emerald-500/20 text-sm">
                        <T>Generate Bill</T>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400 mb-3">
                🇳🇵 <T>Nepal Market Comparison</T>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                <T>Orivraa vs Nepal Jewellery Software</T>
              </h2>
              <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-sm">
                <T>
                  Side-by-side comparison of Orivraa with software commonly used
                  by Nepal jewellers.
                </T>
              </p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-red-700 via-red-600 to-blue-800 text-white">
                    <th className="px-4 py-3 text-left font-semibold">
                      <T>Feature</T>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold bg-amber-500/30 border-x border-amber-400/30">
                      ✨ Orivraa
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Tally + TDL
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Marg ERP
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Vyapar
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
                        {row.tally}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {row.marg}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {row.vyapar}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
              <T>
                Competitor pricing based on publicly listed rates as of 2026.
                Orivraa Pro is NPR 399/month or NPR 3,990/year.
              </T>
            </p>
          </div>
        </section>

        {/* Nepal compliance callout */}
        <section className="py-16 lg:py-20 bg-amber-50 dark:bg-amber-900/10">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                🇳🇵 <T>Nepal Tax &amp; IRD Compliance Checklist</T>
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                <T>
                  Nepal jewellery businesses must follow IRD VAT rules, NRB gold
                  rate guidelines, and issue PAN-linked invoices. Orivraa covers
                  all of these requirements natively.
                </T>
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "13% VAT on worked jewellery with IRD-compatible invoices",
                "PAN number on all customer invoices",
                "NPR (Nepalese Rupee) currency support",
                "Tola weight (1 tola = 11.664g) + gram billing",
                "Nepal Rastra Bank (NRB) daily gold rate integration",
                "VAT return export for quarterly filing",
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
              <T>Comparing with software used by Nepal jewellers?</T>
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/compare/orivraa-vs-tally"
                className="text-sm px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-amber-600 dark:text-amber-400 hover:border-amber-400 transition-colors"
              >
                <T>Orivraa vs Tally</T>
              </Link>
              <Link
                href="/compare/orivraa-vs-marg-erp"
                className="text-sm px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-amber-600 dark:text-amber-400 hover:border-amber-400 transition-colors"
              >
                <T>Orivraa vs Marg ERP</T>
              </Link>
              <Link
                href="/compare/orivraa-vs-vyapar"
                className="text-sm px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-amber-600 dark:text-amber-400 hover:border-amber-400 transition-colors"
              >
                <T>Orivraa vs Vyapar</T>
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
              <T>Start your free jewellery software trial</T>
            </h2>
            <p className="text-lg text-amber-100 mb-8">
              <T>
                NRB gold rates, tola billing, and 13% VAT compliance — all
                included. No credit card needed. Works on your Android phone.
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
                href="/blog/jewellery-billing-software-nepal-tax-guide"
                className="underline hover:text-white"
              >
                <T>Nepal Jewellery VAT &amp; Billing Guide</T>
              </Link>
            </p>
          </div>
        </section>
      </main>
      <DynamicFooter />
    </div>
  );
}
