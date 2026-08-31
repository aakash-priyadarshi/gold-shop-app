import { ConflictException } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { AdminController } from "./admin.controller";

describe("AdminController user creation", () => {
  const prisma = {
    user: {
      create: jest.fn(),
    },
  };
  const controller = new AdminController(
    prisma as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it("stores a blank optional phone as nullish instead of a unique empty string", async () => {
    prisma.user.create.mockResolvedValue({
      id: "user-1",
      email: "new@example.com",
      firstName: "New",
      lastName: "User",
      role: UserRole.CUSTOMER,
    });

    await controller.createUser({
      email: " NEW@example.com ",
      password: "StrongPass123!",
      firstName: " New ",
      lastName: " User ",
      role: UserRole.CUSTOMER,
      phone: "",
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "new@example.com",
        firstName: "New",
        lastName: "User",
        phone: undefined,
      }),
    });
  });

  it("returns a conflict instead of a 500 for duplicate values", async () => {
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["email"] },
      }),
    );

    await expect(
      controller.createUser({
        email: "existing@example.com",
        password: "StrongPass123!",
        firstName: "Existing",
        lastName: "User",
        role: UserRole.CUSTOMER,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ConflictException>>({
        message: "Email is already registered",
      }),
    );
  });
});
