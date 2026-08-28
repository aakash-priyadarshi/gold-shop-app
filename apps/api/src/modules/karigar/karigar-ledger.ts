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

export function issueRequiresWorkshop(workshopId?: string | null): boolean {
  return Boolean(workshopId && workshopId.trim());
}

export function wageForFinishedReturn(
  weightGrams: number,
  wageRatePerGram: number,
): number {
  if (!(weightGrams > 0) || !(wageRatePerGram > 0)) return 0;
  return Math.round(weightGrams * wageRatePerGram * 100) / 100;
}

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

export function computeMetalBalances(
  movements: Array<{
    metalKey?: string | null;
    type: string;
    weightGrams: number | string;
  }>,
): MaterialMetalBalance[] {
  return computeKarigarMetalBalances(movements);
}

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
