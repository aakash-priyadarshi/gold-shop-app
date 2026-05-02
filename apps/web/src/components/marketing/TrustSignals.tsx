"use client";

import { T } from "@/components/ui/T";
import {
    CheckCircle2,
    Globe2,
    Lock,
    ShieldCheck,
    Sparkles,
} from "lucide-react";

interface TrustSignalsProps {
  /** "compact" = single horizontal strip, "grid" = 2x2 cards on mobile / 4 across on desktop */
  variant?: "compact" | "grid";
  /** Optional region label for data residency badge (e.g. "India", "Nepal", "EU"). */
  region?: string;
  className?: string;
}

/**
 * Trust badges shown on seller-facing surfaces (homepage, /for-sellers,
 * /partner, /pricing, register page, etc.). Addresses the trust gap
 * surfaced in the simulation results.
 */
export function TrustSignals({
  variant = "compact",
  region,
  className = "",
}: TrustSignalsProps) {
  const dataResidency = region
    ? `Your data stays in ${region}`
    : "Your data stays in your region";

  const items = [
    {
      icon: ShieldCheck,
      title: "Bank-grade security",
      desc: "TLS 1.3, encrypted at rest, SOC2-aligned controls.",
    },
    {
      icon: Globe2,
      title: dataResidency,
      desc: "Region-pinned databases. No cross-border data transfer.",
    },
    {
      icon: Sparkles,
      title: "Free 30-day trial",
      desc: "No credit card required. Cancel any time.",
    },
    {
      icon: Lock,
      title: "Your customers stay yours",
      desc: "We never resell, contact, or share your customer list.",
    },
  ];

  if (variant === "compact") {
    return (
      <div
        className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm ${className}`}
      >
        {items.map((item) => (
          <div
            key={item.title}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            <T>{item.title}</T>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 ${className}`}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 lg:p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
              <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm lg:text-base mb-1">
              <T>{item.title}</T>
            </h3>
            <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              <T>{item.desc}</T>
            </p>
          </div>
        );
      })}
    </div>
  );
}
