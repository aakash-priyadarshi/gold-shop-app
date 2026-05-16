"use client";

/**
 * Gold Purity Calculator
 *
 * Two modes:
 * 1. Karat → Value: Enter karat + weight → calculate pure gold content and value at today's rate.
 *    Used when buying from customers to know the max payable value.
 *
 * 2. Fire Assay / XRF → Value: Enter assay result as a percentage (e.g. 91.67%) → same calculation.
 *    Jewellers who test gold with an XRF or fire assay can enter the exact purity %.
 *
 * Live rates from materialsApi. Results shown with a clear breakdown.
 */

import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { T } from "@/components/ui/T";
import { useHaptics } from "@/hooks/useHaptics";
import { materialsApi } from "@/lib/api";
import {
  ArrowRight,
  ChevronDown,
  Copy,
  FlaskConical,
  Layers,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface LiveRates {
  rate24k: number;
  currency: string;
}

type Mode = "karat" | "assay";

const KARAT_OPTIONS = [
  { karat: "24K", purity: 1.0, label: "24K — 99.9% Pure" },
  { karat: "23K", purity: 0.9583, label: "23K — 95.83%" },
  { karat: "22K", purity: 0.9167, label: "22K — 91.67% (916)" },
  { karat: "21K", purity: 0.875, label: "21K — 87.5%" },
  { karat: "20K", purity: 0.8333, label: "20K — 83.3%" },
  { karat: "18K", purity: 0.75, label: "18K — 75%" },
  { karat: "14K", purity: 0.5833, label: "14K — 58.33%" },
  { karat: "10K", purity: 0.4167, label: "10K — 41.67%" },
  { karat: "9K", purity: 0.375, label: "9K — 37.5%" },
  { karat: "SILVER", purity: 1.0, label: "Silver — 99.9%" },
  { karat: "SILVER 925", purity: 0.925, label: "Sterling Silver — 92.5%" },
] as const;

type KaratKey = (typeof KARAT_OPTIONS)[number]["karat"];

export default function PurityPage() {
  const haptic = useHaptics();

  const [rates, setRates] = useState<LiveRates | null>(null);
  const [silverRate, setSilverRate] = useState(0);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<Mode>("karat");
  const [selectedKarat, setSelectedKarat] = useState<KaratKey>("22K");
  const [assayPct, setAssayPct] = useState("");
  const [weight, setWeight] = useState("");
  const [deduction, setDeduction] = useState("0"); // making loss %
  const [copied, setCopied] = useState(false);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await materialsApi.getMarketRates();
      const r = res.data;
      setRates({
        rate24k: r.rate24k ?? r.goldRate24k ?? 9500,
        currency: r.currency ?? "NPR",
      });
      setSilverRate(r.silver ?? r.silverRate ?? 115);
    } catch {
      setRates({ rate24k: 9500, currency: "NPR" });
      setSilverRate(115);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const purity: number = (() => {
    if (mode === "assay") {
      const v = parseFloat(assayPct);
      return isNaN(v) ? 0 : Math.min(v / 100, 1);
    }
    const found = KARAT_OPTIONS.find((k) => k.karat === selectedKarat);
    return found?.purity ?? 0;
  })();

  const isSilver = selectedKarat.includes("SILVER");
  const baseRate = isSilver ? silverRate : (rates?.rate24k ?? 0);
  const effectiveRate = baseRate * purity;

  const wt = parseFloat(weight) || 0;
  const pureGrams = wt * purity;
  const grossValue = wt * effectiveRate;
  const dedPct = parseFloat(deduction) || 0;
  const netValue = Math.round(grossValue * (1 - dedPct / 100));

  const currency = rates?.currency ?? "NPR";

  const resultText = [
    `Gold Purity Calculation`,
    `Item: ${mode === "karat" ? selectedKarat : assayPct + "% purity"}`,
    `Weight: ${wt}g`,
    `Pure gold content: ${pureGrams.toFixed(3)}g`,
    `Rate (24K base): ${currency} ${(rates?.rate24k ?? 0).toLocaleString()}/g`,
    `Effective rate: ${currency} ${effectiveRate.toFixed(2)}/g`,
    dedPct > 0 ? `Deduction: ${dedPct}%` : null,
    `Net value: ${currency} ${netValue.toLocaleString()}`,
  ].filter(Boolean).join("\n");

  const copyResult = () => {
    haptic("light");
    navigator.clipboard.writeText(resultText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900"><T>Purity Calculator</T></h1>
          <p className="text-xs text-gray-400">
            {rates
              ? `24K: ${currency} ${rates.rate24k.toLocaleString()}/g`
              : <T>Loading rates…</T>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <MobileHelpButton
            title="Gold Purity Calculator"
            description="Calculate the actual gold content and market value of any jewellery piece based on karat or assay purity."
            tips={[
              "Karat mode: select the hallmark karat of the item",
              "Assay mode: enter the exact XRF or fire assay reading as a %",
              "Enter weight in grams (use a jewellery scale for accuracy)",
              "Set a deduction % to account for melting/refining loss",
              "Tap Copy to share the result via WhatsApp or notes",
            ]}
          />
          <button
            onClick={() => { haptic("light"); fetchRates(); }}
            disabled={loading}
            className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Mode toggle */}
        <div className="flex bg-gray-100 rounded-2xl p-1">
          {(["karat", "assay"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { haptic("light"); setMode(m); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                mode === m ? "bg-white text-amber-700 shadow-sm" : "text-gray-400"
              }`}
            >
              {m === "karat" ? <Layers className="h-4 w-4" /> : <FlaskConical className="h-4 w-4" />}
              <T>{m === "karat" ? "Karat" : "Fire Assay / XRF"}</T>
            </button>
          ))}
        </div>

        {/* Input fields */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
          {mode === "karat" ? (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5"><T>Karat</T></label>
              <div className="relative">
                <select
                  value={selectedKarat}
                  onChange={(e) => setSelectedKarat(e.target.value as KaratKey)}
                  className="w-full appearance-none px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl pr-8 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                >
                  {KARAT_OPTIONS.map((k) => (
                    <option key={k.karat} value={k.karat}>{k.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
                <T>Purity %</T>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={assayPct}
                  onChange={(e) => setAssayPct(e.target.value)}
                  placeholder="e.g. 91.67"
                  min={0}
                  max={100}
                  step={0.01}
                  className="flex-1 px-3 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <span className="text-base font-semibold text-gray-500">%</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">24K = 99.9% · 22K = 91.67% · 18K = 75%</p>
            </div>
          )}

          {/* Weight */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5"><T>Weight (grams)</T></label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0.000"
              step={0.001}
              className="w-full px-3 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Deduction */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
              <T>Melting/Refining Deduction</T>
            </label>
            <div className="relative">
              <select
                value={deduction}
                onChange={(e) => setDeduction(e.target.value)}
                className="w-full appearance-none px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl pr-8 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="0">No deduction</option>
                <option value="2">2% — minimal loss</option>
                <option value="5">5% — standard casting</option>
                <option value="8">8% — handmade items</option>
                <option value="12">12% — heavy deduction</option>
                <option value="15">15% — very old/damaged</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Result */}
        {wt > 0 && purity > 0 && (
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl p-5 text-white space-y-3 shadow-lg shadow-amber-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium opacity-80 uppercase tracking-wide"><T>Result</T></p>
              <button
                onClick={copyResult}
                className="flex items-center gap-1.5 text-xs bg-white/20 px-2.5 py-1 rounded-full"
              >
                <Copy className="h-3 w-3" />
                {copied ? <T>Copied!</T> : <T>Copy</T>}
              </button>
            </div>

            {/* Net value hero */}
            <div>
              <p className="text-3xl font-bold">{currency} {netValue.toLocaleString()}</p>
              {dedPct > 0 && (
                <p className="text-sm opacity-80 mt-0.5">
                  After {dedPct}% deduction
                </p>
              )}
            </div>

            {/* Breakdown */}
            <div className="border-t border-white/20 pt-3 space-y-1.5">
              {[
                ["Pure gold content", `${pureGrams.toFixed(3)} g`],
                ["Effective rate", `${currency} ${effectiveRate.toFixed(2)}/g`],
                ["Gross value", `${currency} ${Math.round(grossValue).toLocaleString()}`],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between text-sm">
                  <span className="opacity-75">{l}</span>
                  <span className="font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reference table */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3"><T>Karat Reference</T></p>
          <div className="space-y-1.5">
            {KARAT_OPTIONS.filter(k => !k.karat.includes("SILVER")).slice(0, 6).map((k) => (
              <div key={k.karat} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 font-medium">{k.karat}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${k.purity * 100}%` }} />
                  </div>
                  <span className="text-gray-500 text-xs w-12 text-right">{(k.purity * 100).toFixed(2)}%</span>
                  {rates && (
                    <>
                      <ArrowRight className="h-3 w-3 text-gray-300" />
                      <span className="text-amber-700 font-semibold text-xs w-16 text-right">
                        {currency} {(rates.rate24k * k.purity).toFixed(0)}/g
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
