"use client";

import { Badge } from "@/components/ui/badge";
import { T } from "@/components/ui/T";
import { useShopCurrency } from "@/hooks/useShopCurrency";
import { useShopMarketRates } from "@/hooks/useShopMarketRates";
import {
  formatRatePerGram,
  isLiveMarketCache,
} from "@/lib/market-rates";
import { Loader2 } from "lucide-react";

export function ShopRatesStrip() {
  const { symbol } = useShopCurrency();
  const { rates, loading, ready } = useShopMarketRates();
  const live = isLiveMarketCache(rates?.cache);

  if (!ready && loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200/70 bg-amber-50/60 px-3 py-2 text-xs text-muted-foreground dark:border-amber-900/40 dark:bg-amber-950/30">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <T>Loading shop rates...</T>
      </div>
    );
  }

  if (!rates) return null;

  const tiles: { label: string; translatable?: boolean; value: number | undefined }[] = [
    { label: "24K", value: rates.metals.GOLD_24K },
    { label: "22K", value: rates.metals.GOLD_22K },
    { label: "18K", value: rates.metals.GOLD_18K },
    { label: "Silver", translatable: true, value: rates.metals.SILVER_999 },
  ];

  return (
    <div
      data-tour="pos-live-rates"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/30"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
        <T>Shop rates</T>
      </span>
      {tiles.map((tile) => (
        <span
          key={tile.label}
          className="text-xs tabular-nums text-amber-950 dark:text-amber-100"
        >
          <span className="mr-1 text-[10px] font-semibold uppercase text-muted-foreground">
            {tile.translatable ? <T>{tile.label}</T> : tile.label}
          </span>
          {symbol}
          {formatRatePerGram(tile.value ?? 0)}
          <span className="text-[10px] font-normal text-muted-foreground">/<T>g</T></span>
        </span>
      ))}
      <Badge
        variant="outline"
        className={`ml-auto text-[10px] ${
          live
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "border-amber-300 bg-white text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        }`}
      >
        {live ? <T>Live</T> : <T>Cached</T>}
      </Badge>
    </div>
  );
}
