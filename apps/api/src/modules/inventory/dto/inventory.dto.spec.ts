import "reflect-metadata";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { UpdateInventoryItemDto } from "./inventory.dto";

const validationPipe = new ValidationPipe({ transform: true, whitelist: true });

function validateUpdate(body: Record<string, unknown>) {
  return validationPipe.transform(body, {
    type: "body",
    metatype: UpdateInventoryItemDto,
  });
}

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
