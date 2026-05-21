import type { Metadata } from "next";
import Link from "next/link";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { T } from "@/components/ui/T";
import { ArrowRight, CheckCircle2, ShieldCheck, FileText, Globe, Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Jewellery Shop Software UAE & Dubai | FTA VAT Compliance & AED Billing | Orivraa",
  description:
    "Jewellery shop management software for UAE and Dubai. FTA-compliant 5% VAT invoicing, 0% on investment gold, TRN fields, AED billing, and Arabic + English invoice support. Free plan available — from AED 14.99/month.",
  alternates: { canonical: "https://www.orivraa.com/uae/jewellery-shop-software" },
  openGraph: {
    title: "Jewellery Software UAE Dubai | FTA VAT 5% & AED Billing | Orivraa",
    description:
      "UAE jewellery software with FTA VAT, investment gold zero-rating, AED billing, and Arabic invoice support. Free to start.",
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
      areaServed: [
        { "@type": "Country", name: "United Arab Emirates" },
        { "@type": "City", name: "Dubai" },
        { "@type": "City", name: "Abu Dhabi" },
      ],
      offers: {
        "@type": "Offer",
        price: "14.99",
        priceCurrency: "AED",
        description: "Orivraa Pro for UAE jewellery shops — from AED 14.99/month.",
        url: "https://www.orivraa.com/pricing",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Is Orivraa FTA-compliant for jewellery businesses in the UAE?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa generates FTA-compliant VAT invoices that include the Tax Registration Number (TRN), the correct 5% VAT rate on worked jewellery, 0% on qualifying investment gold, and all mandatory fields required by the UAE Federal Tax Authority.",
          },
        },
        {
          "@type": "Question",
          name: "How does UAE VAT apply to jewellery — and does Orivraa handle the distinction?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Under UAE VAT law: worked jewellery (rings, necklaces, bracelets) is subject to 5% VAT. Investment gold (gold bars and coins of 99%+ purity) is zero-rated. Orivraa lets you set the VAT rate per product, so investment gold invoices correctly show 0% and worked jewellery shows 5%.",
          },
        },
        {
          "@type": "Question",
          name: "Does Orivraa support Arabic invoices for UAE customers?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa supports bilingual Arabic + English invoice templates for UAE customers. You can issue invoices showing both Arabic and English text, meeting the preference of customers in the UAE gold souk and broader GCC market.",
          },
        },
        {
          "@type": "Question",
          name: "What does Orivraa cost for UAE jewellery shops in AED?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Orivraa offers a free plan for small UAE jewellery shops. The Pro plan starts at AED 14.99/month, billed in UAE Dirhams. There are no setup fees, no hardware to purchase, and no IT installation required.",
          },
        },
      ],
    },
  ],
};

const FEATURES = [
  {
    icon: FileText,
    title: "FTA-Compliant 5% VAT Invoicing",
    desc: "Orivraa generates UAE Federal Tax Authority compliant invoices with your TRN, the correct 5% VAT rate on worked jewellery, and all mandatory VAT fields. Export VAT return data for your accountant.",
  },
  {
    icon: Scale,
    title: "Investment Gold Zero-Rating (99%+ Purity)",
    desc: "UAE VAT zero-rates gold bars and coins with 99%+ purity. Orivraa applies 0% VAT to investment gold products and 5% to all worked jewellery — automatically, per item type.",
  },
  {
    icon: Globe,
    title: "AED Billing + Arabic Invoice Support",
    desc: "Issue invoices in UAE Dirhams with Arabic and English text side by side. Perfect for the Dubai gold souk, Abu Dhabi jewellers, and GCC wholesale buyers. From AED 14.99/month.",
  },
];

const FAQS = [
  {
    q: "Is Orivraa compliant with UAE FTA VAT rules for jewellery?",
    a: "Yes. Orivraa generates FTA-compliant tax invoices with TRN, supply date, taxable amount, 5% VAT amount, and total — all mandatory fields under UAE VAT regulations. Both worked jewellery (5%) and investment gold (0%) are handled correctly.",
  },
  {
    q: "What is the UAE VAT rate on gold jewellery vs investment gold?",
    a: "Under UAE Federal Tax Authority rules: worked jewellery (rings, necklaces, bangles) is subject to 5% VAT. Investment gold bars and coins with 99%+ purity are zero-rated (0% VAT). Orivraa applies these rates automatically per product type.",
  },
  {
    q: "Does Orivraa support Arabic invoices for Dubai and UAE customers?",
    a: "Yes. Orivraa supports bilingual Arabic + English invoice templates. You can issue invoices in Arabic and English side by side — standard practice in the UAE gold souk and expected by many GCC buyers.",
  },
  {
    q: "How much does Orivraa cost for UAE shops in AED?",
    a: "The free plan is available for small UAE shops with no time limit. The Pro plan starts at AED 14.99/month billed in UAE Dirhams. No setup fee, no hardware costs, and no IT engineer needed.",
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
        <section className="relative overflow-hidden bg-gradient-to-b from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 pt-24 pb-16">
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold mb-6">
              🇦🇪 <T>For UAE &amp; Dubai jewellery shops</T>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight mb-6">
              <T>Jewellery Software for</T>{" "}
              <span className="text-amber-600 dark:text-amber-400">
                <T>UAE &amp; Dubai</T>
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10">
              <T>
                Cloud-based jewellery shop management built for the UAE market.
                FTA-compliant 5% VAT invoicing, investment gold zero-rating, Tax
                Registration Number (TRN) support, bilingual Arabic + English
                invoices, and AED billing — from AED 14.99/month.
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
              <T>Why UAE &amp; Dubai jewellers choose Orivraa</T>
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

        {/* UAE compliance callout */}
        <section className="py-16 lg:py-20 bg-amber-50 dark:bg-amber-900/10">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                🇦🇪 <T>UAE Tax &amp; FTA Compliance Checklist</T>
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                <T>
                  UAE jewellery businesses must comply with Federal Tax Authority
                  (FTA) VAT rules. Orivraa handles all mandatory requirements
                  natively — no additional software or accountant workarounds
                  needed.
                </T>
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "5% VAT on worked jewellery (rings, necklaces, bangles)",
                "0% VAT on investment gold (99%+ purity, bars & coins)",
                "Tax Registration Number (TRN) on all invoices",
                "FTA-compliant invoice format with mandatory fields",
                "AED (UAE Dirham) currency support",
                "Arabic + English bilingual invoice option",
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
              <T>Comparing with software used in the UAE gold market?</T>
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
                No credit card. No setup fee. FTA VAT compliance included from
                day one.
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
                href="/blog/vat-on-gold-jewellery-uae-dubai-guide"
                className="underline hover:text-white"
              >
                <T>UAE VAT Guide for Gold &amp; Jewellery Shops</T>
              </Link>
            </p>
          </div>
        </section>
      </main>
      <DynamicFooter />
    </div>
  );
}
