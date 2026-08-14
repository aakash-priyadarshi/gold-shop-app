"use client";

import type { ReactNode } from "react";
import { T } from "@/components/ui/T";
import {
  formatCurrencyAmount,
  type SupportedCurrencyCode,
} from "@/lib/currency";
import {
  buildProductBreakdown,
  hasPricingBreakdown,
  type InventoryBreakdownSource,
  type ProductBreakdown,
  type ProductGemstone,
} from "@/lib/inventory/productBreakdown";
import { formatWeightFromGrams, type WeightUnit } from "@gold-shop/shared";
import { Gem } from "lucide-react";

function money(amount: number, currency: SupportedCurrencyCode) {
  return formatCurrencyAmount(amount, currency, { decimals: 2 });
}

function Row({
  label,
  value,
  hint,
  emphasize,
}: {
  label: ReactNode;
  value: string;
  hint?: ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <p
          className={`text-sm ${
            emphasize ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-300"
          }`}
        >
          {label}
        </p>
        {hint ? (
          <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{hint}</p>
        ) : null}
      </div>
      <p
        className={`text-sm tabular-nums whitespace-nowrap ${
          emphasize
            ? "font-bold text-amber-800 dark:text-amber-300"
            : "font-medium text-gray-900 dark:text-gray-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function GemstoneCard({
  gem,
  currency,
}: {
  gem: ProductGemstone;
  currency: SupportedCurrencyCode;
}) {
  const details = [
    gem.cut,
    gem.caratWeight ? `${gem.caratWeight} ct` : null,
    gem.color,
    gem.clarity,
    gem.cutGrade,
  ].filter(Boolean);

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {gem.type}
          </p>
          {details.length > 0 && (
            <p className="text-xs text-gray-500">{details.join(" · ")}</p>
          )}
          {(gem.lab || gem.certNumber) && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              {[gem.lab, gem.certNumber].filter(Boolean).join(" ")}
            </p>
          )}
          {gem.reportUrl && (
            <a
              href={gem.reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[11px] font-semibold text-amber-700 underline mt-1"
            >
              <T>See certificate</T>
            </a>
          )}
        </div>
        {gem.valueNpr > 0 && (
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
            {money(gem.valueNpr, currency)}
          </p>
        )}
      </div>
    </div>
  );
}

export function SellerProductBreakdown({
  item,
  currency,
  weightUnit,
  compact = false,
}: {
  item: InventoryBreakdownSource;
  currency: SupportedCurrencyCode;
  weightUnit: WeightUnit;
  compact?: boolean;
}) {
  const breakdown: ProductBreakdown = buildProductBreakdown(item);
  if (!hasPricingBreakdown(breakdown) && breakdown.weightGrams <= 0) {
    return null;
  }

  const weightLabel =
    breakdown.weightGrams > 0
      ? formatWeightFromGrams(breakdown.weightGrams, weightUnit, {
          showGramsEquivalent: weightUnit !== "GRAM",
        })
      : null;

  return (
    <div
      data-tour="m-product-breakdown"
      className={`rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">
        <T>Price breakdown</T>
      </p>
      <p className="text-[11px] text-gray-500 mb-2">
        <T>Metal, making, wastage and stones — the same figures used when this piece was added.</T>
      </p>

      <div className="divide-y divide-amber-100/80 dark:divide-amber-900/30">
        {(breakdown.metalType || breakdown.purity || weightLabel) && (
          <div className="py-2 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase">
              <T>Metal</T>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {breakdown.metalType && (
                <span className="px-2 py-0.5 rounded-full bg-white dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-200">
                  {breakdown.metalType.replace(/_/g, " ")}
                </span>
              )}
              {breakdown.purity && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-xs font-medium text-amber-800">
                  {breakdown.purity}
                </span>
              )}
              {weightLabel && (
                <span className="px-2 py-0.5 rounded-full bg-white dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-200">
                  {weightLabel}
                </span>
              )}
            </div>
          </div>
        )}

        {breakdown.metalValue > 0 && (
          <Row
            label={<T>Metal value</T>}
            value={money(breakdown.metalValue, currency)}
          />
        )}

        {breakdown.wastagePercent > 0 && (
          <Row
            label={<T>Wastage (jarti)</T>}
            hint={
              <>
                {breakdown.wastagePercent}% <T>of metal — added when you bill</T>
              </>
            }
            value={money(breakdown.wastageAmount, currency)}
          />
        )}

        {breakdown.makingCharge > 0 && (
          <Row
            label={<T>Making charges</T>}
            value={money(breakdown.makingCharge, currency)}
          />
        )}

        {breakdown.gemstones.length > 0 && compact && (
          <Row
            label={
              <>
                {breakdown.gemstones.length} <T>gemstones</T>
              </>
            }
            hint={<T>Open full details for cut, carat, lab and certificate</T>}
            value={money(breakdown.gemstoneValue, currency)}
          />
        )}

        {breakdown.gemstones.length > 0 && !compact && (
          <div className="py-2 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                <Gem className="h-3.5 w-3.5 text-amber-600" />
                <T>Gemstones</T>
              </p>
              {breakdown.gemstoneValue > 0 && (
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                  {money(breakdown.gemstoneValue, currency)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              {breakdown.gemstones.map((gem, index) => (
                <GemstoneCard
                  key={`${gem.type}-${index}`}
                  gem={gem}
                  currency={currency}
                />
              ))}
            </div>
          </div>
        )}

        {breakdown.gemstones.length === 0 && breakdown.gemstoneValue > 0 && (
          <Row
            label={<T>Gemstones</T>}
            value={money(breakdown.gemstoneValue, currency)}
          />
        )}

        {breakdown.tax > 0 && (
          <Row label={<T>Tax</T>} value={money(breakdown.tax, currency)} />
        )}

        <Row
          label={<T>Catalog price</T>}
          hint={
            breakdown.wastagePercent > 0 ? (
              <T>Stored price before wastage</T>
            ) : undefined
          }
          value={money(breakdown.catalogTotal, currency)}
          emphasize
        />

        {breakdown.wastagePercent > 0 && (
          <Row
            label={<T>Estimated bill</T>}
            hint={<T>Catalog price plus wastage</T>}
            value={money(breakdown.estimatedBill, currency)}
            emphasize
          />
        )}
      </div>
    </div>
  );
}
