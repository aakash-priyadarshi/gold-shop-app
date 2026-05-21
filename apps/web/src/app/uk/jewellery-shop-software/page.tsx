import type { Metadata } from "next";
import Link from "next/link";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { T } from "@/components/ui/T";
import { ArrowRight, CheckCircle2, ShieldCheck, Scale, FileText, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Jewellery Shop Software for UK | HMRC VAT, MTD & Hallmarking | Orivraa",
  description:
    "Jewellery shop management software built for UK businesses. Handles 20% HMRC VAT, Making Tax Digital (MTD) compliance, Hallmarking Act 1973 assay office reference fields, and GBP billing from £2.99/month. Free plan available.",
  alternates: { canonical: "https://www.orivraa.com/uk/jewellery-shop-software" },
  openGraph: {
    title: "Jewellery Shop Software UK | HMRC VAT & MTD | Orivraa",
    description:
      "UK jewellery software with 20% VAT, HMRC MTD, hallmark fields, and GBP billing. Free plan available.",
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
      offers: {
        "@type": "Offer",
        price: "2.99",
        priceCurrency: "GBP",
        description: "Orivraa Pro for UK jewellery shops — from £2.99/month.",
        url: "https://www.orivraa.com/pricing",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Is Orivraa compatible with HMRC Making Tax Digital (MTD) for UK jewellers?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa generates digital VAT records and VAT return exports compatible with HMRC Making Tax Digital requirements. All sales and purchases are recorded digitally, making MTD compliance straightforward for VAT-registered jewellery businesses.",
          },
        },
        {
          "@type": "Question",
          name: "Does Orivraa support hallmarking reference fields for UK jewellers?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa includes hallmark reference fields on product records and invoices, supporting all four UK assay offices: London Assay Office, Birmingham Assay Office, Sheffield Assay Office, and Edinburgh Assay Office. Hallmark sponsor mark fields are also available.",
          },
        },
        {
          "@type": "Question",
          name: "How does Orivraa handle UK VAT on jewellery — including zero-rated investment gold?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Orivraa supports the full UK VAT structure for jewellery: 20% standard rate on worked jewellery, and 0% for investment gold (gold bars and coins of 99%+ purity), in accordance with HMRC VAT Notice 701/21. Each item can have its VAT rate set independently.",
          },
        },
        {
          "@type": "Question",
          name: "What does Orivraa cost for UK jewellery shops in GBP?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Orivraa offers a free plan for small UK jewellery shops. The Pro plan starts at £2.99/month for UK customers, billed in GBP.",
          },
        },
      ],
    },
  ],
};

const FEATURES = [
  {
    icon: FileText,
    title: "20% VAT & HMRC Making Tax Digital",
    desc: "Orivraa automatically applies the correct UK VAT rate — 20% on worked jewellery, 0% on investment gold — and generates digital VAT records for HMRC MTD compliance. Export VAT return data in one click.",
  },
  {
    icon: Shield,
    title: "Hallmarking Act 1973 Support",
    desc: "Record hallmark sponsor marks, fineness marks, and assay office marks (London, Birmingham, Sheffield, Edinburgh) on every product. These fields appear on customer invoices and stock records.",
  },
  {
    icon: Scale,
    title: "GBP Pricing from £2.99/month",
    desc: "All pricing in GBP. Invoices are issued in British Pounds with UK-standard VAT breakdowns. The Pro plan starts at £2.99/month — far less than generic UK retail software.",
  },
];

const FAQS = [
  {
    q: "Is Orivraa HMRC Making Tax Digital (MTD) compatible?",
    a: "Yes. Orivraa digitally records all sales and purchases, and exports VAT return data in a format compatible with HMRC MTD obligations. VAT-registered jewellery businesses can use Orivraa's export to file their quarterly returns.",
  },
  {
    q: "Does Orivraa handle zero-rated investment gold for UK VAT?",
    a: "Yes. UK VAT on gold follows HMRC Notice 701/21: 20% standard rate on worked jewellery, 0% on investment gold (99%+ purity bars and coins). Orivraa lets you set the VAT rate per product type, so investment gold invoices correctly show zero VAT.",
  },
  {
    q: "Does Orivraa support hallmark reference fields for UK assay offices?",
    a: "Yes. Orivraa includes hallmark fields for all four UK assay offices: London, Birmingham, Sheffield, and Edinburgh. Sponsor mark, fineness, and assay office mark are all recordable on product records and printed on invoices.",
  },
  {
    q: "What is the price for UK jewellery shops in GBP?",
    a: "Orivraa offers a free plan for small UK shops. The Pro plan is billed in GBP, starting at £2.99/month. There are no setup fees and no hardware requirements.",
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
              <T>Jewellery Software</T>{" "}
              <span className="text-amber-600 dark:text-amber-400">
                <T>Built for UK Shops</T>
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10">
              <T>
                Cloud-based jewellery shop management for UK businesses. HMRC
                VAT compliance, Making Tax Digital support, Hallmarking Act 1973
                assay fields, and GBP billing — all from one platform, from
                £2.99/month.
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

        {/* UK compliance callout */}
        <section className="py-16 lg:py-20 bg-amber-50 dark:bg-amber-900/10">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                🇬🇧 <T>UK Tax &amp; Compliance Checklist</T>
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                <T>
                  UK jewellery businesses face specific VAT rules, HMRC Making
                  Tax Digital obligations, and Hallmarking Act requirements.
                  Orivraa covers all of these natively.
                </T>
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "20% VAT on worked jewellery",
                "0% VAT on investment gold (99%+ purity)",
                "HMRC Making Tax Digital (MTD) compatible records",
                "VAT return export for filing",
                "GBP invoice templates",
                "London, Birmingham, Sheffield & Edinburgh assay office hallmark fields",
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
              <T>Comparing with other jewellery software used in the UK?</T>
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/compare/orivraa-vs-lightspeed"
                className="text-sm px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-amber-600 dark:text-amber-400 hover:border-amber-400 transition-colors"
              >
                <T>Orivraa vs Lightspeed</T>
              </Link>
              <Link
                href="/compare/orivraa-vs-jewel360"
                className="text-sm px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-amber-600 dark:text-amber-400 hover:border-amber-400 transition-colors"
              >
                <T>Orivraa vs Jewel360</T>
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

        {/* CTA */}
        <section className="py-16 lg:py-20 bg-gradient-to-r from-amber-600 to-yellow-500 text-white">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">
              <T>Start your free jewellery software trial</T>
            </h2>
            <p className="text-lg text-amber-100 mb-8">
              <T>
                No credit card. No setup fee. HMRC VAT, MTD &amp; hallmark
                support included.
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
                href="/blog/jewellery-shop-software-tax-compliance-uk"
                className="underline hover:text-white"
              >
                <T>UK Jewellery VAT &amp; Hallmarking Guide</T>
              </Link>
            </p>
          </div>
        </section>
      </main>
      <DynamicFooter />
    </div>
  );
}
