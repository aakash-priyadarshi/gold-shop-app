"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  calculateEstimate,
  type BuildMethod,
  type EstimateBreakdown,
  type EstimateRequest,
} from "@/lib/pricing/calculate-estimate";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Gem,
  Info,
  Layers,
  Loader2,
  Sparkles,
  TrendingUp,
  Workflow,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

interface MarketRates {
  metals: Record<string, number>;
  currency: string;
  updatedAt: string;
  cache: "fresh" | "stale" | "fallback" | "miss" | "hit";
  fx?: { rate: number };
  source?: string;
}

// Format timestamp for display
function formatLastFetched(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Format date: "Jan 15, 2025, 3:30 PM"
  const formattedDate =
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    ", " +
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  // Relative time suffix
  let relativeTime = "";
  if (diffMins < 1) {
    relativeTime = "just now";
  } else if (diffMins < 60) {
    relativeTime = `${diffMins}m ago`;
  } else if (diffHours < 24) {
    relativeTime = `${diffHours}h ago`;
  } else {
    relativeTime = `${diffDays}d ago`;
  }

  return `${formattedDate} (${relativeTime})`;
}

interface LivePricingPanelProps {
  buildMethod: BuildMethod;
  formData: EstimateRequest;
  marketRates: MarketRates | null;
  marketRatesLoading?: boolean;
  marketRatesWarning?: string | null;
  currencySymbol?: string;
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════

export function LivePricingPanel({
  buildMethod,
  formData,
  marketRates,
  marketRatesLoading = false,
  marketRatesWarning,
  currencySymbol = "₹",
}: LivePricingPanelProps) {
  // Hydration fix - only show relative time after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate estimate whenever form data changes
  const estimate = useMemo(() => {
    if (!marketRates) return null;

    const request: EstimateRequest = {
      ...formData,
      marketRates: {
        metals: marketRates.metals,
        fx: marketRates.fx,
      },
    };

    const result = calculateEstimate(request);
    return result;
  }, [formData, marketRates]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-amber-900 flex items-center gap-2">
            {buildMethod === "METHOD_A" && <Gem className="h-4 w-4" />}
            {buildMethod === "METHOD_B" && <Sparkles className="h-4 w-4" />}
            {buildMethod === "METHOD_C" && <Layers className="h-4 w-4" />}
            {buildMethod === "METHOD_D" && <Workflow className="h-4 w-4" />}
            Live Price Estimate
          </h4>
          <Badge variant="outline" className="text-xs">
            {buildMethod === "METHOD_A" && "Solid Metal"}
            {buildMethod === "METHOD_B" && "Alloy"}
            {buildMethod === "METHOD_C" && "Plated"}
            {buildMethod === "METHOD_D" && "Machine Made"}
          </Badge>
        </div>

        {/* Loading State */}
        {marketRatesLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
            <span className="ml-2 text-sm text-amber-700">
              Loading market rates...
            </span>
          </div>
        )}

        {/* Warning */}
        {marketRatesWarning && (
          <div className="bg-yellow-100 border border-yellow-300 rounded p-2 text-xs text-yellow-800 flex items-center gap-2">
            <AlertCircle className="h-3 w-3" />
            {marketRatesWarning}
          </div>
        )}

        {/* Market Rates Display (Method-specific) */}
        {!marketRatesLoading && marketRates && (
          <MarketRatesDisplay
            buildMethod={buildMethod}
            marketRates={marketRates}
            currencySymbol={currencySymbol}
          />
        )}

        {/* Estimate Display */}
        {estimate && (
          <EstimateDisplay
            estimate={estimate}
            currencySymbol={currencySymbol}
          />
        )}

        {/* Status Message */}
        {estimate?.status === "incomplete" && estimate.statusMessage && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800 flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5" />
            <span>{estimate.statusMessage}</span>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-muted-foreground border-t pt-2 space-y-1">
          {/* Last fetched timestamp - only show relative time after mount to prevent hydration mismatch */}
          {marketRates?.updatedAt && (
            <p className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                Last fetched on: {mounted ? formatLastFetched(marketRates.updatedAt) : new Date(marketRates.updatedAt).toLocaleDateString()}
              </span>
            </p>
          )}
          <p className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Estimate updates as you change options
          </p>
          <p className="mt-1 italic">
            Final quote depends on seller, making charge, and availability
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════
// MARKET RATES DISPLAY
// ═══════════════════════════════════════════

interface MarketRatesDisplayProps {
  buildMethod: BuildMethod;
  marketRates: MarketRates;
  currencySymbol: string;
}

function MarketRatesDisplay({
  buildMethod,
  marketRates,
  currencySymbol,
}: MarketRatesDisplayProps) {
  const metals = marketRates.metals;

  return (
    <div className="space-y-3">
      {/* Method A: Show pure precious metal rates */}
      {buildMethod === "METHOD_A" && (
        <>
          {/* Pure Gold rate */}
          <div>
            <p className="text-xs font-medium text-amber-800 mb-1">
              Pure Gold (per gram)
            </p>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <RateBox
                label="24K (99.9%)"
                value={metals.GOLD_24K}
                symbol={currencySymbol}
              />
            </div>
          </div>

          {/* Pure Silver rate */}
          <div>
            <p className="text-xs font-medium text-amber-800 mb-1">
              Fine Silver (per gram)
            </p>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <RateBox
                label="999 (99.9%)"
                value={metals.SILVER_999}
                symbol={currencySymbol}
                color="gray"
              />
            </div>
          </div>

          {/* Platinum */}
          <div>
            <p className="text-xs font-medium text-amber-800 mb-1">
              Platinum (per gram)
            </p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <RateBox
                label="PT950"
                value={metals.PLATINUM_PT950}
                symbol={currencySymbol}
                color="slate"
              />
              <RateBox
                label="PT900"
                value={metals.PLATINUM_PT900}
                symbol={currencySymbol}
                color="slate"
              />
            </div>
          </div>

          {/* Method A info */}
          <div className="bg-white/60 rounded p-2 text-xs">
            <p className="font-medium text-amber-700">Solid Pure Metal</p>
            <p className="text-muted-foreground">
              Method A uses the purest form of precious metals. For gold alloys
              (22K, 18K, etc.), use Method B.
            </p>
          </div>
        </>
      )}

      {/* Method B: Show alloy metal rates */}
      {buildMethod === "METHOD_B" && (
        <>
          {/* Gold alloy rates */}
          <div>
            <p className="text-xs font-medium text-amber-800 mb-1">
              Gold Alloys (per gram)
            </p>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <RateBox
                label="22K"
                value={metals.GOLD_22K}
                symbol={currencySymbol}
              />
              <RateBox
                label="18K"
                value={metals.GOLD_18K}
                symbol={currencySymbol}
              />
              <RateBox
                label="14K"
                value={metals.GOLD_14K}
                symbol={currencySymbol}
              />
              <RateBox
                label="10K"
                value={metals.GOLD_10K}
                symbol={currencySymbol}
              />
            </div>
          </div>

          {/* Silver rates */}
          <div>
            <p className="text-xs font-medium text-amber-800 mb-1">
              Silver (per gram)
            </p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <RateBox
                label="999"
                value={metals.SILVER_999}
                symbol={currencySymbol}
                color="gray"
              />
              <RateBox
                label="925 (Sterling)"
                value={metals.SILVER_925}
                symbol={currencySymbol}
                color="gray"
              />
            </div>
          </div>

          {/* Alloy Premium Note */}
          <div className="bg-white/60 rounded p-2 text-xs">
            <p className="font-medium text-amber-700">+ Alloy Premium</p>
            <p className="text-muted-foreground">
              Recipe-based premium will be added based on your alloy selection
              (e.g., Rose Gold, White Gold)
            </p>
          </div>
        </>
      )}

      {/* Method C: Show plating info instead */}
      {buildMethod === "METHOD_C" && (
        <>
          <div className="bg-white/60 rounded p-3 space-y-2">
            <p className="text-xs font-medium text-blue-800">
              Base Metal + Plating
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Base metal:</span>
                <p className="font-medium">From {currencySymbol}0.6/g</p>
              </div>
              <div>
                <span className="text-muted-foreground">Plating:</span>
                <p className="font-medium">From {currencySymbol}900+</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Plating is a <strong>service charge</strong> (per piece), not
              metal weight. Prices reflect coating thickness, durability, and
              process quality.
            </p>
          </div>
        </>
      )}

      {/* Method D: Show machine-made rates */}
      {buildMethod === "METHOD_D" && (
        <>
          {/* Gold rates */}
          <div>
            <p className="text-xs font-medium text-amber-800 mb-1">
              Gold (per gram) - Hollow Construction
            </p>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <RateBox
                label="22K"
                value={metals.GOLD_22K}
                symbol={currencySymbol}
              />
              <RateBox
                label="18K"
                value={metals.GOLD_18K}
                symbol={currencySymbol}
              />
              <RateBox
                label="14K"
                value={metals.GOLD_14K}
                symbol={currencySymbol}
              />
            </div>
          </div>

          {/* Silver rates */}
          <div>
            <p className="text-xs font-medium text-amber-800 mb-1">
              Silver (per gram)
            </p>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <RateBox
                label="925"
                value={metals.SILVER_925}
                symbol={currencySymbol}
                color="gray"
              />
            </div>
          </div>

          {/* Method D info */}
          <div className="bg-white/60 rounded p-3 space-y-2">
            <p className="text-xs font-medium text-amber-700">
              Machine Made (Italian Style)
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                • <strong>Hollow construction</strong>: Save 30-50% gold vs
                solid
              </p>
              <p>
                • <strong>Same visual size</strong>: Looks like solid jewelry
              </p>
              <p>
                • <strong>Style charge</strong>: 8-20% based on pattern
                complexity
              </p>
            </div>
            <p className="text-[10px] italic">
              Example: 10g visual → 5-7g actual gold (hollow) + style charge
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// RATE BOX COMPONENT
// ═══════════════════════════════════════════

interface RateBoxProps {
  label: string;
  value: number;
  symbol: string;
  color?: "amber" | "gray" | "slate";
}

function RateBox({ label, value, symbol, color = "amber" }: RateBoxProps) {
  const colorClasses = {
    amber: "text-amber-600",
    gray: "text-gray-500",
    slate: "text-slate-500",
  };

  return (
    <div className="bg-white/60 rounded px-2 py-1">
      <span className={colorClasses[color]}>{label}:</span>{" "}
      <span className="font-semibold">
        {symbol}{" "}
        {value?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ||
          "N/A"}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════
// ESTIMATE DISPLAY
// ═══════════════════════════════════════════

interface EstimateDisplayProps {
  estimate: EstimateBreakdown;
  currencySymbol: string;
}

function EstimateDisplay({ estimate, currencySymbol }: EstimateDisplayProps) {
  if (estimate.status === "incomplete" && estimate.lineItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg p-3 space-y-2 border border-amber-100">
      <div className="flex items-center gap-2 pb-2 border-b">
        {estimate.status === "complete" ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <AlertCircle className="h-4 w-4 text-yellow-500" />
        )}
        <span className="font-medium text-sm">
          {estimate.status === "complete"
            ? "Estimate Ready"
            : "Partial Estimate"}
        </span>
      </div>

      {/* Line Items */}
      <div className="space-y-1 text-sm">
        {estimate.lineItems.map((item, i) => (
          <div key={i} className="flex justify-between items-start">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground truncate max-w-[70%] cursor-help">
                  {item.label}
                </span>
              </TooltipTrigger>
              {item.details && (
                <TooltipContent>
                  <p className="text-xs max-w-[200px]">{item.details}</p>
                </TooltipContent>
              )}
            </Tooltip>
            <span className="font-medium">
              {currencySymbol}{" "}
              {item.amount.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      {estimate.subtotal > 0 && (
        <div className="pt-2 border-t space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>
              {currencySymbol}{" "}
              {estimate.subtotal.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
          {estimate.taxAmount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Tax ({(estimate.taxRate * 100).toFixed(0)}%)</span>
              <span>
                {currencySymbol}{" "}
                {estimate.taxAmount.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-1 border-t">
            <span>Total</span>
            <span className="text-green-600">
              {currencySymbol}{" "}
              {estimate.total.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default LivePricingPanel;
