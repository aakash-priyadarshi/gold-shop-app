"use client";

import { useFeatures } from "@/hooks/useFeatures";
import { Loader2, Lock, Smartphone } from "lucide-react";
import Link from "next/link";

/**
 * Maps a mobile-only feature key to the backend feature key that the admin can
 * toggle per plan on /dashboard/admin/billing.
 *
 *   - `null`  → mobile-only feature with no backend gate; pass through (core
 *                POS functionality available to every shopkeeper).
 *   - string  → the corresponding feature key on the backend plan (e.g.
 *                `customerManagement`). If that backend feature is enabled on
 *                the shop's active plan, the mobile screen unlocks.
 *
 * Any mobile feature NOT listed here falls back to looking up its own key on
 * the backend (legacy behaviour).
 */
const MOBILE_TO_BACKEND_FEATURE: Record<string, string | null> = {
  // Core POS workflows — always available to authenticated shopkeepers
  mobilePOS: null,
  mobileOrders: null,
  mobileRateCard: null,
  mobileBroadcast: null,
  mobileRepairs: null,
  mobileSavings: null,
  mobileAlerts: null,
  mobilePending: null,
  mobileOccasions: null,
  mobilePurity: null,
  mobileSummary: null,
  mobileOfflineMode: null,
  exchange: null,

  // Gated — admin controls these per plan in /dashboard/admin/billing
  mobileQuotes: "invoicing",
  // The backend CustomerCrmController is gated by @RequireFeature("crm"), so
  // the mobile customer directory must check the same key — using a different
  // key (e.g. customerManagement) would unlock the UI but the API would still
  // return 403.
  mobileCustomers: "crm",
  mobileTaxReports: "taxReportsDownload",
  mobileWhatsAppShare: "crm",
  mobileCatalogue: "crm",
};

interface MobileFeatureGateProps {
  /** Feature key matching the plan's features JSON (e.g. "mobileRepairs") */
  feature: string;
  /** Human-readable feature name shown in the upgrade prompt */
  featureName: string;
  children: React.ReactNode;
}

/**
 * Wraps mobile page content. If the current plan doesn't include `feature`,
 * renders an upgrade prompt instead. Mobile-only feature keys (like
 * `mobileCustomers`) are mapped to the matching backend feature key so the
 * admin's plan configuration on /dashboard/admin/billing actually takes
 * effect — without this map, Pro/Pro+ shops always saw "upgrade" because the
 * mobile keys don't exist on the backend plan.
 */
export function MobileFeatureGate({
  feature,
  featureName,
  children,
}: MobileFeatureGateProps) {
  const { hasFeature, loading, planName } = useFeatures();

  // Resolve mobile key → backend key (null = free / always allow).
  const mapped = MOBILE_TO_BACKEND_FEATURE[feature];
  const effectiveKey = mapped === undefined ? feature : mapped;
  if (effectiveKey === null) {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
        </div>
      );
    }
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!hasFeature(effectiveKey)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 gap-5 text-center">
        {/* Icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-amber-50 flex items-center justify-center">
            <Smartphone className="h-10 w-10 text-amber-400" />
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
            <Lock className="h-4 w-4 text-gray-500" />
          </div>
        </div>

        {/* Copy */}
        <div className="space-y-1.5">
          <p className="text-base font-bold text-gray-900">{featureName}</p>
          <p className="text-sm text-gray-400 leading-relaxed">
            {planName ? (
              <>
                Your{" "}
                <span className="font-semibold text-amber-600">{planName}</span>{" "}
                doesn&apos;t include this feature yet.
              </>
            ) : (
              <>This feature requires a higher plan.</>
            )}
          </p>
        </div>

        {/* Upgrade CTA */}
        <Link
          href="/dashboard/shop/billing?tab=plans"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 text-white text-sm font-semibold shadow-sm hover:bg-amber-600 transition-colors"
        >
          View plans
        </Link>

        <p className="text-xs text-gray-300">
          No contracts · Cancel anytime
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
