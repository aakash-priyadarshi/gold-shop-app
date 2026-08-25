import { SaleBuilderService } from "./sale-builder.service";

describe("SaleBuilderService", () => {
  let service: SaleBuilderService;

  beforeEach(() => {
    service = new SaleBuilderService();
  });

  it("prefers canonical item.gemstones and preserves shape and metadata", () => {
    const lines = service.fromInventoryItem({
      id: "item-1",
      nameEn: "Diamond Solitaire Ring",
      sku: "DSR-001",
      jewelleryType: "RING",
      totalWeightGrams: 5.2,
      metalValueNpr: 50000,
      makingChargeNpr: 8000,
      gemstoneValueNpr: 120000,
      taxNpr: 0,
      totalPriceNpr: 178000,
      composition: {
        gemstones: [
          {
            type: "RUBY",
            cost: 10000,
          },
        ],
      },
      gemstones: [
        {
          type: "DIAMOND",
          origin: "LAB",
          shape: "Oval",
          cut: "Oval",
          caratWeight: 1.5,
          color: "D",
          clarity: "VVS1",
          qualityTier: "PREMIUM",
          cutGrade: "Excellent",
          gradingLab: "IGI",
          certNumber: "LG12345678",
          cost: 120000,
          count: 1,
        },
      ],
      hallmarkNumber: "HM-9999",
      assayOffice: "LONDON",
    });

    expect(lines).toHaveLength(1);
    const line = lines[0];
    expect(line.gemstones).toHaveLength(1);
    expect(line.gemstones![0]).toEqual({
      type: "DIAMOND",
      origin: "LAB",
      shape: "Oval",
      cut: "Oval",
      caratWeight: 1.5,
      sizeMm: undefined,
      color: "D",
      clarity: "VVS1",
      qualityTier: "PREMIUM",
      cutGrade: "Excellent",
      gradingLab: "IGI",
      certNumber: "LG12345678",
      reportUrl: undefined,
      reportDate: undefined,
      count: 1,
      cost: 120000,
    });
    // Details string should contain hallmarks/SKU without hardcoded English gemstone prose
    expect(line.details).toBe("DSR-001 · Hallmark: HM-9999 · Assay: LONDON");
  });

  it("direct single gemstone object beats composition", () => {
    const lines = service.fromInventoryItem({
      id: "item-2",
      nameEn: "Emerald Ring",
      sku: "EMR-001",
      jewelleryType: "RING",
      totalWeightGrams: 4.0,
      metalValueNpr: 40000,
      makingChargeNpr: 5000,
      gemstoneValueNpr: 60000,
      taxNpr: 0,
      totalPriceNpr: 105000,
      composition: {
        gemstones: [{ type: "RUBY", cost: 10000 }],
      },
      gemstones: {
        type: "EMERALD",
        origin: "NATURAL",
        shape: "Emerald",
        sizeMm: 6.0,
        cost: 60000,
      } as any,
    });

    expect(lines).toHaveLength(1);
    expect(lines[0].gemstones).toHaveLength(1);
    expect(lines[0].gemstones![0]).toMatchObject({
      type: "EMERALD",
      origin: "NATURAL",
      shape: "Emerald",
      sizeMm: 6.0,
      cost: 60000,
    });
  });

  it("direct wrapper { gemstones: [...] } beats composition", () => {
    const lines = service.fromInventoryItem({
      id: "item-3",
      nameEn: "Sapphire Ring",
      sku: "SAP-001",
      jewelleryType: "RING",
      totalWeightGrams: 4.5,
      metalValueNpr: 40000,
      makingChargeNpr: 5000,
      gemstoneValueNpr: 70000,
      taxNpr: 0,
      totalPriceNpr: 115000,
      composition: {
        gemstones: [{ type: "RUBY", cost: 10000 }],
      },
      gemstones: {
        gemstones: [
          {
            type: "SAPPHIRE",
            origin: "NATURAL",
            shape: "Oval",
            sizeMm: 5.5,
            cost: 70000,
          },
        ],
      } as any,
    });

    expect(lines).toHaveLength(1);
    expect(lines[0].gemstones).toHaveLength(1);
    expect(lines[0].gemstones![0]).toMatchObject({
      type: "SAPPHIRE",
      origin: "NATURAL",
      shape: "Oval",
      cost: 70000,
    });
  });

  it("missing direct gemstones falls back to composition.gemstones", () => {
    const lines = service.fromInventoryItem({
      id: "item-4",
      nameEn: "Ruby Ring",
      sku: "RBY-001",
      jewelleryType: "RING",
      totalWeightGrams: 3.5,
      metalValueNpr: 30000,
      makingChargeNpr: 4000,
      gemstoneValueNpr: 25000,
      taxNpr: 0,
      totalPriceNpr: 59000,
      composition: {
        gemstones: [
          {
            type: "RUBY",
            origin: "NATURAL",
            shape: "Round",
            cost: 25000,
          },
        ],
      },
    });

    expect(lines).toHaveLength(1);
    expect(lines[0].gemstones).toHaveLength(1);
    expect(lines[0].gemstones![0]).toMatchObject({
      type: "RUBY",
      origin: "NATURAL",
      shape: "Round",
      cost: 25000,
    });
  });

  it("empty direct array falls back to composition.gemstones if populated", () => {
    const lines = service.fromInventoryItem({
      id: "item-5",
      nameEn: "Ruby Ring",
      sku: "RBY-002",
      jewelleryType: "RING",
      totalWeightGrams: 3.5,
      metalValueNpr: 30000,
      makingChargeNpr: 4000,
      gemstoneValueNpr: 25000,
      taxNpr: 0,
      totalPriceNpr: 59000,
      gemstones: [],
      composition: {
        gemstones: [
          {
            type: "RUBY",
            origin: "NATURAL",
            shape: "Round",
            cost: 25000,
          },
        ],
      },
    });

    expect(lines).toHaveLength(1);
    expect(lines[0].gemstones).toHaveLength(1);
    expect(lines[0].gemstones![0]).toMatchObject({
      type: "RUBY",
      origin: "NATURAL",
      shape: "Round",
      cost: 25000,
    });
  });
});
