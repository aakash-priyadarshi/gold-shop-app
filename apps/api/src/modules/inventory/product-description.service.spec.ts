import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AI_CREDIT_COSTS } from "@gold-shop/shared";
import { ProductDescriptionService } from "./product-description.service";

describe("ProductDescriptionService", () => {
  const credits = {
    debitForShopkeeperGeneration: jest.fn(),
    refundCredits: jest.fn(),
  };
  const config = {
    get: jest.fn(),
  };

  const service = new ProductDescriptionService(
    credits as never,
    config as unknown as ConfigService,
  );

  const specs = {
    jewelleryType: "RING",
    metalType: "GOLD",
    purity: "22K",
    weightGrams: 5.5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue("test-key");
    credits.debitForShopkeeperGeneration.mockResolvedValue({
      skipped: false,
      balanceAfter: 99.75,
    });
    credits.refundCredits.mockResolvedValue({});
  });

  it("rejects incomplete specs before debiting", async () => {
    await expect(
      service.generateAiDescription({
        userId: "u1",
        shopId: "s1",
        specs: { jewelleryType: "RING", metalType: "GOLD", weightGrams: 0 },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(credits.debitForShopkeeperGeneration).not.toHaveBeenCalled();
  });

  it("debits 0.25 credits and refunds when Gemini fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "boom",
    }) as unknown as typeof fetch;

    await expect(
      service.generateAiDescription({
        userId: "u1",
        shopId: "s1",
        specs,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(credits.debitForShopkeeperGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: AI_CREDIT_COSTS.PRODUCT_DESCRIPTION,
        reason: "product_description",
      }),
    );
    expect(credits.refundCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: AI_CREDIT_COSTS.PRODUCT_DESCRIPTION,
        reason: "product_description_failed",
      }),
    );
  });
});
