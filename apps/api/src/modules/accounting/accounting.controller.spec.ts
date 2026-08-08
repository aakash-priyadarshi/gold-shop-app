import { ForbiddenException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AccountingController } from "./accounting.controller";

describe("AccountingController ownership", () => {
  const accounting = {
    getChartOfAccounts: jest.fn(),
    getTrialBalance: jest.fn(),
    getShopLedger: jest.fn(),
    getGeneralLedger: jest.fn(),
    getJournalDetail: jest.fn(),
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
});
