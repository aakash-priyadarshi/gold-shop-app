"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { T } from "@/components/ui/T";
import { isLiveMarketCache, type ParsedMarketRates } from "@/lib/market-rates";
import { TrendingUp, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export type LiveRateData = ParsedMarketRates;

interface LiveRatesWidgetProps {
  rates: LiveRateData | null;
  loading: boolean;
  currencySymbol: string;
  onRefresh?: () => void;
}

// Metal display config — order matters for display
const METAL_DISPLAY: { key: string; label: string; group: string }[] = [
  { key: "GOLD_24K", label: "Gold 24K (999)", group: "Gold" },
  { key: "GOLD_22K", label: "Gold 22K (916)", group: "Gold" },
  { key: "GOLD_18K", label: "Gold 18K (750)", group: "Gold" },
  { key: "GOLD_14K", label: "Gold 14K (585)", group: "Gold" },
  { key: "SILVER_999", label: "Silver 999", group: "Silver" },
  { key: "SILVER_925", label: "Silver 925", group: "Silver" },
  { key: "PLATINUM_950", label: "Platinum 950", group: "Platinum" },
  { key: "PLATINUM_900", label: "Platinum 900", group: "Platinum" },
];

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function LiveRatesWidget({
  rates,
  loading,
  currencySymbol,
  onRefresh,
}: LiveRatesWidgetProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cacheBadge = () => {
    if (!rates) return null;
    const isLive = isLiveMarketCache(rates.cache);
    return (
      <Badge
        variant="outline"
        className={`text-[10px] px-1.5 py-0 ${
          isLive
            ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
            : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
        }`}
      >
        {isLive ? <T>Live</T> : <T>Cached</T>}
      </Badge>
    );
  };

  return (
    <Card className="border-amber-200 dark:border-amber-900/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-amber-900 dark:text-amber-400">
            <TrendingUp className="h-4 w-4" />
            Live Metal Rates
          </span>
          <div className="flex items-center gap-1.5">
            {cacheBadge()}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                title="Refresh rates"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading && !rates ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-500" />
            <span className="ml-2 text-xs text-muted-foreground">Loading rates...</span>
          </div>
        ) : !rates ? (
          <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5" />
            Rates unavailable
          </div>
        ) : (
          <>
            {/* Rate table */}
            <div className="space-y-0.5">
              {METAL_DISPLAY.filter((m) => rates.metals[m.key] != null).map((metal) => {
                const rate = rates.metals[metal.key];
                return (
                  <div
                    key={metal.key}
                    className="flex items-center justify-between py-1 px-2 rounded hover:bg-amber-50 dark:hover:bg-amber-950/20 text-xs"
                  >
                    <span className="text-foreground/80">{metal.label}</span>
                    <span className="font-mono font-semibold text-amber-900 dark:text-amber-400">
                      {currencySymbol}
                      {rate.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      <span className="text-muted-foreground font-normal text-[10px]">/g</span>
                    </span>
                  </div>
                );
              })}
              {/* Fallback: show any metals not in our display list */}
              {Object.keys(rates.metals)
                .filter((k) => !METAL_DISPLAY.some((m) => m.key === k))
                .slice(0, 4)
                .map((key) => {
                  const rate = rates.metals[key];
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between py-1 px-2 rounded hover:bg-amber-50 dark:hover:bg-amber-950/20 text-xs"
                    >
                      <span className="text-foreground/80">
                        {key.replace(/_/g, " ").toLowerCase()}
                      </span>
                      <span className="font-mono font-semibold text-amber-900 dark:text-amber-400">
                        {currencySymbol}
                        {rate.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        <span className="text-muted-foreground font-normal text-[10px]">/g</span>
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Footer with timestamp */}
            {mounted && rates.updatedAt && (
              <div className="mt-2 pt-2 border-t border-amber-100 dark:border-amber-900/20 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Updated {formatTime(rates.updatedAt)}</span>
                {rates.fx?.rate && (
                  <span>FX: 1 USD = {currencySymbol}{rates.fx.rate.toFixed(2)}</span>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
