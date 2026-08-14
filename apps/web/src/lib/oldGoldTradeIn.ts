/**
 * Old-gold / trade-in helpers for calculator → POS / invoice handoff.
 */

export const TRADE_IN_STORAGE_KEY = "orivraa_trade_in_credit";

export interface TradeInPayload {
  calculatedCredit: number;
  finalCredit: number;
  overrideReason?: string;
  currency?: string;
  items?: Array<{
    metal?: string;
    karatOrPurity?: string | number;
    weightG?: number;
    deductionPct?: number;
    calculatedCredit?: number;
  }>;
  rateSnapshot?: {
    rate24k?: number;
    silver999?: number;
    fetchedAt?: string;
  };
  createdAt: string;
}

export function saveTradeInPayload(payload: Omit<TradeInPayload, "createdAt">) {
  if (typeof window === "undefined") return;
  const full: TradeInPayload = {
    ...payload,
    createdAt: new Date().toISOString(),
  };
  sessionStorage.setItem(TRADE_IN_STORAGE_KEY, JSON.stringify(full));
}

export function loadTradeInPayload(): TradeInPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TRADE_IN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TradeInPayload;
  } catch {
    return null;
  }
}

export function clearTradeInPayload() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TRADE_IN_STORAGE_KEY);
}
