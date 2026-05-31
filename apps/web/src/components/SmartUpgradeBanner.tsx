"use client";

import { useConversionSignals } from "@/hooks/useConversionSignals";
import {
  computeNudge,
  FREE_SOFT_LIMITS,
  type NudgeDescriptor,
} from "@/lib/conversion-nudges";
import { formatCurrencyAmount, type SupportedCurrencyCode } from "@/lib/currency";
import { useT } from "@/providers/translation-provider";
import { Crown, Sparkles, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const DISMISS_KEY = "orivraa_smart_nudge_dismissed";
const BILLING_HREF = "/dashboard/shop/billing?tab=plans";

const METRIC_LABELS: Record<keyof typeof FREE_SOFT_LIMITS, string> = {
  customers: "customers",
  invoicesPerMonth: "bills this month",
  products: "products",
  savingsSchemes: "savings schemes",
};

interface SmartUpgradeBannerProps {
  /** Tighter styling for mobile screens. */
  compact?: boolean;
}

/**
 * Global, soft, dismissible upgrade banner driven by real usage + trial state.
 * Shows AT MOST ONE nudge (trial-ending / soft-limit / milestone) and never
 * blocks anything. Renders nothing for paid shops or when no nudge applies.
 */
export function SmartUpgradeBanner({ compact }: SmartUpgradeBannerProps) {
  const t = useT();
  const { signals } = useConversionSignals();
  const nudge = useMemo(() => computeNudge(signals), [signals]);

  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDismissedId(localStorage.getItem(DISMISS_KEY));
    } catch {
      setDismissedId(null);
    }
  }, []);

  if (!nudge || nudge.id === dismissedId) return null;

  const dismiss = () => {
    setDismissedId(nudge.id);
    try {
      localStorage.setItem(DISMISS_KEY, nudge.id);
    } catch {
      /* ignore */
    }
  };

  const { title, body, cta, Icon } = buildCopy(nudge, t);

  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:border-amber-800/40 print:hidden ${
        compact ? "mx-3 mt-3 px-3 py-2.5" : "mb-4 px-4 py-3"
      }`}
    >
      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
      <div className="min-w-0 flex-1">
        <p
          className={`font-semibold text-amber-800 dark:text-amber-300 ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          {title}
        </p>
        <p
          className={`mt-0.5 leading-normal text-amber-700 dark:text-amber-400 ${
            compact ? "text-[11px]" : "text-xs"
          }`}
        >
          {body}
        </p>
        <Link
          href={BILLING_HREF}
          className={`mt-1.5 inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1 font-bold text-white transition hover:bg-amber-600 ${
            compact ? "text-[11px]" : "text-xs"
          }`}
        >
          <Crown className="h-3.5 w-3.5" />
          {cta}
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("Dismiss")}
        className="ml-1 flex-shrink-0 rounded-full p-0.5 text-amber-500/70 transition hover:bg-amber-500/10 hover:text-amber-600"
      >
        <X className={compact ? "h-4 w-4" : "h-4 w-4"} />
      </button>
    </div>
  );
}

function buildCopy(
  nudge: NudgeDescriptor,
  t: (s: string) => string,
): { title: string; body: string; cta: string; Icon: typeof Crown } {
  const { data } = nudge;

  if (nudge.kind === "trial-ending") {
    const days = data.daysRemaining ?? 0;
    const dayWord = days === 1 ? t("day") : t("days");
    const title = `${t("Your PRO trial ends in")} ${days} ${dayWord}`;

    let body: string;
    if (data.invoices && data.invoices > 0) {
      const valueStr =
        data.invoiceValue && data.invoiceValue > 0
          ? formatCurrencyAmount(
              data.invoiceValue,
              (data.currency ?? "INR") as SupportedCurrencyCode,
              { compact: true },
            )
          : null;
      body = valueStr
        ? `${t("You've already created")} ${data.invoices} ${t(
            "bills worth",
          )} ${valueStr}. ${t(
            "Upgrade now to keep AI design, multi-branch and all your tools.",
          )}`
        : `${t("You've already created")} ${data.invoices} ${t(
            "bills. Upgrade now to keep AI design, multi-branch and all your tools.",
          )}`;
    } else {
      body = t(
        "Upgrade now to keep AI design generation, multi-branch and advanced tools after your trial.",
      );
    }
    return { title, body, cta: t("Upgrade & keep everything"), Icon: Crown };
  }

  if (nudge.kind === "soft-limit") {
    const label = data.metric ? t(METRIC_LABELS[data.metric]) : "";
    const title = data.over
      ? `${t("You've reached")} ${data.count} ${label} 🎉`
      : `${t("You're at")} ${data.count} ${t("of")} ${data.limit} ${label}`;
    const body = `${t(
      "You're growing fast! Upgrade to PRO for unlimited",
    )} ${label} ${t("plus AI design and multi-branch.")}`;
    return { title, body, cta: t("Upgrade to PRO"), Icon: TrendingUp };
  }

  // milestone
  const title = `🎉 ${data.invoices} ${t("bills created on Orivraa!")}`;
  const body = t(
    "You're building a real business here. Upgrade to PRO to unlock AI design, multi-branch and advanced reports.",
  );
  return { title, body, cta: t("See PRO plans"), Icon: Sparkles };
}
