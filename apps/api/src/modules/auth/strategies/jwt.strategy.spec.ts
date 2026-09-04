import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";
import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy", () => {
  const findUnique = jest.fn();
  const prisma = {
    user: { findUnique },
  } as unknown as PrismaService;
  const config = {
    get: jest.fn().mockReturnValue("test-jwt-secret-for-jest"),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exposes the resolved active shop through both shop identifiers", async () => {
    findUnique.mockResolvedValue({
      id: "seller-1",
      email: "seller@example.com",
      role: "SHOPKEEPER",
      firstName: "Test",
      lastName: "Seller",
      preferredLanguage: "en",
      status: "ACTIVE",
      activeShopId: "shop-2",
      shops: [{ id: "shop-1" }, { id: "shop-2" }],
    });
    const strategy = new JwtStrategy(config, prisma);

    const result = await strategy.validate({ sub: "seller-1" } as any);

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "seller-1" },
      include: { shops: true },
    });
    expect(result).toMatchObject({
      id: "seller-1",
      shopId: "shop-2",
      activeShopId: "shop-2",
    });
  });
});
