/**
 * Conversion-nudge logic (shared by PC + mobile).
 *
 * The backend (`GET /seller-subscriptions/my-conversion-signals`) returns raw
 * usage + trial numbers. This module turns those numbers into AT MOST ONE
 * gentle, dismissible nudge — it NEVER blocks anything.
 *
 * Strategy (silent, "earn the upgrade" — not "demand it"):
 *   1. trial-ending  — last few days of the free PRO trial, with a recap of
 *                      everything they've built ("keep all of it").
 *   2. soft-limit    — approaching / past a free-tier soft threshold while
 *                      still fully usable ("you're growing → upgrade to scale").
 *   3. milestone     — celebrate a usage milestone, then suggest PRO.
 *
 * Paid subscribers (isPaid) get nothing.
 */

export interface ConversionSignals {
  planName: string;
  status: string;
  isPaid: boolean;
  currency: string;
  trial: {
    active: boolean;
    daysRemaining: number | null;
    endsAt: string | null;
  };
  usage: {
    customers: number;
    invoicesThisMonth: number;
    repairs: number;
    savingsSchemes: number;
    goldLoans: number;
    products: number;
  };
  lifetime: {
    invoices: number;
    invoiceValue: number;
    customers: number;
  };
}

/**
 * Free-tier soft thresholds. These do NOT block usage — they only decide when
 * a gentle "you're outgrowing free" nudge appears.
 */
export const FREE_SOFT_LIMITS = {
  customers: 100,
  invoicesPerMonth: 50,
  products: 100,
  savingsSchemes: 5,
} as const;

/** Lifetime invoice counts worth celebrating. */
const INVOICE_MILESTONES = [10, 50, 100, 250, 500, 1000, 2500] as const;

/** Show the trial recap once we're inside this many days of trial end. */
const TRIAL_NUDGE_WINDOW_DAYS = 7;
/** Show soft-limit nudge once usage reaches this fraction of the cap. */
const SOFT_LIMIT_TRIGGER_RATIO = 0.8;

export type NudgeKind = "trial-ending" | "soft-limit" | "milestone";

export interface NudgeDescriptor {
  /** Stable id used to remember dismissal. Evolves as state progresses so a
   *  dismissed nudge does not suppress the next meaningful one. */
  id: string;
  kind: NudgeKind;
  data: {
    daysRemaining?: number;
    /** which usage metric tripped the soft limit (e.g. "customers") */
    metric?: keyof typeof FREE_SOFT_LIMITS;
    count?: number;
    limit?: number;
    /** whether the soft cap is reached/passed vs merely near */
    over?: boolean;
    invoices?: number;
    invoiceValue?: number;
    currency?: string;
  };
}

function currentPeriodKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}`;
}

/**
 * Decide which single nudge (if any) to show for the given signals.
 * Returns null when nothing should be shown.
 */
export function computeNudge(
  signals: ConversionSignals | null,
): NudgeDescriptor | null {
  if (!signals || signals.isPaid) return null;

  const { trial, usage, lifetime, currency } = signals;

  // ── 1. Trial ending (highest priority) ───────────────────────────
  if (
    trial.active &&
    typeof trial.daysRemaining === "number" &&
    trial.daysRemaining <= TRIAL_NUDGE_WINDOW_DAYS
  ) {
    const bucket = trial.daysRemaining <= 2 ? "final" : "soon";
    return {
      id: `trial-ending-${bucket}`,
      kind: "trial-ending",
      data: {
        daysRemaining: trial.daysRemaining,
        invoices: lifetime.invoices,
        invoiceValue: lifetime.invoiceValue,
        currency,
      },
    };
  }

  // ── 2. Soft limit (you're outgrowing free) ───────────────────────
  const softChecks: Array<{
    metric: keyof typeof FREE_SOFT_LIMITS;
    count: number;
    limit: number;
    periodScoped?: boolean;
  }> = [
    {
      metric: "customers",
      count: usage.customers,
      limit: FREE_SOFT_LIMITS.customers,
    },
    {
      metric: "invoicesPerMonth",
      count: usage.invoicesThisMonth,
      limit: FREE_SOFT_LIMITS.invoicesPerMonth,
      periodScoped: true,
    },
    {
      metric: "products",
      count: usage.products,
      limit: FREE_SOFT_LIMITS.products,
    },
    {
      metric: "savingsSchemes",
      count: usage.savingsSchemes,
      limit: FREE_SOFT_LIMITS.savingsSchemes,
    },
  ];

  let best: (typeof softChecks)[number] | null = null;
  let bestRatio = 0;
  for (const c of softChecks) {
    const ratio = c.limit > 0 ? c.count / c.limit : 0;
    if (ratio >= SOFT_LIMIT_TRIGGER_RATIO && ratio > bestRatio) {
      best = c;
      bestRatio = ratio;
    }
  }
  if (best) {
    const over = best.count >= best.limit;
    // Monthly metric: scope the id to the period so it re-appears next month.
    const periodSuffix = best.periodScoped ? `-${currentPeriodKey()}` : "";
    return {
      id: `soft-limit-${best.metric}-${over ? "over" : "near"}${periodSuffix}`,
      kind: "soft-limit",
      data: {
        metric: best.metric,
        count: best.count,
        limit: best.limit,
        over,
      },
    };
  }

  // ── 3. Milestone (celebrate, then suggest PRO) ───────────────────
  let milestone = 0;
  for (const m of INVOICE_MILESTONES) {
    if (lifetime.invoices >= m) milestone = m;
  }
  if (milestone > 0) {
    return {
      id: `milestone-invoices-${milestone}`,
      kind: "milestone",
      data: { invoices: milestone },
    };
  }

  return null;
}
