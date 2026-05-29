import { ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { GoldLoansService } from "./gold-loans.service";

const mockPrisma = {
  goldLoan: {
    findUnique: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
};

const baseDto: any = {
  customerName: "Walk-in",
  customerPhone: "+9779812345678",
  principal: 50000,
  interestRate: 2,
};

describe("GoldLoansService.create (tenant isolation)", () => {
  let service: GoldLoansService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GoldLoansService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = moduleRef.get<GoldLoansService>(GoldLoansService);
  });

  it("returns the existing loan on idempotent replay for the same shop", async () => {
    const existing = { id: "loan-1", shopId: "shop-1", clientId: "c-1" };
    mockPrisma.goldLoan.findUnique.mockResolvedValue(existing);

    const result = await service.create("shop-1", { ...baseDto, clientId: "c-1" });

    expect(result).toBe(existing);
    expect(mockPrisma.goldLoan.create).not.toHaveBeenCalled();
  });

  it("rejects a clientId already owned by a different shop", async () => {
    mockPrisma.goldLoan.findUnique.mockResolvedValue({
      id: "loan-1",
      shopId: "shop-OTHER",
      clientId: "c-1",
    });

    await expect(
      service.create("shop-1", { ...baseDto, clientId: "c-1" }),
    ).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.goldLoan.create).not.toHaveBeenCalled();
  });

  it("creates a new loan when the clientId is unseen", async () => {
    mockPrisma.goldLoan.findUnique.mockResolvedValue(null);
    mockPrisma.goldLoan.count.mockResolvedValue(0);
    mockPrisma.goldLoan.create.mockResolvedValue({ id: "loan-new", shopId: "shop-1" });

    const result = await service.create("shop-1", { ...baseDto, clientId: "c-2" });

    expect(mockPrisma.goldLoan.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.goldLoan.create.mock.calls[0][0].data.shopId).toBe("shop-1");
    expect(result).toEqual({ id: "loan-new", shopId: "shop-1" });
  });
});
