/**
 * Karigar Account & Financial Settlement types and pure math helpers.
 */

export const KARIGAR_MOVEMENT_TYPES = [
  "ISSUE",
  "TRANSFER",
  "RETURN_FINISHED",
  "RETURN_UNUSED",
  "RETURN_SPRUE",
  "SCRAP",
  "DUST",
  "ADJUST",
] as const;

export type KarigarMovementTypeCode = (typeof KARIGAR_MOVEMENT_TYPES)[number];

export const KARIGAR_FINANCIAL_ENTRY_TYPES = [
  "OPENING_BALANCE",
  "WAGE_ACCRUAL",
  "SETTLEMENT_PAYMENT",
  "ADVANCE_PAYMENT",
  "ADJUSTMENT_INCREASE",
  "ADJUSTMENT_DECREASE",
] as const;

export type KarigarFinancialEntryTypeCode =
  (typeof KARIGAR_FINANCIAL_ENTRY_TYPES)[number];

export const KARIGAR_PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "UPI",
  "ESEWA",
  "KHALTI",
  "CONNECTIPS",
  "CHEQUE",
  "OTHER",
] as const;

export type KarigarPaymentMethodCode =
  (typeof KARIGAR_PAYMENT_METHODS)[number];

export function roundMoney(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

export interface FinancialEntryInput {
  type: string;
  amount: number | string;
}

export interface KarigarFinancialSummary {
  openingBalance: number;
  totalWagesAccrued: number;
  totalSettlementsPaid: number;
  totalAdvances: number;
  adjustmentsIncrease: number;
  adjustmentsDecrease: number;
  netPayable: number;
  amountPayable: number;
  advanceBalance: number;
}

/**
 * Authoritative financial balance formula:
 * netPayable = OPENING_BALANCE + WAGE_ACCRUAL + ADJUSTMENT_INCREASE - SETTLEMENT_PAYMENT - ADVANCE_PAYMENT - ADJUSTMENT_DECREASE
 * amountPayable = max(netPayable, 0)
 * advanceBalance = max(-netPayable, 0)
 */
export function computeKarigarFinancialSummary(
  entries: FinancialEntryInput[],
): KarigarFinancialSummary {
  let openingBalance = 0;
  let totalWagesAccrued = 0;
  let totalSettlementsPaid = 0;
  let totalAdvances = 0;
  let adjustmentsIncrease = 0;
  let adjustmentsDecrease = 0;

  for (const entry of entries) {
    const raw =
      typeof entry.amount === "string"
        ? parseFloat(entry.amount)
        : Number(entry.amount);
    const amount = Number.isFinite(raw) && raw > 0 ? roundMoney(raw) : 0;
    if (amount <= 0) continue;

    switch (entry.type) {
      case "OPENING_BALANCE":
        openingBalance = roundMoney(openingBalance + amount);
        break;
      case "WAGE_ACCRUAL":
        totalWagesAccrued = roundMoney(totalWagesAccrued + amount);
        break;
      case "SETTLEMENT_PAYMENT":
        totalSettlementsPaid = roundMoney(totalSettlementsPaid + amount);
        break;
      case "ADVANCE_PAYMENT":
        totalAdvances = roundMoney(totalAdvances + amount);
        break;
      case "ADJUSTMENT_INCREASE":
        adjustmentsIncrease = roundMoney(adjustmentsIncrease + amount);
        break;
      case "ADJUSTMENT_DECREASE":
        adjustmentsDecrease = roundMoney(adjustmentsDecrease + amount);
        break;
      default:
        break;
    }
  }

  const credits = roundMoney(
    openingBalance + totalWagesAccrued + adjustmentsIncrease,
  );
  const debits = roundMoney(
    totalSettlementsPaid + totalAdvances + adjustmentsDecrease,
  );
  const netPayable = roundMoney(credits - debits);
  const amountPayable = roundMoney(Math.max(0, netPayable));
  const advanceBalance = roundMoney(Math.max(0, -netPayable));

  return {
    openingBalance,
    totalWagesAccrued,
    totalSettlementsPaid,
    totalAdvances,
    adjustmentsIncrease,
    adjustmentsDecrease,
    netPayable,
    amountPayable,
    advanceBalance,
  };
}

export interface MetalMovementInput {
  metalKey?: string | null;
  type: string;
  weightGrams: number | string;
}

export interface MaterialMetalBalance {
  metalKey: string;
  issuedGrams: number;
  returnedGrams: number;
  outstandingGrams: number;
}

export function isReturnMovementType(type: string): boolean {
  return (
    type === "RETURN_FINISHED" ||
    type === "RETURN_UNUSED" ||
    type === "RETURN_SPRUE" ||
    type === "SCRAP" ||
    type === "DUST"
  );
}

/**
 * Metal balance per material (grouped by metalKey):
 * issuedGrams = sum of ISSUE
 * returnedGrams = sum of RETURN_FINISHED, RETURN_UNUSED, RETURN_SPRUE, SCRAP, DUST
 * outstandingGrams = max(0, issuedGrams - returnedGrams)
 */
export function computeKarigarMetalBalances(
  movements: MetalMovementInput[],
): MaterialMetalBalance[] {
  const map = new Map<string, { issued: number; returned: number }>();

  for (const m of movements) {
    const metalKey = m.metalKey?.trim() || "goldGrains24k";
    const rawWeight =
      typeof m.weightGrams === "string"
        ? parseFloat(m.weightGrams)
        : Number(m.weightGrams);
    const weight = Number.isFinite(rawWeight) && rawWeight > 0
      ? Math.round(rawWeight * 1000) / 1000
      : 0;
    if (weight <= 0) continue;

    const row = map.get(metalKey) ?? { issued: 0, returned: 0 };
    if (m.type === "ISSUE") {
      row.issued = Math.round((row.issued + weight) * 1000) / 1000;
    } else if (isReturnMovementType(m.type)) {
      row.returned = Math.round((row.returned + weight) * 1000) / 1000;
    }
    map.set(metalKey, row);
  }

  const result: MaterialMetalBalance[] = [];
  map.forEach((row, metalKey) => {
    const outstanding = Math.max(
      0,
      Math.round((row.issued - row.returned) * 1000) / 1000,
    );
    result.push({
      metalKey,
      issuedGrams: row.issued,
      returnedGrams: row.returned,
      outstandingGrams: outstanding,
    });
  });

  return result.sort((a, b) => a.metalKey.localeCompare(b.metalKey));
}
