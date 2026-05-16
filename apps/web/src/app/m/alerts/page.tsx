"use client";

/**
 * Gold Rate Threshold Alerts
 *
 * Shopkeeper sets a price target (e.g. "alert me when 24K > NPR 9800").
 * Alerts are stored in localStorage. On load, we compare against live rates
 * and show a banner for any triggered alert.
 *
 * No backend required — edge-cached rates are fetched client-side.
 */

import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { T } from "@/components/ui/T";
import { useHaptics } from "@/hooks/useHaptics";
import { materialsApi } from "@/lib/api";
import { getMobileMarketParams } from "@/lib/mobileCurrency";
import {
  Bell,
  BellOff,
  ChevronDown,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Metal = "24K" | "22K" | "18K" | "SILVER";
type Direction = "ABOVE" | "BELOW";

interface Alert {
  id: string;
  metal: Metal;
  direction: Direction;
  targetPrice: number;
  currency: string;
  label: string;
  active: boolean;
  createdAt: string;
}

interface LiveRates {
  rate24k: number;
  rate22k: number;
  rate18k: number;
  silver: number;
  currency: string;
  updatedAt?: string;
}

const STORAGE_KEY = "orivraa_rate_alerts";

function loadAlerts(): Alert[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveAlerts(alerts: Alert[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

function getLiveRate(metal: Metal, rates: LiveRates): number {
  switch (metal) {
    case "24K": return rates.rate24k;
    case "22K": return rates.rate22k;
    case "18K": return rates.rate18k;
    case "SILVER": return rates.silver;
  }
}

function isTriggered(alert: Alert, rates: LiveRates): boolean {
  if (!alert.active) return false;
  const live = getLiveRate(alert.metal, rates);
  return alert.direction === "ABOVE" ? live >= alert.targetPrice : live <= alert.targetPrice;
}

const METAL_LABELS: Record<Metal, string> = {
  "24K": "24K Gold",
  "22K": "22K Gold",
  "18K": "18K Gold",
  "SILVER": "Silver",
};

export default function AlertsPage() {
  const haptic = useHaptics();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rates, setRates] = useState<LiveRates | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [metal, setMetal] = useState<Metal>("24K");
  const [direction, setDirection] = useState<Direction>("ABOVE");
  const [targetPrice, setTargetPrice] = useState("");
  const [label, setLabel] = useState("");

  useEffect(() => {
    setAlerts(loadAlerts());
  }, []);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await materialsApi.getMarketRates(getMobileMarketParams());
      const r = res.data;
      setRates({
        rate24k: r.rate24k ?? r.goldRate24k ?? 9500,
        rate22k: r.rate22k ?? r.goldRate22k ?? 8750,
        rate18k: r.rate18k ?? r.goldRate18k ?? 7100,
        silver: r.silver ?? r.silverRate ?? 115,
        currency: r.currency ?? "NPR",
        updatedAt: r.updatedAt,
      });
    } catch {
      // keep previous
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const addAlert = () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) return;
    haptic("success");

    const newAlert: Alert = {
      id: crypto.randomUUID(),
      metal,
      direction,
      targetPrice: price,
      currency: rates?.currency ?? "NPR",
      label: label.trim() || `${METAL_LABELS[metal]} ${direction === "ABOVE" ? "≥" : "≤"} ${price}`,
      active: true,
      createdAt: new Date().toISOString(),
    };

    const next = [newAlert, ...alerts];
    setAlerts(next);
    saveAlerts(next);
    setTargetPrice("");
    setLabel("");
    setShowForm(false);
  };

  const toggleAlert = (id: string) => {
    haptic("light");
    const next = alerts.map((a) => (a.id === id ? { ...a, active: !a.active } : a));
    setAlerts(next);
    saveAlerts(next);
  };

  const deleteAlert = (id: string) => {
    haptic("medium");
    const next = alerts.filter((a) => a.id !== id);
    setAlerts(next);
    saveAlerts(next);
  };

  const triggered = rates ? alerts.filter((a) => isTriggered(a, rates)) : [];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900"><T>Rate Alerts</T></h1>
          <p className="text-xs text-gray-400">
            {rates
              ? `24K: ${rates.currency} ${rates.rate24k.toLocaleString()}/g · 22K: ${rates.rate22k.toLocaleString()}/g`
              : <T>Loading live rates…</T>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <MobileHelpButton
            title="Rate Threshold Alerts"
            description="Get notified when gold or silver hits your target price. Alerts trigger automatically when you open this page."
            tips={[
              "Set an ABOVE alert to know when to sell stock at profit",
              "Set a BELOW alert to know when to buy gold at a low rate",
              "Triggered alerts appear in a banner at the top",
              "Alerts are stored on this device — no internet needed to view them",
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
        {/* Triggered alerts banner */}
        {triggered.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-700">
              <Zap className="h-4 w-4" />
              <p className="text-sm font-bold"><T>Alerts Triggered!</T></p>
            </div>
            {triggered.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm text-amber-800">
                {a.direction === "ABOVE" ? (
                  <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-blue-600 flex-shrink-0" />
                )}
                <span>
                  {a.label} — now{" "}
                  <strong>
                    {a.currency} {rates ? getLiveRate(a.metal, rates).toLocaleString() : "—"}
                  </strong>
                  /g
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Live rate ticker */}
        {rates && (
          <div className="grid grid-cols-2 gap-2">
            {([["24K", rates.rate24k], ["22K", rates.rate22k], ["18K", rates.rate18k], ["Silver", rates.silver]] as const).map(([label, val]) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 px-3 py-2 flex justify-between items-center">
                <span className="text-xs font-medium text-gray-500">{label}</span>
                <span className="text-sm font-bold text-amber-700">{rates.currency} {(val as number).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Alert list */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide"><T>Your Alerts</T></p>
            {alerts.map((a) => {
              const fired = rates ? isTriggered(a, rates) : false;
              return (
                <div
                  key={a.id}
                  className={`bg-white rounded-2xl border px-4 py-3 flex items-center gap-3 ${
                    fired ? "border-amber-300 bg-amber-50/50" : "border-gray-100"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.label}</p>
                    <p className="text-xs text-gray-400">
                      {METAL_LABELS[a.metal]} {a.direction === "ABOVE" ? "≥" : "≤"}{" "}
                      {a.currency} {a.targetPrice.toLocaleString()}/g
                    </p>
                  </div>
                  {fired && <Zap className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                  <button
                    onClick={() => toggleAlert(a.id)}
                    className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      a.active ? "text-amber-600 bg-amber-50" : "text-gray-300 bg-gray-100"
                    }`}
                  >
                    {a.active ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => deleteAlert(a.id)}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-red-400 bg-red-50 flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
            <Bell className="h-10 w-10" />
            <p className="text-sm text-center"><T>No alerts yet. Tap + to create your first price alert.</T></p>
          </div>
        )}
      </div>

      {/* Add alert form */}
      {showForm && (
        <div className="bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900"><T>New Alert</T></p>

          {/* Metal + Direction row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={metal}
                onChange={(e) => setMetal(e.target.value as Metal)}
                className="w-full appearance-none px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl pr-7 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="24K">24K Gold</option>
                <option value="22K">22K Gold</option>
                <option value="18K">18K Gold</option>
                <option value="SILVER">Silver</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative flex-1">
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as Direction)}
                className="w-full appearance-none px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl pr-7 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="ABOVE">Goes ≥ (sell signal)</option>
                <option value="BELOW">Goes ≤ (buy signal)</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Price */}
          <input
            type="number"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder={`Target price (${rates?.currency ?? "NPR"}/gram)`}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
          />

          {/* Optional label */}
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional)"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
          />

          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium"
            >
              <T>Cancel</T>
            </button>
            <button
              onClick={addAlert}
              disabled={!targetPrice}
              className="flex-1 h-11 rounded-xl bg-amber-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              <T>Save Alert</T>
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <div className="bg-white border-t border-gray-100 px-4 py-3">
          <button
            onClick={() => { haptic("light"); setShowForm(true); }}
            className="w-full h-12 rounded-2xl bg-amber-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            <T>Add Rate Alert</T>
          </button>
        </div>
      )}
    </div>
  );
}
