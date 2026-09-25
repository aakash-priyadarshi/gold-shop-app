import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { WorkshopPermissionGuard } from "./workshop-permission.guard";

describe("WorkshopPermissionGuard", () => {
  const shop = { findUnique: jest.fn(), findFirst: jest.fn() };
  const staffAccount = { findFirst: jest.fn() };
  const prisma = { shop, staffAccount } as any;
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const guard = new WorkshopPermissionGuard(prisma, reflector);
  const context = (user: Record<string, unknown>, shopId = "shop-1") => ({
    switchToHttp: () => ({ getRequest: () => ({ user, headers: { "x-workshop-shop-id": shopId } }) }),
    getHandler: () => ({}), getClass: () => ({}),
  } as unknown as ExecutionContext);

  beforeEach(() => {
    jest.clearAllMocks();
    shop.findFirst.mockResolvedValue(null);
    shop.findUnique.mockResolvedValue({ id: "shop-1" });
    staffAccount.findFirst.mockResolvedValue(null);
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue("workshopCapture");
  });

  it("accepts a shop owner and pins the verified shop", async () => {
    shop.findFirst.mockResolvedValue({ id: "shop-1" });
    const user = { id: "owner", role: "SHOPKEEPER" };
    await expect(guard.canActivate(context(user))).resolves.toBe(true);
    expect(user).toHaveProperty("shopId", "shop-1");
  });

  it("allows only accepted active staff with the requested ability", async () => {
    staffAccount.findFirst.mockResolvedValue({ shopId: "shop-1", permissions: { workshopCapture: true } });
    const user = { id: "operator", role: "CUSTOMER" };
    await expect(guard.canActivate(context(user))).resolves.toBe(true);
    expect(user).toHaveProperty("shopId", "shop-1");
    expect(staffAccount.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ shopId: "shop-1", isActive: true, acceptedAt: { not: null } }) }));
  });

  it("denies staff attempting owner-only correction despite other permissions", async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue("workshopCorrect");
    staffAccount.findFirst.mockResolvedValue({ shopId: "shop-1", permissions: { workshopCapture: true, workshopCorrect: true } });
    await expect(guard.canActivate(context({ id: "operator", role: "CUSTOMER" }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(staffAccount.findFirst).not.toHaveBeenCalled();
  });

  it("denies a shop header that is neither owned nor assigned", async () => {
    await expect(guard.canActivate(context({ id: "other", role: "SHOPKEEPER" }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("requires an existing selected shop even for admin", async () => {
    shop.findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(context({ id: "admin", role: "ADMIN" }))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
