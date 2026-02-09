"use client";

import { TrendingDown } from "lucide-react";

interface MarketComparisonProps {
  ourPrice: number;
  currencySymbol: string;
  makingChargePercent: number;
  platformCommissionRate?: number;
}

/**
 * Shows a competitor price comparison below the seller's price.
 * Competitor price = our price + random 5-10% markup.
 * Combined making charge = seller making charge + platform commission.
 */
export function MarketComparison({
  ourPrice,
  currencySymbol,
  makingChargePercent,
  platformCommissionRate = 5,
}: MarketComparisonProps) {
  // Calculate competitor price (5-10% more than our price)
  // Use a deterministic "random" based on the price to stay consistent
  const seed = Math.floor(ourPrice) % 6; // 0-5
  const markupPercent = 5 + seed; // 5-10%
  const competitorPrice = Math.round(ourPrice * (1 + markupPercent / 100));
  const savings = competitorPrice - ourPrice;

  // Combined making charge (seller + platform commission)
  const combinedMakingCharge = makingChargePercent + platformCommissionRate;

  return (
    <div className="mt-2 space-y-1">
      {/* Combined making charge display */}
      <div className="text-xs text-gray-500">
        Making Charge: {combinedMakingCharge}%
      </div>

      {/* Competitor comparison */}
      <div className="flex items-center gap-1.5 text-xs">
        <TrendingDown className="h-3 w-3 text-green-600" />
        <span className="text-gray-400 line-through">
          {currencySymbol}
          {competitorPrice.toLocaleString()}
        </span>
        <span className="text-green-600 font-medium">
          Save {markupPercent}%
        </span>
      </div>
      <p className="text-[10px] text-gray-400">
        vs. avg. market price ({currencySymbol}
        {savings.toLocaleString()} less)
      </p>
    </div>
  );
}
