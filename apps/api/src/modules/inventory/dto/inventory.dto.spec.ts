import "reflect-metadata";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventoryGemstoneDto,
} from "./inventory.dto";

const validationPipe = new ValidationPipe({ transform: true, whitelist: true });

function validateCreate(body: Record<string, unknown>) {
  return validationPipe.transform(body, {
    type: "body",
    metatype: CreateInventoryItemDto,
  });
}

function validateUpdate(body: Record<string, unknown>) {
  return validationPipe.transform(body, {
    type: "body",
    metatype: UpdateInventoryItemDto,
  });
}

const baseValidCreate: Record<string, unknown> = {
  nameEn: "Diamond Ring",
  sku: "RNG-001",
  jewelleryType: "RING",
  buildMethod: "METHOD_A",
  composition: { baseAlloy: { metal: "GOLD", purity: "22K" } },
  totalWeightGrams: 5.5,
  metalValueNpr: 50000,
  makingChargeNpr: 5000,
};

describe("Inventory DTO Gemstone Normalization and Validation", () => {
  describe("CreateInventoryItemDto gemstones", () => {
    it("accepts omitted gemstones", async () => {
      const res = await validateCreate({ ...baseValidCreate });
      expect(res.gemstones).toBeUndefined();
    });

    it("accepts empty gemstones array", async () => {
      const res = await validateCreate({ ...baseValidCreate, gemstones: [] });
      expect(res.gemstones).toEqual([]);
    });

    it("accepts valid gemstones array", async () => {
      const res = await validateCreate({
        ...baseValidCreate,
        gemstones: [
          {
            type: "DIAMOND",
            origin: "LAB",
            shape: "Oval",
            cut: "Oval Brilliant",
            caratWeight: 1.5,
            sizeMm: 7.0,
            color: "D",
            clarity: "VVS1",
            qualityTier: "PREMIUM",
            cutGrade: "Excellent",
            gradingLab: "IGI",
            certNumber: "IGI-987",
            reportUrl: "https://example.com/igi-987",
            reportDate: "2026-08-01",
            count: 1,
            valueNpr: 75000,
          },
        ],
      });
      expect(res.gemstones).toHaveLength(1);
      expect(res.gemstones![0]).toBeInstanceOf(InventoryGemstoneDto);
      expect(res.gemstones![0]).toMatchObject({
        type: "DIAMOND",
        origin: "LAB",
        shape: "Oval",
        caratWeight: 1.5,
        clarity: "VVS1",
      });
    });

    it("normalizes single plain gemstone object into a canonical array", async () => {
      const res = await validateCreate({
        ...baseValidCreate,
        gemstones: {
          type: "EMERALD",
          origin: "NATURAL",
          shape: "Emerald",
          sizeMm: 6.5,
          color: "Green",
          count: 2,
          valueNpr: 40000,
        },
      });
      expect(Array.isArray(res.gemstones)).toBe(true);
      expect(res.gemstones).toHaveLength(1);
      expect(res.gemstones![0]).toBeInstanceOf(InventoryGemstoneDto);
      expect(res.gemstones![0]).toMatchObject({
        type: "EMERALD",
        origin: "NATURAL",
        shape: "Emerald",
        sizeMm: 6.5,
      });
    });

    it("normalizes legacy wrapper { gemstones: [...] } into a canonical array", async () => {
      const res = await validateCreate({
        ...baseValidCreate,
        gemstones: {
          gemstones: [
            {
              type: "RUBY",
              origin: "NATURAL",
              shape: "Cushion",
              caratWeight: 2.0,
              valueNpr: 60000,
            },
          ],
        },
      });
      expect(Array.isArray(res.gemstones)).toBe(true);
      expect(res.gemstones).toHaveLength(1);
      expect(res.gemstones![0]).toBeInstanceOf(InventoryGemstoneDto);
      expect(res.gemstones![0]).toMatchObject({
        type: "RUBY",
        shape: "Cushion",
        caratWeight: 2.0,
      });
    });

    it("rejects string gemstones with HTTP 400", async () => {
      await expect(
        validateCreate({ ...baseValidCreate, gemstones: "DIAMOND" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects number gemstones with HTTP 400", async () => {
      await expect(
        validateCreate({ ...baseValidCreate, gemstones: 12345 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects boolean gemstones with HTTP 400", async () => {
      await expect(
        validateCreate({ ...baseValidCreate, gemstones: true }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects invalid qualityTier with HTTP 400", async () => {
      await expect(
        validateCreate({
          ...baseValidCreate,
          gemstones: [{ type: "DIAMOND", qualityTier: "SUPER_PREMIUM" }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects negative caratWeight or sizeMm with HTTP 400", async () => {
      await expect(
        validateCreate({
          ...baseValidCreate,
          gemstones: [{ type: "DIAMOND", caratWeight: -0.5 }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        validateCreate({
          ...baseValidCreate,
          gemstones: [{ type: "RUBY", sizeMm: 0 }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects count 0 or count exceeding max limit with HTTP 400", async () => {
      await expect(
        validateCreate({
          ...baseValidCreate,
          gemstones: [{ type: "DIAMOND", count: 0 }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        validateCreate({
          ...baseValidCreate,
          gemstones: [{ type: "DIAMOND", count: 10001 }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("UpdateInventoryItemDto gemstones", () => {
    it("accepts omitted and empty gemstones array on update", async () => {
      const res1 = await validateUpdate({ nameEn: "Updated" });
      expect(res1.gemstones).toBeUndefined();

      const res2 = await validateUpdate({ gemstones: [] });
      expect(res2.gemstones).toEqual([]);
    });

    it("normalizes single gemstone object and wrapper on update", async () => {
      const res1 = await validateUpdate({
        gemstones: { type: "DIAMOND", shape: "Round", caratWeight: 1.0 },
      });
      expect(Array.isArray(res1.gemstones)).toBe(true);
      expect(res1.gemstones![0]).toBeInstanceOf(InventoryGemstoneDto);
      expect(res1.gemstones![0].type).toBe("DIAMOND");

      const res2 = await validateUpdate({
        gemstones: {
          gemstones: [{ type: "SAPPHIRE", sizeMm: 5.0, count: 1 }],
        },
      });
      expect(Array.isArray(res2.gemstones)).toBe(true);
      expect(res2.gemstones![0]).toBeInstanceOf(InventoryGemstoneDto);
      expect(res2.gemstones![0].type).toBe("SAPPHIRE");
    });

    it("rejects scalars and invalid fields on update", async () => {
      await expect(
        validateUpdate({ gemstones: "invalid" }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        validateUpdate({ gemstones: [{ type: "DIAMOND", caratWeight: -1 }] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

describe("UpdateInventoryItemDto SET discount validation", () => {
  it("rejects unsupported discount types", async () => {
    await expect(
      validateUpdate({ setDiscountType: "TIERED" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects negative discount values", async () => {
    await expect(
      validateUpdate({ setDiscountValue: -0.01 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(["PERCENT", "FIXED"])(
    "accepts the %s SET discount type",
    async (setDiscountType) => {
      await expect(
        validateUpdate({ setDiscountType, setDiscountValue: 0 }),
      ).resolves.toMatchObject({ setDiscountType, setDiscountValue: 0 });
    },
  );

  it("preserves explicit null clears and omitted update values", async () => {
    await expect(
      validateUpdate({ setDiscountType: null, setDiscountValue: null }),
    ).resolves.toMatchObject({ setDiscountType: null, setDiscountValue: null });

    const omitted = await validateUpdate({});
    expect(omitted).not.toHaveProperty("setDiscountType");
    expect(omitted).not.toHaveProperty("setDiscountValue");
  });
});
