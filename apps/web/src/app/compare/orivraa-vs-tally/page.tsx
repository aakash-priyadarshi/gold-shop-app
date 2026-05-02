"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { TrustSignals } from "@/components/marketing/TrustSignals";
import { Button } from "@/components/ui/button";
import { T } from "@/components/ui/T";
import {
    ArrowRight,
    CheckCircle2,
    Cloud,
    Globe,
    Layers,
    ShieldCheck,
    Smartphone,
    XCircle,
    Zap,
} from "lucide-react";
import Link from "next/link";

const ROWS: {
  feature: string;
  orivraa: string | boolean;
  tally: string | boolean;
  note?: string;
}[] = [
  { feature: "Built specifically for jewellery shops", orivraa: true, tally: false },
  { feature: "Weight-based billing (gram, tola, ounce)", orivraa: true, tally: false },
  { feature: "Purity tracking (24K / 22K / 18K, hallmark)", orivraa: true, tally: false },
  { feature: "Live gold & silver rates", orivraa: true, tally: false },
  { feature: "Making charges & wastage support", orivraa: true, tally: "Manual" },
  { feature: "Old gold exchange & buy-back", orivraa: true, tally: false },
  { feature: "GST / VAT compliant invoicing", orivraa: true, tally: true },
  { feature: "Multi-store / multi-branch", orivraa: true, tally: "Add-on" },
  { feature: "Cloud-based, access anywhere", orivraa: true, tally: false, note: "Tally is desktop-first" },
  { feature: "Built-in customer chat & RFQ", orivraa: true, tally: false },
  { feature: "Digital catalogue & marketplace", orivraa: true, tally: false },
  { feature: "Mobile + Desktop + Web apps", orivraa: true, tally: "Desktop only" },
  { feature: "Free plan available", orivraa: true, tally: false },
  { feature: "Setup time", orivraa: "Under 10 min", tally: "Days, needs accountant" },
  { feature: "Starting price", orivraa: "Free → ₹999/mo", tally: "₹18,000+ one-time" },
];

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

export default function OrivraaVsTallyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="pt-24 pb-12 bg-gradient-to-b from-amber-50 to-white dark:from-gray-900 dark:to-gray-950">
          <div className="container mx-auto px-4 max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium mb-6">
              <Layers className="h-4 w-4" />
              <T>Software comparison</T>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">
              <T>Orivraa vs Tally for Jewellery Shops</T>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">
              <T>
                Tally is a great general-purpose accounting tool — but it
                wasn&apos;t built for jewellery. Here&apos;s an honest, side-by-side
                look at how Orivraa stacks up for shops that sell gold, silver,
                and diamond.
              </T>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="gold-gradient text-white h-12 px-8 rounded-xl">
                  <T>Start free trial</T>
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

        {/* Comparison table */}
        <section className="py-16 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white text-center mb-10">
              <T>Feature-by-feature comparison</T>
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="text-left px-4 lg:px-6 py-4 font-semibold text-gray-900 dark:text-white">
                      <T>Feature</T>
                    </th>
                    <th className="px-4 lg:px-6 py-4 font-semibold text-amber-600 dark:text-amber-400 text-center">
                      Orivraa
                    </th>
                    <th className="px-4 lg:px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-center">
                      Tally
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
                        <Cell value={row.tally} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Three pillars */}
        <section className="py-16 bg-gray-50 dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Zap,
                  title: "Made for jewellery, not retrofitted",
                  desc: "Weight, purity, making charges, wastage, hallmark — built in. No spreadsheets, no workarounds.",
                },
                {
                  icon: Cloud,
                  title: "Cloud + offline desktop",
                  desc: "Bill at the counter offline, sync to cloud automatically. Access reports from your phone.",
                },
                {
                  icon: Globe,
                  title: "Sell beyond your shop",
                  desc: "Optional marketplace lets buyers in 6+ countries discover your shop — no extra setup.",
                },
              ].map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800"
                  >
                    <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      <T>{p.title}</T>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <T>{p.desc}</T>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* When to stick with Tally — honest section */}
        <section className="py-16 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-6">
              <T>When Tally is still the right choice</T>
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              <T>
                We won&apos;t pretend Orivraa replaces Tally for everyone. If
                your accountant has 20 years of Tally workflow muscle memory,
                or you primarily need deep general-ledger accounting across
                non-jewellery businesses, Tally remains a solid choice.
              </T>
            </p>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              <T>
                Many of our customers actually keep using Tally for accounting
                — and use Orivraa for everything that touches the customer:
                billing, inventory, catalogue, and online presence. You can
                export from Orivraa to Tally-compatible formats any time.
              </T>
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gradient-to-br from-amber-500 to-orange-500">
          <div className="container mx-auto px-4 max-w-3xl text-center text-white">
            <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-3xl font-bold mb-4">
              <T>Try Orivraa free for 30 days</T>
            </h2>
            <p className="text-lg text-white/90 mb-8">
              <T>
                No credit card. No setup fee. Import your existing inventory
                in minutes.
              </T>
            </p>
            <Link href="/auth/register">
              <Button
                size="lg"
                className="bg-white text-amber-600 hover:bg-gray-100 h-12 px-8 rounded-xl font-semibold"
              >
                <T>Get started free</T>
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <div className="mt-6 flex items-center justify-center gap-2 text-white/80 text-sm">
              <Smartphone className="h-4 w-4" />
              <T>Works on web, desktop, and mobile</T>
            </div>
          </div>
        </section>
      </main>
      <DynamicFooter />
    </div>
  );
}
