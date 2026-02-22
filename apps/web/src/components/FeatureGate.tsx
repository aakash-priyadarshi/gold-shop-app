"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";

/**
 * FeatureGate — wraps UI sections and shows an upgrade prompt when the
 * required feature is disabled on the seller's current plan.
 *
 * Usage:
 *   <FeatureGate feature="invoicing" hasFeature={hasFeature} planName={planName}>
 *     <InvoicesContent />
 *   </FeatureGate>
 *
 * Or with loading state:
 *   <FeatureGate feature="crm" hasFeature={hasFeature} planName={planName} loading={loading}>
 *     <CrmContent />
 *   </FeatureGate>
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
  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (!hasFeature(feature)) {
    const label = featureLabel || feature.replace(/([A-Z])/g, " $1").trim();
    return (
      <Card className="border-dashed border-2 border-muted">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">
            {label} is not available on your plan
          </CardTitle>
          <CardDescription>
            Your <strong>{planName || "current"}</strong> plan does not include{" "}
            <strong>{label}</strong>. Upgrade to unlock this feature.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <Link href="/dashboard/shop/billing?tab=upgrade">
            <Button variant="default" className="gap-2">
              <Sparkles className="h-4 w-4" />
              View Plans & Upgrade
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
