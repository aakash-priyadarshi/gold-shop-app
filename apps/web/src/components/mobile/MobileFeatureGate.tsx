"use client";

import { useFeatures } from "@/hooks/useFeatures";
import { Loader2, Lock, Smartphone, Sparkles, Crown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { sellerSubscriptionsApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import { isPreviewableFeature } from "@/lib/feature-tiers";
import { UpgradeNudge } from "@/components/UpgradeNudge";

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
  const t = useT();
  const { hasFeature, loading, planName } = useFeatures();
  const [activating, setActivating] = useState(false);

  const handleActivateTrial = async () => {
    try {
      setActivating(true);
      await sellerSubscriptionsApi.activateTrial();
      toast({
        title: t("Premium Trial Activated!"),
        description: t("Welcome to PRO! Enjoy 60 days of premium CRM and POS features completely free."),
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      toast({
        title: t("Trial Activation Failed"),
        description: err?.response?.data?.message || t("Could not activate trial. Please contact support."),
        variant: "destructive",
      });
    } finally {
      setActivating(false);
    }
  };

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
    const isFree = planName?.toUpperCase() === "FREE";

    // Basic USP screens (quotes, customers, catalogue, WhatsApp share, tax
    // reports) are never hard-walled — render them with a soft, dismissible
    // upgrade nudge so people can keep trying the core app. Only AI + enterprise
    // features fall through to the full upgrade wall below.
    if (isPreviewableFeature(effectiveKey)) {
      return (
        <div className="flex flex-col h-full">
          <UpgradeNudge featureKey={effectiveKey} featureName={featureName} compact />
          {children}
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-6 text-center bg-gray-50 dark:bg-gray-900 min-h-[80vh]">
        {/* Icon */}
        <div className="relative">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shadow-inner">
            <Smartphone className="h-8 w-8 text-amber-500" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border-2 border-white dark:border-gray-800 flex items-center justify-center shadow">
            <Lock className="h-3 w-3 text-gray-500 dark:text-gray-400" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5 max-w-[280px]">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{featureName}</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
            {planName ? (
              <>
                Your{" "}
                <span className="font-semibold text-amber-600 dark:text-amber-400">{planName}</span>{" "}
                plan doesn&apos;t include this feature yet.
              </>
            ) : (
              <>This feature requires a premium plan.</>
            )}
          </p>
        </div>

        {/* 60-Day Premium Trial Offer (rendered for FREE users) */}
        {isFree ? (
          <div className="w-full max-w-[320px] rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-b from-amber-50/50 to-orange-50/20 dark:from-amber-950/20 dark:to-orange-950/10 p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
              <Crown className="h-3.5 w-3.5 text-amber-500" />
              <span>{t("Limited Time Offer")}</span>
            </div>
            <p className="text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
              {t("Claim a 60-Day Free Trial of our Premium PRO plan right now! Unlock walk-in Quotes, karigar Repairs tracking, customer CRM databases, gold Savings Schemes, and WhatsApp sharing immediately.")}
            </p>
            <button
              onClick={handleActivateTrial}
              disabled={activating}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all duration-300 active:scale-95"
            >
              {activating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t("Unlocking...")}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 fill-white" />
                  <span>{t("Activate 60-Day Pro Trial")}</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              {t("No credit card required · Claim once per account")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full max-w-[280px]">
            <Link
              href="/dashboard/shop/billing?tab=plans"
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow transition-colors text-center"
            >
              {t("View Plans")}
            </Link>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              {t("Upgrade to enjoy higher resource limits")}
            </p>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
