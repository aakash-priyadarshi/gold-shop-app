import type { Metadata } from "next";
import Link from "next/link";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { AiDiscoverySection } from "@/components/marketing/AskAiAboutUs";
import { FaqSection } from "@/components/ui/FaqSection";
import { T } from "@/components/ui/T";
import {
  ArrowRight,
  CheckCircle2,
  Gem,
  Printer,
  Receipt,
  Scale,
  ShieldCheck,
  Smartphone,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title:
    "Jewellery Shop Software for Sri Lanka | LKR Billing, VAT & Mobile POS | Orivraa",
  description:
    "Jewellery billing software for Sri Lankan gold shops. LKR pricing, gram and tola weights, 18% VAT invoices with TIN fields, mobile POS, QR/RFID tag printing, and catalog-linked stock. Pro from LKR 4,500/month. Free plan available.",
  alternates: {
    canonical: "https://www.orivraa.com/lk/jewellery-shop-software",
  },
  openGraph: {
    title: "Jewellery Shop Software Sri Lanka | Orivraa",
    description:
      "Purpose-built jewellery POS for Sri Lanka. LKR billing, VAT-ready invoices, mobile POS. Pro from LKR 4,500/mo. Free plan.",
    url: "https://www.orivraa.com/lk/jewellery-shop-software",
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
      areaServed: { "@type": "Country", name: "Sri Lanka" },
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "LKR",
          description:
            "Orivraa Free plan for Sri Lankan jewellery shops — up to 15 products, no credit card.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "4500",
          priceCurrency: "LKR",
          description:
            "Orivraa Pro for Sri Lankan jewellery shops — LKR 4,500/month.",
          url: "https://www.orivraa.com/pricing",
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Does Orivraa support Sri Lanka VAT for jewellery shops?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa applies Sri Lanka's configured standard VAT rate (currently 18%) on qualifying jewellery sales with TIN fields on tax invoices. Confirm current exemptions and registration thresholds with the Inland Revenue Department or your accountant.",
          },
        },
        {
          "@type": "Question",
          name: "What does Orivraa cost for Sri Lankan jewellery shops?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Orivraa offers a free plan (up to 15 products). Pro is LKR 4,500/month with unlimited inventory, mobile POS, tax reports, and catalog reprice — priced for local gold shops in Colombo, Kandy, Galle, and nationwide.",
          },
        },
        {
          "@type": "Question",
          name: "Can Sri Lankan jewellery shops print QR and RFID tags?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Each inventory piece can carry a QR identity, scanner-readable SKU barcode, and optional RFID/EPC code. Print a single tag, multiple A4 labels, or thermal-roll labels from desktop or mobile. Multi-tag printing is available on Pro and higher plans.",
          },
        },
      ],
    },
  ],
};

const FEATURES = [
  {
    icon: Scale,
    title: "Gram & Tola Billing",
    desc: "Bill in grams or tola with making charges, wastage, and stone value — stored internally in grams for accuracy across every receipt.",
  },
  {
    icon: Receipt,
    title: "LKR VAT-Ready Invoices",
    desc: "Generate invoices in Sri Lankan Rupees with VAT breakdown and verified shop TIN snapshots on formal tax invoices when required.",
  },
  {
    icon: Smartphone,
    title: "Mobile POS for Walk-Ins",
    desc: "Turn any Android phone into a counter POS — scan items, issue receipts, and sync stock without a dedicated terminal.",
  },
  {
    icon: Printer,
    title: "QR, RFID & Tag Printing",
    desc: "Give each piece QR, barcode and optional RFID/EPC identity. Print A4 multi-tag sheets or thermal labels from desktop and mobile; multi-tag printing is included with Pro.",
  },
];

