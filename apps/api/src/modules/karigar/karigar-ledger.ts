import {
  computeKarigarFinancialSummary,
  computeKarigarMetalBalances,
  roundMoney,
  roundGrams,
  type KarigarFinancialSummary,
  type MaterialMetalBalance,
} from "@gold-shop/shared";

export {
  computeKarigarFinancialSummary,
  computeKarigarMetalBalances,
  roundMoney,
  roundGrams,
  type KarigarFinancialSummary,
  type MaterialMetalBalance,
};
import { Prisma } from "@prisma/client";

/** Pure ledger rules for the shop karigar book and account ledger. */

/**
 * Check if a metal issue operation requires a valid workshop ID.
 */
export function issueRequiresWorkshop(workshopId?: string | null): boolean {
  return Boolean(workshopId && workshopId.trim());
}

/**
 * Calculate wage amount for finished goods return based on weight and rate per gram.
 */
export function wageForFinishedReturn(
  weightGrams: number,
  wageRatePerGram: number,
): number {
  if (!(weightGrams > 0) || !(wageRatePerGram > 0)) return 0;
  return Math.round(weightGrams * wageRatePerGram * 100) / 100;
}

/**
 * Compute karigar financial summary from ledger entries, normalizing Prisma Decimal types.
 */
export function computeFinancialSummary(
  entries: Array<{ type: string; amount: number | string | Prisma.Decimal }>,
): KarigarFinancialSummary {
  const normalized = entries.map((e) => ({
    type: e.type,
    amount:
      e.amount instanceof Prisma.Decimal
        ? e.amount.toNumber()
        : typeof e.amount === "string"
          ? parseFloat(e.amount)
          : Number(e.amount),
  }));
  return computeKarigarFinancialSummary(normalized);
}

/**
 * Compute metal balances (issued, returned, outstanding) per material from movement records.
 */
export function computeMetalBalances(
  movements: Array<{
    metalKey?: string | null;
    type: string;
    weightGrams: number | string;
  }>,
): MaterialMetalBalance[] {
  return computeKarigarMetalBalances(movements);
}

/**
 * Validate a payment amount against current amount payable, preventing overpayment.
 */
export function validatePaymentAmount(
  amountToPay: number,
  currentAmountPayable: number,
): { valid: boolean; reason?: string } {
  if (!Number.isFinite(amountToPay) || amountToPay <= 0) {
    return { valid: false, reason: "Payment amount must be greater than zero." };
  }
  const roundedAmount = roundMoney(amountToPay);
  const roundedPayable = roundMoney(currentAmountPayable);
  if (roundedAmount > roundedPayable + 0.0001) {
    return {
      valid: false,
      reason: `Payment amount (${roundedAmount}) cannot exceed total payable (${roundedPayable}). Use 'Record advance' to record an advance balance.`,
    };
  }
  return { valid: true };
}

/**
 * Validate a metal return weight against current outstanding balance, preventing over-return.
 */
export function validateMetalReturn(
  weightGrams: number,
  currentOutstandingGrams: number,
): { valid: boolean; reason?: string } {
  if (!Number.isFinite(weightGrams) || weightGrams <= 0) {
    return { valid: false, reason: "Return weight must be greater than zero." };
  }
  const roundedReturn = roundGrams(weightGrams);
  const roundedOutstanding = roundGrams(currentOutstandingGrams);
  if (roundedReturn > roundedOutstanding + 0.0005) {
    return {
      valid: false,
      reason: `Cannot return ${roundedReturn} g. Only ${roundedOutstanding} g is outstanding with this karigar for this material.`,
    };
  }
  return { valid: true };
}
