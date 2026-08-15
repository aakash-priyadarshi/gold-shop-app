import { TranslationService } from "./translation.service";
import { SUPPORTED_LOCALES } from "./dto/translate.dto";

describe("TranslationService locale and persistence safeguards", () => {
  it("accepts Hebrew and keeps Sinhala aligned with the frontend registry", () => {
    expect(SUPPORTED_LOCALES).toEqual(expect.arrayContaining(["he", "si"]));
  });

  it("upserts corrected translations instead of preserving stale fallbacks", async () => {
    const upsert = jest.fn().mockReturnValue(Promise.resolve());
    const transaction = jest.fn().mockResolvedValue([]);
    const service = new TranslationService(
      { get: jest.fn().mockReturnValue("") } as any,
      {} as any,
      {
        translation: { upsert },
        $transaction: transaction,
      } as any,
    );

    await (service as any).saveToDb("he", [
      { sourceText: "Workshop", translation: "סדנה" },
    ]);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          locale_sourceHash: {
            locale: "he",
            sourceHash: expect.any(String),
          },
        },
        create: expect.objectContaining({
          locale: "he",
          sourceText: "Workshop",
          translation: "סדנה",
        }),
        update: expect.objectContaining({
          sourceText: "Workshop",
          translation: "סדנה",
        }),
      }),
    );
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
