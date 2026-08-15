import { TRANSLATION_TEXT_MAX_LENGTH } from "@gold-shop/shared";
import { describe, expect, it } from "vitest";
import {
  chunkTranslationTexts,
  mapPreparedResultsToOriginals,
  mergeTranslationResponse,
  prepareTranslationBatch,
  TRANSLATION_BATCH_CHUNK_SIZE,
  TRANSLATION_MAX_TEXT_LENGTH,
  translationBatchErrorDetail,
} from "../translation-batch";

describe("prepareTranslationBatch", () => {
  it("trims, drops empties and oversize strings, and dedupes in first-seen order", () => {
    const tooLong = "x".repeat(2001);
    expect(
      prepareTranslationBatch([
        "  Welcome home  ",
        "",
        "Welcome home",
        tooLong,
        "Shop currency",
        "   ",
      ]),
    ).toEqual({
      unique: ["Welcome home", "Shop currency"],
      aliases: {
        "Welcome home": ["  Welcome home  ", "Welcome home"],
        "Shop currency": ["Shop currency"],
      },
      dropped: ["", tooLong, "   "],
    });
  });
});

describe("mapPreparedResultsToOriginals", () => {
  it("writes dictionary and cooldown keys for every raw alias, including dropped texts", () => {
    const prepared = prepareTranslationBatch([
      "  Welcome home  ",
      "Welcome home",
      "   ",
    ]);
    const mapped = mapPreparedResultsToOriginals(
      prepared.aliases,
      { "Welcome home": "ברוכים הבאים הביתה" },
      [],
      prepared.dropped,
    );

    expect(mapped.confirmed).toEqual({
      "  Welcome home  ": "ברוכים הבאים הביתה",
      "Welcome home": "ברוכים הבאים הביתה",
    });
    expect(mapped.failed).toEqual(["   "]);
    expect(mapped.confirmed["  Welcome home  "]).toBe(
      mapped.confirmed["Welcome home"],
    );
  });

  it("keeps the web client on the shared 2000-character ceiling", () => {
    expect(TRANSLATION_MAX_TEXT_LENGTH).toBe(TRANSLATION_TEXT_MAX_LENGTH);
  });
});

describe("chunkTranslationTexts", () => {
  it("keeps dashboard-sized batches under the previous API limit of 100", () => {
    const texts = Array.from({ length: 101 }, (_, i) => `Label ${i}`);
    const chunks = chunkTranslationTexts(texts);
    expect(TRANSLATION_BATCH_CHUNK_SIZE).toBeLessThanOrEqual(100);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(TRANSLATION_BATCH_CHUNK_SIZE);
    expect(chunks[1]).toHaveLength(101 - TRANSLATION_BATCH_CHUNK_SIZE);
    expect(chunks.every((chunk) => chunk.length <= 100)).toBe(true);
  });

  it("returns no chunks for an empty list", () => {
    expect(chunkTranslationTexts([])).toEqual([]);
  });

  it("splits a 150-string dashboard flush into two API requests", () => {
    const texts = Array.from({ length: 150 }, (_, i) => `Label ${i}`);
    const chunks = chunkTranslationTexts(texts);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].length + chunks[1].length).toBe(150);
    expect(chunks[0][0]).toBe("Label 0");
    expect(chunks[1][0]).toBe(`Label ${TRANSLATION_BATCH_CHUNK_SIZE}`);
  });
});

describe("mergeTranslationResponse", () => {
  it("keeps confirmed Hindi/Hebrew translations and marks English fallbacks failed", () => {
    const merged = mergeTranslationResponse(
      ["Welcome home", "Shop currency", "Open settings"],
      ["स्वागत है", "Shop currency", "פתח הגדרות"],
      [true, false, true],
    );
    expect(merged.confirmed).toEqual({
      "Welcome home": "स्वागत है",
      "Open settings": "פתח הגדרות",
    });
    expect(merged.failed).toEqual(["Shop currency"]);
  });

  it("treats missing translated flags as a comparison against the source", () => {
    const merged = mergeTranslationResponse(
      ["Welcome home"],
      ["Welcome home"],
      undefined,
    );
    expect(merged.confirmed).toEqual({});
    expect(merged.failed).toEqual(["Welcome home"]);
  });
});

describe("translationBatchErrorDetail", () => {
  it("surfaces axios-style 400 response bodies for console diagnosis", () => {
    expect(
      translationBatchErrorDetail({
        response: { status: 400, data: { message: "texts must not exceed 100" } },
      }),
    ).toEqual({
      status: 400,
      data: { message: "texts must not exceed 100" },
    });
  });
});
