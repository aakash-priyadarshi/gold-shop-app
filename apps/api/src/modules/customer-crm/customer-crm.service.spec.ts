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

    it("prevents a non-creator shop from overwriting notes and core customer details", async () => {
      prisma.walkInCustomer.findUnique.mockResolvedValue({
        id: "cust-1",
        phone: "+9779800000000",
        phoneCountryCode: "+977",
        name: "Original Name",
        email: null,
        address: "Original Address",
        city: "Kathmandu",
        country: "NP",
        notes: "Secret shop-1 notes",
        createdByShopId: "shop-1",
      });
      prisma.walkInCustomer.update.mockResolvedValue({
        id: "cust-1",
        name: "Original Name",
        phone: "+9779800000000",
        createdByShopId: "shop-1",
      });

      await service.upsertWalkInCustomer("shop-2", {
        name: "Malicious Overwrite",
        phoneCountryCode: "+977",
        phone: "9800000000",
        email: "shop2@example.com",
        address: "Hacked Address",
        city: "Pokhara",
        notes: "Overwritten note",
      });

      expect(prisma.walkInCustomer.update).toHaveBeenCalledWith({
        where: { id: "cust-1" },
        data: {
          name: "Original Name",
          phoneCountryCode: "+977",
          email: "shop2@example.com",
          address: "Original Address",
          city: "Kathmandu",
          country: "NP",
        },
      });
    });
  });
});
