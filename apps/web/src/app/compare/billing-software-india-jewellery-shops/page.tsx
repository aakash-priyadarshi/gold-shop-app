"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { TrustSignals } from "@/components/marketing/TrustSignals";
import { Button } from "@/components/ui/button";
import { T } from "@/components/ui/T";
import {
    ArrowRight,
    CheckCircle2,
    Layers,
    MessageSquare,
    Receipt,
    Scale,
    ShieldCheck,
    XCircle,
} from "lucide-react";
import Link from "next/link";

const ROWS: {
  feature: string;
  orivraa: string | boolean;
  vyapar: string | boolean;
  tally: string | boolean;
  busy: string | boolean;
  marg: string | boolean;
  note?: string;
}[] = [
  {
    feature: "Built for jewellery billing",
    orivraa: true,
    vyapar: false,
    tally: false,
    busy: false,
    marg: "Jewellery module",
  },
  {
    feature: "Weight and purity billing",
    orivraa: true,
    vyapar: "Basic",
    tally: "Manual setup",
    busy: "Manual setup",
    marg: true,
  },
  {
    feature: "Making charges and wastage workflows",
    orivraa: true,
    vyapar: "Manual",
    tally: "Manual",
    busy: "Manual",
    marg: true,
  },
  {
    feature: "Old gold exchange / buy-back",
    orivraa: true,
    vyapar: "Basic",
    tally: false,
    busy: false,
    marg: true,
  },
  {
    feature: "GST-ready invoices",
    orivraa: true,
    vyapar: true,
    tally: true,
    busy: true,
    marg: true,
  },
  {
    feature: "Customer history and repeat-sale follow-up",
    orivraa: true,
    vyapar: "Basic",
    tally: false,
    busy: false,
    marg: "Basic",
  },
  {
    feature: "Digital catalogues and WhatsApp selling",
    orivraa: true,
    vyapar: false,
    tally: false,
    busy: false,
    marg: false,
  },
  {
    feature: "Cloud plus desktop access",
    orivraa: true,
    vyapar: true,
    tally: "Desktop-first",
    busy: "Desktop-first",
    marg: "Desktop-first",
  },
  {
    feature: "Marketplace or online discovery",
    orivraa: true,
    vyapar: false,
    tally: false,
    busy: false,
    marg: false,
  },
  {
    feature: "Best fit",
    orivraa: "Jewellery retail + growth",
    vyapar: "Simple small-shop billing",
    tally: "Accounting-heavy businesses",
    busy: "GST + stock-heavy SMEs",
    marg: "Legacy ERP jewellery ops",
  },
  {
    feature: "Starting model",
    orivraa: "Free + ₹299/mo in India",
    vyapar: "Free mobile + paid annual",
    tally: "Paid licence",
    busy: "Paid annual / licence",
    marg: "Paid licence + AMC",
  },
];

const FAQS = [
  {
    q: "What is the best billing software in India for jewellery shops?",
    a: "If you only need GST invoices and basic stock, several billing tools can work. If you need jewellery-specific billing, customer follow-up, catalogues, old-gold workflows, and inventory by purity in one system, Orivraa is usually the better fit for growth-focused jewellery businesses.",
  },
  {
    q: "How is Orivraa different from Vyapar or TallyPrime?",
    a: "Vyapar and TallyPrime are strong for general billing and accounting. Orivraa goes further for jewellery retail by connecting billing with customer history, catalogue sharing, RFQs, online discovery, and inventory workflows built around gold, silver, diamonds, and making charges.",
  },
  {
    q: "Is Orivraa GST billing software for jewellers?",
    a: "Yes. Orivraa supports GST-ready invoicing and jewellery-specific billing flows, including precious-metal inventory, making charges, and old-gold exchange scenarios that general billing apps often handle manually.",
  },
  {
    q: "Can I use Orivraa for both billing and customer retention?",
    a: "Yes. That is one of the main differences. Orivraa keeps invoices, product history, customer chats, RFQs, and catalogue sharing together, so billing data can directly help repeat sales instead of living in a separate system.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
};

function Cell({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <div className="flex items-center justify-center">
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="flex items-center justify-center">
        <XCircle className="h-5 w-5 text-rose-400" />
      </div>
    );
  }
  return (
    <div className="text-center text-sm text-gray-700 dark:text-gray-300">
      {value}
    </div>
  );
}

