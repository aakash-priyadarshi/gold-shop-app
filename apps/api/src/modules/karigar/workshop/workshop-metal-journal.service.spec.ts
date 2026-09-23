import { BadRequestException } from "@nestjs/common";
import { createHash } from "crypto";
import {
  Prisma,
  WorkshopMetalAccountKey,
  WorkshopMetalJournalReferenceType,
  WorkshopMetalJournalStatus,
} from "@prisma/client";
import { WorkshopMetalJournalService } from "./workshop-metal-journal.service";
import { DEFAULT_WORKSHOP_METAL_ACCOUNTS } from "./workshop-metal.types";

describe("WorkshopMetalJournalService", () => {
  const findMany = jest.fn();
  const upsert = jest.fn();
  const journalFindUnique = jest.fn();
  const journalCreate = jest.fn();
  const journalUpdate = jest.fn();
  const accountUpdate = jest.fn();
  const queryRaw = jest.fn();
  const tx = {
    workshopMetalAccount: {
      findMany,
      upsert,
      update: accountUpdate,
    },
    workshopMetalJournal: {
      findUnique: journalFindUnique,
      create: journalCreate,
      update: journalUpdate,
    },
    $queryRaw: queryRaw,
  } as any;
  let service: WorkshopMetalJournalService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkshopMetalJournalService({} as any);
    journalFindUnique.mockResolvedValue(null);
    findMany.mockResolvedValue([]);
    upsert.mockImplementation(({ create }: any) => Promise.resolve(create));
    journalCreate.mockResolvedValue({ id: "journal-1" });
    journalUpdate.mockResolvedValue({
      id: "journal-1",
      status: WorkshopMetalJournalStatus.POSTED,
      weightGrams: new Prisma.Decimal("100.25"),
      lines: [],
    });
    accountUpdate.mockResolvedValue({});
    queryRaw.mockResolvedValue([
      {
        id: "vault",
        systemKey: WorkshopMetalAccountKey.GOLD995_VAULT,
        balanceGrams: new Prisma.Decimal("1000.00"),
      },
      {
        id: "wip",
        systemKey: WorkshopMetalAccountKey.CASTING_TREE_WIP,
        balanceGrams: new Prisma.Decimal("0"),
      },
      {
        id: "eq",
        systemKey: WorkshopMetalAccountKey.OPENING_EQUITY,
        balanceGrams: new Prisma.Decimal("1000.00"),
      },
    ]);
  });

  const issueInput = {
    shopId: "shop-1",
    referenceType: WorkshopMetalJournalReferenceType.GOLD995_ISSUE_TO_TREE,
    referenceId: "reading-1",
    idempotencyKey: "workshop-gold995-issue:reading-1",
    description: "Gold 995 issue",
    transactionDate: new Date("2026-09-18T00:00:00Z"),
    weightGrams: "100.25",
    scaleReadingId: "reading-1",
    lines: [
      {
        accountKey: WorkshopMetalAccountKey.CASTING_TREE_WIP,
        debitGrams: "100.25",
      },
      {
        accountKey: WorkshopMetalAccountKey.GOLD995_VAULT,
        creditGrams: "100.25",
      },
    ],
  };

  it("creates DRAFT then POSTED balanced Gold 995 issue lines", async () => {
    await service.postEntry(tx, issueInput);

    expect(journalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: WorkshopMetalJournalStatus.DRAFT,
          weightGrams: new Prisma.Decimal("100.250000"),
          scaleReadingId: "reading-1",
        }),
      }),
    );
    expect(journalUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "journal-1" },
        data: expect.objectContaining({
          status: WorkshopMetalJournalStatus.POSTED,
        }),
      }),
    );
    expect(accountUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          shopId_systemKey: {
            shopId: "shop-1",
            systemKey: WorkshopMetalAccountKey.GOLD995_VAULT,
          },
        },
        data: { balanceGrams: new Prisma.Decimal("899.750000") },
      }),
    );
    expect(accountUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          shopId_systemKey: {
            shopId: "shop-1",
            systemKey: WorkshopMetalAccountKey.CASTING_TREE_WIP,
          },
        },
        data: { balanceGrams: new Prisma.Decimal("100.250000") },
      }),
    );
  });

  it("rejects Gold Scale weights that are not 0.01 g multiples", async () => {
    await expect(
      service.postEntry(tx, { ...issueInput, weightGrams: "100.251" }),
    ).rejects.toThrow();
  });

  it("rejects unbalanced lines", async () => {
    await expect(
      service.postEntry(tx, {
        ...issueInput,
        lines: [
          {
            accountKey: WorkshopMetalAccountKey.CASTING_TREE_WIP,
            debitGrams: "100.25",
          },
          {
            accountKey: WorkshopMetalAccountKey.GOLD995_VAULT,
            creditGrams: "90.00",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects insufficient vault", async () => {
    queryRaw.mockResolvedValue([
      {
        id: "vault",
        systemKey: WorkshopMetalAccountKey.GOLD995_VAULT,
        balanceGrams: new Prisma.Decimal("10.00"),
      },
      {
        id: "wip",
        systemKey: WorkshopMetalAccountKey.CASTING_TREE_WIP,
        balanceGrams: new Prisma.Decimal("0"),
      },
    ]);
    await expect(service.postEntry(tx, issueInput)).rejects.toThrow(
      /Insufficient/,
    );
  });

  it("returns the existing posted journal for the same reading", async () => {
    const existing = {
      id: "journal-1",
      status: WorkshopMetalJournalStatus.POSTED,
      lines: [],
    };
    journalFindUnique.mockResolvedValueOnce(existing);
    const result = await service.postEntry(tx, issueInput);
    expect(result.idempotent).toBe(true);
    expect(journalCreate).not.toHaveBeenCalled();
  });

  it("ensures default Gold 995 accounts, not 24K vault keys", () => {
    expect(
      DEFAULT_WORKSHOP_METAL_ACCOUNTS.every(
        (account) => account.materialKey === "goldGrains995",
      ),
    ).toBe(true);
    expect(
      DEFAULT_WORKSHOP_METAL_ACCOUNTS.some((a) => a.purity === "0.995"),
    ).toBe(true);
  });

  it("derives stable account IDs with SHA-256 rather than a weak hash", async () => {
    const first = await service.ensureDefaultAccounts(tx, "shop-1");
    const second = await service.ensureDefaultAccounts(tx, "shop-1");
    const expected = createHash("sha256")
      .update("shop-1:workshop-metal:GOLD995_VAULT")
      .digest("hex")
      .slice(0, 24);

    expect(first.get(WorkshopMetalAccountKey.GOLD995_VAULT)).toBe(
      `wmacct_${expected}`,
    );
    expect(second.get(WorkshopMetalAccountKey.GOLD995_VAULT)).toBe(
      first.get(WorkshopMetalAccountKey.GOLD995_VAULT),
    );
  });
});
