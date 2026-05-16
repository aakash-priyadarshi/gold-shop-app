"use client";

/**
 * Old Gold Exchange Calculator
 *
 * Daily-use tool for jewelry shops:
 * Customer brings old gold → shopkeeper enters weight + karat → gets
 * instant buyback value at today's live rate. Can be applied as a
 * trade-in deduction on a new bill.
 *
 * No backend needed — pure client-side math using the live gold rate
 * already fetched in the layout.
 */

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { T } from "@/components/ui/T";
import { useHaptics } from "@/hooks/useHaptics";
import { materialsApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import {
  ArrowRight,
  ChevronDown,
  Copy,
  RefreshCw,
  Scale,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface GoldRate {
  rate24k: number;
  rate22k: number;
  rate18k: number;
  silver: number;
  currency: string;
}

type Karat = "24" | "22" | "18" | "14" | "10" | "SILVER";
type Deduction = "none" | "5" | "10" | "15" | "20";

interface Item {
  id: number;
  karat: Karat;
  weight: string; // string for input control
  deduction: Deduction;
}

const KARAT_PURITY: Record<Karat, number> = {
  "24": 1.0,
  "22": 0.9167,
  "18": 0.75,
  "14": 0.5833,
  "10": 0.4167,
  SILVER: 0,
};

const KARAT_LABELS: Record<Karat, string> = {
  "24": "24K (Pure)",
  "22": "22K (91.6%)",
  "18": "18K (75%)",
  "14": "14K (58.3%)",
  "10": "10K (41.6%)",
  SILVER: "Silver",
};

function getRate(karat: Karat, rates: GoldRate): number {
  if (karat === "SILVER") return rates.silver;
  if (karat === "24") return rates.rate24k;
  if (karat === "22") return rates.rate22k;
  if (karat === "18") return rates.rate18k;
  // 14K and 10K derived from 24K
  return Math.round(rates.rate24k * KARAT_PURITY[karat]);
}

function calcBuyback(item: Item, rates: GoldRate): number {
  const wt = parseFloat(item.weight) || 0;
  if (wt <= 0) return 0;
  const rate = getRate(item.karat, rates);
  const gross = wt * rate;
  const dedPct = item.deduction === "none" ? 0 : parseInt(item.deduction);
  return Math.round(gross * (1 - dedPct / 100));
}

let nextId = 2;

export default function OldGoldExchangePage() {
  const t = useT();
  const haptic = useHaptics();

  const [rates, setRates] = useState<GoldRate | null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([
    { id: 1, karat: "22", weight: "", deduction: "5" },
  ]);
  const [copied, setCopied] = useState(false);

  const loadRates = useCallback(async () => {
    setRateLoading(true);
    try {
      const res = await materialsApi.getCurrentRates();
      const r = res.data;
      setRates({
        rate24k: r.rate24k ?? r.goldRate24k ?? 9500,
        rate22k: r.rate22k ?? r.goldRate22k ?? 8750,
        rate18k: r.rate18k ?? r.goldRate18k ?? 7000,
        silver: r.silver ?? r.silverRate ?? 115,
        currency: r.currency ?? "NPR",
      });
    } catch {
      // fallback demo rates
      setRates({ rate24k: 9500, rate22k: 8750, rate18k: 7100, silver: 115, currency: "NPR" });
    } finally {
      setRateLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const addItem = () => {
    haptic("light");
    setItems((prev) => [
      ...prev,
      { id: nextId++, karat: "22", weight: "", deduction: "5" },
    ]);
  };

  const removeItem = (id: number) => {
    haptic("light");
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = <K extends keyof Item>(id: number, key: K, value: Item[K]) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [key]: value } : i)),
    );
  };

  const totalBuyback = rates
    ? items.reduce((s, i) => s + calcBuyback(i, rates), 0)
    : 0;

  const copyToClipboard = () => {
    if (!rates) return;
    haptic("light");
    const lines = items
      .filter((i) => parseFloat(i.weight) > 0)
      .map(
        (i) =>
          `${KARAT_LABELS[i.karat]} · ${i.weight}g · ${i.deduction !== "none" ? `-${i.deduction}% deduction` : "no deduction"} → ${rates.currency} ${calcBuyback(i, rates).toLocaleString()}`,
      );
    lines.push(`\nTotal buyback: ${rates.currency} ${totalBuyback.toLocaleString()}`);
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      haptic("success");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <MobileFeatureGate feature="mobilePOS" featureName="Old Gold Exchange">
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900"><T>Old Gold Exchange</T></h1>
            <p className="text-xs text-gray-400">
              {rateLoading ? (
                <T>Fetching live rates…</T>
              ) : rates ? (
                <T>24K: {rates.currency} {rates.rate24k.toLocaleString()}/g</T>
              ) : (
                <T>Rate unavailable</T>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <MobileHelpButton
              title="Old Gold Exchange Calculator"
              description="Calculate the buyback value of old gold/silver jewelry a customer brings for exchange."
              tips={[
                "Add each piece of jewelry as a separate line",
                "Choose the correct karat — if unsure, use 22K for most Indian jewelry",
                "Deduction covers melting/refining loss (5–20% is industry standard)",
                "Total buyback can be deducted from the new bill as trade-in credit",
                "Tap Copy to share the calculation on WhatsApp",
              ]}
            />
            <button
              onClick={() => { haptic("light"); loadRates(); }}
              disabled={rateLoading}
              className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
            >
              <RefreshCw className={`h-4 w-4 ${rateLoading ? "animate-spin text-amber-500" : ""}`} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* Item rows */}
          {items.map((item, idx) => {
            const buyback = rates ? calcBuyback(item, rates) : 0;
            const hasWeight = parseFloat(item.weight) > 0;

            return (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <T>Item {idx + 1}</T>
                  </span>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="h-7 w-7 rounded-full bg-red-50 flex items-center justify-center"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </button>
                  )}
                </div>

                {/* Karat selector */}
                <div className="relative">
                  <select
                    value={item.karat}
                    onChange={(e) => updateItem(item.id, "karat", e.target.value as Karat)}
                    className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-medium"
                  >
                    {(Object.keys(KARAT_LABELS) as Karat[]).map((k) => (
                      <option key={k} value={k}>
                        {KARAT_LABELS[k]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Weight */}
                  <div className="relative">
                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="Weight (g)"
                      value={item.weight}
                      onChange={(e) => updateItem(item.id, "weight", e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  {/* Deduction */}
                  <div className="relative">
                    <select
                      value={item.deduction}
                      onChange={(e) => updateItem(item.id, "deduction", e.target.value as Deduction)}
                      className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    >
                      <option value="none">No deduction</option>
                      <option value="5">−5% loss</option>
                      <option value="10">−10% loss</option>
                      <option value="15">−15% loss</option>
                      <option value="20">−20% loss</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Result */}
                {hasWeight && rates && (
                  <div className="flex items-center justify-between bg-amber-50 rounded-xl px-3 py-2.5">
                    <div>
                      <p className="text-[10px] text-amber-600 font-medium uppercase tracking-wide">
                        <T>Buyback value</T>
                      </p>
                      <p className="text-lg font-bold text-amber-700">
                        {rates.currency} {buyback.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right text-xs text-amber-600 opacity-70">
                      <p>{rates.currency} {getRate(item.karat, rates).toLocaleString()}/g</p>
                      {item.deduction !== "none" && (
                        <p>−{item.deduction}% deduction</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add item */}
          <button
            onClick={addItem}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-amber-200 text-amber-600 text-sm font-medium hover:bg-amber-50 active:bg-amber-100 transition-colors"
          >
            + <T>Add another piece</T>
          </button>

          {/* Spacer for sticky footer */}
          <div className="h-4" />
        </div>

        {/* Sticky total */}
        {totalBuyback > 0 && rates && (
          <div className="bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide"><T>Total Trade-In Value</T></p>
                <p className="text-2xl font-bold text-gray-900">
                  {rates.currency} {totalBuyback.toLocaleString()}
                </p>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 h-10 px-4 rounded-xl bg-amber-50 text-amber-700 text-sm font-semibold"
              >
                <Copy className="h-4 w-4" />
                {copied ? <T>Copied!</T> : <T>Copy</T>}
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />
              <T>Deduct this from the new bill total when the customer is trading in old gold</T>
            </div>
          </div>
        )}
      </div>
    </MobileFeatureGate>
  );
}
