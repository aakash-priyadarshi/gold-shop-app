import { Prisma, WorkshopAccountBucket } from "@prisma/client";
import { WorkshopReportService } from "./workshop-report.service";
import { WorkshopReportController } from "./workshop-report.controller";

describe("WorkshopReportService", () => {
  it("requires supervisor permission for balances and raw scale audit", () => {
    expect(Reflect.getMetadata("workshopAbility", WorkshopReportController.prototype.dashboard)).toBe("workshopApprove");
  });
  it("attributes classified process variance to the measured run, machine, operator and product", async () => {
    const run = {
      id: "run-1", treeId: "tree-1", jobId: "job-1", batchChildId: "piece-1",
      operatorUserId: "operator-1", status: "RECONCILED", department: "Polishing",
      workstation: { name: "Polisher A" }, definition: { name: "Polishing" },
      job: { product: "Ring" }, batchChild: { label: "Ring 1" },
      approvalUserId: "supervisor-1", approvalAt: new Date(), approvalReason: "Verified dust",
    };
    const prisma = {
      workshopMetalAccount: { findMany: jest.fn().mockResolvedValue([
        { id: "variance-1", materialKey: "mixed-22k", bucket: WorkshopAccountBucket.PROCESS_VARIANCE,
          scopeId: "", balanceGrams: new Prisma.Decimal("0.13"), purity: new Prisma.Decimal("0.916667") },
      ]) },
      workshopProcessRun: { findMany: jest.fn().mockResolvedValue([run]) },
      workshopTransfer: { findMany: jest.fn().mockResolvedValue([]) },
      workshopRecoveryContainer: { findMany: jest.fn().mockResolvedValue([]) },
      workshopScaleReading: { findMany: jest.fn().mockResolvedValue([]) },
      workshopMetalJournal: { findMany: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{
          id: "variance-journal", processRunId: run.id, materialKey: "mixed-22k",
          weightGrams: new Prisma.Decimal("0.13"), postedAt: new Date(), actorUserId: "supervisor-1",
          metadata: { classification: "PROCESS_VARIANCE" },
        }]) },
      inventoryItem: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const report = await new WorkshopReportService(prisma, {} as any).dashboard("shop-1");

    expect(report.materialStock).toEqual([expect.objectContaining({ materialKey: "mixed-22k", balanceGrams: "0.130000" })]);
    expect(prisma.workshopMetalAccount.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { shopId: "shop-1", isActive: true, balanceGrams: { not: 0 } },
    }));
    expect(report.processVariance).toEqual([expect.objectContaining({
      processRunId: "run-1", weightGrams: "0.130000", approverUserId: "supervisor-1",
      process: expect.objectContaining({ operatorUserId: "operator-1", job: { product: "Ring" },
        workstation: { name: "Polisher A" }, batchChild: { label: "Ring 1" } }),
    })]);
  });
});
