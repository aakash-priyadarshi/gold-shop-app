"use client";

import { Button } from "@/components/ui/button";
import { T } from "@/components/ui/T";
import { requestSupportChat } from "@/store/help-ui";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface AISalesteamPromoProps {
  /** "section" = full marketing band, "card" = single inline card */
  variant?: "section" | "card";
  className?: string;
}

/**
 * Surfaces the floating Orivraa chat assistant and support center as the
 * help CTA on seller-facing pages.
 */
export function AISalesteamPromo({
  variant = "section",
  className = "",
}: AISalesteamPromoProps) {
  if (variant === "card") {
    return (
      <ScrollReveal direction="scale" delay={0.05} spring className={className}>
        <div
          className="rounded-2xl border border-amber-400/30 dark:border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] via-gold-500/[0.03] to-transparent backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-gold-500 text-gray-950 flex items-center justify-center flex-shrink-0 shadow-md">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                <T>Ask Orivraa AI Assistant (Free on Every Plan)</T>
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
                <T>
                  Have questions before you sign up? Ask about pricing, GST/VAT,
                  old-gold exchange, offline billing, or how artisan (karigar)
                  metal tracking works — in Hindi, Nepali, or English. Free, no signup.
                </T>
              </p>
              <div className="flex flex-wrap gap-2">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-amber-400 to-gold-500 text-gray-950 font-bold hover:brightness-105 shadow-sm active:scale-95 transition-all"
                    onClick={() =>
                      requestSupportChat({
                        message:
                          "I want help choosing the right Orivraa setup for my jewellery shop.",
                      })
                    }
                  >
                    <T>Open Orivraa AI</T>
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </motion.div>
                <Link href="/support">
                  <Button size="sm" variant="outline" className="active:scale-95 transition-all">
                    <T>Support center</T>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    );
  }

  return (
    <section
      className={`relative overflow-hidden bg-gradient-to-b from-[#080e16] via-[#0d1624] to-[#080e16] border-y border-gold-500/15 py-16 lg:py-24 ${className}`}
    >
      {/* Radiant ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(212,175,55,0.12),rgba(0,0,0,0))]" />
      
      {/* Floating blurred ambient orbs */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-10 left-1/4 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1.15, 1, 1.15], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="absolute bottom-10 right-1/4 w-80 h-80 bg-gold-500/20 rounded-full blur-3xl pointer-events-none"
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center text-white">
          <ScrollReveal direction="assemble" delay={0.05} spring>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/25 text-gold-300 text-xs sm:text-sm font-semibold mb-6 shadow-sm">
              <Sparkles className="h-4 w-4 text-gold-400 animate-spin" style={{ animationDuration: "7s" }} />
              <T>Chat-first support for jewellers</T>
            </div>
          </ScrollReveal>
          
          <ScrollReveal direction="assemble" delay={0.12} spring>
            <h2 className="text-3xl lg:text-5xl font-black mb-4 tracking-tight leading-tight text-white">
              <T>Need help before you sign up?</T>
            </h2>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.18} spring>
            <p className="text-base lg:text-lg text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              <T>
                Our AI assistant is 100% free on every plan. Ask anything before you commit —
                how much it costs, whether it works offline, how old-gold exchange is billed,
                or how to track the metal you give each artisan (karigar). Instant answers, no signup.
              </T>
            </p>
          </ScrollReveal>

          <ScrollReveal direction="assemble" delay={0.25} spring>
            <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-400 via-gold-400 to-amber-500 text-gray-950 hover:brightness-105 h-12 px-8 rounded-xl text-base font-extrabold shadow-[0_0_25px_rgba(212,175,55,0.25)] active:scale-95 transition-all border-none"
                  onClick={() =>
                    requestSupportChat({
                      message:
                        "I need help understanding Orivraa pricing, onboarding, and support options.",
                    })
                  }
                >
                  <Sparkles className="mr-2 h-5 w-5 text-gray-950" />
                  <T>Ask Orivraa AI</T>
                </Button>
              </motion.div>
              <Link href="/support" className="w-full sm:w-auto">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto bg-white/[0.05] hover:bg-white/[0.1] text-white border-white/20 hover:border-gold-400/40 backdrop-blur-md h-12 px-8 rounded-xl text-base font-semibold active:scale-95 transition-all"
                  >
                    <T>Open support center</T>
                  </Button>
                </motion.div>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

