import { CustomerCrmService } from "./customer-crm.service";

describe("CustomerCrmService", () => {
  let service: CustomerCrmService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      walkInCustomer: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    service = new CustomerCrmService(prisma);
  });

  describe("upsertWalkInCustomer", () => {
    it("creates a new walk-in customer when none exists", async () => {
      prisma.walkInCustomer.findUnique.mockResolvedValue(null);
      prisma.walkInCustomer.create.mockResolvedValue({
        id: "cust-1",
        phone: "+9779800000000",
        phoneCountryCode: "+977",
        name: "Aakash",
        email: "aakash@example.com",
        address: "Kathmandu",
        city: "Kathmandu",
        country: "NP",
        notes: "VIP customer",
        createdByShopId: "shop-1",
      });

      const res = await service.upsertWalkInCustomer("shop-1", {
        name: "Aakash",
        phoneCountryCode: "+977",
        phone: "9800000000",
        email: "aakash@example.com",
        address: "Kathmandu",
        city: "Kathmandu",
        country: "NP",
        notes: "VIP customer",
      });

      expect(res.id).toBe("cust-1");
      expect(prisma.walkInCustomer.create).toHaveBeenCalledWith({
        data: {
          phone: "+9779800000000",
          phoneCountryCode: "+977",
          name: "Aakash",
          email: "aakash@example.com",
          address: "Kathmandu",
          city: "Kathmandu",
          country: "NP",
          notes: "VIP customer",
          createdByShopId: "shop-1",
        },
      });
    });

    it("allows the creator shop to update private notes and address", async () => {
      prisma.walkInCustomer.findUnique.mockResolvedValue({
        id: "cust-1",
        phone: "+9779800000000",
        phoneCountryCode: "+977",
        name: "Aakash",
        email: "aakash@example.com",
        address: "Old Address",
        city: "Kathmandu",
        country: "NP",
        notes: "Original note",
        createdByShopId: "shop-1",
      });
      prisma.walkInCustomer.update.mockResolvedValue({
        id: "cust-1",
        name: "Aakash Updated",
        email: "aakash@example.com",
        address: "New Address",
        city: "Lalitpur",
        country: "NP",
        notes: "Updated note",
      });

      await service.upsertWalkInCustomer("shop-1", {
        name: "Aakash Updated",
        phoneCountryCode: "+977",
        phone: "9800000000",
        address: "New Address",
        city: "Lalitpur",
        notes: "Updated note",
      });

      expect(prisma.walkInCustomer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "cust-1" },
          data: expect.objectContaining({
            name: "Aakash Updated",
            address: "New Address",
            city: "Lalitpur",
            notes: "Updated note",
          }),
        }),
      );
    });

    it("creates an isolated customer record for another shop even if phone exists elsewhere", async () => {
      prisma.walkInCustomer.findUnique.mockResolvedValue(null);
      prisma.walkInCustomer.create.mockResolvedValue({
        id: "cust-2",
        name: "Shop 2 Customer",
        phone: "+9779800000000",
        createdByShopId: "shop-2",
      });

      const result = await service.upsertWalkInCustomer("shop-2", {
        name: "Shop 2 Customer",
        phoneCountryCode: "+977",
        phone: "9800000000",
        email: "shop2@example.com",
        address: "Pokhara Address",
        city: "Pokhara",
        notes: "Shop 2 private note",
      });

      expect(prisma.walkInCustomer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            createdByShopId: "shop-2",
            name: "Shop 2 Customer",
            notes: "Shop 2 private note",
          }),
        }),
      );
      expect(result.id).toBe("cust-2");
    });
  });

  it("only searches walk-in customers owned by the requesting shop", async () => {
    prisma.invoice = { groupBy: jest.fn().mockResolvedValue([]) };
    prisma.user = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };
    prisma.walkInCustomer.findMany = jest.fn().mockResolvedValue([]);
    prisma.walkInCustomer.count = jest.fn().mockResolvedValue(0);

    await service.searchCustomers("shop-1", "Aakash");

    expect(prisma.walkInCustomer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ createdByShopId: "shop-1" }),
      }),
    );
    expect(prisma.walkInCustomer.findMany.mock.calls[0][0].where).not.toHaveProperty(
      "invoices",
    );
  });
});
