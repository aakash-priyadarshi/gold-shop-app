"use client";

import { Button } from "@/components/ui/button";
import { T } from "@/components/ui/T";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SampleBillByMarket } from "@/components/marketing/SampleBillByMarket";
import {
  ArrowRight,
  Calculator,
  Gem,
  Layers,
  Receipt,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const PILLARS = [
  {
    icon: Sparkles,
    title: "Live gold & silver rates",
    desc: "Metal lines refresh from today's rate card — gram, tola, ounce, or laal — so counter staff never bill on yesterday's price.",
  },
  {
    icon: Gem,
    title: "Gemstone pricing engine",
    desc: "Diamonds, ruby, sapphire, and more — priced by type, size, quality tier, and origin (natural vs lab-grown). Set your own shop rates or use Orivraa's reference catalog.",
  },
  {
    icon: Calculator,
    title: "Making + wastage (jarti)",
    desc: "Labour and customer wastage stay separate lines. Change weight or rate and the whole bill recalculates instantly.",
  },
  {
    icon: Receipt,
    title: "Country-aware tax",
    desc: "GST, Skill Promotion Fee, gemstone VAT, UAE/UK/EU VAT, US sales tax, and Sri Lanka VAT — each shown on the invoice, not buried in one total.",
  },
  {
    icon: Layers,
    title: "Your shop rate card",
    desc: "Override any price — metals, gemstones, plating, finishes, making charges — from Pricing Setup. Orivraa shows the reference; you set the final rate.",
  },
];

export function BillingCalculationSpotlight() {
  return (
    <section
      id="jewellery-billing-calculation"
      data-tour="billing-calculation-spotlight"
      className="relative py-12 lg:py-20 bg-white dark:bg-gray-950 border-b border-gray-150 dark:border-gray-900/60 overflow-hidden"
    >
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          <div className="space-y-6">
            <ScrollReveal direction="assemble" delay={0.05} spring>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-500/10 text-gold-700 dark:text-gold-300 text-xs font-semibold uppercase tracking-wide border border-gold-500/20">
                <Calculator className="h-3.5 w-3.5" />
                <T>Transparent jewellery billing</T>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="assemble" delay={0.1} spring>
              <h2 className="text-2xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                <T>
                  See exactly how every bill is calculated — before you print
                </T>
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.16} spring>
              <p className="text-gray-600 dark:text-gray-300 text-sm lg:text-base leading-relaxed max-w-lg">
                <T>
                  Orivraa builds each invoice from weight, live gold and silver
                  rates, gemstone pricing by type and quality, making charges,
                  wastage (jarti), stone value, and your country&apos;s tax
                  rules — India, Nepal, UAE, UK, Europe, USA, and Sri Lanka.
                  Your shop rates override the reference at every step. No side
                  spreadsheet. No guessing at the counter.
                </T>
              </p>
            </ScrollReveal>

            <ScrollReveal direction="up" staggerChildren={0.06} className="space-y-3">
              {PILLARS.map((pillar) => (
                <motion.div
                  key={pillar.title}
                  whileHover={{ x: 5, transition: { duration: 0.2 } }}
                  className="flex gap-3 p-2 rounded-xl hover:bg-gold-50/40 dark:hover:bg-gold-950/20 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-gold-100 dark:bg-gold-900/40 border border-gold-200/40 dark:border-gold-800/40 flex items-center justify-center shrink-0 shadow-sm">
                    <pillar.icon className="h-4 w-4 text-gold-600 dark:text-gold-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      <T>{pillar.title}</T>
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mt-0.5">
                      <T>{pillar.desc}</T>
                    </p>
                  </div>
                </motion.div>
              ))}
            </ScrollReveal>

            <ScrollReveal direction="assemble" delay={0.28} spring>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
                <Link href="/auth/register">
                  <Button
                    size="lg"
                    className="h-11 px-7 rounded-xl text-sm font-bold gold-gradient text-white shadow-md active:scale-95 transition-all"
                  >
                    <T>Start free trial</T>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/jewellery-shop-billing-software">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-11 px-7 rounded-xl text-sm font-bold active:scale-95 transition-all"
                  >
                    <T>See billing software</T>
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="h-11 px-5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 active:scale-95 transition-all"
                  >
                    <T>Watch billing demo</T>
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal direction="right" delay={0.12}>
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-[#faf6f0] to-white dark:from-[#0b1420] dark:to-gray-950 shadow-xl overflow-hidden hover:border-gold-400/30 transition-colors"
            >
              <SampleBillByMarket className="border-0 rounded-none bg-transparent dark:bg-transparent" />

              <div className="mx-4 mb-4 rounded-xl border border-gold-300/40 bg-gold-50/60 dark:bg-gold-950/20 p-3">
                <div className="flex items-start gap-2">
                  <Layers className="h-4 w-4 text-gold-600 dark:text-gold-400 shrink-0 mt-0.5" />
                  <div className="font-sans text-[11px]">
                    <p className="font-bold text-gray-900 dark:text-white">
                      <T>Bridal jewellery set</T>
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 mt-0.5">
                      <T>
                        Necklace + bangles + earrings · Set discount −5% · One
                        line at POS · Components tracked in vault until set is
                        broken
                      </T>
                    </p>
                  </div>
                  <Gem className="h-4 w-4 text-gold-500 shrink-0 opacity-60" />
                </div>
              </div>
            </motion.div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
