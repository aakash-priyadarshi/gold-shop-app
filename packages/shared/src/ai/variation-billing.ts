/** Decide whether a POST /designs image should consume a prepaid 5-pack slot. */
export function shouldUsePrepaidVariationSlot(opts: {
  variationOf: unknown;
  redisAvailable: boolean;
  prepaidRemaining: number | null;
}): boolean {
  if (typeof opts.variationOf !== "string" || !opts.variationOf.trim()) {
    return false;
  }
  if (!opts.redisAvailable) return true;
  return (opts.prepaidRemaining ?? 0) > 0;
}
