import {
  buildWorkshopTower,
  finishedGramsForReceive,
  nextDepartment,
  resolveDepartments,
} from "./karigar-workshop";

describe("workshop manufacturing helpers", () => {
  it("defaults departments to the karigar stage order", () => {
    expect(resolveDepartments(null)[0]).toBe("CASTING");
    expect(resolveDepartments(["QC", "CASTING"])).toEqual(["QC", "CASTING"]);
    expect(resolveDepartments(["NOPE"])).toEqual([
      "CASTING",
      "FILING",
      "POLISHING",
      "SETTING",
      "FINAL_POLISH",
      "QC",
    ]);
  });

  it("advances to the next department and stops at QC", () => {
    expect(nextDepartment(null)).toBe("CASTING");
    expect(nextDepartment("CASTING")).toBe("FILING");
    expect(nextDepartment("QC")).toBeNull();
  });

  it("prefers tree finished grams when receiving FG", () => {
    expect(
      finishedGramsForReceive({
        trees: [{ finishedGrams: 920 }],
        stages: [{ stage: "QC", goldOutGrams: 903 }],
      }),
    ).toBe(920);
    expect(
      finishedGramsForReceive({
        trees: [],
        stages: [
          { stage: "CASTING", goldOutGrams: 10 },
          { stage: "QC", goldOutGrams: 8 },
        ],
      }),
    ).toBe(8);
  });

  it("classifies overdue, QC, loss-limit, and low vault on the tower", () => {
    const now = new Date("2026-08-14T12:00:00.000Z");
    const tower = buildWorkshopTower({
      now,
      vaultGoldGrams: 10,
      workshops: [
        {
          id: "ws-1",
          name: "Bench",
          artisan: "Ravi",
          wageDue: 500,
          outstandingBalance: 12,
        },
      ],
      jobs: [
        {
          id: "job-overdue",
          product: "Ring",
          artisan: "Ravi",
          status: "Casting",
          dueAt: new Date("2026-08-01T00:00:00.000Z"),
          currentStage: "CASTING",
          inventoryItemId: null,
          allowedWastagePercent: 1,
          stages: [
            {
              stage: "CASTING",
              status: "DONE",
              goldInGrams: 100,
              goldOutGrams: 90,
              scrapGrams: 0,
              dustGrams: 0,
              allowedWastagePercent: 1,
              reworkCount: 0,
              qcApprovedAt: new Date("2026-08-12T00:00:00.000Z"),
            },
          ],
          trees: [
            {
              issuedGrams: 1000,
              finishedGrams: 900,
              sprueButtonGrams: 50,
              recoverableGrams: 20,
              allowedWastagePercent: 1,
            },
          ],
        },
        {
          id: "job-qc",
          product: "Bangle",
          artisan: "Ravi",
          status: "QC",
          dueAt: new Date("2026-08-16T00:00:00.000Z"),
          currentStage: "QC",
          inventoryItemId: null,
          allowedWastagePercent: 1,
          stages: [
            {
              stage: "QC",
              status: "PENDING",
              goldInGrams: 50,
              goldOutGrams: 0,
              scrapGrams: 0,
              dustGrams: 0,
              allowedWastagePercent: 1,
              reworkCount: 1,
            },
          ],
          trees: [],
        },
        {
          id: "job-fg",
          product: "Chain",
          artisan: "Ravi",
          status: "Completed",
          dueAt: null,
          currentStage: "QC",
          inventoryItemId: null,
          allowedWastagePercent: 1,
          stages: [
            {
              stage: "QC",
              status: "DONE",
              qcApprovedAt: new Date("2026-08-16T00:00:00.000Z"),
              goldInGrams: 40,
              goldOutGrams: 40,
              scrapGrams: 0,
              dustGrams: 0,
              allowedWastagePercent: 1,
              reworkCount: 0,
            },
          ],
          trees: [],
        },
      ],
    });

    expect(tower.overdue.map((j) => j.id)).toEqual(["job-overdue"]);
    expect(tower.qcPending.map((j) => j.id)).toEqual(["job-qc"]);
    expect(tower.unreceivedFg.map((j) => j.id)).toEqual(["job-fg"]);
    expect(tower.dueThisWeek.map((j) => j.id)).toEqual(["job-qc"]);
    expect(tower.lossLimit.map((j) => j.id)).toContain("job-overdue");
    expect(tower.lowVault).toBe(true);
    expect(tower.wagesDue).toHaveLength(1);
    expect(tower.unreceivedMetal).toHaveLength(1);
    expect(tower.waitingOnNext.map((j) => j.id)).toEqual(["job-overdue"]);
    expect(tower.reworkRate).toBeGreaterThan(0);
  });

  it("calculates onTimePercent using QC completedAt rather than current timestamp", () => {
    const now = new Date("2026-08-20T12:00:00.000Z");
    const tower = buildWorkshopTower({
      now,
      vaultGoldGrams: 50,
      workshops: [],
      jobs: [
        {
          id: "job-completed-on-time",
          product: "Earrings",
          artisan: "Ravi",
          status: "Completed",
          dueAt: new Date("2026-08-10T00:00:00.000Z"),
          currentStage: "QC",
          inventoryItemId: "item-1",
          allowedWastagePercent: 1,
          stages: [
            {
              stage: "QC",
              status: "DONE",
              goldInGrams: 10,
              goldOutGrams: 10,
              scrapGrams: 0,
              dustGrams: 0,
              allowedWastagePercent: 1,
              reworkCount: 0,
              completedAt: new Date("2026-08-09T18:00:00.000Z"),
            },
          ],
          trees: [],
        },
        {
          id: "job-completed-late",
          product: "Pendant",
          artisan: "Ravi",
          status: "Completed",
          dueAt: new Date("2026-08-05T00:00:00.000Z"),
          currentStage: "QC",
          inventoryItemId: "item-2",
          allowedWastagePercent: 1,
          stages: [
            {
              stage: "QC",
              status: "DONE",
              goldInGrams: 15,
              goldOutGrams: 15,
              scrapGrams: 0,
              dustGrams: 0,
              allowedWastagePercent: 1,
              reworkCount: 0,
              completedAt: new Date("2026-08-08T12:00:00.000Z"),
            },
          ],
          trees: [],
        },
      ],
    });

    // 1 of 2 completed on time
    expect(tower.onTimePercent).toBe(0.5);
  });

  it("does not offer finished-goods receipt for a QC stage completed without approval", () => {
    const tower = buildWorkshopTower({
      vaultGoldGrams: 100,
      workshops: [],
      jobs: [
        {
          id: "job-unapproved-qc",
          product: "Ring",
          artisan: "Ravi",
          status: "Final Polishing",
          dueAt: null,
          currentStage: "QC",
          inventoryItemId: null,
          allowedWastagePercent: 1,
          stages: [
            {
              stage: "QC",
              status: "DONE",
              goldInGrams: 10,
              goldOutGrams: 10,
              scrapGrams: 0,
              dustGrams: 0,
              allowedWastagePercent: 1,
              reworkCount: 0,
            },
          ],
          trees: [],
        },
      ],
    });

    expect(tower.unreceivedFg).toEqual([]);
  });

  it("builds tower deptLoad according to custom configured shop departments", () => {
    const tower = buildWorkshopTower({
      vaultGoldGrams: 100,
      workshops: [],
      departments: ["CASTING", "POLISHING", "QC"],
      jobs: [
        {
          id: "job-1",
          product: "Ring",
          artisan: "Ravi",
          status: "Casting",
          dueAt: null,
          currentStage: "CASTING",
          inventoryItemId: null,
          allowedWastagePercent: 1,
          stages: [],
          trees: [],
        },
        {
          id: "job-2",
          product: "Necklace",
          artisan: "Ravi",
          status: "Polishing",
          dueAt: null,
          currentStage: "POLISHING",
          inventoryItemId: null,
          allowedWastagePercent: 1,
          stages: [],
          trees: [],
        },
      ],
    });

    expect(tower.deptLoad).toEqual([
      { stage: "CASTING", count: 1 },
      { stage: "POLISHING", count: 1 },
      { stage: "QC", count: 0 },
    ]);
  });
});
