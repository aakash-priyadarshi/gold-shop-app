import "reflect-metadata";
import { TRANSLATION_TEXT_MAX_LENGTH } from "@gold-shop/shared";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import {
  TranslateBatchDto,
  TRANSLATION_BATCH_MAX_SIZE,
  TRANSLATION_TEXT_MAX_LENGTH as DTO_TEXT_MAX_LENGTH,
} from "./translate.dto";

async function validateBatch(body: unknown) {
  const dto = plainToInstance(TranslateBatchDto, body);
  return validate(dto);
}

describe("TranslateBatchDto", () => {
  it("accepts Hindi and Hebrew locales", async () => {
    expect(
      await validateBatch({ texts: ["Welcome home"], locale: "hi" }),
    ).toHaveLength(0);
    expect(
      await validateBatch({ texts: ["Welcome home"], locale: "he" }),
    ).toHaveLength(0);
  });

  it("allows a dashboard-sized batch that previously exceeded 100 strings", async () => {
    const texts = Array.from({ length: 101 }, (_, i) => `Label ${i}`);
    const errors = await validateBatch({ texts, locale: "hi" });
    expect(errors).toHaveLength(0);
  });

  it("rejects batches over the server ceiling and oversize strings", async () => {
    const tooMany = Array.from(
      { length: TRANSLATION_BATCH_MAX_SIZE + 1 },
      (_, i) => `Label ${i}`,
    );
    const sizeErrors = await validateBatch({ texts: tooMany, locale: "he" });
    expect(sizeErrors.some((error) => error.property === "texts")).toBe(true);

    const tooLong = "x".repeat(TRANSLATION_TEXT_MAX_LENGTH + 1);
    const lengthErrors = await validateBatch({
      texts: [tooLong],
      locale: "hi",
    });
    expect(lengthErrors.some((error) => error.property === "texts")).toBe(true);
  });

  it("rejects an empty texts array", async () => {
    const errors = await validateBatch({ texts: [], locale: "hi" });
    expect(errors.some((error) => error.property === "texts")).toBe(true);
  });

  it("reuses the shared 2000-character text ceiling", () => {
    expect(DTO_TEXT_MAX_LENGTH).toBe(TRANSLATION_TEXT_MAX_LENGTH);
    expect(DTO_TEXT_MAX_LENGTH).toBe(2000);
  });
});
