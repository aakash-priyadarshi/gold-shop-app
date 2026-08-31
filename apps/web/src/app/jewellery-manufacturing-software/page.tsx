"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { AiDiscoverySection } from "@/components/marketing/AskAiAboutUs";
import { T } from "@/components/ui/T";
import {
  Hammer,
  Scale,
  Database,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Coins,
  Users,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Orivraa — Jewellery Manufacturing & Karigar Software",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Windows, macOS, Android, iOS",
      description:
        "Jewellery manufacturing ERP and Karigar wastage tracking software. Manage gold smith accounts, pure bullion stocks, fine metal issued vs returned weight, wastage percentages, and alloy calculations.",
      url: "https://www.orivraa.com/jewellery-manufacturing-software",
      featureList: [
        "Karigar wastage and recovery tracking",
        "Bullion inventory stock accounts",
        "Fine gold (24K) and silver ledgers",
        "Dual-unit inventory (count and weight)",
        "Metallurgical alloy bill of materials",
        "Artisan payroll and making charges",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Karigar Hisab in jewellery manufacturing software?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Karigar Hisab is the forensic tracking of gold, silver, and precious stones issued to an artisan versus the weight returned in the finished piece. It calculates metal recovery, accepted loss or wastage, and labor fees dynamically.",
          },
        },
        {
          "@type": "Question",
          name: "How does bullion inventory tracking prevent margin erosion?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Orivraa integrates with live commodity APIs. When gold or silver spot rates change, the value of your raw bullion reserves and finished inventory is automatically recalculated, preventing margin erosion during fabrication.",
          },
        },
      ],
    },
  ],
};

const MFG_FEATURES = [
  {
    icon: Users,
    title: "Karigar Wastage Ledgers",
    desc: "Maintain meticulous accounts of metal issued to internal or external artisans. Automatically calculate accepted loss limits and net gold recovery.",
  },
  {
    icon: Coins,
    title: "Pure Bullion Inventory",
    desc: "Track raw 24K Gold, 999 Silver, and platinum stocks in real-time. Dynamic valuation updates keep raw material assets accurate with spot prices.",
  },
  {
    icon: Scale,
    title: "Dual-Unit Accounting",
    desc: "Track inventory both by piece count and by precise weight (grams, tola, carats). Essential for precious gems and custom fabrication.",
  },
  {
    icon: Hammer,
    title: "Metallurgical BOMs",
    desc: "Build comprehensive multi-stage Bill of Materials. Track the exact alloy mixing ratios, pre-casting wax, setting, and polishing workflows.",
  },
  {
    icon: TrendingUp,
    title: "Dynamic Spot Pricing",
    desc: "Update material costs automatically using live bullion feeds.Recalculate custom order estimates instantly as international commodity rates change.",
  },
  {
    icon: ShieldCheck,
    title: "Hallmark & HUID Tracking",
    desc: "Verify purity grades (24K, 22K, 18K) and map unique Hallmark Identification Numbers (HUID) at the moment of fabrication completion.",
  },
];

const WORKFLOW = [
  {
    step: "1",
    title: "Issue Metal & Stones",
    desc: "Record raw fine gold and gems issued to the Karigar. Orivraa locks the weight to the artisan's active material ledger.",
  },
  {
    step: "2",
    title: "Track Fabrication Status",
    desc: "Monitor jobs through multi-stage pipelines: CAD designs, casting, gemstone setting, polishing, and final purity assay.",
  },
  {
    step: "3",
    title: "Receive Piece & Recalculate",
    desc: "Weigh the finished piece. Orivraa instantly isolates scrap metal, logs process wastage, and assesses acceptable loss thresholds.",
  },
  {
    step: "4",
    title: "Settle Karigar Balance",
    desc: "Close the artisan job card. Calculate labor fees per gram or per piece, post payments, and update the finished retail stock.",
  },
];

