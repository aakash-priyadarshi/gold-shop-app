import { ForbiddenException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AccountingController } from "./accounting.controller";

describe("AccountingController ownership", () => {
  const accounting = {
    getChartOfAccounts: jest.fn(),
    getTrialBalance: jest.fn(),
    getProfitAndLoss: jest.fn(),
    getShopLedger: jest.fn(),
    getGeneralLedger: jest.fn(),
    getJournalDetail: jest.fn(),
    postOpeningBalance: jest.fn(),
    backfillShopLedger: jest.fn(),
  };
  const controller = new AccountingController(accounting as any);

  beforeEach(() => jest.clearAllMocks());

  it("rejects a shopkeeper reading another shop ledger", async () => {
    await expect(
      controller.ledger(
        "shop-2",
        "shop-1",
        UserRole.SHOPKEEPER,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(accounting.getShopLedger).not.toHaveBeenCalled();
  });

  it("allows an administrator to read a requested shop trial balance", async () => {
    accounting.getTrialBalance.mockResolvedValue({ balanced: true });
    await expect(
      controller.trialBalance(
        "shop-2",
        undefined as any,
        UserRole.ADMIN,
      ),
    ).resolves.toEqual({ balanced: true });
    expect(accounting.getTrialBalance).toHaveBeenCalledWith("shop-2", {
      from: undefined,
      to: undefined,
    });
  });

  it("rejects a shopkeeper posting opening balances for another shop", async () => {
    await expect(
      controller.openingBalances(
        "shop-2",
        "shop-1",
        UserRole.SHOPKEEPER,
        "user-1",
        {
          asOfDate: "2026-01-01",
          cashAmount: 1000,
        } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(accounting.postOpeningBalance).not.toHaveBeenCalled();
  });

  it("allows shop owner to backfill their own ledger", async () => {
    accounting.backfillShopLedger.mockResolvedValue({ invoicesPosted: 2 });
    await expect(
      controller.backfill("shop-1", "shop-1", UserRole.SHOPKEEPER, "user-1"),
    ).resolves.toEqual({ invoicesPosted: 2 });
    expect(accounting.backfillShopLedger).toHaveBeenCalledWith(
      "shop-1",
      "user-1",
    );
  });

  it("allows admin to read profit and loss for any shop", async () => {
    accounting.getProfitAndLoss.mockResolvedValue({ netIncomeNpr: "10.0000" });
    await expect(
      controller.profitLoss("shop-9", undefined as any, UserRole.ADMIN),
    ).resolves.toEqual({ netIncomeNpr: "10.0000" });
  });
});
