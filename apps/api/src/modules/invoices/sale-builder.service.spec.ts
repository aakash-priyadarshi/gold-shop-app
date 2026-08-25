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
    expect(line.details).toContain("Lab-grown");
    expect(line.details).toContain("Oval");
    expect(line.details).toContain("1.5ct");
    expect(line.details).toContain("Color D");
    expect(line.details).toContain("Clarity VVS1");
  });
});
