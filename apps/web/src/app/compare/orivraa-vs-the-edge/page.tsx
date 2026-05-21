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
  Cloud,
  Globe,
  Layers,
  ShieldCheck,
  Smartphone,
  XCircle,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Orivraa vs The Edge for Jewellers | Cloud Alternative to Desktop POS",
  description:
    "The Edge is a respected jewellery POS — but it's Windows-only, requires a local server, and is built exclusively for North America. Compare Orivraa: cloud-native, works on any device, supports India, Nepal, UAE & UK, free plan available.",
  alternates: { canonical: "https://www.orivraa.com/compare/orivraa-vs-the-edge" },
};

type Row = {
  feature: string;
  orivraa: string | boolean;
  edge: string | boolean;
  note?: string;
};

const ROWS: Row[] = [
  {
    feature: "Cloud-based (no server install)",
    orivraa: true,
    edge: false,
    note: "The Edge requires a dedicated Windows PC server on-premise",
  },
  { feature: "Works on Mac, iPad, or Android", orivraa: true, edge: false },
  { feature: "Mobile app for owner / staff", orivraa: true, edge: false },
  { feature: "Setup time", orivraa: "Under 10 min", edge: "1–3 days, IT technician required" },
  { feature: "Free plan available", orivraa: true, edge: false },
  { feature: "Weight-based billing (gram, tola, ounce)", orivraa: true, edge: true },
  { feature: "Live gold & silver rate integration", orivraa: true, edge: "Manual entry" },
  { feature: "Old gold exchange & trade-in", orivraa: true, edge: true },
  { feature: "Making charges & wastage calculation", orivraa: true, edge: "Limited" },
  {
    feature: "Works in India, Nepal, UAE & UK",
    orivraa: true,
    edge: false,
    note: "The Edge is built for USA and Canada only",
  },
  { feature: "Multi-currency: INR, NPR, AED, GBP, EUR", orivraa: true, edge: false },
  { feature: "Built-in online buyer marketplace", orivraa: true, edge: false },
  { feature: "Automatic software updates", orivraa: true, edge: "Manual upgrade cycles" },
  { feature: "Starting price", orivraa: "Free → ₹299/mo in India", edge: "$150+/month (USD)" },
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

export default function OrivraaVsTheEdgePage() {
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
              <T>Orivraa vs The Edge for Jewellery Shops</T>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">
              <T>
                The Edge by Abbott&apos;s System is a long-established North
                American jewellery POS. But it runs on a Windows desktop server,
                requires an IT technician to install, only works in USD and CAD,
                and has no cloud access. Here&apos;s how a modern, cloud-native
                alternative compares.
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
                      The Edge
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
                        <Cell value={row.edge} />
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
                  icon: Cloud,
                  title: "Cloud in 2026, not desktop from the 90s",
                  desc: "Orivraa runs in the browser on any device — Mac, iPad, Windows, Android. No server room, no IT call-out, no paying for hardware every 5 years.",
                },
                {
                  icon: Globe,
                  title: "Built for global jewellers",
                  desc: "Orivraa supports jewellers in India, Nepal, UAE, UK, and USA with local currency, local tax rules, and local pricing. The Edge works only in USD and CAD.",
                },
                {
                  icon: Zap,
                  title: "Free plan, then flat monthly pricing",
                  desc: "Start free with no time limit. Paid plans are a flat monthly subscription — not a $150+/month perpetual licence requiring annual renewal.",
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
              <T>When The Edge is still the right choice</T>
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              <T>
                The Edge has been deployed in North American jewellery shops for
                decades, and many stores have deep workflows, trained staff, and
                custom reporting built around it. Its layaway module and
                customer relationship history depth are genuinely hard to
                replicate quickly.
              </T>
            </p>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              <T>
                If your shop is in the USA or Canada, your entire team is
                already trained on The Edge, and you have no plans to serve
                international customers — switching costs may not justify the
                move. But if you want cloud access, mobile management, or you
                serve customers outside North America, Orivraa is purpose-built
                for that.
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
              <T>No credit card. No setup fee. No IT technician needed.</T>
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
