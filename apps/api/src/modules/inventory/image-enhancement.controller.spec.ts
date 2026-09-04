import { ForbiddenException } from "@nestjs/common";
import { REQUIRED_FEATURE_KEY } from "../core/subscriptions/require-feature.decorator";
import { InventoryController } from "./inventory.controller";

describe("InventoryController image enhancement", () => {
  const enhancement = { enhance: jest.fn() };
  const controller = new InventoryController(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    enhancement as never,
  );

  beforeEach(() => enhancement.enhance.mockReset());

  it("requires the aiImageEnhancement plan feature", () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_FEATURE_KEY,
        controller.enhanceProductImages,
      ),
    ).toEqual(["aiImageEnhancement"]);
  });

  it("rejects a shopkeeper targeting another shop", async () => {
    await expect(
      controller.enhanceProductImages(
        "shop-other",
        "user-1",
        "shop-own",
        { imageUrls: ["https://images.orivraa.com/product/a.jpg"] },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(enhancement.enhance).not.toHaveBeenCalled();
  });
});
