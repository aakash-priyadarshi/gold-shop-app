/**
 * Money helpers.
 *
 * All monetary amounts in the app are stored as decimal currency units (e.g.
 * rupees), not minor units. Raw IEEE-754 arithmetic on those values introduces
 * representation errors (e.g. `0.1 + 0.2 === 0.30000000000000004`, or
 * `1234.5 * 0.13 === 160.48500000000001`), which then get persisted and shown
 * to customers. `roundMoney` snaps a computed amount back to 2 decimal places
 * using half-away-from-zero rounding so totals are stable and auditable.
 */

/** Round a monetary amount to 2 decimal places (half away from zero). */
export function roundMoney(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  // Scale, round with a tiny epsilon to counter float representation error,
  // then unscale. Works correctly for the negative case too.
  const sign = amount < 0 ? -1 : 1;
  const scaled = Math.abs(amount) * 100;
  return (sign * Math.round(scaled + Number.EPSILON * scaled)) / 100;
}

/** Sum a list of monetary amounts, rounding the result to 2 decimals. */
export function sumMoney(amounts: number[]): number {
  return roundMoney(amounts.reduce((acc, n) => acc + (Number(n) || 0), 0));
}
