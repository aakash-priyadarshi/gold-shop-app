"use client";

import { Crown, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/providers/translation-provider";

interface UpgradeNudgeProps {
  /** Feature key — used to remember dismissal so we don't nag on every visit. */
  featureKey: string;
  /** Human-readable feature name shown in the nudge. */
  featureName?: string;
  /** Compact styling for mobile screens. */
  compact?: boolean;
}

/**
 * Soft, dismissible upgrade nudge shown above a previewable feature instead of
 * a hard pay-wall. Lets people keep using core USP features while gently
 * pointing them at the PRO plan for AI design & enterprise tools.
 */
export function UpgradeNudge({ featureKey, featureName, compact }: UpgradeNudgeProps) {
  const t = useT();
  const storageKey = `orivraa_nudge_dismissed_${featureKey}`;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className={`flex items-start gap-2.5 border-b border-amber-200/60 bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:border-amber-800/40 print:hidden ${
        compact ? "px-4 py-2" : "px-4 py-2.5"
      }`}
    >
      <Crown className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
      <div className="min-w-0 flex-1">
        <p className={`font-semibold text-amber-800 dark:text-amber-300 ${compact ? "text-[11px]" : "text-xs"}`}>
          {featureName
            ? t(`You're previewing ${featureName}`)
            : t("You're previewing a premium feature")}
        </p>
        <p className={`mt-0.5 leading-normal text-amber-700 dark:text-amber-400 ${compact ? "text-[10px]" : "text-[11px]"}`}>
          {t("Keep using it free. Upgrade to PRO for AI design generation, multi-branch and advanced tools.")}
        </p>
      </div>
      <Link
        href="/dashboard/shop/billing?tab=plans"
        className={`whitespace-nowrap font-bold text-amber-600 underline dark:text-amber-400 ${compact ? "text-[10px]" : "text-[11px]"}`}
      >
        {t("View plans")}
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("Dismiss")}
        className="ml-1 flex-shrink-0 rounded-full p-0.5 text-amber-500/70 transition hover:bg-amber-500/10 hover:text-amber-600"
      >
        <X className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    </div>
  );
}
