import { ShopsService } from "./shops.service";

describe("ShopsService business details", () => {
  it("saves editable details without creating a verification request", async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ activeShopId: "shop-1" }),
      },
      shop: {
        findFirst: jest.fn().mockResolvedValue({
          id: "shop-1",
          userId: "user-1",
          country: "NP",
          panNumber: "OLD-PAN",
          vatNumber: null,
          bisLicenseNumber: null,
          verificationDocuments: {
            governmentId: "https://cdn.test/id.pdf",
            addressProof: "https://cdn.test/old-address.pdf",
          },
        }),
        update: jest.fn().mockResolvedValue({
          id: "shop-1",
          panNumber: "NEW-PAN",
        }),
      },
      verificationRequest: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };
    const service = Object.create(ShopsService.prototype) as ShopsService;
    Object.assign(service as any, { prisma, auditService });

    await service.updateShopKyc("user-1", {
      panNumber: "NEW-PAN",
      verificationDocuments: {
        governmentId: null,
        addressProof: "https://cdn.test/new-address.pdf",
      },
    });

    expect(prisma.shop.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "shop-1" },
        data: expect.objectContaining({
          panNumber: "NEW-PAN",
          verificationDocuments: {
            addressProof: "https://cdn.test/new-address.pdf",
          },
        }),
      }),
    );
    expect(prisma.verificationRequest.findFirst).not.toHaveBeenCalled();
    expect(prisma.verificationRequest.update).not.toHaveBeenCalled();
    expect(prisma.verificationRequest.create).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ resourceType: "SHOP_BUSINESS_DETAILS" }),
    );
  });
});
