import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ImageEnhancementService } from "./image-enhancement.service";

const SOURCE_BYTES = Buffer.alloc(256, 1);
const OUTPUT_BASE64 = Buffer.alloc(1_024, 2).toString("base64");

function imageResponse() {
  return new Response(SOURCE_BYTES, {
    status: 200,
    headers: { "content-type": "image/jpeg" },
  });
}

function geminiResponse(payload?: Record<string, unknown>) {
  return new Response(
    JSON.stringify(
      payload || {
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: "image/png",
                    data: OUTPUT_BASE64,
                  },
                },
              ],
            },
          },
        ],
      },
    ),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("ImageEnhancementService", () => {
  const aiCredits = {
    debitForShopkeeperGeneration: jest.fn(),
    refundCredits: jest.fn(),
  };
  const imageUpload = { uploadDataUrl: jest.fn() };
  const config = {
    get: jest.fn((key: string) => {
      if (key === "GEMINI_API_KEY") return "test-key";
      if (key === "IMAGE_WORKER_URL") return "https://images.orivraa.com";
      return undefined;
    }),
  } as unknown as ConfigService;
  let service: ImageEnhancementService;

  beforeEach(() => {
    jest.restoreAllMocks();
    aiCredits.debitForShopkeeperGeneration.mockReset().mockResolvedValue({
      skipped: false,
      ledgerEntry: {},
      balanceAfter: 86,
    });
    aiCredits.refundCredits.mockReset().mockResolvedValue({ balanceAfter: 93 });
    imageUpload.uploadDataUrl.mockReset().mockResolvedValue(
      "https://images.orivraa.com/product/enhanced.jpg",
    );
    service = new ImageEnhancementService(
      config,
      aiCredits as never,
      imageUpload as never,
    );
    jest.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      return url.includes(":generateContent") ? geminiResponse() : imageResponse();
    });
  });

  it("debits the exact premium batch cost", async () => {
    const result = await service.enhance({
      userId: "user-1",
      shopId: "shop-1",
      model: "nano-banana-pro",
      imageUrls: [
        "https://images.orivraa.com/product/1-a.jpg",
        "https://images.orivraa.com/product/2-b.jpg",
      ],
    });

    expect(aiCredits.debitForShopkeeperGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 14, shopId: "shop-1" }),
    );
    expect(result.creditsCharged).toBe(14);
    expect(result.results).toHaveLength(2);
    expect(aiCredits.refundCredits).not.toHaveBeenCalled();
  });

  it("does not bill sibling reference photos", async () => {
    await service.enhance({
      userId: "user-1",
      shopId: "shop-1",
      model: "nano-banana",
      imageUrls: ["https://images.orivraa.com/product/target.jpg"],
      referenceImageUrls: [
        "https://images.orivraa.com/product/ref-1.jpg",
        "https://images.orivraa.com/product/ref-2.jpg",
      ],
    });

    expect(aiCredits.debitForShopkeeperGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2 }),
    );
  });

  it("refunds only the target whose upload fails", async () => {
    imageUpload.uploadDataUrl
      .mockResolvedValueOnce("https://images.orivraa.com/product/good.jpg")
      .mockRejectedValueOnce(new Error("worker unavailable"));

    const result = await service.enhance({
      userId: "user-1",
      shopId: "shop-1",
      model: "nano-banana",
      imageUrls: [
        "https://images.orivraa.com/product/1-a.jpg",
        "https://images.orivraa.com/product/2-b.jpg",
      ],
    });

    expect(aiCredits.refundCredits).toHaveBeenCalledTimes(1);
    expect(aiCredits.refundCredits).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2, idempotencyKey: expect.stringMatching(/:1$/) }),
    );
    expect(result.creditsRefunded).toBe(2);
    expect(result.balanceAfter).toBe(93);
    expect(result.results.map((item) => item.status)).toEqual(["success", "failed"]);
  });

  it("refunds a safety-blocked target", async () => {
    jest.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      return url.includes(":generateContent")
        ? geminiResponse({ promptFeedback: { blockReason: "SAFETY" } })
        : imageResponse();
    });

    const result = await service.enhance({
      userId: "user-1",
      shopId: "shop-1",
      imageUrls: ["https://images.orivraa.com/product/target.jpg"],
    });

    expect(result.results[0].status).toBe("failed");
    expect(aiCredits.refundCredits).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2 }),
    );
  });

  it.each([
    "http://images.orivraa.com/product/a.jpg",
    "https://example.com/product/a.jpg",
    "https://images.orivraa.com/profile/a.jpg",
    "https://images.orivraa.com/product/a/b.jpg",
    "https://images.orivraa.com/product/../admin.jpg",
    "http://127.0.0.1/product/a.jpg",
  ])("rejects unsafe or non-product URL %s before debit", async (url) => {
    await expect(
      service.enhance({
        userId: "user-1",
        shopId: "shop-1",
        imageUrls: [url],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(aiCredits.debitForShopkeeperGeneration).not.toHaveBeenCalled();
  });
});
