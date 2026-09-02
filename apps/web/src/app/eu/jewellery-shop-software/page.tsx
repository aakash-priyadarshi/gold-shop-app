import type { Metadata } from "next";
import { absolutePageTitle } from "@/lib/seo/metadata";
import Link from "next/link";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { AiDiscoverySection } from "@/components/marketing/AskAiAboutUs";
import { FaqSection } from "@/components/ui/FaqSection";
import { T } from "@/components/ui/T";
import {
  ArrowRight,
  CheckCircle2,
  Euro,
  Gem,
  Globe,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: absolutePageTitle("Jewellery Shop Software for Europe"),
  description:
    "Cloud jewellery POS for EU shops with country VAT, EUR billing, weight-based pricing, and hallmark fields. Free plan available.",
  alternates: {
    canonical: "https://www.orivraa.com/eu/jewellery-shop-software",
  },
  openGraph: {
    title: "Jewellery Shop Software Europe | Orivraa",
    description:
      "Purpose-built jewellery POS for EU shops. Country VAT rates, EUR billing, weight-based pricing. Pro from €12.99/mo. Free plan.",
    url: "https://www.orivraa.com/eu/jewellery-shop-software",
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
      areaServed: { "@type": "Place", name: "European Union" },
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
          description:
            "Orivraa Free plan for EU jewellery shops — up to 15 products, no credit card.",
          url: "https://www.orivraa.com/pricing",
        },
        {
          "@type": "Offer",
          price: "12.99",
          priceCurrency: "EUR",
          description:
            "Orivraa Pro for EU jewellery shops — €12.99/month or €129.99/year.",
          url: "https://www.orivraa.com/pricing",
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Does Orivraa handle EU VAT for jewellery shops?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa applies country-appropriate EU VAT rates on worked jewellery (typically 19–21% depending on member state) and supports investment gold exemptions where applicable. Invoices include VAT ID fields and itemised tax breakdowns for cross-border B2B and B2C sales.",
          },
        },
        {
          "@type": "Question",
          name: "What does Orivraa cost for European jewellery shops?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Orivraa offers a free plan for small EU jewellery shops (up to 15 products). Pro is €12.99/month (€129.99/year) with unlimited inventory, mobile POS, and tax reports — far less than generic retail POS systems built for non-jewellery businesses.",
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
    desc: "Weight × purity pricing, making charges, stone value, and hallmark references — the way European ateliers and high-street jewellers actually sell.",
  },
  {
    icon: Receipt,
    title: "EU VAT by Country",
    desc: "Configure your shop country once. Orivraa applies the correct VAT rate on worked jewellery and handles investment gold distinctions where your products qualify.",
  },
  {
    icon: Globe,
    title: "EUR & Multi-Market Billing",
    desc: "Bill in EUR with export-ready invoices. Serve local walk-ins and international buyers from one catalog with stock-linked POS and invoicing.",
  },
];

const PAIN_POINTS = [
  {
    icon: ShoppingBag,
    title: "Generic POS Ignores Weight & Purity",
    desc: "Horizontal retail systems treat a gold bracelet like any other SKU. Orivraa prices every line by metal weight, karat, making charges, and stones natively.",
  },
  {
    icon: Euro,
    title: "Affordable vs Enterprise Retail Suites",
    desc: "Enterprise jewellery suites and generic retail POS often cost hundreds per month per store. Orivraa Pro starts at €12.99/month with jewellery workflows included.",
  },
  {
    icon: ShieldCheck,
    title: "Audit-Ready Tax Summaries",
    desc: "Monthly VAT summaries and exportable sales reports help your accountant file without reconstructing spreadsheets from generic tills.",
  },
  {
    icon: Zap,
    title: "Mobile POS at the Counter",
    desc: "Bill from any phone or tablet — scan barcodes, share receipts, and sync stock back to inventory without proprietary hardware lock-in.",
  },
];

const FAQS = [
  {
    q: "Does Orivraa support EU VAT for jewellery shops?",
    a: "Yes. Orivraa applies VAT based on your shop's EU country (rates typically 19–21% on worked jewellery, varying by member state). Investment gold products can be configured with appropriate tax treatment. Invoices include VAT breakdowns suitable for local filing and cross-border sales documentation.",
  },
  {
    q: "What does Orivraa cost for European jewellers?",
    a: "The free plan covers up to 15 products with core POS and billing. Pro is €12.99/month (€129.99/year) with unlimited inventory, tax reports, catalog reprice, vault locations, and jewellery sets. See the pricing page for live rates in your market.",
  },
  {
    q: "Can I migrate from another POS or spreadsheet?",
    a: "Yes. Import customers and inventory via CSV. Most EU shops are live the same day — weight, purity, and making charges map to Orivraa's jewellery-native fields.",
  },
  {
    q: "Does Orivraa work for goldsmiths and custom workshops?",
    a: "Yes. Track karigar material, job cards, RFQs, and custom orders alongside retail inventory. Vault locations and jewellery sets help ateliers organise finished pieces and bundled collections.",
  },
  {
    q: "Is there a desktop app for EU shops?",
    a: "Yes. Download the Windows or macOS desktop app for offline counter billing with silent cloud sync — same catalog, POS, and invoices as the browser.",
  },
];

export default function EUJewelleryShopSoftwarePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 pt-24 pb-16">
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-sm font-semibold mb-6">
              🇪🇺 <T>For European jewellery shops</T>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight mb-6">
              <T>Jewellery Shop Software</T>{" "}
              <span className="text-amber-600 dark:text-amber-400">
                <T>Built for Europe</T>
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10">
              <T>
                Cloud jewellery management for EU ateliers and retail shops.
                Country VAT rates, EUR billing, weight-based pricing, vault
                locations, catalog reprice, and mobile POS — Pro from
                €12.99/month. Free to start.
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
              <T>Why EU jewellers choose Orivraa</T>
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
            <div className="text-center mb-12">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                <T>Generic retail software wasn&apos;t built for jewellery</T>
              </h2>
            </div>
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
              🇪🇺 <T>EU compliance checklist</T>
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "Country VAT rates on worked jewellery",
                "Investment gold product classification",
                "EUR invoices with VAT breakdown",
                "Monthly tax summary exports",
                "Catalog-linked stock on invoice commit",
                "Vault locations & jewellery sets",
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
              <T>Start your free EU jewellery software trial</T>
            </h2>
            <p className="text-lg text-amber-100 mb-8">
              <T>
                No credit card. Works in the browser, on mobile, or via the
                desktop app. Purpose-built for European jewellers.
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
