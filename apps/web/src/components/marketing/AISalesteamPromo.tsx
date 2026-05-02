"use client";

import { Button } from "@/components/ui/button";
import { T } from "@/components/ui/T";
import { ArrowRight, Mic, Phone, Sparkles } from "lucide-react";
import Link from "next/link";

interface AISalesteamPromoProps {
  /** "section" = full marketing band, "card" = single inline card */
  variant?: "section" | "card";
  className?: string;
}

/**
 * Surfaces the existing AI sales agent and Pipecat voice bot as a
 * conversion CTA on seller-facing pages.
 */
export function AISalesteamPromo({
  variant = "section",
  className = "",
}: AISalesteamPromoProps) {
  if (variant === "card") {
    return (
      <div
        className={`rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 p-6 ${className}`}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
            <Mic className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              <T>Talk to our AI shopkeeper now</T>
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              <T>
                Get answers about pricing, features, or onboarding in Hindi,
                Nepali, or English — instantly.
              </T>
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/ai-sales-team">
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                  <T>Start chat</T>
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/ai-sales-team?mode=voice">
                <Button size="sm" variant="outline">
                  <Phone className="mr-1 h-4 w-4" />
                  <T>Voice call</T>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      className={`relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 py-14 lg:py-20 ${className}`}
    >
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-yellow-200 rounded-full blur-3xl" />
      </div>
      <div className="container mx-auto px-4 relative">
        <div className="max-w-3xl mx-auto text-center text-white">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            <T>New — AI sales team available 24/7</T>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            <T>Have questions? Talk to our AI shopkeeper.</T>
          </h2>
          <p className="text-lg text-white/90 mb-8 leading-relaxed">
            <T>
              Pricing, demos, onboarding, integrations — get instant answers in
              Hindi, Nepali, or English. Or call our voice bot for a guided
              walkthrough.
            </T>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/ai-sales-team">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-amber-600 hover:bg-gray-100 h-12 px-8 rounded-xl text-base font-semibold"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                <T>Chat with AI sales</T>
              </Button>
            </Link>
            <Link href="/ai-sales-team?mode=voice">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-transparent text-white border-white/60 hover:bg-white/10 h-12 px-8 rounded-xl text-base"
              >
                <Phone className="mr-2 h-5 w-5" />
                <T>Call in Hindi / Nepali</T>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
