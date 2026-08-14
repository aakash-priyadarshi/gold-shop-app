/** Audit resource for shop-base-currency rebases. */
export const SHOP_PRICE_REBASE_RESOURCE = "SHOP_PRICE_REBASE";

const MONEY_CURRENCIES = new Set([
  "NPR",
  "INR",
  "AED",
  "USD",
  "GBP",
  "EUR",
  "LKR",
]);

export function isShopMoneyCurrency(value: unknown): value is string {
  return typeof value === "string" && MONEY_CURRENCIES.has(value);
}

/** Round a stored shop-currency amount by an FX multiplier (2 decimal places). */
export function scaleShopMoney(
  amount: number | null | undefined,
  rate: number,
): number | null | undefined {
  if (amount == null) return amount;
  if (!Number.isFinite(amount) || !Number.isFinite(rate)) return amount;
  return Math.round(amount * rate * 100) / 100;
}

export type ShopPriceConversion = {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
  quotedAt: string;
};

export function previousCurrencyFromAudit(
  previousValue: unknown,
  currentCurrency: string,
): string | null {
  if (!previousValue || typeof previousValue !== "object") return null;
  const prev = (previousValue as { currency?: unknown }).currency;
  if (!isShopMoneyCurrency(prev) || prev === currentCurrency) return null;
  return prev;
}

export function rebaseAlreadyApplied(
  lastRebase: unknown,
  toCurrency: string,
): boolean {
  if (!lastRebase || typeof lastRebase !== "object") return false;
  const to = (lastRebase as { toCurrency?: unknown }).toCurrency;
  return isShopMoneyCurrency(to) && to === toCurrency;
}

export function fromCurrencyOfLastRebase(lastRebase: unknown): string | null {
  if (!lastRebase || typeof lastRebase !== "object") return null;
  const to = (lastRebase as { toCurrency?: unknown }).toCurrency;
  return isShopMoneyCurrency(to) ? to : null;
}
