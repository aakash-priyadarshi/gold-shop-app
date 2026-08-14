"use client";

import { T } from "@/components/ui/T";
import { AI_CREDITS_BILLING_HREF } from "@/lib/aiCredits";
import {
  AI_CREDIT_COSTS,
  formatAiCredits,
} from "@gold-shop/shared";
import { Coins } from "lucide-react";
import Link from "next/link";

export function AiCreditsDepletedNotice({
  required = AI_CREDIT_COSTS.DESIGN_IMAGE,
  className,
}: {
  required?: number;
  className?: string;
}) {
  return (
    <div
      className={
        className ||
        "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
      }
    >
      <p className="flex items-start gap-2">
        <Coins className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          <T>AI credits depleted.</T>{" "}
          <T>This action needs</T> {formatAiCredits(required)}{" "}
          <T>credits.</T>{" "}
          <Link
            href={AI_CREDITS_BILLING_HREF}
            className="font-semibold underline underline-offset-2"
          >
            <T>Buy more credits here</T>
          </Link>
        </span>
      </p>
    </div>
  );
}

export function AiCreditCostHint({
  cost,
  balance,
}: {
  cost: number;
  balance?: number | null;
}) {
  const showBalance = typeof balance === "number";
  return (
    <p className="text-[11px] text-muted-foreground">
      <T>Uses</T> {formatAiCredits(cost)} <T>AI credits</T>
      {showBalance ? (
        <>
          {" · "}
          <T>Balance</T> {formatAiCredits(balance)}
        </>
      ) : null}
    </p>
  );
}
