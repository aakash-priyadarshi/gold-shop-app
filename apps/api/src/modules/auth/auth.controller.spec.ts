import { AuthController } from "./auth.controller";
import { IMAGE_WORKER_TOKEN_TTL_SECONDS } from "../media/image-worker-token";

describe("AuthController image upload token", () => {
  it("marks the identity-specific token response as non-cacheable", async () => {
    const controller = new AuthController(
      {} as any,
      {
        get: jest.fn().mockReturnValue("test-image-worker-secret-012345678901234567890"),
      } as any,
      {} as any,
      {} as any,
    );
    const response = { setHeader: jest.fn() } as any;

    const result = await controller.imageUploadToken(
      { id: "user-1", shopId: "shop-1", role: "SHOPKEEPER" },
      "upload",
      "product",
      response,
    );

    expect(response.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(result).toEqual({
      token: expect.any(String),
      expiresIn: IMAGE_WORKER_TOKEN_TTL_SECONDS,
    });
  });
});
