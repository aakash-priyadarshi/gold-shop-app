"use client";

import { useFeatures } from "@/hooks/useFeatures";
import { Loader2, Lock, Smartphone } from "lucide-react";
import Link from "next/link";

/** Map of mobile feature key → minimum plan required */
export const MOBILE_FEATURE_PLANS: Record<string, "Pro" | "Pro+"> = {
  mobileQuotes: "Pro",
  mobileRepairs: "Pro",
  mobileCustomers: "Pro",
  mobileSavings: "Pro",
  mobileWhatsAppShare: "Pro",
  mobileTaxReports: "Pro+",
  mobileOfflineMode: "Pro+",
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
 * renders an upgrade prompt instead. Free-tier features (mobilePOS, mobileRateCard,
 * mobileOrders) always pass through once loaded.
 */
export function MobileFeatureGate({
  feature,
  featureName,
  children,
}: MobileFeatureGateProps) {
  const { hasFeature, loading } = useFeatures();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!hasFeature(feature)) {
    const requiredPlan = MOBILE_FEATURE_PLANS[feature] ?? "Pro";
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
            This feature is available on the{" "}
            <span className="font-semibold text-amber-600">{requiredPlan} plan</span>{" "}
            and above.
          </p>
        </div>

        {/* Upgrade CTA */}
        <Link
          href="/dashboard/shop/billing?tab=plans"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 text-white text-sm font-semibold shadow-sm hover:bg-amber-600 transition-colors"
        >
          Upgrade to {requiredPlan}
        </Link>

        <p className="text-xs text-gray-300">
          No contracts · Cancel anytime
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
