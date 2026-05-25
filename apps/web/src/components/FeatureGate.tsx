"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock, Sparkles, Crown, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { sellerSubscriptionsApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";

/**
 * FeatureGate — wraps UI sections and shows an upgrade prompt when the
 * required feature is disabled on the seller's current plan.
 * If the user is on the FREE plan, it displays a premium contextual 60-day trial activator card.
 */
export function FeatureGate({
  feature,
  featureLabel,
  hasFeature,
  planName,
  loading,
  children,
}: {
  /** Feature key to check (e.g. "invoicing", "crm", "multiBranch") */
  feature: string;
  /** Human-readable label for the feature (shown in upgrade prompt) */
  featureLabel?: string;
  /** Function from useFeatures hook */
  hasFeature: (key: string) => boolean;
  /** Current plan name for display */
  planName: string | null;
  /** Whether features are still loading */
  loading?: boolean;
  children: React.ReactNode;
}) {
  const t = useT();
  const [activating, setActivating] = useState(false);

  const handleActivateTrial = async () => {
    try {
      setActivating(true);
      await sellerSubscriptionsApi.activateTrial();
      toast({
        title: t("Premium Trial Activated!"),
        description: t("Welcome to PRO! Enjoy 60 days of premium CRM, quotes, and POS features completely free."),
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

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
        <span>{t("Loading features...")}</span>
      </div>
    );
  }

  if (!hasFeature(feature)) {
    const label = featureLabel || feature.replace(/([A-Z])/g, " $1").trim();
    const isFree = planName?.toUpperCase() === "FREE";

    return (
      <Card className="border-dashed border-2 border-muted bg-white dark:bg-gray-900/50 shadow-sm max-w-2xl mx-auto my-8">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 shadow-inner">
            <Lock className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">
            {t(label)} is not available on your plan
          </CardTitle>
          <CardDescription className="text-sm">
            Your <strong>{planName || "current"}</strong> plan does not include{" "}
            <strong>{t(label)}</strong>. Upgrade to unlock this feature.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 pb-8">
          <div className="flex gap-3">
            <Link href="/dashboard/shop/billing?tab=plans">
              <Button variant="outline" className="h-10 px-6 font-semibold">
                {t("View Plans & Pricing")}
              </Button>
            </Link>
          </div>

          {/* Contextual 60-Day Free Trial Offer Banner for FREE Plan Sellers */}
          {isFree && (
            <div className="w-full max-w-lg rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/40 via-orange-50/10 to-transparent dark:from-amber-950/20 dark:via-orange-950/10 p-5 text-center space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                <Crown className="h-4 w-4 text-amber-500" />
                <span>{t("Limited Time Premium Offer")}</span>
              </div>
              <p className="text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed max-w-md mx-auto">
                {t("Don't let plan limits slow you down. Start a 60-day Premium PRO trial in one click! Unlock full customer CRM databases, customized quotes, digital invoice sharing, stock ledgers, and automated restock insights immediately.")}
              </p>
              <div className="flex justify-center">
                <Button
                  onClick={handleActivateTrial}
                  disabled={activating}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-5 rounded-xl shadow-md transition-all duration-300 active:scale-95 flex items-center gap-2"
                >
                  {activating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t("Unlocking Premium POS...")}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 fill-white" />
                      <span>{t("Activate 60-Day Premium Trial")}</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {t("No credit card required · Offer claimable once per account")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
