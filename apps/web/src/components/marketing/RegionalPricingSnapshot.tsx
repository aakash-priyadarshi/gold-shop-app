"use client";

import { subscriptionPlansApi } from "@/lib/api";
import {
  COUNTRIES,
  CURRENCIES,
  usePreferencesStore,
  type CountryCode,
  type CurrencyCode,
} from "@/store/preferences";
import { ArrowRight, Check, Crown, Globe, Loader2, Sparkles, Store } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { T } from "@/components/ui/T";

interface PlanFromAPI {
  id: string;
  name: string;
  displayName: string;
  description: string;
  country: string;
  currency: CurrencyCode;
  monthlyPrice: number;
  annualPrice: number;
  maxProducts: number | null;
  maxInvoicesPerMonth: number | null;
  maxCatalogues: number | null;
  catalogueLimit: number | null;
  maxOrdersPerMonth: number | null;
  commissionPercent: number;
  includesAi: boolean;
  monthlyAiCredits: number;
  rolloverCap: number;
  extraCreditPrice: number;
  overageBehavior: string;
  features: Record<string, boolean | string | number>;
  sortOrder: number;
  badgeText?: string | null;
  buttonColor?: string | null;
}

type RegionalPricingSnapshotProps = {
  eyebrow?: string;
  description?: string;
};

export const BUYER_COUNTRY_COUNT = 27;

export const LIVE_LOCAL_PRICING_SUMMARY =
  "Free plan available. Paid plans use live local pricing by country, and the pricing page shows the current regional rates.";

function currencySymbol(code: CurrencyCode): string {
  return CURRENCIES[code]?.symbol ?? code;
}

function formatPrice(amount: number, currency: CurrencyCode): string {
  const sym = currencySymbol(currency);
  if (amount === 0) return `${sym}0`;

  const hasDecimals = amount % 1 !== 0;
  try {
    const locale = CURRENCIES[currency]?.locale ?? "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    }).format(amount);
  } catch {
    return `${sym}${amount.toLocaleString()}`;
  }
}

function getListingLimitText(plan: PlanFromAPI | undefined): string {
  if (!plan) return "Live plan details update by market.";

  const limit = plan.catalogueLimit ?? plan.maxProducts;
  return limit
    ? `Up to ${limit.toLocaleString()} product listings.`
    : "Unlimited product listings.";
}

export function RegionalPricingSnapshot({
  eyebrow = "Live pricing snapshot",
  description =
    "This page uses the same live plan service as the main pricing page, so regional monthly rates stay aligned here too.",
}: RegionalPricingSnapshotProps) {
  const [plans, setPlans] = useState<PlanFromAPI[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const country = usePreferencesStore((state) => state.country);
  const detectedCountry = usePreferencesStore((state) => state.detectedCountry);
  const pricingCountry =
    detectedCountry && COUNTRIES[detectedCountry] ? detectedCountry : country;

  const fetchPlans = useCallback(async (market: CountryCode) => {
    try {
      setLoadingPlans(true);
      const res = await subscriptionPlansApi.getAvailable(market);
      const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setPlans(data);
    } catch {
      setPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans(pricingCountry);
  }, [fetchPlans, pricingCountry]);

  const sortedPlans = useMemo(
    () => [...plans].sort((left, right) => left.sortOrder - right.sortOrder),
    [plans],
  );

  const freePlan = sortedPlans.find((plan) => plan.name === "FREE");
  const proPlan = sortedPlans.find((plan) => plan.name === "PRO");
  const proPlusPlan = sortedPlans.find((plan) => plan.name === "PRO_PLUS");
  const pricingMarketLabel = COUNTRIES[pricingCountry]?.name ?? pricingCountry;
  const liveCurrency =
    freePlan?.currency ??
    proPlan?.currency ??
    proPlusPlan?.currency ??
    (COUNTRIES[pricingCountry]?.defaultCurrency as CurrencyCode) ??
    "USD";

  return (
    <section className="border-y border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
              <T>{eyebrow}</T>
            </p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white lg:text-3xl">
              <T>Current plans for</T> {pricingMarketLabel}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
              <T>{description}</T>
            </p>
          </div>

          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
          >
            <T>Open full pricing page</T>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loadingPlans ? (
          <div className="flex items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50/70 py-14 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="inline-flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
              <T>Loading live regional pricing...</T>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-emerald-600 shadow-sm dark:bg-emerald-900/40 dark:text-emerald-300">
                <Store className="h-5 w-5" />
              </div>
              <p className="mt-5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                <T>Free plan</T>
              </p>
              <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {freePlan ? formatPrice(freePlan.monthlyPrice, freePlan.currency) : <T>Free</T>}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                <T>Marketplace access, catalogues, messaging, and core shop tools.</T>
              </p>
            </div>

            <div className="rounded-3xl border border-amber-300 bg-white p-6 shadow-sm dark:border-amber-700 dark:bg-gray-950">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                <Crown className="h-5 w-5" />
              </div>
              <p className="mt-5 text-sm font-semibold text-amber-700 dark:text-amber-300">
                {proPlan?.displayName.replace(/\s*\(.*?\)\s*$/, "") ?? "Pro"}
              </p>
              <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {proPlan ? formatPrice(proPlan.monthlyPrice, proPlan.currency) : <T>Unavailable</T>}
                {proPlan && (
                  <span className="ml-1 text-base font-medium text-gray-500 dark:text-gray-400">
                    <T>/month</T>
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {proPlan
                  ? getListingLimitText(proPlan)
                  : "Live Pro pricing is not available for this market yet."}
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="mt-5 text-sm font-semibold text-violet-700 dark:text-violet-300">
                {proPlusPlan?.displayName.replace(/\s*\(.*?\)\s*$/, "") ?? "Pro+"}
              </p>
              <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {proPlusPlan ? formatPrice(proPlusPlan.monthlyPrice, proPlusPlan.currency) : <T>Unavailable</T>}
                {proPlusPlan && (
                  <span className="ml-1 text-base font-medium text-gray-500 dark:text-gray-400">
                    <T>/month</T>
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {proPlusPlan?.includesAi
                  ? `${proPlusPlan.monthlyAiCredits.toLocaleString()} AI credits/month with advanced automation.`
                  : "Advanced automation, analytics, and higher limits for growing shops."}
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
                <Globe className="h-5 w-5" />
              </div>
              <p className="mt-5 text-sm font-semibold text-sky-700 dark:text-sky-300">
                <T>Marketplace reach</T>
              </p>
              <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {BUYER_COUNTRY_COUNT}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                <T>Buyer countries actively browsing Orivraa product listings and enquiries.</T>
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 inline-flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4 text-amber-500" />
            <T>Final billing is verified against your shop country.</T>
          </span>
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4 text-amber-500" />
            <T>Currently showing</T> {pricingMarketLabel} <T>pricing in</T>{" "}
            {currencySymbol(liveCurrency)} ({liveCurrency})
          </span>
        </div>
      </div>
    </section>
  );
}