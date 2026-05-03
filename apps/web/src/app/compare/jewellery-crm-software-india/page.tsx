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
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";

const ROWS: {
  feature: string;
  orivraa: string | boolean;
  zoho: string | boolean;
  kylas: string | boolean;
  leadSquared: string | boolean;
  note?: string;
}[] = [
  {
    feature: "Built for jewellery shops",
    orivraa: true,
    zoho: false,
    kylas: false,
    leadSquared: false,
  },
  {
    feature: "Customer profiles with sales history",
    orivraa: true,
    zoho: true,
    kylas: true,
    leadSquared: true,
  },
  {
    feature: "Inventory by weight and purity",
    orivraa: true,
    zoho: "Needs add-on",
    kylas: false,
    leadSquared: false,
  },
  {
    feature: "Billing and invoicing in the same workflow",
    orivraa: true,
    zoho: "Separate apps",
    kylas: false,
    leadSquared: false,
  },
  {
    feature: "Digital catalogue sharing for WhatsApp",
    orivraa: true,
    zoho: "Manual setup",
    kylas: "Manual setup",
    leadSquared: "Manual setup",
  },
  {
    feature: "Custom order / RFQ tracking",
    orivraa: true,
    zoho: "Custom workflow",
    kylas: "Custom workflow",
    leadSquared: "Custom workflow",
  },
  {
    feature: "Built-in buyer chat",
    orivraa: true,
    zoho: "Add-on / integration",
    kylas: "WhatsApp add-on",
    leadSquared: "Integration",
  },
  {
    feature: "Marketplace or discovery layer",
    orivraa: true,
    zoho: false,
    kylas: false,
    leadSquared: false,
  },
  {
    feature: "Best for",
    orivraa: "Jewellery retail + repeat sales",
    zoho: "Generic CRM teams",
    kylas: "Indian inside sales teams",
    leadSquared: "High-volume lead teams",
  },
  {
    feature: "Pricing model",
    orivraa: "Flat shop pricing",
    zoho: "Per-user monthly",
    kylas: "Flat CRM plan",
    leadSquared: "Per-user / quote-based",
  },
];

const FAQS = [
  {
    q: "What is the best CRM software for jewellery stores in India?",
    a: "If you need a true CRM plus jewellery operations in one place, Orivraa is the stronger fit because it combines customer history, billing, inventory by weight and purity, catalogues, and custom-order workflows. If you only need lead tracking for a generic sales team, tools like Zoho, Kylas, or LeadSquared can still be useful.",
  },
  {
    q: "How is Orivraa different from Zoho CRM or LeadSquared?",
    a: "Zoho CRM and LeadSquared are built for generic sales pipelines. Orivraa is designed for jewellery shops, so inventory, invoicing, gold purity, making charges, customer chat, and catalogue sharing sit in the same workflow instead of being spread across multiple tools or integrations.",
  },
  {
    q: "Do jewellery shops need a CRM or billing software?",
    a: "Most jewellery shops need both. The real question is whether those two systems should stay separate. If your business relies on repeat customers, WhatsApp follow-up, custom orders, and fast billing at the counter, using one system reduces duplicate data entry and helps staff move faster.",
  },
  {
    q: "Can Orivraa help with repeat customers and custom orders?",
    a: "Yes. Orivraa keeps customer conversations, purchase history, digital catalogues, RFQs, and invoices connected, which makes follow-up and repeat sales easier for jewellery stores than using a generic CRM alone.",
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

export default function JewelleryCrmSoftwareIndiaPage() {
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
              <T>CRM comparison for India</T>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">
              <T>Best Jewellery CRM Software in India</T>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed mb-8">
              <T>
                Jewellery shops do not just need a lead pipeline. They need
                customer follow-up, billing, inventory, custom-order tracking,
                and catalogue sharing in the same workflow. Here is how Orivraa
                compares with popular CRM options Indian businesses often
                evaluate first.
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
              <T>Feature-by-feature CRM comparison</T>
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <table className="w-full text-sm min-w-[920px]">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="text-left px-4 lg:px-6 py-4 font-semibold text-gray-900 dark:text-white">
                      <T>Feature</T>
                    </th>
                    <th className="px-4 lg:px-6 py-4 font-semibold text-amber-600 dark:text-amber-400 text-center">
                      Orivraa
                    </th>
                    <th className="px-4 lg:px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-center">
                      Zoho CRM / Bigin
                    </th>
                    <th className="px-4 lg:px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-center">
                      Kylas
                    </th>
                    <th className="px-4 lg:px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-center">
                      LeadSquared
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
                        <Cell value={row.zoho} />
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <Cell value={row.kylas} />
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <Cell value={row.leadSquared} />
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
                  icon: Store,
                  title: "One workflow for the whole shop",
                  desc: "Your staff should not need one app for leads, another for billing, and another for stock. Orivraa keeps those actions together.",
                },
                {
                  icon: MessageSquare,
                  title: "Better for WhatsApp selling",
                  desc: "Jewellery buyers ask for photos, prices, and customisations. Built-in catalogues and RFQ flows matter more than a generic pipeline board.",
                },
                {
                  icon: Sparkles,
                  title: "Built for repeat business",
                  desc: "Customer history, saved designs, follow-up chats, and quote tracking make repeat sales easier than using a generic CRM plus manual spreadsheets.",
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
              <T>When a generic CRM is still the better choice</T>
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              <T>
                If you run a large multi-category sales team and your core need
                is lead routing, call cadences, territory management, and
                per-rep pipeline analytics, a generic CRM like Zoho, Kylas, or
                LeadSquared may be the better operational fit.
              </T>
            </p>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              <T>
                But if your jewellery business needs customer follow-up tied to
                real products, real invoices, stock by purity, and ongoing
                custom orders, Orivraa removes the integration and training
                overhead that generic CRMs usually create.
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
              <T>Choose a CRM built around jewellery work</T>
            </h2>
            <p className="text-lg text-white/90 mb-8">
              <T>
                Start with the free plan, test billing and customer follow-up in
                one flow, and see whether your team actually needs another CRM
                on top.
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
              <Link href="/compare/billing-software-india-jewellery-shops">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 rounded-xl border-white/50 bg-white/10 text-white hover:bg-white/20"
                >
                  <T>Compare billing software next</T>
                  <Users className="ml-2 h-5 w-5" />
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