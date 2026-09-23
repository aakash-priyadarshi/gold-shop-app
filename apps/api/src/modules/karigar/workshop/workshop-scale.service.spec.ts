import { BadRequestException, ValidationPipe } from "@nestjs/common";
import {
  Prisma,
  WorkshopLedgerVersion,
  WorkshopMetalAccountKey,
  WorkshopScalePurpose,
  WorkshopWeighingSessionStatus,
} from "@prisma/client";
import { assertBalancedMicrograms, GoldScaleSimulator } from "@gold-shop/shared";
import { ConfirmWeighingSessionDto } from "./dto/workshop-weighing.dto";
import { WorkshopMetalJournalService } from "./workshop-metal-journal.service";
import { WorkshopScaleService } from "./workshop-scale.service";

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

describe("WorkshopScaleService Gold 995 issue slice", () => {
  let prisma: any;
  let journal: WorkshopMetalJournalService;
  let service: WorkshopScaleService;
  let accounts: Record<string, any>;
  let sessions: Record<string, any>;
  let readings: Record<string, any>;
  let journals: Record<string, any>;
  let movementCreates: number;
  let sessionCounter: number;
  let tree: any;
  let device: any;

  beforeEach(() => {
    movementCreates = 0;
    sessionCounter = 0;
    accounts = {};
    sessions = {};
    readings = {};
    journals = {};
    tree = {
      id: "tree-1",
      shopId: "shop-1",
      jobId: "job-1",
      label: "Tree",
      metalKey: "goldGrains995",
      issuedGrams: 0,
      job: { id: "job-1", status: "Casting" },
    };
    device = {
      id: "device-1",
      shopId: "shop-1",
      purpose: WorkshopScalePurpose.GOLD,
      adapterKind: "SIMULATOR",
      isActive: true,
      precisionGrams: new Prisma.Decimal("0.01"),
      name: "Gold Scale simulator",
    };

    const tx = {} as any;
    const assignTx = () => {
      tx.shop = prisma.shop;
      tx.workshopMetalAccount = prisma.workshopMetalAccount;
      tx.workshopMetalJournal = prisma.workshopMetalJournal;
      tx.workshopScaleDevice = prisma.workshopScaleDevice;
      tx.workshopWeighingSession = prisma.workshopWeighingSession;
      tx.workshopScaleReading = prisma.workshopScaleReading;
      tx.karigarCastingTree = prisma.karigarCastingTree;
      tx.karigarMetalMovement = prisma.karigarMetalMovement;
      tx.$queryRaw = prisma.$queryRaw;
    };

    prisma = {
      shop: {
        findUnique: jest.fn().mockResolvedValue({
          id: "shop-1",
          workshopMode: true,
          workshopLedgerVersion: WorkshopLedgerVersion.TRACEABLE,
        }),
      },
      workshopMetalAccount: {
        findMany: jest.fn(async () => Object.values(accounts)),
        upsert: jest.fn(async ({ create, where }: any) => {
          const key = where.shopId_systemKey.systemKey;
          if (!accounts[key]) accounts[key] = { ...create, balanceGrams: new Prisma.Decimal(0) };
          return accounts[key];
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const key = where.shopId_systemKey.systemKey;
          accounts[key] = { ...accounts[key], ...data };
          return accounts[key];
        }),
      },
      workshopMetalJournal: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.shopId_referenceType_referenceId) {
            return (
              Object.values(journals).find(
                (j: any) =>
                  j.referenceType === where.shopId_referenceType_referenceId.referenceType &&
                  j.referenceId === where.shopId_referenceType_referenceId.referenceId,
              ) ?? null
            );
          }
          if (where.shopId_idempotencyKey) {
            return (
              Object.values(journals).find(
                (j: any) => j.idempotencyKey === where.shopId_idempotencyKey.idempotencyKey,
              ) ?? null
            );
          }
          if (where.scaleReadingId) {
            return (
              Object.values(journals).find(
                (j: any) => j.scaleReadingId === where.scaleReadingId,
              ) ?? null
            );
          }
          return null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const lines = (data.lines?.create ?? []).map((line: any, i: number) => ({
            id: `line-${i}`,
            ...line,
            account: {
              systemKey: Object.keys(accounts).find(
                (k) => accounts[k].id === line.accountId,
              ),
            },
          }));
          const entry = { ...data, lines };
          journals[data.id] = entry;
          return entry;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          journals[where.id] = { ...journals[where.id], ...data };
          return journals[where.id];
        }),
      },
      workshopScaleDevice: {
        findFirst: jest.fn(async ({ where }: any) => {
          if (where.id === "device-2") {
            return { ...device, id: "device-2" };
          }
          if (where.id && where.id !== device.id) return null;
          if (where.purpose && where.purpose !== device.purpose) return null;
          return device;
        }),
        create: jest.fn(async ({ data }: any) => ({ id: "device-1", ...data })),
        upsert: jest.fn(async ({ create }: any) => ({ id: "device-1", ...create })),
      },
      workshopWeighingSession: {
        create: jest.fn(async ({ data }: any) => {
          const session = {
            id: `session-${++sessionCounter}`,
            ...data,
            createdAt: new Date(),
            reading: null,
            journal: null,
            tree,
          };
          sessions[session.id] = session;
          return session;
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          const session = sessions[where.id];
          if (!session || session.shopId !== where.shopId) return null;
          return {
            ...session,
            reading: Object.values(readings).find((r: any) => r.sessionId === session.id) ?? null,
            journal:
              Object.values(journals).find((j: any) => j.weighingSessionId === session.id) ??
              null,
            tree,
          };
        }),
        update: jest.fn(async ({ where, data }: any) => {
          sessions[where.id] = { ...sessions[where.id], ...data };
          return {
            ...sessions[where.id],
            reading: Object.values(readings).find((r: any) => r.sessionId === where.id) ?? null,
          };
        }),
      },
      workshopScaleReading: {
        create: jest.fn(async ({ data }: any) => {
          if (
            Object.values(readings).some(
              (reading: any) =>
                reading.deviceId === data.deviceId &&
                reading.sequence === data.sequence,
            )
          ) {
            const error: any = new Error("Unique reading sequence");
            error.code = "P2002";
            throw error;
          }
          const reading = { id: "reading-1", ...data };
          readings[reading.id] = reading;
          return reading;
        }),
      },
      karigarCastingTree: {
        findFirst: jest.fn(async () => ({
          ...tree,
          movements: tree.movements ?? [],
          workshopMetalJournals: Object.values(journals).filter(
            (entry: any) => entry.treeId === tree.id,
          ),
        })),
        update: jest.fn(async ({ data }: any) => {
          tree = { ...tree, ...data };
          return tree;
        }),
      },
      karigarMetalMovement: {
        create: jest.fn(async () => {
          movementCreates += 1;
          return {};
        }),
      },
      $queryRaw: jest.fn(async (strings: TemplateStringsArray) => {
        const sql = strings.join(" ");
        if (sql.includes("WorkshopWeighingSession")) {
          return sessions["session-1"] ? [{ id: "session-1" }] : [];
        }
        if (sql.includes("KarigarCastingTree")) {
          return [{ id: tree.id, issuedGrams: tree.issuedGrams }];
        }
        return Object.values(accounts).map((a: any) => ({
          id: a.id,
          systemKey: a.systemKey,
          balanceGrams: a.balanceGrams,
        }));
      }),
      $transaction: jest.fn(async (cb: any) => {
        assignTx();
        return cb(tx);
      }),
    };

    journal = new WorkshopMetalJournalService(prisma);
    service = new WorkshopScaleService(prisma, journal);
  });

  function seedVault(grams = "1000.00") {
    accounts[WorkshopMetalAccountKey.GOLD995_VAULT] = {
      id: "vault",
      shopId: "shop-1",
      systemKey: WorkshopMetalAccountKey.GOLD995_VAULT,
      balanceGrams: new Prisma.Decimal(grams),
    };
    accounts[WorkshopMetalAccountKey.CASTING_TREE_WIP] = {
      id: "wip",
      shopId: "shop-1",
      systemKey: WorkshopMetalAccountKey.CASTING_TREE_WIP,
      balanceGrams: new Prisma.Decimal(0),
    };
    accounts[WorkshopMetalAccountKey.OPENING_EQUITY] = {
      id: "equity",
      shopId: "shop-1",
      systemKey: WorkshopMetalAccountKey.OPENING_EQUITY,
      balanceGrams: new Prisma.Decimal(grams),
    };
  }

  async function captureStable(weight = "100.25") {
    const sim = new GoldScaleSimulator(weight);
    sim.connect();
    sim.setStable(true);
    const reading = sim.read()!;
    const session = await service.createSession("shop-1", "user-1", {
      treeId: "tree-1",
      jobId: "job-1",
      deviceId: "device-1",
    });
    const captured = await service.capture("shop-1", "user-1", session.id, {
      deviceId: "device-1",
      reading: {
        weightGrams: reading.weightGrams,
        unit: "g",
        stable: reading.stable,
        sequence: reading.sequence,
        rawFrame: reading.rawFrame,
        readingAt: reading.readingAt,
      },
    });
    return { session, captured, reading };
  }

  it("posts Gold995 vault -100.25 and casting WIP +100.25 from a stable simulator reading", async () => {
    seedVault("1000.00");
    const { captured } = await captureStable("100.25");
    const posted = await service.confirm("shop-1", "user-1", "session-1", {
      readingId: captured.reading.id,
    });

    expect(posted.journal.weightGrams).toBe("100.250000");
    expect(posted.journal.materialKey).toBe("goldGrains995");
    expect(posted.dualWrittenToKarigarMetalMovement).toBe(false);
    expect(movementCreates).toBe(0);
    expect(accounts[WorkshopMetalAccountKey.GOLD995_VAULT].balanceGrams.toFixed(6)).toBe(
      "899.750000",
    );
    expect(
      accounts[WorkshopMetalAccountKey.CASTING_TREE_WIP].balanceGrams.toFixed(6),
    ).toBe("100.250000");
    const debit = posted.journal.lines.find(
      (l: any) => l.accountKey === WorkshopMetalAccountKey.CASTING_TREE_WIP,
    );
    const credit = posted.journal.lines.find(
      (l: any) => l.accountKey === WorkshopMetalAccountKey.GOLD995_VAULT,
    );
    expect(debit.debitGrams).toBe("100.250000");
    expect(credit.creditGrams).toBe("100.250000");
  });

  it("claims a fresh legacy tree as Gold 995 before accepting a scale session", async () => {
    tree.metalKey = "goldGrains24k";
    const session = await service.createSession("shop-1", "user-1", {
      treeId: tree.id,
      deviceId: device.id,
    });
    expect(session.materialKey).toBe("goldGrains995");
    expect(tree.metalKey).toBe("goldGrains995");
    expect(tree.purity).toBe("995");
  });

  it("rejects a tree with legacy metal history even if it is labelled Gold 995", async () => {
    tree.movements = [{ id: "legacy-movement" }];
    await expect(
      service.createSession("shop-1", "user-1", {
        treeId: tree.id,
        deviceId: device.id,
      }),
    ).rejects.toThrow(/legacy metal history/);
    expect(prisma.workshopWeighingSession.create).not.toHaveBeenCalled();
  });

  it("allows a later Gold 995 issue to the same tree after the first journal posts", async () => {
    seedVault("1000.00");
    const { captured } = await captureStable();
    await service.confirm("shop-1", "user-1", "session-1", {
      readingId: captured.reading.id,
    });
    const next = await service.createSession("shop-1", "user-1", {
      treeId: tree.id,
      deviceId: device.id,
    });
    expect(next.id).toBe("session-2");
  });

  it("rejects unstable readings", async () => {
    const sim = new GoldScaleSimulator("100.25");
    sim.connect();
    sim.setStable(false);
    const reading = sim.read()!;
    const session = await service.createSession("shop-1", "user-1", {
      treeId: "tree-1",
      deviceId: "device-1",
    });
    await expect(
      service.capture("shop-1", "user-1", session.id, {
        deviceId: "device-1",
        reading: {
          weightGrams: reading.weightGrams,
          unit: "g",
          stable: reading.stable,
          sequence: reading.sequence,
          rawFrame: reading.rawFrame,
        },
      }),
    ).rejects.toThrow(/not stable/);
  });

  it("rejects the wrong scale purpose", async () => {
    const session = await service.createSession("shop-1", "user-1", {
      treeId: "tree-1",
      deviceId: "device-1",
    });
    device.purpose = WorkshopScalePurpose.STONE;
    await expect(
      service.capture("shop-1", "user-1", session.id, {
        deviceId: "device-1",
        reading: {
          weightGrams: "1.234",
          unit: "g",
          stable: true,
          sequence: 1,
        },
      }),
    ).rejects.toThrow(/purpose/);
  });

  it("rejects Gold weights that are not 0.01 g multiples", async () => {
    const session = await service.createSession("shop-1", "user-1", {
      treeId: "tree-1",
      deviceId: "device-1",
    });
    await expect(
      service.capture("shop-1", "user-1", session.id, {
        deviceId: "device-1",
        reading: {
          weightGrams: "100.251",
          unit: "g",
          stable: true,
          sequence: 1,
        },
      }),
    ).rejects.toThrow(/0\.01/);
  });

  it("rejects a capture from a different device than the one bound to the session", async () => {
    const session = await service.createSession("shop-1", "user-1", {
      treeId: "tree-1",
      deviceId: "device-1",
    });
    await expect(
      service.capture("shop-1", "user-1", session.id, {
        deviceId: "device-2",
        reading: {
          weightGrams: "100.25",
          unit: "g",
          stable: true,
          sequence: 1,
        },
      }),
    ).rejects.toThrow(/bound to this weighing session/);
  });

  it("rejects a duplicated device reading sequence in another session", async () => {
    const { reading } = await captureStable("100.25");
    const second = await service.createSession("shop-1", "user-1", {
      treeId: "tree-1",
      deviceId: "device-1",
    });
    await expect(
      service.capture("shop-1", "user-1", second.id, {
        deviceId: "device-1",
        reading: {
          weightGrams: reading.weightGrams,
          unit: "g",
          stable: true,
          sequence: reading.sequence,
          rawFrame: reading.rawFrame,
          readingAt: reading.readingAt,
        },
      }),
    ).rejects.toThrow(/sequence has already been captured/);
  });

  it("rejects stale readings and expired sessions", async () => {
    const session = await service.createSession("shop-1", "user-1", {
      treeId: "tree-1",
      deviceId: "device-1",
    });
    await expect(
      service.capture("shop-1", "user-1", session.id, {
        deviceId: "device-1",
        reading: {
          weightGrams: "100.25",
          unit: "g",
          stable: true,
          sequence: 1,
          readingAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        },
      }),
    ).rejects.toThrow(/outside the allowed capture window/);

    sessions[session.id].status = WorkshopWeighingSessionStatus.EXPIRED;
    await expect(
      service.confirm("shop-1", "user-1", session.id, { readingId: "reading-1" }),
    ).rejects.toThrow(/expired/);
  });

  it("persists expiry when a captured session times out before confirmation", async () => {
    seedVault("1000.00");
    const { captured } = await captureStable();
    sessions["session-1"].expiresAt = new Date(Date.now() - 1000);
    await expect(
      service.confirm("shop-1", "user-1", "session-1", {
        readingId: captured.reading.id,
      }),
    ).rejects.toThrow(/expired/);
    expect(sessions["session-1"].status).toBe(WorkshopWeighingSessionStatus.EXPIRED);
    expect(Object.keys(journals)).toHaveLength(0);
  });

  it("rejects a Gold device configured at the wrong precision", async () => {
    const session = await service.createSession("shop-1", "user-1", {
      treeId: "tree-1",
      deviceId: "device-1",
    });
    device.precisionGrams = new Prisma.Decimal("0.001");
    await expect(
      service.capture("shop-1", "user-1", session.id, {
        deviceId: "device-1",
        reading: {
          weightGrams: "100.25",
          unit: "g",
          stable: true,
          sequence: 1,
        },
      }),
    ).rejects.toThrow(/configured with 0\.01/);
  });

  it("does not reuse a reading for a second stock movement", async () => {
    seedVault("1000.00");
    const { captured } = await captureStable("100.25");
    const first = await service.confirm("shop-1", "user-1", "session-1", {
      readingId: captured.reading.id,
      idempotencyKey: "confirm-1",
    });
    const second = await service.confirm("shop-1", "user-1", "session-1", {
      readingId: captured.reading.id,
      idempotencyKey: "confirm-1",
    });
    expect(second.journal.id).toBe(first.journal.id);
    expect(second.journal.idempotent).toBe(true);
    expect(
      accounts[WorkshopMetalAccountKey.CASTING_TREE_WIP].balanceGrams.toFixed(6),
    ).toBe("100.250000");
    expect(movementCreates).toBe(0);
  });

  it("replays capture of the same stable reading without duplicating it", async () => {
    const { captured, reading } = await captureStable("100.25");
    const again = await service.capture("shop-1", "user-1", "session-1", {
      deviceId: "device-1",
      reading: {
        weightGrams: reading.weightGrams,
        unit: "g",
        stable: true,
        sequence: reading.sequence,
        rawFrame: reading.rawFrame,
      },
    });
    expect(again.idempotent).toBe(true);
    expect(again.reading.id).toBe(captured.reading.id);
  });

  it("replays a capture with no raw frame idempotently", async () => {
    const session = await service.createSession("shop-1", "user-1", {
      treeId: "tree-1",
      deviceId: "device-1",
    });
    const payload = {
      deviceId: "device-1",
      reading: { weightGrams: "100.25", unit: "g" as const, stable: true, sequence: 1 },
    };
    const first = await service.capture("shop-1", "user-1", session.id, payload);
    const replay = await service.capture("shop-1", "user-1", session.id, payload);
    expect(first.idempotent).toBe(false);
    expect(replay.idempotent).toBe(true);
    expect(replay.reading.id).toBe(first.reading.id);
    expect(prisma.workshopScaleReading.create).toHaveBeenCalledTimes(1);
  });

  it("denies simulator provisioning and posting in production unless the shop is allowlisted", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousAllowedShops = process.env.WORKSHOP_SIMULATOR_SHOP_IDS;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.WORKSHOP_SIMULATOR_SHOP_IDS;
      await expect(service.ensureGoldSimulatorDevice("shop-1")).rejects.toThrow(/not enabled/);
      expect(prisma.workshopScaleDevice.upsert).not.toHaveBeenCalled();
      await expect(service.createSession("shop-1", "user-1", {
        treeId: "tree-1", deviceId: "device-1",
      })).rejects.toThrow(/not enabled/);
      expect(prisma.workshopWeighingSession.create).not.toHaveBeenCalled();

      process.env.WORKSHOP_SIMULATOR_SHOP_IDS = "shop-2, shop-1";
      const session = await service.createSession("shop-1", "user-1", {
        treeId: "tree-1", deviceId: "device-1",
      });
      const captured = await service.capture("shop-1", "user-1", session.id, {
        deviceId: "device-1",
        reading: { weightGrams: "100.25", unit: "g", stable: true, sequence: 1 },
      });
      delete process.env.WORKSHOP_SIMULATOR_SHOP_IDS;
      await expect(service.capture("shop-1", "user-1", session.id, {
        deviceId: "device-1",
        reading: { weightGrams: "100.25", unit: "g", stable: true, sequence: 1 },
      })).rejects.toThrow(/not enabled/);
      await expect(service.confirm("shop-1", "user-1", session.id, {
        readingId: captured.reading.id,
      })).rejects.toThrow(/not enabled/);
      expect(Object.keys(journals)).toHaveLength(0);
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
      if (previousAllowedShops === undefined) delete process.env.WORKSHOP_SIMULATOR_SHOP_IDS;
      else process.env.WORKSHOP_SIMULATOR_SHOP_IDS = previousAllowedShops;
    }
  });

  it("allows real-device capture in production", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousAllowedShops = process.env.WORKSHOP_SIMULATOR_SHOP_IDS;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.WORKSHOP_SIMULATOR_SHOP_IDS;
      device.adapterKind = "SERIAL";
      const session = await service.createSession("shop-1", "user-1", {
        treeId: "tree-1", deviceId: "device-1",
      });
      const captured = await service.capture("shop-1", "user-1", session.id, {
        deviceId: "device-1",
        reading: { weightGrams: "100.25", unit: "g", stable: true, sequence: 1 },
      });
      seedVault();
      const posted = await service.confirm("shop-1", "user-1", session.id, {
        readingId: captured.reading.id,
      });
      expect(posted.journal.weightGrams).toBe("100.250000");
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
      if (previousAllowedShops === undefined) delete process.env.WORKSHOP_SIMULATOR_SHOP_IDS;
      else process.env.WORKSHOP_SIMULATOR_SHOP_IDS = previousAllowedShops;
    }
  });

  it("rejects confirm payloads that include a weight field", async () => {
    seedVault("1000.00");
    const { captured } = await captureStable("100.25");
    await expect(
      service.confirm("shop-1", "user-1", "session-1", {
        readingId: captured.reading.id,
        weightGrams: "99.99",
      } as never),
    ).rejects.toThrow(/must not include a weight field/);
    expect(movementCreates).toBe(0);
  });

  it("keeps the metal journal balanced and does not dual-write KarigarMetalMovement", async () => {
    seedVault("1000.00");
    const { captured } = await captureStable("100.25");
    const posted = await service.confirm("shop-1", "user-1", "session-1", {
      readingId: captured.reading.id,
    });
    const signed = posted.journal.lines.map((line: any) =>
      line.debitGrams !== "0.000000"
        ? line.debitGrams
        : `-${line.creditGrams}`,
    );
    expect(() => assertBalancedMicrograms(signed)).not.toThrow();
    expect(prisma.karigarMetalMovement.create).not.toHaveBeenCalled();
  });

  it("returns the existing journal for a replayed confirm with a new idempotency key", async () => {
    seedVault("1000.00");
    const { captured } = await captureStable("100.25");
    const first = await service.confirm("shop-1", "user-1", "session-1", {
      readingId: captured.reading.id,
      idempotencyKey: "click-1",
    });
    const replay = await service.confirm("shop-1", "user-1", "session-1", {
      readingId: captured.reading.id,
      idempotencyKey: "click-2",
    });
    expect(replay.journal.id).toBe(first.journal.id);
    expect(replay.journal.idempotent).toBe(true);
    expect(
      accounts[WorkshopMetalAccountKey.GOLD995_VAULT].balanceGrams.toFixed(6),
    ).toBe("899.750000");
    expect(
      accounts[WorkshopMetalAccountKey.CASTING_TREE_WIP].balanceGrams.toFixed(6),
    ).toBe("100.250000");
  });

  it("rejects the Gold 995 scale flow for LEGACY shops", async () => {
    prisma.shop.findUnique.mockResolvedValue({
      id: "shop-1",
      workshopMode: true,
      workshopLedgerVersion: WorkshopLedgerVersion.LEGACY,
    });
    await expect(
      service.createSession("shop-1", "user-1", {
        treeId: "tree-1",
        deviceId: "device-1",
      }),
    ).rejects.toThrow(/TRACEABLE/);
  });
});

describe("ConfirmWeighingSessionDto", () => {
  it("accepts readingId and rejects an arbitrary weight field", async () => {
    const ok = await pipe.transform(
      { readingId: "reading-1" },
      { type: "body", metatype: ConfirmWeighingSessionDto },
    );
    expect(ok.readingId).toBe("reading-1");
    expect(ok).not.toHaveProperty("weightGrams");

    await expect(
      pipe.transform(
        { readingId: "reading-1", weightGrams: "99.99" },
        { type: "body", metatype: ConfirmWeighingSessionDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
