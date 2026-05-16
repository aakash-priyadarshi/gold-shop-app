"use client";

/**
 * Daily Sales Summary — End-of-Day report for mobile.
 *
 * Answers: "How did today go?" in one screen.
 * - Total revenue, bill count, average bill size
 * - Revenue by payment method (cash/card/UPI)
 * - Hourly sparkline to see peak hours
 * - Comparison vs. yesterday
 * - One-tap WhatsApp share of summary to owner/accountant
 */

import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { MobileSkeletonCard, MobileSkeletonRow } from "@/components/mobile/MobileSkeleton";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { useHaptics } from "@/hooks/useHaptics";
import { ordersApi } from "@/lib/api";
import {
  ArrowDown,
  ArrowUp,
  BarChart2,
  CreditCard,
  RefreshCw,
  Share2,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Order {
  id: string;
  totalNpr?: number;
  totalAmount?: number;
  createdAt: string;
  paymentMethod?: string;
  status: string;
}

interface Summary {
  total: number;
  count: number;
  avg: number;
  cash: number;
  card: number;
  upi: number;
  other: number;
  currency: string;
  hourly: number[]; // 0-23
  yesterdayTotal: number;
}

function buildSummary(orders: Order[], yOrders: Order[]): Summary {
  const paid = orders.filter((o) => o.status !== "CANCELLED");

  const total = paid.reduce((s, o) => s + (o.totalNpr ?? o.totalAmount ?? 0), 0);
  const count = paid.length;

  const byMethod = (method: string) =>
    paid
      .filter((o) => (o.paymentMethod ?? "CASH").toUpperCase().includes(method))
      .reduce((s, o) => s + (o.totalNpr ?? o.totalAmount ?? 0), 0);

  const cash = byMethod("CASH");
  const card = byMethod("CARD");
  const upi = byMethod("UPI") + byMethod("DIGITAL") + byMethod("ONLINE");
  const other = total - cash - card - upi;

  const hourly = Array.from({ length: 24 }, (_, h) =>
    paid
      .filter((o) => new Date(o.createdAt).getHours() === h)
      .reduce((s, o) => s + (o.totalNpr ?? o.totalAmount ?? 0), 0),
  );

  const yesterdayTotal = yOrders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((s, o) => s + (o.totalNpr ?? o.totalAmount ?? 0), 0);

  return {
    total,
    count,
    avg: count > 0 ? Math.round(total / count) : 0,
    cash,
    card,
    upi,
    other: Math.max(0, other),
    currency: "NPR",
    hourly,
    yesterdayTotal,
  };
}

/** Mini bar chart for hourly revenue — no chart library needed */
function HourlyBar({ hourly, currency }: { hourly: number[]; currency: string }) {
  const max = Math.max(...hourly, 1);
  const nowHour = new Date().getHours();

  // Show hours 7–22 (most shops are open then)
  const display = Array.from({ length: 16 }, (_, i) => i + 7);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-900"><T>Sales by Hour</T></p>
        <BarChart2 className="h-4 w-4 text-gray-300" />
      </div>
      <div className="flex items-end gap-1 h-16">
        {display.map((h) => {
          const pct = Math.round((hourly[h] / max) * 100);
          const isNow = h === nowHour;
          return (
            <div key={h} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className={`w-full rounded-t-sm transition-all duration-300 ${
                  isNow ? "bg-amber-500" : "bg-amber-200"
                }`}
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-gray-400">
        <span>7am</span>
        <span>12pm</span>
        <span>5pm</span>
        <span>10pm</span>
      </div>
      {max > 1 && (
        <p className="mt-2 text-xs text-gray-400 text-center">
          Peak hour: {hourly.indexOf(max)}:00 · {currency} {max.toLocaleString()}
        </p>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "amber",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color?: "amber" | "green" | "blue" | "purple";
}) {
  const bg: Record<string, string> = {
    amber: "bg-amber-50",
    green: "bg-green-50",
    blue: "bg-blue-50",
    purple: "bg-purple-50",
  };
  const ico: Record<string, string> = {
    amber: "text-amber-600",
    green: "text-green-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl ${bg[color]} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`h-5 w-5 ${ico[color]}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-400 font-medium"><T>{label}</T></p>
        <p className="text-base font-bold text-gray-900 truncate">{value}</p>
        {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function DailySummaryPage() {
  const { user } = useAuth();
  const haptic = useHaptics();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const shopId = user?.shop?.id;

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      const [todayRes, yRes] = await Promise.all([
        ordersApi.getShopOrders(shopId, { dateFrom: today, dateTo: today, limit: 200 }),
        ordersApi.getShopOrders(shopId, { dateFrom: yesterday, dateTo: yesterday, limit: 200 }),
      ]);

      const todayOrders: Order[] = todayRes.data?.orders ?? todayRes.data?.items ?? todayRes.data ?? [];
      const yOrders: Order[] = yRes.data?.orders ?? yRes.data?.items ?? yRes.data ?? [];
      setSummary(buildSummary(todayOrders, yOrders));
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  const shareOnWhatsApp = () => {
    if (!summary) return;
    haptic("light");
    const date = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const lines = [
      `📊 *Daily Sales Summary — ${date}*`,
      ``,
      `💰 Total Revenue: ${summary.currency} ${summary.total.toLocaleString()}`,
      `🧾 Bills Created: ${summary.count}`,
      `📈 Avg Bill Size: ${summary.currency} ${summary.avg.toLocaleString()}`,
      ``,
      `💵 Cash: ${summary.currency} ${summary.cash.toLocaleString()}`,
      `💳 Card: ${summary.currency} ${summary.card.toLocaleString()}`,
      `📲 UPI/Digital: ${summary.currency} ${summary.upi.toLocaleString()}`,
      ``,
      `_Sent from Orivraa POS_`,
    ];

    const msg = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noreferrer");
  };

  const pct =
    summary && summary.yesterdayTotal > 0
      ? Math.round(((summary.total - summary.yesterdayTotal) / summary.yesterdayTotal) * 100)
      : null;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900"><T>Daily Summary</T></h1>
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <MobileHelpButton
            title="Daily Sales Summary"
            description="A real-time end-of-day snapshot of your shop's performance."
            tips={[
              "Updates live as new bills are created",
              "Compare today's revenue vs yesterday at a glance",
              "See which hours are your busiest (amber bar = current hour)",
              "Tap Share to send the summary to your WhatsApp accountant group",
            ]}
          />
          <button
            onClick={() => { haptic("light"); load(); }}
            disabled={loading}
            className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <>
            <MobileSkeletonCard />
            <MobileSkeletonCard />
            <MobileSkeletonRow />
            <MobileSkeletonRow />
          </>
        ) : summary ? (
          <>
            {/* Revenue hero */}
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl p-5 text-white shadow-lg shadow-amber-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium opacity-80 uppercase tracking-wide">
                    <T>Today's Revenue</T>
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {summary.currency} {summary.total.toLocaleString()}
                  </p>
                  {pct !== null && (
                    <div className="flex items-center gap-1 mt-2">
                      {pct >= 0 ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" />
                      )}
                      <span className="text-sm font-medium">
                        {Math.abs(pct)}% vs yesterday
                      </span>
                    </div>
                  )}
                </div>
                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={ShoppingBag}
                label="Bills Today"
                value={summary.count.toString()}
                color="amber"
              />
              <StatCard
                icon={BarChart2}
                label="Avg Bill"
                value={`${summary.currency} ${summary.avg.toLocaleString()}`}
                color="blue"
              />
            </div>

            {/* Payment breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-900"><T>By Payment Method</T></p>
              {[
                { label: "Cash", value: summary.cash, icon: Wallet, color: "text-green-600", bg: "bg-green-50" },
                { label: "Card", value: summary.card, icon: CreditCard, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "UPI / Digital", value: summary.upi, icon: Share2, color: "text-purple-600", bg: "bg-purple-50" },
              ].filter((m) => m.value > 0).map((m) => (
                <div key={m.label} className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg ${m.bg} flex items-center justify-center flex-shrink-0`}>
                    <m.icon className={`h-4 w-4 ${m.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700"><T>{m.label}</T></span>
                      <span className="text-xs font-bold text-gray-900">
                        {summary.currency} {m.value.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${m.color.replace("text-", "bg-")}`}
                        style={{ width: `${summary.total > 0 ? Math.round((m.value / summary.total) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Hourly chart */}
            <HourlyBar hourly={summary.hourly} currency={summary.currency} />

            {/* Yesterday comparison */}
            {summary.yesterdayTotal > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2"><T>vs Yesterday</T></p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-[11px] text-gray-400"><T>Today</T></p>
                    <p className="text-base font-bold text-gray-900">
                      {summary.currency} {summary.total.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] text-gray-400"><T>Yesterday</T></p>
                    <p className="text-base font-bold text-gray-500">
                      {summary.currency} {summary.yesterdayTotal.toLocaleString()}
                    </p>
                  </div>
                  {pct !== null && (
                    <div
                      className={`h-10 w-16 rounded-xl flex items-center justify-center text-sm font-bold ${
                        pct >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                      }`}
                    >
                      {pct >= 0 ? "+" : ""}{pct}%
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="h-4" />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
            <BarChart2 className="h-10 w-10" />
            <p className="text-sm"><T>No data yet — bills will appear here</T></p>
          </div>
        )}
      </div>

      {/* Share button */}
      {summary && summary.count > 0 && (
        <div className="bg-white border-t border-gray-100 px-4 py-3">
          <button
            onClick={shareOnWhatsApp}
            className="w-full h-12 rounded-2xl bg-green-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Share2 className="h-5 w-5" />
            <T>Share Summary on WhatsApp</T>
          </button>
        </div>
      )}
    </div>
  );
}