export default function BillingSoftwareIndiaJewelleryShopsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <Header />
      <main className="flex-1">
        <section className="pt-24 pb-12 bg-gradient-to-b from-amber-50 to-white dark:from-gray-900 dark:to-gray-950">
          <div className="container mx-auto px-4 max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium mb-6">
              <Layers className="h-4 w-4" />
              <T>Billing comparison for India</T>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">
              <T>Best Billing Software in India for Jewellery Shops</T>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed mb-8">
              <T>
                Billing software for jewellers has to do more than print GST
                invoices. It should understand weight, purity, making charges,
                old-gold exchange, customer history, and modern sales channels.
                Here is where Orivraa differs from the billing tools Indian
                businesses compare most often.
              </T>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="gold-gradient text-white h-12 px-8 rounded-xl">
                  <T>Start free</T>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="h-12 px-8 rounded-xl">
                  <T>See pricing</T>
                </Button>
              </Link>
            </div>
            <TrustSignals variant="compact" className="mt-10" />
          </div>
        </section>

        <section className="py-16 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white text-center mb-10">
              <T>Feature-by-feature billing comparison</T>
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <table className="w-full text-sm min-w-[1080px]">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="text-left px-4 lg:px-6 py-4 font-semibold text-gray-900 dark:text-white">
                      <T>Feature</T>
                    </th>
                    <th className="px-4 lg:px-6 py-4 font-semibold text-amber-600 dark:text-amber-400 text-center">
                      Orivraa
                    </th>
                    <th className="px-4 lg:px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-center">
                      Vyapar
                    </th>
                    <th className="px-4 lg:px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-center">
                      TallyPrime
                    </th>
                    <th className="px-4 lg:px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-center">
                      Busy
                    </th>
                    <th className="px-4 lg:px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-center">
                      Marg ERP
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {ROWS.map((row) => (
                    <tr key={row.feature} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-4 lg:px-6 py-4 text-gray-800 dark:text-gray-200">
                        <T>{row.feature}</T>
                        {row.note && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            <T>{row.note}</T>
                          </div>
                        )}
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <Cell value={row.orivraa} />
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <Cell value={row.vyapar} />
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <Cell value={row.tally} />
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <Cell value={row.busy} />
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <Cell value={row.marg} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50 dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Receipt,
                  title: "Billing is only the start",
                  desc: "Most tools can generate an invoice. Jewellery businesses also need product detail, purity, making charges, and customer context attached to the sale.",
                },
                {
                  icon: Scale,
                  title: "Jewellery logic matters",
                  desc: "Gold and silver billing is not generic retail billing. Weight, purity, wastage, exchange, and custom work should not depend on manual notes.",
                },
                {
                  icon: MessageSquare,
                  title: "Modern retail needs follow-up",
                  desc: "A bill should lead into repeat sales. Catalogues, customer chat, and RFQ workflows are where Orivraa goes beyond classic billing software.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800"
                  >
                    <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      <T>{item.title}</T>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <T>{item.desc}</T>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-16 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-6">
              <T>When traditional billing tools still make sense</T>
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              <T>
                If your only goal is to bill at the counter, print GST-ready
                invoices, and hand the numbers to your accountant, classic
                billing tools like Vyapar, TallyPrime, Busy, or Marg can still
                be a workable choice.
              </T>
            </p>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              <T>
                But if you want your billing tool to support repeat sales,
                customer follow-up, online discovery, and jewellery-specific
                workflows without stitching multiple apps together, Orivraa is
                built for that broader job.
              </T>
            </p>
          </div>
        </section>

        <section className="py-16 bg-white dark:bg-gray-900/50 border-y border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                <T>FAQ</T>
              </h2>
            </div>
            <div className="space-y-3">
              {FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 overflow-hidden"
                >
                  <summary className="flex items-center justify-between cursor-pointer px-6 py-4 font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                    <T>{faq.q}</T>
                    <span className="ml-4 text-gray-400 group-open:rotate-180 transition-transform">
                      ▾
                    </span>
                  </summary>
                  <div className="px-6 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <T>{faq.a}</T>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-gradient-to-br from-amber-500 to-orange-500">
          <div className="container mx-auto px-4 max-w-3xl text-center text-white">
            <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-3xl font-bold mb-4">
              <T>Use one billing system that can still help you sell</T>
            </h2>
            <p className="text-lg text-white/90 mb-8">
              <T>
                Test Orivraa with the free plan, compare it against your current
                billing workflow, and see whether your shop can replace separate
                billing, CRM, and catalogue tools with one platform.
              </T>
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link href="/auth/register">
                <Button
                  size="lg"
                  className="bg-white text-amber-600 hover:bg-gray-100 h-12 px-8 rounded-xl font-semibold"
                >
                  <T>Start free</T>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/compare/jewellery-crm-software-india">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 rounded-xl border-white/50 bg-white/10 text-white hover:bg-white/20"
                >
                  <T>Compare CRM software next</T>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <DynamicFooter />
    </div>
  );
}