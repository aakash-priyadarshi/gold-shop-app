import { NotFoundException } from "@nestjs/common";
import { WorkshopAssignmentsController } from "./workshop-assignments.controller";

describe("WorkshopAssignmentsController", () => {
  let prisma: any;
  let controller: WorkshopAssignmentsController;

  beforeEach(() => {
    const tx = {
      staffAccount: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: "membership-1", acceptedAt: null }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: "staff-1" }) },
      staffAccount: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      $transaction: (fn: (client: any) => Promise<unknown>) => fn(tx),
      tx,
    };
    controller = new WorkshopAssignmentsController(prisma);
  });

  it("invites a registered operator with only capture permission", async () => {
    const result = await controller.invite("shop-1", "owner-1", { email: " Staff@Example.com ", canCapture: true, canApprove: false });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "staff@example.com" }, select: { id: true } });
    expect(prisma.tx.staffAccount.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { shopId_userId: { shopId: "shop-1", userId: "staff-1" } },
      create: expect.objectContaining({ permissions: { workshopCapture: true, workshopApprove: false } }),
    }));
    expect(result).toEqual({ id: "membership-1", accepted: false, permissions: { workshopCapture: true, workshopApprove: false } });
  });

  it("requires renewed acceptance and drops stale privileges on an inactive membership", async () => {
    prisma.tx.staffAccount.findUnique.mockResolvedValue({
      isActive: false, acceptedAt: new Date(), permissions: { workshopApprove: true, inventoryWrite: true },
    });
    prisma.tx.staffAccount.upsert.mockResolvedValue({ id: "membership-1", acceptedAt: null });
    const result = await controller.invite("shop-1", "owner-1", { email: "staff@example.com", canCapture: true, canApprove: false });

    expect(prisma.tx.staffAccount.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({
        isActive: true, acceptedAt: null, invitedByUserId: "owner-1", staffRole: "INVENTORY",
        permissions: { workshopCapture: true, workshopApprove: false },
      }),
    }));
    expect(result.accepted).toBe(false);
  });

  it("accepts only an active pending invitation belonging to the signed-in user", async () => {
    await controller.accept("staff-1", "membership-1");
    expect(prisma.staffAccount.updateMany).toHaveBeenCalledWith({
      where: { id: "membership-1", userId: "staff-1", isActive: true, acceptedAt: null },
      data: { acceptedAt: expect.any(Date) },
    });
    prisma.staffAccount.updateMany.mockResolvedValue({ count: 0 });
    await expect(controller.accept("other-user", "membership-1")).rejects.toBeInstanceOf(NotFoundException);
  });
});
