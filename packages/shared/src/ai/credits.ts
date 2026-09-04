/** Billing page tab where shopkeepers buy extra AI credits. */
export const AI_CREDITS_BILLING_PATH = "/dashboard/shop/billing?tab=credits";

/** Credits charged per shopkeeper AI action. Customers are rate-limited, not billed. */
export const AI_CREDIT_COSTS = {
  PRODUCT_DESCRIPTION: 0.25,
  DESIGN_IMAGE: 1,
  /** 5 Imagen variations from Design Studio / RFQ. Equals 5 × DESIGN_IMAGE. */
  DESIGN_VARIATIONS: 5,
} as const;

export const AI_VARIATION_BATCH_SIZE = 5;
export const AI_VARIATION_BATCH_TTL_SEC = 30 * 60;

export function variationBatchRedisKey(
  userId: string,
  batchId?: string,
): string {
  return batchId ? `ai:varbatch:${userId}:${batchId}` : `ai:varbatch:${userId}`;
}

export function variationBatchModelRedisKey(
  userId: string,
  batchId?: string,
): string {
  return `${variationBatchRedisKey(userId, batchId)}:model`;
}

export function toCreditNumber(value: unknown): number {
  if (value == null) return 0;
  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber: () => number }).toNumber === "function"
  ) {
    return roundCredits((value as { toNumber: () => number }).toNumber());
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return roundCredits(n);
}

export function roundCredits(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatAiCredits(value: unknown): string {
  const n = toCreditNumber(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function hasEnoughAiCredits(
  balance: unknown,
  required: number,
): boolean {
  return toCreditNumber(balance) + 1e-9 >= roundCredits(required);
}
