"use client";

import { T } from "@/components/ui/T";
import { BRAND } from "@/config/brand";
import { CalendarClock, Handshake, Store } from "lucide-react";
import Link from "next/link";

/**
 * Honest E-E-A-T story for Google and jewellers:
 * 10+ years serving customers at the counter; the software went cloud in January 2026.
 */
export function HeritageTrust({
  variant = "section",
}: {
  variant?: "section" | "story" | "footer";
}) {
  const years = String(BRAND.heritage.servingYears);
  const launch = BRAND.heritage.cloudLaunchLabel;
  const launchIso = BRAND.heritage.cloudLaunchIso;

  if (variant === "footer") {
    return (
      <p className="mt-3 text-xs text-gray-500 leading-relaxed">
        <T>More than</T> {years} <T>years serving jewellery customers. Cloud software since</T>{" "}
        <time dateTime={launchIso}>{launch}</time>.
      </p>
    );
  }

  if (variant === "story") {
    return (
      <section
        className="py-16 lg:py-20 bg-amber-50/80 dark:bg-amber-950/10 border-y border-amber-100 dark:border-amber-900/30"
        aria-labelledby="heritage-story-heading"
      >
        <div className="container mx-auto px-4 max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
            <T>Our story</T>
          </p>
          <h2
            id="heritage-story-heading"
            className="mt-3 text-3xl md:text-4xl font-bold text-gray-900 dark:text-white"
          >
            <T>A decade at the counter. Cloud software since</T>{" "}
            <time dateTime={launchIso}>{launch}</time>.
          </h2>
          <p className="mt-5 text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
            <T>
              Orivraa did not start as a generic SaaS template. The people
              behind it spent more than ten years serving jewellery customers
              in person — weighing gold, explaining making charges, exchanging
              old ornaments, and closing the day&apos;s book when the shutter
              came down. That is why the product talks in tola and jarti, not
              only SKUs and barcodes.
            </T>
          </p>
          <p className="mt-4 text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
            <T>
              In January 2026 we brought that shop-floor practice online. The
              same discipline is now cloud software: a phone at the counter, a
              laptop in the office, a desktop till that still works when the
              internet blips. New stack. Old respect for the trade.
            </T>
          </p>
          <dl className="mt-10 grid sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white dark:bg-gray-950 border border-amber-200/70 dark:border-amber-900/40 p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                <T>Trade experience</T>
              </dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {years}+ <span className="text-base font-semibold"><T>years</T></span>
              </dd>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                <T>Serving jewellery customers before we shipped a cloud login</T>
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-gray-950 border border-amber-200/70 dark:border-amber-900/40 p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                <T>Cloud launch</T>
              </dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                <time dateTime={launchIso}>{launch}</time>
              </dd>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                <T>Orivraa went live as browser and app software this year</T>
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-gray-950 border border-amber-200/70 dark:border-amber-900/40 p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                <T>What did not change</T>
              </dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                <T>The till</T>
              </dd>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                <T>Live rates, wastage, GST/VAT, and a person still confirming money</T>
              </p>
            </div>
          </dl>
        </div>
      </section>
    );
  }

  return (
    <section
      className="py-10 lg:py-12 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-900"
      aria-labelledby="heritage-heading"
    >
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto rounded-3xl border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-950/20 dark:via-gray-950 dark:to-gray-900 p-6 lg:p-8">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2">
                <T>Why jewellers trust the people, not just the login</T>
              </p>
              <h2
                id="heritage-heading"
                className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white"
              >
                <T>Ten years serving customers. Cloud-born in</T>{" "}
                <time dateTime={launchIso}>{launch}</time>.
              </h2>
              <p className="mt-3 text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                <T>
                  Before Orivraa was a website, we spent more than a decade
                  serving jewellery customers across the counter. In January
                  2026 we put that craft into cloud software — so a family shop
                  can bill in tola, track karigar gold, and still look a buyer
                  in the eye.
                </T>
              </p>
              <p className="mt-3 text-sm">
                <Link
                  href="/about"
                  className="font-semibold text-amber-800 dark:text-amber-400 hover:underline"
                >
                  <T>Read the January 2026 cloud story</T>
                </Link>
              </p>
            </div>
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                <Handshake className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <T>More than</T> {years}{" "}
                  <T>years of jewellery customer service — quotes, old-gold exchange, and closing the book</T>
                </span>
              </li>
              <li className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                <CalendarClock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <T>Went online as cloud software in</T>{" "}
                  <time dateTime={launchIso}>{launch}</time>
                  {" — "}
                  <T>phone, laptop, and desktop, not a disc in a cupboard</T>
                </span>
              </li>
              <li className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                <Store className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <T>
                    Built for the shop that already knew the trade — we digitised the counter, we did not invent it
                  </T>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
