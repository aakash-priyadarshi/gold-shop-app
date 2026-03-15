import { PrismaService } from "../../../prisma/prisma.service";
import { AgentMemoryService } from "./agent-memory.service";

describe("AgentMemoryService", () => {
  it("returns curated CRM defaults for missing entries", () => {
    const service = new AgentMemoryService({} as PrismaService, {} as any);

    expect(service.get("company", "description")).toContain("jewellery business CRM");
    expect(service.get("product", "pricing_summary")).toContain("₹299/month");
    expect(service.get("urls", "product_url")).toContain("jewellery-shop-software");
  });

  it("getAll merges DB rows with curated defaults", async () => {
    const prisma = {
      agentMemory: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "db-1",
            category: "company",
            key: "name",
            value: "Orivraa",
            label: "Company Name",
          },
        ]),
      },
    } as unknown as PrismaService;
    const service = new AgentMemoryService(prisma, {} as any);

    const rows = await service.getAll();

    expect(rows.some((row) => row.id === "db-1")).toBe(true);
    expect(rows.some((row) => row.id.startsWith("default:product:pricing_summary"))).toBe(true);
  });

  it("seedDefaults preserves configured phone numbers while updating descriptive memory", async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      agentMemory: {
        findMany: jest.fn().mockResolvedValue([
          { category: "phones", key: "twilio_phone", value: "+15551234567" },
          { category: "company", key: "description", value: "old description" },
        ]),
        upsert,
      },
    } as unknown as PrismaService;
    const service = new AgentMemoryService(prisma, {} as any);
    jest.spyOn(service as any, "loadAll").mockResolvedValue(undefined);

    await service.seedDefaults();

    const phoneUpdate = upsert.mock.calls.find(
      (call) => call[0].where.category_key.category === "phones" && call[0].where.category_key.key === "twilio_phone",
    );
    const descriptionUpdate = upsert.mock.calls.find(
      (call) => call[0].where.category_key.category === "company" && call[0].where.category_key.key === "description",
    );

    expect(phoneUpdate[0].update.value).toBe("+15551234567");
    expect(descriptionUpdate[0].update.value).toContain("jewellery business CRM");
  });
});