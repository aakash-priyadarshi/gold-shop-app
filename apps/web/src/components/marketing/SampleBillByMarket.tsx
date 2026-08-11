"use client";

import { T } from "@/components/ui/T";
import {
  BILL_EXAMPLES,
  type BillMarket,
} from "@/components/marketing/billCalculationExamples";
import { useMemo, useState } from "react";

interface SampleBillByMarketProps {
  defaultMarket?: BillMarket;
  className?: string;
}

export function SampleBillByMarket({
  defaultMarket = "IN",
  className = "",
}: SampleBillByMarketProps) {
  const [market, setMarket] = useState<BillMarket>(defaultMarket);

  const example = useMemo(
    () => BILL_EXAMPLES.find((e) => e.id === market) ?? BILL_EXAMPLES[0],
    [market],
  );

  return (
    <div
      className={`rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden ${className}`}
    >
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          <T>Sample bill by market</T>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {BILL_EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => setMarket(ex.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                market === ex.id
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-amber-400"
              }`}
              aria-pressed={market === ex.id}
            >
              {ex.flag} {ex.marketName}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 lg:p-5 font-mono text-[11px] lg:text-xs space-y-0">
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-dashed border-gray-300 dark:border-gray-700">
          <span className="font-sans font-bold text-sm text-gray-900 dark:text-white">
            <T>Tax invoice preview</T>
          </span>
          <span className="text-amber-600 dark:text-gold-400 font-sans text-[10px] font-semibold">
            {example.flag} {example.marketName}
          </span>
        </div>

        {example.lines.map((line) => (
          <div
            key={line.label}
            className={`flex justify-between gap-3 py-1.5 border-b border-gray-100 dark:border-gray-800/80 ${
              line.liveRate
                ? "bg-emerald-50/50 dark:bg-emerald-950/20 -mx-1 px-1 rounded"
                : ""
            }`}
          >
            <div className="min-w-0">
              <p className="text-gray-900 dark:text-gray-100 truncate">
                {line.label}
              </p>
              <p
                className={`text-[10px] ${
                  line.liveRate
                    ? "text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse"
                    : "text-gray-500"
                }`}
              >
                {line.liveRate ? <T>● Live rate applied</T> : line.detail}
                {line.liveRate && line.detail ? ` · ${line.detail}` : ""}
              </p>
            </div>
            <span className="text-gray-800 dark:text-gray-200 shrink-0 font-semibold">
              {line.amount}
            </span>
          </div>
        ))}

        <div className="flex justify-between py-2 mt-1 text-gray-600 dark:text-gray-400">
          <span>
            <T>Subtotal</T>
          </span>
          <span>{example.subtotal}</span>
        </div>
        {example.taxes.map((tax) => (
          <div
            key={tax.label}
            className="flex justify-between py-1 text-amber-800 dark:text-amber-300/90"
          >
            <span className="pr-2">{tax.label}</span>
            <span className="shrink-0">{tax.amount}</span>
          </div>
        ))}
        <div className="flex justify-between py-2.5 mt-1 border-t-2 border-gray-900 dark:border-amber-500/40 font-bold text-sm text-gray-900 dark:text-white">
          <span>
            <T>Total</T>
          </span>
          <span>{example.total}</span>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-gray-500 font-sans pt-2 leading-relaxed">
          {example.regimeNote}
        </p>
      </div>
    </div>
  );
}
