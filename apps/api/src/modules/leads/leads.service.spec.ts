import { LeadSource, LeadStatus } from "@prisma/client";
import { LeadsService } from "./leads.service";

describe("LeadsService", () => {
  let service: LeadsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      lead: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new LeadsService(prisma);
  });

  describe("getLeads", () => {
    it("should query paginated leads with filters and compute stats", async () => {
      const mockLeads = [
        {
          id: "lead-1",
          shopName: "Priyadarshi Jewellers",
          email: "shop@test.com",
          city: "Kathmandu",
          country: "NP",
          status: LeadStatus.NEW,
          source: LeadSource.GOOGLE_MAPS,
        },
      ];

      prisma.lead.findMany.mockResolvedValue(mockLeads);
      prisma.lead.count
        .mockResolvedValueOnce(1) // total matching
        .mockResolvedValueOnce(10) // totalAll
        .mockResolvedValueOnce(5) // newCount
        .mockResolvedValueOnce(3) // contactedCount
        .mockResolvedValueOnce(2) // wonCount
        .mockResolvedValueOnce(0) // lostCount
        .mockResolvedValueOnce(8) // mapsCount
        .mockResolvedValueOnce(2); // chatCount

      const result = await service.getLeads({
        page: 1,
        limit: 20,
        country: "NP",
        status: "NEW",
      });

      expect(result.leads).toEqual(mockLeads);
      expect(result.total).toBe(1);
      expect(result.stats.totalAll).toBe(10);
      expect(result.stats.newCount).toBe(5);
      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            country: "NP",
            status: LeadStatus.NEW,
          }),
        }),
      );
    });
  });

  describe("importLeads", () => {
    it("should create new lead when no existing record is found", async () => {
      prisma.lead.findFirst.mockResolvedValue(null);
      prisma.lead.create.mockResolvedValue({ id: "new-lead" });

      const result = await service.importLeads({
        leads: [
          {
            shopName: "Everest Gold House",
            email: "everest@gold.np",
            phone: "+977 9800000000",
            city: "Kathmandu",
            country: "NP",
            source: LeadSource.GOOGLE_MAPS,
          },
        ],
      });

      expect(result.imported).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(prisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shopName: "Everest Gold House",
            email: "everest@gold.np",
            country: "NP",
          }),
        }),
      );
    });

    it("should update existing lead if email matches", async () => {
      const existing = {
        id: "existing-1",
        shopName: "Old Name",
        email: "existing@shop.com",
        phone: null,
      };

      prisma.lead.findFirst.mockResolvedValue(existing);
      prisma.lead.update.mockResolvedValue({ ...existing, phone: "+977 9811111111" });

      const result = await service.importLeads({
        leads: [
          {
            shopName: "Existing Shop",
            email: "existing@shop.com",
            phone: "+977 9811111111",
            city: "Patan",
            country: "NP",
          },
        ],
      });

      expect(result.imported).toBe(0);
      expect(result.updated).toBe(1);
      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "existing-1" },
        }),
      );
    });
  });

  describe("bulkUpdateStatus", () => {
    it("should update status for multiple leads", async () => {
      prisma.lead.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.bulkUpdateStatus({
        ids: ["l1", "l2", "l3"],
        status: LeadStatus.CONTACTED,
      });

      expect(result.count).toBe(3);
      expect(result.status).toBe(LeadStatus.CONTACTED);
      expect(prisma.lead.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["l1", "l2", "l3"] } },
        data: { status: LeadStatus.CONTACTED },
      });
    });
  });
});
