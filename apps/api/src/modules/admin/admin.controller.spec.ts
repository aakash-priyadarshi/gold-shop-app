import { ConflictException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AdminController } from "./admin.controller";

describe("AdminController.createUser", () => {
  const request = {
    email: "new-shopkeeper@example.com",
    password: "Password1!",
    firstName: "New",
    lastName: "Shopkeeper",
    role: UserRole.SHOPKEEPER,
  };

  function createController() {
    const prisma = { user: { create: jest.fn() } };
    const controller = new AdminController(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    return { controller, prisma };
  }

  it("does not persist a blank optional phone as a unique value", async () => {
    const { controller, prisma } = createController();
    prisma.user.create.mockResolvedValue({ id: "user-1", ...request });

    await expect(
      controller.createUser({ ...request, phone: "   " }),
    ).resolves.toMatchObject({ success: true, user: { id: "user-1" } });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ phone: undefined }),
    });
  });

  it("returns a conflict rather than an internal error for a real duplicate", async () => {
    const { controller, prisma } = createController();
    prisma.user.create.mockRejectedValue({
      code: "P2002",
      meta: { target: ["phone"] },
    });

    const result = controller.createUser({
      ...request,
      phone: "+9779812345678",
    });

    await expect(result).rejects.toBeInstanceOf(ConflictException);
    await expect(result).rejects.toEqual(
      expect.objectContaining({
        response: expect.objectContaining({
          statusCode: 409,
          message: "A user with this phone already exists",
        }),
      }),
    );
  });
});