const PAIN_POINTS = [
  {
    icon: Gem,
    title: "Spreadsheets Lose Grams",
    desc: "Manual ledgers cannot keep pace with daily gold rate moves and partial exchanges. Orivraa ties live rates to every bill and catalog line.",
  },
  {
    icon: Zap,
    title: "Affordable Local Pricing",
    desc: "Enterprise ERPs are priced for multinationals. Orivraa Pro starts at LKR 4,500/month with jewellery-native workflows included.",
  },
  {
    icon: ShieldCheck,
    title: "Stock-Linked Billing",
    desc: "Catalog items added to invoices can commit inventory automatically — fewer double-sales from the showcase.",
  },
  {
    icon: Receipt,
    title: "Tax Summaries for Filing",
    desc: "Export monthly sales and VAT summaries for your accountant instead of reconstructing totals from paper chits.",
  },
];

const FAQS = [
  {
    q: "Does Orivraa support Sri Lankan Rupee (LKR) billing?",
    a: "Yes. Orivraa bills in LKR with gram and tola display options. Card payments can route through Stripe with FX details recorded when buyers pay in other currencies.",
  },
  {
    q: "How does VAT work for Sri Lankan jewellery shops?",
    a: "Orivraa applies the configured Sri Lanka standard VAT rate (currently 18%) on qualifying sales. Tax treatment, exemptions, and registration thresholds can change — confirm current rules with the Inland Revenue Department or a qualified local accountant.",
  },
  {
    q: "What does Orivraa Pro cost in Sri Lanka?",
    a: "The free plan includes up to 15 products. Pro is LKR 4,500/month with unlimited inventory, mobile POS, tax reports, vault locations, jewellery sets, and catalog reprice. See the pricing page for live plan details.",
  },
  {
    q: "Can I use Orivraa on my phone at the shop counter?",
    a: "Yes. Mobile POS works on any smartphone browser — add products, apply making charges, share receipts, and sync inventory without installing proprietary hardware.",
  },
  {
    q: "Does Orivraa support Sinhala or Tamil?",
    a: "The interface supports dynamic translation including Sinhala, with English fallback. Tamil translation is also available through the same system.",
  },
  {
    q: "Can I print multiple jewellery tags on one A4 page?",
    a: "Yes. Select pieces from Vault & Tags, choose an A4 21-tag or 10-tag layout, and print the selected labels together. Thermal roll layouts and single-tag printing are also available. Multi-tag sheets are a Pro plan feature.",
  },
];

export default function LKJewelleryShopSoftwarePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 pt-24 pb-16">
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold mb-6">
              🇱🇰 <T>For Sri Lankan jewellery shops</T>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight mb-6">
              <T>Jewellery Shop Software</T>{" "}
              <span className="text-amber-600 dark:text-amber-400">
                <T>Built for Sri Lanka</T>
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10">
              <T>
                Cloud jewellery billing for Sri Lankan gold shops. LKR pricing,
                gram and tola weights, VAT-ready invoices, mobile POS, and
                catalog-linked stock — Pro from LKR 4,500/month. Free to start.
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

        <section className="py-16 lg:py-20 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
              <T>Why Sri Lankan jewellers choose Orivraa</T>
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

        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              <T>Built for how Sri Lankan gold shops actually work</T>
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {PAIN_POINTS.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800"
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

        <section className="py-16 lg:py-20 bg-amber-50 dark:bg-amber-900/10">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
              🇱🇰 <T>Sri Lanka compliance checklist</T>
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "LKR invoices with VAT breakdown",
                "Shop TIN on formal tax invoices",
                "Gram and tola weight billing",
                "Monthly tax summary exports",
                "Catalog-linked stock on sale",
                "Mobile POS on any smartphone",
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

        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
              <T>Frequently Asked Questions</T>
            </h2>
            <FaqSection faqs={FAQS} />
          </div>
        </section>

        <section className="py-16 lg:py-20 bg-gradient-to-r from-amber-600 to-yellow-500 text-white">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">
              <T>Start your free Sri Lanka jewellery software trial</T>
            </h2>
            <p className="text-lg text-amber-100 mb-8">
              <T>
                No credit card. Works in the browser and on your Android phone.
                Purpose-built for Sri Lankan gold shops.
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
      <AiDiscoverySection />
      <DynamicFooter />
    </div>
  );
}
