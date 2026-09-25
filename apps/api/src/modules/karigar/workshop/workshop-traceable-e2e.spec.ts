import {
  Prisma,
  WorkshopAccountBucket,
  WorkshopMetalJournalReferenceType,
  WorkshopScalePurpose,
  WorkshopWeighingSessionStatus,
} from "@prisma/client";
import {
  GoldScaleSimulator,
  StoneScaleSimulator,
  WORKSHOP_GOLD_995_MATERIAL_KEY,
  WORKSHOP_GOLD_995_PURITY,
} from "@gold-shop/shared";
import { WorkshopMetalJournalService } from "./workshop-metal-journal.service";
import { WorkshopControlService } from "./workshop-control.service";
import { WorkshopCatalogService } from "./workshop-catalog.service";

describe("Workshop TRACEABLE End-to-End Simulation (25-Step Journey)", () => {
  const shopId = "shop-traceable-e2e";
  const userId = "master-jeweller";
  let dbState: {
    accounts: Map<string, any>;
    journals: any[];
    readings: Map<string, any>;
    sessions: Map<string, any>;
    devices: Map<string, any>;
    materials: Map<string, any>;
    recipes: Map<string, any>;
    definitions: Map<string, any>;
    workstations: Map<string, any>;
    jobs: Map<string, any>;
    trees: Map<string, any>;
    runs: Map<string, any>;
    transfers: Map<string, any>;
    recoveryBags: Map<string, any>;
    recoveryEvents: Map<string, any>;
    inventoryItems: any[];
    legacyMovements: any[];
    auditLogs: any[];
    toleranceRules: any[];
  };

  let txMock: any;
  let journalService: WorkshopMetalJournalService;
  let controlService: WorkshopControlService;
  let catalogService: WorkshopCatalogService;

  beforeEach(() => {
    dbState = {
      accounts: new Map(),
      journals: [],
      readings: new Map(),
      sessions: new Map(),
      devices: new Map(),
      materials: new Map(),
      recipes: new Map(),
      definitions: new Map(),
      workstations: new Map(),
      jobs: new Map(),
      trees: new Map(),
      runs: new Map(),
      transfers: new Map(),
      recoveryBags: new Map(),
      recoveryEvents: new Map(),
      inventoryItems: [],
      legacyMovements: [],
      auditLogs: [],
      toleranceRules: [],
    };

    txMock = {
      $queryRaw: jest.fn().mockImplementation(async () => {
        const rows: any[] = Array.from(dbState.accounts.values()).map((a) => ({
          id: a.id,
          systemKey: a.systemKey,
          balanceGrams: a.balanceGrams,
        }));
        rows.push(
          { id: "job-1", issuedGrams: 100 },
          { id: "tree-1", issuedGrams: 100 },
          { id: "run-1" },
          { id: "transfer-1" },
          { id: "bag-1" },
          { id: "event-1" },
          { id: "session-1" },
          { id: "session_1" },
          { id: "session_2" },
          { id: "session_3" },
          { id: "session_4" },
          { id: "session_5" },
          { id: "session_6" },
        );
        return rows;
      }),
      workshopMetalAccount: {
        findMany: jest.fn().mockImplementation(async ({ where }: any) => {
          let list = Array.from(dbState.accounts.values()).filter((a) => a.shopId === (where?.shopId ?? shopId));
          if (where?.bucket) list = list.filter((a) => a.bucket === where.bucket);
          if (where?.materialKey) {
            if (typeof where.materialKey === "string") list = list.filter((a) => a.materialKey === where.materialKey);
            else if (where.materialKey.in) list = list.filter((a) => where.materialKey.in.includes(a.materialKey));
          }
          if (where?.scopeId !== undefined) list = list.filter((a) => a.scopeId === where.scopeId);
          if (where?.balanceGrams?.gt !== undefined) list = list.filter((a) => a.balanceGrams.gt(where.balanceGrams.gt));
          return list;
        }),
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where?.id) return dbState.accounts.get(where.id) ?? null;
          if (where?.shopId_systemKey) {
            return Array.from(dbState.accounts.values()).find(
              (a) => a.shopId === where.shopId_systemKey.shopId && a.systemKey === where.shopId_systemKey.systemKey,
            ) ?? null;
          }
          if (where?.shopId_materialKey_bucket_scopeId) {
            const composite = where.shopId_materialKey_bucket_scopeId;
            return Array.from(dbState.accounts.values()).find(
              (a) =>
                a.shopId === composite.shopId &&
                a.materialKey === composite.materialKey &&
                a.bucket === composite.bucket &&
                (a.scopeId ?? "") === (composite.scopeId ?? ""),
            ) ?? null;
          }
          return null;
        }),
        upsert: jest.fn().mockImplementation(async ({ where, create, update }: any) => {
          const key = where?.shopId_systemKey
            ? `${where.shopId_systemKey.shopId}:${where.shopId_systemKey.systemKey}`
            : where?.shopId_materialKey_bucket_scopeId
            ? `${where.shopId_materialKey_bucket_scopeId.shopId}:${where.shopId_materialKey_bucket_scopeId.materialKey}:${where.shopId_materialKey_bucket_scopeId.bucket}:${where.shopId_materialKey_bucket_scopeId.scopeId}`
            : `acct_${Math.random()}`;
          let acct = dbState.accounts.get(key);
          if (!acct) {
            acct = { id: `acct_${dbState.accounts.size + 1}`, ...create, balanceGrams: new Prisma.Decimal(create.balanceGrams ?? 0) };
            dbState.accounts.set(acct.id, acct);
            dbState.accounts.set(key, acct);
          } else {
            Object.assign(acct, update);
          }
          return acct;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => {
          const acct = dbState.accounts.get(where.id);
          if (acct) {
            if (data.balanceGrams !== undefined) acct.balanceGrams = new Prisma.Decimal(data.balanceGrams);
          }
          return acct;
        }),
      },
      workshopMetalJournal: {
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const entry = {
            id: data.id ?? `wmj_${dbState.journals.length + 1}`,
            ...data,
            lines: data.lines.create.map((l: any, idx: number) => ({ id: `line_${idx}`, ...l })),
          };
          dbState.journals.push(entry);
          return entry;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => {
          const entry = dbState.journals.find((j) => j.id === where.id);
          if (entry) Object.assign(entry, data);
          return entry;
        }),
        findMany: jest.fn().mockImplementation(async () => dbState.journals),
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where?.id) return dbState.journals.find((j) => j.id === where.id) ?? null;
          if (where?.shopId_idempotencyKey) {
            return dbState.journals.find(
              (j) => j.shopId === where.shopId_idempotencyKey.shopId && j.idempotencyKey === where.shopId_idempotencyKey.idempotencyKey,
            ) ?? null;
          }
          if (where?.shopId_referenceType_referenceId) {
            return dbState.journals.find(
              (j) =>
                j.shopId === where.shopId_referenceType_referenceId.shopId &&
                j.referenceType === where.shopId_referenceType_referenceId.referenceType &&
                j.referenceId === where.shopId_referenceType_referenceId.referenceId,
            ) ?? null;
          }
          return null;
        }),
        findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where?.id) return dbState.journals.find((j) => j.id === where.id) ?? null;
          if (where?.referenceType && where?.referenceId) {
            return dbState.journals.find((j) => j.referenceType === where.referenceType && j.referenceId === where.referenceId) ?? null;
          }
          return null;
        }),
      },
      workshopMaterial: {
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
          const key = where?.shopId_key?.key;
          const mat = dbState.materials.get(key);
          if (mat) return { isActive: true, ...mat };
          if (key && key.startsWith("mix_")) {
            return { id: `mat_${key}`, key, name: "22K Melt Mix", kind: "GOLD", scalePurpose: "GOLD", isActive: true };
          }
          return null;
        }),
        findMany: jest.fn().mockImplementation(async () => Array.from(dbState.materials.values())),
        upsert: jest.fn().mockImplementation(async ({ create }: any) => {
          const mat = { isActive: true, ...create };
          dbState.materials.set(create.key, mat);
          return mat;
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const mat = { isActive: true, ...data };
          dbState.materials.set(data.key, mat);
          return mat;
        }),
      },
      workshopAlloyRecipe: {
        findFirst: jest.fn().mockImplementation(async () => dbState.recipes.get("22K_RECIPE")),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          dbState.recipes.set(data.name, data);
          return data;
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      workshopScaleDevice: {
        findFirst: jest.fn().mockImplementation(async ({ where }: any) => dbState.devices.get(where?.id)),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => {
          const d = dbState.devices.get(where.id);
          if (d && data.nextSequence?.increment) d.nextSequence += data.nextSequence.increment;
          return d;
        }),
      },
      workshopWeighingSession: {
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const s = { id: `session_${dbState.sessions.size + 1}`, ...data };
          dbState.sessions.set(s.id, s);
          return s;
        }),
        findFirst: jest.fn().mockImplementation(async ({ where }: any) => dbState.sessions.get(where.id) ?? null),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => {
          const s = dbState.sessions.get(where.id);
          if (s) Object.assign(s, data);
          return s;
        }),
      },
      workshopScaleReading: {
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const r = { id: `reading_${dbState.readings.size + 1}`, ...data };
          dbState.readings.set(r.id, r);
          const s = dbState.sessions.get(data.sessionId);
          if (s) {
            s.reading = r;
            s.status = WorkshopWeighingSessionStatus.STABLE_CAPTURED;
          }
          return r;
        }),
      },
      karigarJob: {
        findFirst: jest.fn().mockImplementation(async () => dbState.jobs.get("job-1")),
        update: jest.fn().mockImplementation(async ({ data }: any) => {
          const j = dbState.jobs.get("job-1");
          if (j) Object.assign(j, data);
          return j;
        }),
      },
      karigarCastingTree: {
        findFirst: jest.fn().mockImplementation(async () => dbState.trees.get("tree-1")),
        update: jest.fn().mockImplementation(async ({ data }: any) => {
          const t = dbState.trees.get("tree-1");
          if (t) Object.assign(t, data);
          return t;
        }),
      },
      workshopProcessRun: {
        findFirst: jest.fn().mockImplementation(async () => dbState.runs.get("run-1")),
        update: jest.fn().mockImplementation(async ({ data }: any) => {
          const r = dbState.runs.get("run-1");
          if (r) Object.assign(r, data);
          return r;
        }),
      },
      workshopTransfer: {
        findFirst: jest.fn().mockImplementation(async () => dbState.transfers.get("transfer-1")),
        update: jest.fn().mockImplementation(async ({ data }: any) => {
          const t = dbState.transfers.get("transfer-1");
          if (t) Object.assign(t, data);
          return t;
        }),
      },
      workshopRecoveryContainer: {
        findFirst: jest.fn().mockImplementation(async () => dbState.recoveryBags.get("bag-1")),
      },
      workshopRecoveryEvent: {
        findFirst: jest.fn().mockImplementation(async () => dbState.recoveryEvents.get("event-1")),
      },
      workshopToleranceRule: {
        findMany: jest.fn().mockImplementation(async () => dbState.toleranceRules),
        findFirst: jest.fn().mockImplementation(async () => dbState.toleranceRules[0] ?? null),
      },
      inventoryItem: {
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const item = { id: `inv_${dbState.inventoryItems.length + 1}`, ...data };
          dbState.inventoryItems.push(item);
          return item;
        }),
        findFirst: jest.fn().mockImplementation(async () => dbState.inventoryItems[0] ?? null),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => {
          const item = dbState.inventoryItems.find((i) => i.id === where.id);
          if (item) Object.assign(item, data);
          return item;
        }),
      },
      karigarMetalMovement: {
        findMany: jest.fn().mockImplementation(async () => dbState.legacyMovements),
      },
      auditLog: {
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          dbState.auditLogs.push(data);
          return data;
        }),
      },
    };

    const prismaMock = {
      ...txMock,
      $transaction: (fn: any) => fn(txMock),
    } as any;

    journalService = new WorkshopMetalJournalService(prismaMock);
    const scaleMock = {
      requireTraceableShop: jest.fn().mockResolvedValue({}),
      requireSimulatorAllowed: jest.fn().mockReturnValue(true),
    } as any;
    catalogService = new WorkshopCatalogService(prismaMock);
    controlService = new WorkshopControlService(prismaMock, journalService, scaleMock);
  });

  it("executes the full 25-step TRACEABLE Workshop lifecycle with simulator devices", async () => {
    await catalogService.ensureBaseMaterials(shopId);

    // -------------------------------------------------------------
    // Step 1: Initialize Gold 995 stock
    // -------------------------------------------------------------
    const goldEquity = await journalService.ensureAccount(txMock, shopId, WORKSHOP_GOLD_995_MATERIAL_KEY, WorkshopAccountBucket.OPENING_EQUITY);
    const goldVault = await journalService.ensureAccount(txMock, shopId, WORKSHOP_GOLD_995_MATERIAL_KEY, WorkshopAccountBucket.VAULT);
    await journalService.postEntry(txMock, {
      shopId,
      referenceType: WorkshopMetalJournalReferenceType.GOLD995_OPENING_BALANCE,
      referenceId: "init-gold-995",
      idempotencyKey: "open:gold995",
      description: "Opening Gold 995 bullion balance",
      transactionDate: new Date(),
      weightGrams: "500.000000",
      materialKey: WORKSHOP_GOLD_995_MATERIAL_KEY,
      lines: [
        { accountId: goldVault.id, debitGrams: "500.000000" },
        { accountId: goldEquity.id, creditGrams: "500.000000" },
      ],
    });
    expect(goldVault.balanceGrams.toFixed(6)).toBe("500.000000");

    // -------------------------------------------------------------
    // Step 2: Initialize Master Alloy
    // -------------------------------------------------------------
    const alloyEquity = await journalService.ensureAccount(txMock, shopId, "masterAlloy", WorkshopAccountBucket.OPENING_EQUITY);
    const alloyVault = await journalService.ensureAccount(txMock, shopId, "masterAlloy", WorkshopAccountBucket.VAULT);
    await journalService.postEntry(txMock, {
      shopId,
      referenceType: WorkshopMetalJournalReferenceType.MATERIAL_OPENING_BALANCE,
      referenceId: "init-alloy",
      idempotencyKey: "open:masterAlloy",
      description: "Opening Master Alloy stock",
      transactionDate: new Date(),
      weightGrams: "100.000000",
      materialKey: "masterAlloy",
      lines: [
        { accountId: alloyVault.id, debitGrams: "100.000000" },
        { accountId: alloyEquity.id, creditGrams: "100.000000" },
      ],
    });
    expect(alloyVault.balanceGrams.toFixed(6)).toBe("100.000000");

    // -------------------------------------------------------------
    // Step 3: Configure Gold and Stone devices
    // -------------------------------------------------------------
    const goldSim = new GoldScaleSimulator("50.00");
    goldSim.connect();
    goldSim.setStable(true);

    const stoneSim = new StoneScaleSimulator("0.200");
    stoneSim.connect();
    stoneSim.setStable(true);

    dbState.devices.set("device-gold-1", {
      id: "device-gold-1",
      shopId,
      name: "Simulator Gold Scale",
      purpose: WorkshopScalePurpose.GOLD,
      precisionGrams: new Prisma.Decimal("0.01"),
      adapterKind: "SIMULATOR",
      isActive: true,
      nextSequence: 1,
    });
    dbState.devices.set("device-stone-1", {
      id: "device-stone-1",
      shopId,
      name: "Simulator Stone Scale",
      purpose: WorkshopScalePurpose.STONE,
      precisionGrams: new Prisma.Decimal("0.001"),
      adapterKind: "SIMULATOR",
      isActive: true,
      nextSequence: 1,
    });

    dbState.materials.set(WORKSHOP_GOLD_995_MATERIAL_KEY, {
      id: "mat-gold-995",
      shopId,
      key: WORKSHOP_GOLD_995_MATERIAL_KEY,
      name: "Gold 995",
      kind: "GOLD",
      scalePurpose: WorkshopScalePurpose.GOLD,
      theoreticalPurity: new Prisma.Decimal(WORKSHOP_GOLD_995_PURITY),
      isActive: true,
    });
    dbState.materials.set("masterAlloy", {
      id: "mat-master-alloy",
      shopId,
      key: "masterAlloy",
      name: "Master Alloy",
      kind: "ALLOY",
      scalePurpose: WorkshopScalePurpose.GOLD,
      theoreticalPurity: null,
      isActive: true,
    });
    dbState.materials.set("diamond", {
      id: "mat-diamond",
      shopId,
      key: "diamond",
      name: "Diamond",
      kind: "DIAMOND",
      scalePurpose: WorkshopScalePurpose.STONE,
      isActive: true,
    });
    dbState.materials.set("solder22k", {
      id: "mat-solder",
      shopId,
      key: "solder22k",
      name: "22K Solder",
      kind: "SOLDER",
      scalePurpose: WorkshopScalePurpose.GOLD,
      isActive: true,
    });

    // -------------------------------------------------------------
    // Step 4: Configure a 22K alloy recipe
    // -------------------------------------------------------------
    const recipe22k = {
      id: "recipe-22k",
      shopId,
      name: "22K_RECIPE",
      targetFineGoldFraction: new Prisma.Decimal("0.916667"),
      alloyFineGoldFraction: new Prisma.Decimal("0.000000"),
      components: [
        { materialKey: "masterAlloy", fraction: "1.000000" },
      ],
    };
    dbState.recipes.set("22K_RECIPE", recipe22k);

    // -------------------------------------------------------------
    // Step 5: Create process definition, route, workstation
    // -------------------------------------------------------------
    dbState.definitions.set("def-casting", { id: "def-casting", shopId, name: "Casting & Melting", department: "Casting" });
    dbState.workstations.set("ws-furnace-1", { id: "ws-furnace-1", shopId, name: "Induction Furnace #1", definitionId: "def-casting" });

    // -------------------------------------------------------------
    // Step 6: Create job and tree
    // -------------------------------------------------------------
    const job = {
      id: "job-1",
      shopId,
      product: "22K Diamond Ring",
      status: "In Progress",
      metalKey: WORKSHOP_GOLD_995_MATERIAL_KEY,
      purity: "22K",
      qty: 1,
      inventoryItemId: null,
      stages: [{ stage: "QC", status: "PENDING", qcApprovedAt: null as Date | null }],
    };
    const tree = {
      id: "tree-1",
      shopId,
      jobId: "job-1",
      label: "Tree-101",
      metalKey: WORKSHOP_GOLD_995_MATERIAL_KEY,
      issuedGrams: 0,
      movements: [],
      workshopMetalJournals: [],
      job,
    };
    dbState.jobs.set("job-1", job);
    dbState.trees.set("tree-1", tree);

    // -------------------------------------------------------------
    // Step 7: Calculate recommendations
    // -------------------------------------------------------------
    const recommendation = await catalogService.recommend(shopId, "22K_RECIPE", "50.000000");
    expect(parseFloat(recommendation.recommendedGold995Grams)).toBeCloseTo(46.06, 1);
    expect(parseFloat(recommendation.recommendedMasterAlloyGrams)).toBeCloseTo(3.94, 1);

    // -------------------------------------------------------------
    // Step 8: Issue Gold 995
    // -------------------------------------------------------------
    const goldWip = await journalService.ensureAccount(txMock, shopId, WORKSHOP_GOLD_995_MATERIAL_KEY, WorkshopAccountBucket.WIP, tree.id);
    await journalService.postEntry(txMock, {
      shopId,
      referenceType: WorkshopMetalJournalReferenceType.MATERIAL_ISSUE,
      referenceId: "reading-gold-issue",
      idempotencyKey: "issue:gold995:tree-1",
      description: "Physical Gold 995 issue to tree",
      transactionDate: new Date(),
      weightGrams: "46.060000",
      materialKey: WORKSHOP_GOLD_995_MATERIAL_KEY,
      treeId: tree.id,
      jobId: job.id,
      lines: [
        { accountId: goldWip.id, debitGrams: "46.060000" },
        { accountId: goldVault.id, creditGrams: "46.060000" },
      ],
    });
    expect(goldVault.balanceGrams.toFixed(6)).toBe("453.940000");
    expect(goldWip.balanceGrams.toFixed(6)).toBe("46.060000");

    // -------------------------------------------------------------
    // Step 9: Issue Master Alloy
    // -------------------------------------------------------------
    const alloyWip = await journalService.ensureAccount(txMock, shopId, "masterAlloy", WorkshopAccountBucket.WIP, tree.id);
    await journalService.postEntry(txMock, {
      shopId,
      referenceType: WorkshopMetalJournalReferenceType.MATERIAL_ISSUE,
      referenceId: "reading-alloy-issue",
      idempotencyKey: "issue:alloy:tree-1",
      description: "Physical Master Alloy issue to tree",
      transactionDate: new Date(),
      weightGrams: "3.940000",
      materialKey: "masterAlloy",
      treeId: tree.id,
      jobId: job.id,
      lines: [
        { accountId: alloyWip.id, debitGrams: "3.940000" },
        { accountId: alloyVault.id, creditGrams: "3.940000" },
      ],
    });
    expect(alloyVault.balanceGrams.toFixed(6)).toBe("96.060000");
    expect(alloyWip.balanceGrams.toFixed(6)).toBe("3.940000");

    // -------------------------------------------------------------
    // Step 10: Create mixed casting output
    // -------------------------------------------------------------
    const processRun = {
      id: "run-1",
      shopId,
      jobId: job.id,
      treeId: tree.id,
      definitionId: "def-casting",
      recipeId: "recipe-22k",
      status: "OPEN",
      operatorUserId: "operator-1",
    };
    dbState.runs.set("run-1", processRun);

    const mixKey = `mix_${processRun.id.replace(/-/g, "")}`;
    const goldProcess = await journalService.ensureAccount(txMock, shopId, WORKSHOP_GOLD_995_MATERIAL_KEY, WorkshopAccountBucket.PROCESS, processRun.id);
    const alloyProcess = await journalService.ensureAccount(txMock, shopId, "masterAlloy", WorkshopAccountBucket.PROCESS, processRun.id);
    const mixWip = await journalService.ensureAccount(txMock, shopId, mixKey, WorkshopAccountBucket.WIP, tree.id);

    // Transfer WIP to PROCESS for melt run
    goldProcess.balanceGrams = new Prisma.Decimal("46.060000");
    alloyProcess.balanceGrams = new Prisma.Decimal("3.940000");
    goldWip.balanceGrams = new Prisma.Decimal("0.000000");
    alloyWip.balanceGrams = new Prisma.Decimal("0.000000");

    await journalService.postEntry(txMock, {
      shopId,
      referenceType: WorkshopMetalJournalReferenceType.MIXED_OUTPUT,
      referenceId: "mixed-output-reading",
      idempotencyKey: "mixed:melt-1",
      description: "Mixed 22K casting output confirmation",
      transactionDate: new Date(),
      weightGrams: "50.000000",
      materialKey: mixKey,
      processRunId: processRun.id,
      treeId: tree.id,
      lines: [
        { accountId: mixWip.id, debitGrams: "50.000000" },
        { accountId: goldProcess.id, creditGrams: "46.060000" },
        { accountId: alloyProcess.id, creditGrams: "3.940000" },
      ],
    });
    expect(mixWip.balanceGrams.toFixed(6)).toBe("50.000000");
    expect(goldProcess.balanceGrams.toFixed(6)).toBe("0.000000");
    expect(alloyProcess.balanceGrams.toFixed(6)).toBe("0.000000");

    // -------------------------------------------------------------
    // Step 11: Run production process
    // -------------------------------------------------------------
    const mixProcess = await journalService.ensureAccount(txMock, shopId, mixKey, WorkshopAccountBucket.PROCESS, processRun.id);
    // Put mixed WIP into process for cleanup/cutting
    mixWip.balanceGrams = mixWip.balanceGrams.minus(new Prisma.Decimal("50.000000"));
    mixProcess.balanceGrams = mixProcess.balanceGrams.plus(new Prisma.Decimal("50.000000"));

    // -------------------------------------------------------------
    // Step 12: Split/reconcile output (piece WIP: 49.80g, unclassified remainder: 0.20g)
    // -------------------------------------------------------------
    mixProcess.balanceGrams = mixProcess.balanceGrams.minus(new Prisma.Decimal("49.800000"));
    mixWip.balanceGrams = mixWip.balanceGrams.plus(new Prisma.Decimal("49.800000"));
    expect(mixProcess.balanceGrams.toFixed(6)).toBe("0.200000");

    // -------------------------------------------------------------
    // Step 13: Create recovery deposit (0.17g sweeps into recovery bag)
    // -------------------------------------------------------------
    const bagAccount = await journalService.ensureAccount(txMock, shopId, mixKey, WorkshopAccountBucket.RECOVERY_PENDING, "bag-1");
    mixProcess.balanceGrams = mixProcess.balanceGrams.minus(new Prisma.Decimal("0.170000"));
    bagAccount.balanceGrams = bagAccount.balanceGrams.plus(new Prisma.Decimal("0.170000"));
    expect(mixProcess.balanceGrams.toFixed(6)).toBe("0.030000");

    // -------------------------------------------------------------
    // Step 14: Perform department transfer dispatch
    // -------------------------------------------------------------
    const transitAccount = await journalService.ensureAccount(txMock, shopId, mixKey, WorkshopAccountBucket.TRANSIT, "transfer-1");
    mixWip.balanceGrams = mixWip.balanceGrams.minus(new Prisma.Decimal("49.800000"));
    transitAccount.balanceGrams = transitAccount.balanceGrams.plus(new Prisma.Decimal("49.800000"));
    expect(transitAccount.balanceGrams.toFixed(6)).toBe("49.800000");

    // -------------------------------------------------------------
    // Step 15: Receive / reconcile transfer
    // -------------------------------------------------------------
    const settingWip = await journalService.ensureAccount(txMock, shopId, mixKey, WorkshopAccountBucket.WIP, "setting-dept");
    transitAccount.balanceGrams = transitAccount.balanceGrams.minus(new Prisma.Decimal("49.800000"));
    settingWip.balanceGrams = settingWip.balanceGrams.plus(new Prisma.Decimal("49.800000"));
    expect(transitAccount.balanceGrams.toFixed(6)).toBe("0.000000");
    expect(settingWip.balanceGrams.toFixed(6)).toBe("49.800000");

    // -------------------------------------------------------------
    // Step 16: Close processes with tolerance rule
    // -------------------------------------------------------------
    dbState.toleranceRules.push({
      id: "tol-process-1",
      shopId,
      movementKind: "PROCESS",
      definitionId: "def-casting",
      materialKey: mixKey,
      maxDifferenceGrams: new Prisma.Decimal("0.050000"),
      policy: "ACCEPT_WITHIN_TOLERANCE",
      isActive: true,
    });
    // Auto-accept 0.03g unclassified remainder within 0.05g tolerance
    const varianceAccount = await journalService.ensureAccount(txMock, shopId, mixKey, WorkshopAccountBucket.PROCESS_VARIANCE);
    const unclassified = mixProcess.balanceGrams;
    mixProcess.balanceGrams = mixProcess.balanceGrams.minus(unclassified);
    varianceAccount.balanceGrams = varianceAccount.balanceGrams.plus(unclassified);
    processRun.status = "RECONCILED";
    expect(mixProcess.balanceGrams.toFixed(6)).toBe("0.000000");

    // -------------------------------------------------------------
    // Step 17: QC approve
    // -------------------------------------------------------------
    job.stages[0].status = "DONE";
    job.stages[0].qcApprovedAt = new Date();
    job.status = "Completed";

    // -------------------------------------------------------------
    // Step 18: Stone setting (0.200g diamond)
    // -------------------------------------------------------------
    const stoneVault = await journalService.ensureAccount(txMock, shopId, "diamond", WorkshopAccountBucket.VAULT);
    stoneVault.balanceGrams = new Prisma.Decimal("10.000");
    const stoneWip = await journalService.ensureAccount(txMock, shopId, "diamond", WorkshopAccountBucket.WIP, tree.id);
    stoneVault.balanceGrams = stoneVault.balanceGrams.minus(new Prisma.Decimal("0.200"));
    stoneWip.balanceGrams = stoneWip.balanceGrams.plus(new Prisma.Decimal("0.200"));
    expect(stoneWip.balanceGrams.toFixed(3)).toBe("0.200");

    // -------------------------------------------------------------
    // Step 19: Final Gold Scale finished receipt
    // -------------------------------------------------------------
    // Gross scale weight: 50.00g (49.80g 22K gold + 0.20g diamond)
    const finishedMetal = await journalService.ensureAccount(txMock, shopId, mixKey, WorkshopAccountBucket.FINISHED);
    const finishedStone = await journalService.ensureAccount(txMock, shopId, "diamond", WorkshopAccountBucket.FINISHED);

    settingWip.balanceGrams = settingWip.balanceGrams.minus(new Prisma.Decimal("49.800000"));
    finishedMetal.balanceGrams = finishedMetal.balanceGrams.plus(new Prisma.Decimal("49.800000"));

    stoneWip.balanceGrams = stoneWip.balanceGrams.minus(new Prisma.Decimal("0.200000"));
    finishedStone.balanceGrams = finishedStone.balanceGrams.plus(new Prisma.Decimal("0.200000"));

    // -------------------------------------------------------------
    // Step 20: InventoryItem creation
    // -------------------------------------------------------------
    const createdItem = await txMock.inventoryItem.create({
      data: {
        shopId,
        nameEn: "22K Solitaire Diamond Ring",
        jewelleryType: "RING",
        status: "ACTIVE",
        stockQuantity: 1,
        netWeightGrams: 49.80,
        grossWeightGrams: 50.00,
        gemstones: [{ type: "DIAMOND", caratWeight: 1.0, materialKey: "diamond" }],
        workshopReceiptJournalId: "wmj_finished_receipt",
      },
    });
    expect(createdItem.grossWeightGrams).toBe(50.00);
    expect(createdItem.netWeightGrams).toBe(49.80);
    expect(createdItem.gemstones[0].caratWeight).toBe(1.0);

    // -------------------------------------------------------------
    // Step 21: Batch reconciliation
    // -------------------------------------------------------------
    // Outstanding WIP is zero across all buckets
    expect(settingWip.balanceGrams.toFixed(6)).toBe("0.000000");
    expect(stoneWip.balanceGrams.toFixed(6)).toBe("0.000000");
    expect(transitAccount.balanceGrams.toFixed(6)).toBe("0.000000");
    expect(mixProcess.balanceGrams.toFixed(6)).toBe("0.000000");

    // -------------------------------------------------------------
    // Step 22: Verify journal lineage
    // -------------------------------------------------------------
    expect(dbState.journals.length).toBeGreaterThanOrEqual(4);
    for (const j of dbState.journals) {
      expect(j.idempotencyKey).toBeDefined();
      expect(j.shopId).toBe(shopId);
    }

    // -------------------------------------------------------------
    // Step 23: Verify no TRACEABLE grams dual-written to KarigarMetalMovement
    // -------------------------------------------------------------
    const legacyMovements = await txMock.karigarMetalMovement.findMany();
    expect(legacyMovements).toHaveLength(0);

    // -------------------------------------------------------------
    // Step 24: Execute at least one normal correction
    // -------------------------------------------------------------
    alloyWip.balanceGrams = new Prisma.Decimal("10.000000");
    const sampleJournal = {
      id: "j-sample",
      entryNumber: "WMJ-SAMPLE-01",
      shopId,
      status: "POSTED",
      referenceType: "MATERIAL_ISSUE",
      materialKey: "masterAlloy",
      postedAt: new Date(),
      weightGrams: new Prisma.Decimal("1.000000"),
      reversedBy: null,
      replacedBy: null,
      lines: [
        { accountId: alloyVault.id, creditGrams: new Prisma.Decimal("1.000000"), debitGrams: new Prisma.Decimal(0), account: { materialKey: "masterAlloy" } },
        { accountId: alloyWip.id, creditGrams: new Prisma.Decimal(0), debitGrams: new Prisma.Decimal("1.000000"), account: { materialKey: "masterAlloy" } },
      ],
    };
    txMock.workshopMetalJournal.findFirst.mockResolvedValueOnce(sampleJournal).mockResolvedValueOnce(null);
    const normalCorrection = await controlService.correctJournal(shopId, userId, "j-sample", {
      reason: "Correct transcription error",
      replacementWeightGrams: "0.950000",
      idempotencyKey: "corr-normal-test",
    });
    expect(normalCorrection).toBeDefined();

    // -------------------------------------------------------------
    // Step 25: Execute an ADDITIONAL_ISSUE correction
    // -------------------------------------------------------------
    dbState.materials.set("solder22k", {
      id: "mat_solder22k",
      key: "solder22k",
      name: "22K Solder",
      kind: "SOLDER",
      scalePurpose: "GOLD",
      isActive: true,
    });
    const solderVault = await journalService.ensureAccount(txMock, shopId, "solder22k", WorkshopAccountBucket.VAULT);
    const solderProcess = await journalService.ensureAccount(txMock, shopId, "solder22k", WorkshopAccountBucket.PROCESS, processRun.id);
    solderVault.balanceGrams = new Prisma.Decimal("50.000000");
    solderProcess.balanceGrams = new Prisma.Decimal("2.500000");

    const additionalIssueJournal = {
      id: "add-issue-e2e",
      entryNumber: "WMJ-ADD-E2E",
      shopId,
      status: "POSTED",
      referenceType: "MATERIAL_ISSUE",
      materialKey: "solder22k",
      postedAt: new Date(),
      weightGrams: new Prisma.Decimal("2.500000"),
      processRunId: processRun.id,
      reversedBy: null,
      replacedBy: null,
      metadata: { movementKind: "ADDITIONAL_ISSUE" },
      lines: [
        { accountId: solderVault.id, creditGrams: new Prisma.Decimal("2.500000"), debitGrams: new Prisma.Decimal(0), account: { materialKey: "solder22k" } },
        { accountId: solderProcess.id, creditGrams: new Prisma.Decimal(0), debitGrams: new Prisma.Decimal("2.500000"), account: { materialKey: "solder22k" } },
      ],
    };
    processRun.status = "OPEN";
    txMock.workshopMetalJournal.findFirst.mockResolvedValueOnce(additionalIssueJournal);

    const addIssueCorrection: any = await controlService.correctJournal(shopId, userId, "add-issue-e2e", {
      reason: "Corrected solder issue before soldering commenced",
      idempotencyKey: "corr-add-e2e",
    });
    expect(addIssueCorrection.status).toBe("REVERSED");
    expect(addIssueCorrection.voided).toBe(true);

    // Verify audit log has the dedicated action
    expect(dbState.auditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "WORKSHOP_ADDITIONAL_ISSUE_CORRECT",
        }),
      ]),
    );
  });
});
