"use client";

import { MobileFeatureGate } from "@/components/mobile/MobileFeatureGate";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { materialsApi } from "@/lib/api";
import { ImageIcon, Loader2, MessageCircle, RefreshCw, Share2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Rates {
  gold24k: number;
  gold22k: number;
  gold18k: number;
  gold14k: number;
  silver: number;
  currency: string;
  date: string;
}

function formatAmt(n: number, cur: string) {
  return `${cur} ${n.toLocaleString("en-IN")}`;
}

export default function RateCardPage() {
  const { user } = useAuth();
  const [rates, setRates] = useState<Rates | null>(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await materialsApi.getMarketRates();
      const d = res.data;
      const gold = d?.metals?.find?.((m: any) => m.code === "XAU" || m.code === "GOLD");
      const silver = d?.metals?.find?.((m: any) => m.code === "XAG" || m.code === "SILVER");
      const g = gold?.ratePerGram ?? gold?.rate ?? 0;
      const s = silver?.ratePerGram ?? silver?.rate ?? 0;
      const today = new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      setRates({
        gold24k: Math.round(g),
        gold22k: Math.round(g * (22 / 24)),
        gold18k: Math.round(g * (18 / 24)),
        gold14k: Math.round(g * (14 / 24)),
        silver: Math.round(s),
        currency: d?.currency ?? "NPR",
        date: today,
      });
    } catch {
      // pass
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shareText = rates
    ? `🪙 *Today's Gold & Silver Rates*\n📅 ${rates.date}\n🏪 ${user?.shop?.name ?? "Our Store"}\n\n` +
      `💛 24K — ${formatAmt(rates.gold24k, rates.currency)}/g\n` +
      `🟡 22K — ${formatAmt(rates.gold22k, rates.currency)}/g\n` +
      `🟠 18K — ${formatAmt(rates.gold18k, rates.currency)}/g\n` +
      `⚪ Silver — ${formatAmt(rates.silver, rates.currency)}/g\n\n` +
      `_Rates may vary. Contact us for live pricing._`
    : "";

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noreferrer");
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Today's Gold Rates", text: shareText });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      alert("Rate text copied to clipboard!");
    }
  };

  const ROWS = rates
    ? [
        { karat: "24K (99.9%)", desc: "Pure Gold", rate: rates.gold24k, color: "bg-yellow-400" },
        { karat: "22K (91.6%)", desc: "Hallmark Jewellery", rate: rates.gold22k, color: "bg-yellow-500" },
        { karat: "18K (75%)", desc: "Mixed Jewellery", rate: rates.gold18k, color: "bg-amber-500" },
        { karat: "14K (58.3%)", desc: "Fashion Jewellery", rate: rates.gold14k, color: "bg-amber-600" },
        { karat: "Silver", desc: "Pure Silver (999)", rate: rates.silver, color: "bg-gray-400" },
      ]
    : [];

  return (
    <MobileFeatureGate feature="mobileRateCard" featureName="Live Rate Card">
      <div className="px-4 py-5 space-y-4">
      {/* Card */}
      <div
        data-tour="m-rate-card"
        ref={cardRef}
        className="rounded-3xl overflow-hidden bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-400 text-white shadow-xl"
      >
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium opacity-80 uppercase tracking-wider">
                <T>Daily Rate Card</T>
              </p>
              <h1 className="text-xl font-bold mt-0.5">
                {user?.shop?.name ?? "Gold Shop"}
              </h1>
              {loading ? (
                <p className="text-sm opacity-70 mt-1"><T>Loading rates…</T></p>
              ) : (
                <p className="text-sm opacity-70 mt-1">{rates?.date}</p>
              )}
            </div>
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Rate rows */}
        <div className="bg-white/10 backdrop-blur-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          ) : (
            ROWS.map((row, i) => (
              <div
                key={row.karat}
                className={`flex items-center justify-between px-6 py-3.5 ${
                  i < ROWS.length - 1 ? "border-b border-white/15" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${row.color}`} />
                  <div>
                    <p className="text-sm font-semibold">{row.karat}</p>
                    <p className="text-xs opacity-70">{row.desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">
                    {formatAmt(row.rate, rates?.currency ?? "NPR")}
                  </p>
                  <p className="text-xs opacity-70"><T>per gram</T></p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-3 text-center">
          <p className="text-[11px] opacity-60">
            <T>Rates are indicative. Contact store for exact pricing.</T>
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          data-tour="m-rate-whatsapp"
          onClick={shareWhatsApp}
          disabled={loading || !rates}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#25D366] text-white font-semibold text-sm shadow active:opacity-90 disabled:opacity-40"
        >
          <MessageCircle className="h-5 w-5" />
          <T>WhatsApp</T>
        </button>
        <button
          onClick={shareNative}
          disabled={loading || !rates}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-gray-200 bg-white text-gray-700 font-semibold text-sm active:bg-gray-50 disabled:opacity-40"
        >
          <Share2 className="h-5 w-5" />
          <T>Share / Copy</T>
        </button>
      </div>

      {/* Refresh */}
      <button
        data-tour="m-rate-refresh"
        onClick={load}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-amber-300 text-amber-600 text-sm font-medium active:bg-amber-50 disabled:opacity-40"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        <T>Refresh Rates</T>
      </button>

      <p className="text-center text-xs text-gray-400">
        <T>Rates sourced from live market feed. Updated at</T>{" "}
        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
      </p>
    </div>
    </MobileFeatureGate>
  );
}
