import {
  GEMINI_TRANSLATION_MODELS,
  GEMINI_TRANSLATION_TIMEOUT_MS,
  parseGeminiTranslationArray,
  TranslationService,
} from "./translation.service";
import { SUPPORTED_LOCALES } from "./dto/translate.dto";

function geminiOk(translations: string[]) {
  return {
    ok: true,
    json: async () => ({
      candidates: [
        { content: { parts: [{ text: JSON.stringify(translations) }] } },
      ],
    }),
  };
}

function geminiNotFound() {
  return {
    ok: false,
    status: 404,
    text: async () => '{"error":{"message":"model not found"}}',
  };
}

function createService(apiKey = "test-gemini-key") {
  const redis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
  const prisma = {
    translation: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({}),
    },
    htmlTranslation: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(async (ops: unknown[]) =>
      Promise.all(ops as Promise<unknown>[]),
    ),
  };
  const service = new TranslationService(
    { get: jest.fn().mockReturnValue(apiKey) } as any,
    redis as any,
    prisma as any,
  );
  return { service, redis, prisma };
}

describe("TranslationService locale and persistence safeguards", () => {
  it("accepts Hebrew and keeps Sinhala aligned with the frontend registry", () => {
    expect(SUPPORTED_LOCALES).toEqual(
      expect.arrayContaining(["he", "yi", "si", "hi"]),
    );
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

    await (service as any).saveToDb(
      "he",
      [{ sourceText: "Workshop", translation: "סדנה" }],
      "gemini-2.5-flash",
    );

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
          model: "gemini-2.5-flash",
        }),
        update: expect.objectContaining({
          sourceText: "Workshop",
          translation: "סדנה",
          model: "gemini-2.5-flash",
        }),
      }),
    );
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});

describe("parseGeminiTranslationArray", () => {
  it("accepts a raw JSON array and strips markdown fences", () => {
    expect(parseGeminiTranslationArray('["स्वागत है"]', 1)).toEqual(["स्वागत है"]);
    expect(
      parseGeminiTranslationArray('```json\n["סדנה"]\n```', 1),
    ).toEqual(["סדנה"]);
  });

  it("rejects a length mismatch so English fallbacks are not silently applied", () => {
    expect(() => parseGeminiTranslationArray('["only-one"]', 2)).toThrow(
      /expected array of 2/,
    );
  });
});

describe("TranslationService Gemini model fallback", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("uses Gemini 3.1 Flash-Lite first, with 2.5 Flash as fallback, not retired 2.0", () => {
    expect(GEMINI_TRANSLATION_MODELS[0]).toBe("gemini-3.1-flash-lite");
    expect(GEMINI_TRANSLATION_MODELS).toContain("gemini-2.5-flash");
    expect(GEMINI_TRANSLATION_MODELS).not.toContain("gemini-2.0-flash");
    expect(GEMINI_TRANSLATION_MODELS).not.toContain(
      "gemini-3.1-flash-lite-preview",
    );
  });

  it("falls back to Gemini 2.5 Flash when 3.1 Flash-Lite returns 404", async () => {
    const { service, prisma } = createService();
    global.fetch = jest.fn(async (url: unknown) => {
      const href = String(url);
      if (href.includes("gemini-2.5-flash:")) {
        return geminiOk(["ברוכים הבאים ללוח הבקרה"]) as any;
      }
      return geminiNotFound() as any;
    }) as any;

    const result = await service.translateBatch(
      ["Welcome to your dashboard"],
      "he",
    );

    expect(result.translations).toEqual(["ברוכים הבאים ללוח הבקרה"]);
    expect(result.translated).toEqual([true]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain(
      GEMINI_TRANSLATION_MODELS[0],
    );
    const fallbackBody = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[1][1].body as string,
    );
    expect(fallbackBody.generationConfig.thinkingConfig).toBeUndefined();
    expect(prisma.translation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ model: "gemini-2.5-flash" }),
        update: expect.objectContaining({ model: "gemini-2.5-flash" }),
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("returns English with translated=false when every Gemini model 404s", async () => {
    const { service } = createService();
    global.fetch = jest.fn(async () => geminiNotFound() as any) as any;

    const result = await service.translateBatch(["Welcome home"], "hi");

    expect(result.translations).toEqual(["Welcome home"]);
    expect(result.translated).toEqual([false]);
    expect(global.fetch).toHaveBeenCalledTimes(GEMINI_TRANSLATION_MODELS.length);
  });

  it("aborts a stalled Gemini request and falls back to the next model", async () => {
    const { service } = createService();
    global.fetch = jest.fn(async (url: unknown, init?: RequestInit) => {
      expect(init?.signal).toBeDefined();
      const href = String(url);
      if (href.includes("gemini-3.1-flash-lite:")) {
        const err = new Error("The operation was aborted");
        err.name = "TimeoutError";
        throw err;
      }
      return geminiOk(["स्वागत है"]) as any;
    }) as any;

    const result = await service.translateBatch(["Welcome home"], "hi");

    expect(result.translations).toEqual(["स्वागत है"]);
    expect(result.translated).toEqual([true]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(GEMINI_TRANSLATION_TIMEOUT_MS).toBe(20_000);
  });

  it("translates Hindi with Gemini 3.1 Flash-Lite and minimal thinking", async () => {
    const { service } = createService();
    global.fetch = jest.fn(async () => geminiOk(["स्वागत है घर पर"]) as any) as any;

    const result = await service.translateBatch(["Welcome home"], "hi");

    expect(result.translations).toEqual(["स्वागत है घर पर"]);
    expect(result.translated).toEqual([true]);
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain(
      "gemini-3.1-flash-lite:",
    );
    const body = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body as string,
    );
    expect(body.generationConfig.thinkingConfig).toEqual({
      thinkingLevel: "minimal",
    });
  });
});
