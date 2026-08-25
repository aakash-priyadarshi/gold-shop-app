import { describe, expect, it } from "vitest";
import {
  computeKarigarFinancialSummary,
  computeKarigarMetalBalances,
} from "./karigar-settlement";

describe("Karigar settlement pure helpers", () => {
  it("computes net payable, amount payable and advance balance correctly", () => {
    // 1. Initial state: zero
    const empty = computeKarigarFinancialSummary([]);
    expect(empty.netPayable).toBe(0);
    expect(empty.amountPayable).toBe(0);
    expect(empty.advanceBalance).toBe(0);

    // 2. Opening balance + Wage accrual
    const s1 = computeKarigarFinancialSummary([
      { type: "OPENING_BALANCE", amount: 1000 },
      { type: "WAGE_ACCRUAL", amount: 2500 },
    ]);
    expect(s1.openingBalance).toBe(1000);
    expect(s1.totalWagesAccrued).toBe(2500);
    expect(s1.netPayable).toBe(3500);
    expect(s1.amountPayable).toBe(3500);
    expect(s1.advanceBalance).toBe(0);

    // 3. Partial settlement payment
    const s2 = computeKarigarFinancialSummary([
      { type: "OPENING_BALANCE", amount: 1000 },
      { type: "WAGE_ACCRUAL", amount: 2500 },
      { type: "SETTLEMENT_PAYMENT", amount: 1500 },
    ]);
    expect(s2.totalSettlementsPaid).toBe(1500);
    expect(s2.netPayable).toBe(2000);
    expect(s2.amountPayable).toBe(2000);
    expect(s2.advanceBalance).toBe(0);

    // 4. Advance payment exceeding payable (creates advance credit balance)
    const s3 = computeKarigarFinancialSummary([
      { type: "OPENING_BALANCE", amount: 0 },
      { type: "ADVANCE_PAYMENT", amount: 5000 },
    ]);
    expect(s3.totalAdvances).toBe(5000);
    expect(s3.netPayable).toBe(-5000);
    expect(s3.amountPayable).toBe(0);
    expect(s3.advanceBalance).toBe(5000);

    // 5. Subsequent wage accrual consumes advance
    const s4 = computeKarigarFinancialSummary([
      { type: "ADVANCE_PAYMENT", amount: 5000 },
      { type: "WAGE_ACCRUAL", amount: 3000 },
    ]);
    expect(s4.netPayable).toBe(-2000);
    expect(s4.amountPayable).toBe(0);
    expect(s4.advanceBalance).toBe(2000);

    // 6. Additional wage accrual flips to payable
    const s5 = computeKarigarFinancialSummary([
      { type: "ADVANCE_PAYMENT", amount: 5000 },
      { type: "WAGE_ACCRUAL", amount: 7000 },
    ]);
    expect(s5.netPayable).toBe(2000);
    expect(s5.amountPayable).toBe(2000);
    expect(s5.advanceBalance).toBe(0);

    // 7. Adjustments increase and decrease
    const s6 = computeKarigarFinancialSummary([
      { type: "WAGE_ACCRUAL", amount: 2000 },
      { type: "ADJUSTMENT_INCREASE", amount: 300 },
      { type: "ADJUSTMENT_DECREASE", amount: 100 },
    ]);
    expect(s6.adjustmentsIncrease).toBe(300);
    expect(s6.adjustmentsDecrease).toBe(100);
    expect(s6.netPayable).toBe(2200);
    expect(s6.amountPayable).toBe(2200);
  });

  it("computes material-by-material metal balances", () => {
    const movements = [
      { metalKey: "goldGrains24k", type: "ISSUE", weightGrams: 100 },
      { metalKey: "goldGrains24k", type: "RETURN_FINISHED", weightGrams: 50 },
      { metalKey: "goldGrains24k", type: "RETURN_UNUSED", weightGrams: 20 },
      { metalKey: "goldGrains24k", type: "RETURN_SPRUE", weightGrams: 10 },
      { metalKey: "goldGrains24k", type: "SCRAP", weightGrams: 5 },
      { metalKey: "silverBullion999", type: "ISSUE", weightGrams: 200 },
      { metalKey: "silverBullion999", type: "RETURN_FINISHED", weightGrams: 80 },
    ];

    const balances = computeKarigarMetalBalances(movements);
    expect(balances).toHaveLength(2);

    const gold = balances.find((b) => b.metalKey === "goldGrains24k");
    expect(gold).toBeDefined();
    expect(gold?.issuedGrams).toBe(100);
    expect(gold?.returnedGrams).toBe(85);
    expect(gold?.outstandingGrams).toBe(15);

    const silver = balances.find((b) => b.metalKey === "silverBullion999");
    expect(silver).toBeDefined();
    expect(silver?.issuedGrams).toBe(200);
    expect(silver?.returnedGrams).toBe(80);
    expect(silver?.outstandingGrams).toBe(120);
  });
});
