import type { Metadata } from "next";
import Link from "next/link";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { T } from "@/components/ui/T";
import { ArrowRight, CheckCircle2, ShieldCheck, TrendingUp, Scale, FileText, Smartphone } from "lucide-react";

export const metadata: Metadata = {
  title: "Jewellery Shop Software Nepal | Tola Billing, NRB Gold Rate & 13% VAT | Orivraa",
  description:
    "Jewellery billing software for Nepal. Nepal Rastra Bank (NRB) daily gold rate integration, tola and gram weight billing, NPR currency, 13% VAT with IRD-compatible invoices, and PAN-linked records. Free plan available — from NPR 399/month.",
  alternates: { canonical: "https://www.orivraa.com/np/jewellery-shop-software" },
  openGraph: {
    title: "Jewellery Software Nepal | NRB Rate, Tola Billing & 13% VAT | Orivraa",
    description:
      "Nepal jewellery billing software with NRB gold rates, tola weight, NPR billing, and IRD VAT compliance. Free to start.",
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
      offers: {
        "@type": "Offer",
        price: "399",
        priceCurrency: "NPR",
        description: "Orivraa Pro for Nepal jewellery shops — from NPR 399/month.",
        url: "https://www.orivraa.com/pricing",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Does Orivraa integrate with Nepal Rastra Bank (NRB) daily gold rates?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa integrates with Nepal Rastra Bank published daily gold rates. When you open the billing terminal, today's NRB rate is automatically applied to calculate the price of 24K, 22K, and 18K gold items without manual entry.",
          },
        },
        {
          "@type": "Question",
          name: "Does Orivraa support tola weight billing for Nepal jewellery shops?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Orivraa fully supports tola weight (1 tola = 11.664 grams) alongside grams for Nepal jewellery billing. All invoices can display weight in tola, grams, or both, matching how Nepali jewellers price and sell gold.",
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
            text: "Orivraa offers a free plan for small Nepal jewellery shops with no time limit. The Pro plan starts at NPR 399/month, billed in Nepalese Rupees. No setup fees, no hardware, and no technical installation required.",
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
    desc: "Orivraa automatically pulls the NRB published daily gold rate. Every bill you generate uses today's official rate for 24K, 22K, and 18K gold — no manual rate entry required.",
  },
  {
    icon: Scale,
    title: "Tola Weight Billing + NPR Currency",
    desc: "Bill by tola (1 tola = 11.664g) or grams — exactly how Nepali jewellers sell gold. All invoices are issued in NPR (Nepalese Rupee) with correct weight display.",
  },
  {
    icon: FileText,
    title: "13% VAT & IRD Compliance — from NPR 399/month",
    desc: "Orivraa generates IRD-compatible invoices with PAN number, 13% VAT calculation, and all mandatory fields. Export VAT return data for your accountant. Pro plan from NPR 399/month.",
  },
];

const FAQS = [
  {
    q: "Does Orivraa integrate with NRB daily gold rates for Nepal?",
    a: "Yes. Orivraa pulls the Nepal Rastra Bank published daily gold rate automatically. When you open a bill, today's official NRB rate is applied to price 24K, 22K, and 18K gold items — no manual entry, no rate errors.",
  },
  {
    q: "How does tola weight billing work in Orivraa for Nepal?",
    a: "Orivraa supports tola (1 tola = 11.664 grams) as a native weight unit alongside grams. You can enter weight in tola and the invoice will display it in tola, grams, or both. Making charges can also be set per tola.",
  },
  {
    q: "Is Orivraa IRD and VAT compliant for Nepal jewellery shops?",
    a: "Yes. Orivraa generates IRD-compatible VAT invoices with PAN number, 13% VAT amount, taxable base, and all mandatory fields required by the Inland Revenue Department of Nepal. VAT return data can be exported quarterly for filing.",
  },
  {
    q: "What is the price for Nepal jewellery shops in NPR?",
    a: "Orivraa offers a free plan for small Nepal shops with no time limit. The Pro plan is NPR 399/month billed in Nepalese Rupees. No setup fees, no hardware required, and it works on any device including Android phones.",
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
                billing, NPR currency, 13% VAT with IRD-compatible invoices —
                from NPR 399/month. Free to start.
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

        {/* Mobile POS Section */}
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
                  <T>No PC? No Problem. Run your jewellery shop entirely from your phone.</T>
                </h2>
                <p className="text-gray-300 text-lg leading-relaxed">
                  <T>
                    We know that many small sellers in Nepal cannot afford or do not have space for a dedicated PC setup. That's why we built Orivraa to work flawlessly as a mobile POS. Generate IRD-compatible invoices, check NRB gold rates, and track your stock—all from your smartphone.
                  </T>
                </p>
                <ul className="space-y-4 pt-4">
                  {[
                    "Works on any Android or iOS device",
                    "Scan barcodes using your phone camera",
                    "Share PDF bills directly via WhatsApp or Viber",
                    "Real-time backup and instant sync"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-amber-400" />
                      </div>
                      <span className="text-gray-200"><T>{item}</T></span>
                    </li>
                  ))}
                </ul>
                <div className="pt-6">
                   <Link
                    href="/auth/register"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-amber-500/25"
                  >
                    <T>Try Mobile POS Free</T>
                    <ArrowRight className="h-4 w-4" />
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
                      <div className="font-bold text-lg"><T>Orivraa POS</T></div>
                      <div className="text-xs bg-amber-600 px-2 py-1 rounded"><T>NRB Rate: ₹ 142,000</T></div>
                    </div>
                  </div>
                  
                  {/* Fake UI Content */}
                  <div className="flex-1 bg-gray-50 p-4 flex flex-col gap-3 overflow-hidden z-10">
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-gray-800 text-sm"><T>24K Gold Ring</T></div>
                        <div className="text-xs text-gray-500">0.5 Tola • HUID: 8A9B</div>
                      </div>
                      <div className="font-bold text-gray-800">₹ 71,000</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-gray-800 text-sm"><T>Making Charges</T></div>
                        <div className="text-xs text-gray-500">12%</div>
                      </div>
                      <div className="font-bold text-gray-800">₹ 8,520</div>
                    </div>
                    
                    <div className="mt-auto bg-gray-100 p-4 -mx-4 -mb-4 border-t border-gray-200">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span><T>Subtotal</T></span>
                        <span>₹ 79,520</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mb-3">
                        <span><T>VAT (13%)</T></span>
                        <span>₹ 10,337</span>
                      </div>
                      <div className="flex justify-between font-bold text-gray-900 text-lg mb-4">
                        <span><T>Total</T></span>
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
                NRB gold rates, tola billing, and 13% VAT compliance — all
                included. No credit card needed.
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
