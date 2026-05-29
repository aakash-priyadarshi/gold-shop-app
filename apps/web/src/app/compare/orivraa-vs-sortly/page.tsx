import type { Metadata } from "next";
import Link from "next/link";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { TrustSignals } from "@/components/marketing/TrustSignals";
import { Button } from "@/components/ui/button";
import { T } from "@/components/ui/T";
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Layers,
  ShieldCheck,
  Smartphone,
  XCircle,
  Zap,
  Tag,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Orivraa vs Sortly for Jewellery Shops | Billing vs Inventory Tracker",
  description:
    "Sortly is a great visual inventory organiser — but it cannot create invoices, bill customers by gold weight, calculate making charges, or handle GST/VAT. Compare Orivraa: a full jewellery shop management platform with POS, billing, and marketplace.",
  alternates: { canonical: "https://www.orivraa.com/compare/orivraa-vs-sortly" },
};

type Row = {
  feature: string;
  orivraa: string | boolean;
  sortly: string | boolean;
  note?: string;
};

const ROWS: Row[] = [
  { feature: "Built specifically for jewellery shops", orivraa: true, sortly: false },
  { feature: "POS billing terminal (counter sales)", orivraa: true, sortly: false },
  { feature: "Weight-based billing (gram, tola, ounce)", orivraa: true, sortly: false },
  { feature: "Live gold & silver rate integration", orivraa: true, sortly: false },
  { feature: "Making charges & wastage calculation", orivraa: true, sortly: false },
  { feature: "GST / VAT compliant invoicing", orivraa: true, sortly: false },
  {
    feature: "Customer-facing digital catalogue",
    orivraa: true,
    sortly: "Internal use only",
    note: "Sortly catalogues cannot be shared with buyers",
  },
  { feature: "Old gold exchange & buy-back", orivraa: true, sortly: false },
  { feature: "Custom order (RFQ) management", orivraa: true, sortly: false },
  { feature: "Barcode / QR label printing", orivraa: true, sortly: true },
  { feature: "Multi-currency: INR, NPR, AED, GBP, USD", orivraa: true, sortly: false },
  { feature: "Mobile app", orivraa: true, sortly: true },
  {
    feature: "Free plan available",
    orivraa: true,
    sortly: true,
    note: "Sortly free plan limited to 100 items",
  },
  { feature: "Starting price", orivraa: "Free → ₹299/mo in India", sortly: "$29/month (USD)" },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true)
    return (
      <div className="flex items-center justify-center">
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      </div>
    );
  if (value === false)
    return (
      <div className="flex items-center justify-center">
        <XCircle className="h-5 w-5 text-rose-400" />
      </div>
    );
  return <div className="text-center text-sm text-gray-700 dark:text-gray-300">{value}</div>;
}

export default function OrivraaVsSortlyPage() {
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
              <T>Orivraa vs Sortly for Jewellery Shops</T>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">
              <T>
                Sortly is a clean visual inventory organiser — great for
                tagging, photographing, and locating items in storage. But it
                cannot bill a customer, calculate a gold ring price from
                today&apos;s rate, generate a GST invoice, or accept payment.
                Here&apos;s the full comparison with Orivraa, a complete
                jewellery shop management platform.
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
                      Sortly
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
                        <Cell value={row.sortly} />
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
                  title: "Billing, not just labelling",
                  desc: "Sortly tags and locates your inventory. Orivraa does that AND calculates the price, generates a GST/VAT invoice, and processes the sale at your counter.",
                },
                {
                  icon: Globe,
                  title: "Live gold rates, not static prices",
                  desc: "Sortly stores a fixed price per item. Orivraa pulls today's gold rate and calculates the correct price dynamically — no manual updates needed.",
                },
                {
                  icon: Tag,
                  title: "Marketplace built in",
                  desc: "Orivraa includes a shareable shop catalogue that buyers can browse. Sortly catalogues are internal-only — customers can never see them.",
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

        {/* Honest section */}
        <section className="py-16 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-6">
              <T>When Sortly is still the right choice</T>
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              <T>
                Sortly is genuinely excellent for asset tracking across any
                category — tools, equipment, office supplies, and storage
                facilities. Its visual interface and QR code scanning make
                physical audits quick and easy.
              </T>
            </p>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              <T>
                For a very early-stage jeweller who only needs to photograph and
                tag a small collection (under 100 items) before setting up a
                proper sales workflow, Sortly&apos;s free plan is a reasonable
                temporary solution. But the moment you need to bill a customer
                or handle live metal pricing, you need a purpose-built
                jewellery platform like Orivraa.
              </T>
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gradient-to-br from-amber-500 to-orange-500">
          <div className="container mx-auto px-4 max-w-3xl text-center text-white">
            <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-3xl font-bold mb-4">
              <T>Try Orivraa free for 60 days</T>
            </h2>
            <p className="text-lg text-white/90 mb-8">
              <T>
                Inventory + billing + marketplace in one platform. No credit
                card to start.
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