export default function JewelleryManufacturingSoftwarePage() {
  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen bg-white dark:bg-gray-950">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-16 lg:py-24">
          <div className="container mx-auto px-4 max-w-6xl text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-gold-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles className="h-3 w-3" />
              <T>Manufacturing &amp; ERP</T>
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
              <T>Jewellery Manufacturing Software</T>{" "}
              <span className="text-amber-600 dark:text-gold-400 block mt-2">
                <T>&amp; Karigar Wastage Tracker</T>
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
              <T>
                Take absolute control of your workshop operations. Orivraa's
                vertical jewellery ERP manages raw bullion stocks, tracks metal
                issued vs. returned, automates Karigar wastage ledgers, and
                calculates alloy mixing costs dynamically.
              </T>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register?role=SELLER"
                className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-base transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <T>Start Free ERP Trial</T> <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-base hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <T>View Regional Plans</T>
              </Link>
            </div>
          </div>
        </section>

        {/* ── The Problem ─────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
              <T>Why General ERPs &amp; Spreadsheets Fail Workshops</T>
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
              <p>
                <T>
                  Horizontal manufacturing software is built for static assembly
                  lines. You issue 10 widgets, you get 1 piece. Simple. But
                  precious metals demand meticulous accounting:
                </T>
              </p>
              <ul>
                <li>
                  <strong><T>Fine Purity Recalculations:</T></strong> <T>Issuing 24K gold and mixing it down to 22K, 18K, or 14K gold requires dynamic alloy formulas to ensure exact fine metal bookkeeping.</T>
                </li>
                <li>
                  <strong><T>Karigar Loss &amp; Wastage:</T></strong> <T>Handcrafting jewellery generates inevitable dust, filing scrap, and casting losses. If your software doesn't track accepted loss percentages, you are actively losing profit.</T>
                </li>
                <li>
                  <strong><T>Bullion Asset Valuation:</T></strong> <T>Raw bullion inventory must be valuated constantly based on daily metal market spot prices to keep your balance sheet accurate.</T>
                </li>
                <li>
                  <strong><T>Dual-Unit Inventory:</T></strong> <T>Precious gems and diamonds cannot be grouped as simple counts. They require detailed, non-fungible parameters (carats, cut, certificate numbers) mapped to custom castings.</T>
                </li>
              </ul>
              <p>
                <T>
                  Orivraa unifies the showroom floor and the casting workshop into
                  a single database state. No disconnected software, no manual
                  ledger books.
                </T>
              </p>
            </div>
          </div>
        </section>

        {/* ── Manufacturing Features ─────────────────────── */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <T>Built-In Features for Jewellery Artisans</T>
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-12">
              <T>
                Unify Karigar accounts, dynamic gold melting rules, and
                bill of materials on one secure B2B platform.
              </T>
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {MFG_FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700"
                >
                  <f.icon className="h-8 w-8 text-amber-600 dark:text-gold-400 mb-3" />
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                    <T>{f.title}</T>
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <T>{f.desc}</T>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Workflow ────────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              <T>The Karigar Job Card Workflow</T>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {WORKFLOW.map((s) => (
                <div key={s.step} className="text-center">
                  <div className="w-12 h-12 bg-amber-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                    {s.step}
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                    <T>{s.title}</T>
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <T>{s.desc}</T>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comparison ──────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <T>Unifying the Workshop &amp; POS</T>
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10">
              <T>
                How Orivraa compares against legacy regional ERPs and generic
                manufacturing tools.
              </T>
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">
                      <T>Capability</T>
                    </th>
                    <th className="px-4 py-3 font-semibold text-amber-700 dark:text-gold-400">
                      Orivraa ERP
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-500">
                      Legacy ERPs
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-500">
                      Horizontal MRPs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Karigar loss & wastage accounts", true, true, false],
                    ["Pure 24K Bullion stock tracker", true, true, false],
                    ["Live commodity rate calculation", true, false, false],
                    ["Alloy Karat mixing logic", true, true, false],
                    ["Real-time cloud database sync", true, false, true],
                    ["Integrated counter POS billing", true, "Limited", false],
                    ["API diamond certificate lookup", true, false, false],
                    ["Zero-IT setup under 10 mins", true, false, false],
                  ].map(([feature, orivraa, legacy, horizontal], i) => (
                    <tr
                      key={feature as string}
                      className={
                        i % 2 === 0
                          ? "bg-white dark:bg-gray-950"
                          : "bg-gray-50/50 dark:bg-gray-900/50"
                      }
                    >
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        <T>{feature as string}</T>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {orivraa ? "✅" : "❌"}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                        {typeof legacy === "string" ? legacy : legacy ? "✅" : "❌"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {horizontal ? "✅" : "❌"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────── */}
        <section className="py-16 lg:py-20 bg-gradient-to-r from-amber-600 to-yellow-500 text-white">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">
              <T>Streamline Your Workshop Operations Today</T>
            </h2>
            <p className="text-lg text-amber-100 mb-8">
              <T>
                Ditch archaic Windows servers and un-reconciled ledgers. Get complete
                metal and labor balance visibility. Free 60-day trial.
              </T>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register?role=SELLER"
                className="px-8 py-3 bg-white text-amber-700 rounded-xl font-semibold hover:bg-amber-50 transition-all shadow-lg flex items-center gap-2"
              >
                <T>Start Free Today</T> <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/jewellery-shop-software"
                className="px-8 py-3 border-2 border-white/50 text-white rounded-xl font-semibold hover:bg-white/10 transition-all"
              >
                <T>Browse Full Capabilities</T>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <AiDiscoverySection />
      <DynamicFooter />
    </>
  );
}
