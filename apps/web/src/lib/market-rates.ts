export type MarketCacheStatus =
  | "fresh"
  | "stale"
  | "fallback"
  | "miss"
  | "hit";

export interface ParsedMarketRates {
  metals: Record<string, number>;
  currency: string;
  updatedAt: string;
  cache: MarketCacheStatus;
  fx?: { rate: number };
  source?: string;
  changePercent?: number;
}

/** Memory/API hits are current enough to label Live; stale and fallback are Cached. */
export function isLiveMarketCache(cache?: string | null): boolean {
  return cache === "fresh" || cache === "hit" || cache === "miss";
}

export function unwrapMarketRatesPayload(
  payload: unknown,
): Record<string, any> | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, any>;
  if (root.metals) return root;
  const nested = root.data;
  if (nested && typeof nested === "object") {
    if (nested.metals || nested.currency) return nested;
  }
  return null;
}

export function readMetalRate(
  data: unknown,
  codes: string[],
): number {
  const payload = unwrapMarketRatesPayload(data);
  const metals = payload?.metals;
  if (Array.isArray(metals)) {
    const match = metals.find((m: { code?: string }) =>
      codes.includes(String(m?.code || "")),
    );
    return Number(match?.ratePerGram ?? match?.rate ?? 0) || 0;
  }
  if (metals && typeof metals === "object") {
    for (const code of codes) {
      const value = (metals as Record<string, unknown>)[code];
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (value && typeof value === "object") {
        const nested = Number(
          (value as { ratePerGram?: number; rate?: number }).ratePerGram ??
            (value as { rate?: number }).rate ??
            0,
        );
        if (nested > 0) return nested;
      }
    }
  }
  return 0;
}

function asCacheStatus(value: unknown): MarketCacheStatus {
  if (
    value === "fresh" ||
    value === "stale" ||
    value === "fallback" ||
    value === "miss" ||
    value === "hit"
  ) {
    return value;
  }
  return "stale";
}

export function parseMarketRatesPayload(
  payload: unknown,
): ParsedMarketRates | null {
  const data = unwrapMarketRatesPayload(payload);
  if (!data) return null;

  const metals: Record<string, number> = {};
  const rawMetals = data.metals;
  if (Array.isArray(rawMetals)) {
    for (const item of rawMetals) {
      const code = String(item?.code || "");
      const rate = Number(item?.ratePerGram ?? item?.rate ?? 0);
      if (code && rate > 0) metals[code] = rate;
    }
  } else if (rawMetals && typeof rawMetals === "object") {
    for (const [key, value] of Object.entries(rawMetals)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        metals[key] = value;
        continue;
      }
      if (value && typeof value === "object") {
        const nested = Number(
          (value as { ratePerGram?: number; rate?: number }).ratePerGram ??
            (value as { rate?: number }).rate ??
            0,
        );
        if (nested > 0) metals[key] = nested;
      }
    }
  }

  const rate24k = readMetalRate(data, ["GOLD_24K", "XAU", "GOLD"]);
  if (rate24k > 0 && metals.GOLD_24K == null) metals.GOLD_24K = rate24k;
  const rate22k = readMetalRate(data, ["GOLD_22K"]) || (rate24k > 0 ? rate24k * (22 / 24) : 0);
  if (rate22k > 0 && metals.GOLD_22K == null) metals.GOLD_22K = rate22k;
  const rate18k = readMetalRate(data, ["GOLD_18K"]) || (rate24k > 0 ? rate24k * (18 / 24) : 0);
  if (rate18k > 0 && metals.GOLD_18K == null) metals.GOLD_18K = rate18k;
  const rate14k = readMetalRate(data, ["GOLD_14K"]) || (rate24k > 0 ? rate24k * (14 / 24) : 0);
  if (rate14k > 0 && metals.GOLD_14K == null) metals.GOLD_14K = rate14k;
  const silver = readMetalRate(data, ["SILVER_999", "SILVER_925", "XAG", "SILVER"]);
  if (silver > 0 && metals.SILVER_999 == null) metals.SILVER_999 = silver;

  if (!data.currency && Object.keys(metals).length === 0) return null;

  return {
    metals,
    currency: String(data.currency || ""),
    updatedAt:
      typeof data.updatedAt === "string" && data.updatedAt
        ? data.updatedAt
        : new Date().toISOString(),
    cache: asCacheStatus(data.cache),
    fx:
      data.fx && typeof data.fx.rate === "number"
        ? { rate: data.fx.rate }
        : undefined,
    source: typeof data.source === "string" ? data.source : undefined,
    changePercent:
      typeof data.changePercent === "number" ? data.changePercent : undefined,
  };
}

export function compactGoldRates(rates: ParsedMarketRates) {
  const rate24k = rates.metals.GOLD_24K ?? 0;
  return {
    rate24k,
    rate22k: rates.metals.GOLD_22K || (rate24k > 0 ? rate24k * (22 / 24) : 0),
    rate18k: rates.metals.GOLD_18K || (rate24k > 0 ? rate24k * (18 / 24) : 0),
    silver: rates.metals.SILVER_999 || rates.metals.SILVER_925 || 0,
    currency: rates.currency,
    updatedAt: rates.updatedAt,
    cache: rates.cache,
  };
}

export function formatRatePerGram(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
