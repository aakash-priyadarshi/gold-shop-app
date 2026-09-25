import { BadRequestException } from "@nestjs/common";
import { WorkshopLedgerVersion } from "@prisma/client";
import { WorkshopTraceableController } from "./workshop.controller";

describe("WorkshopTraceableController ledger mode", () => {
  const shop = {
    workshopMode: true,
    workshopLedgerVersion: WorkshopLedgerVersion.LEGACY,
  };
  const prisma = {
    shop: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const controller = new WorkshopTraceableController({} as never, prisma as never, {} as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.shop.findUnique.mockResolvedValue({ ...shop });
    prisma.shop.update.mockResolvedValue({
      id: "shop-1",
      workshopLedgerVersion: WorkshopLedgerVersion.TRACEABLE,
    });
  });

  it("allows an explicit opt-in from LEGACY", async () => {
    await expect(
      controller.setLedgerVersion("shop-1", { workshopLedgerVersion: "TRACEABLE" }),
    ).resolves.toEqual({
      id: "shop-1",
      workshopLedgerVersion: WorkshopLedgerVersion.TRACEABLE,
    });
  });

  it("rejects a return to LEGACY after traceable mode was enabled", async () => {
    prisma.shop.findUnique.mockResolvedValue({
      ...shop,
      workshopLedgerVersion: WorkshopLedgerVersion.TRACEABLE,
    });
    await expect(
      controller.setLedgerVersion("shop-1", { workshopLedgerVersion: "LEGACY" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.shop.update).not.toHaveBeenCalled();
  });
});
