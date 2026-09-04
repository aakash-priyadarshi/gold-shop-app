import { ForbiddenException } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import {
  IMAGE_WORKER_TOKEN_TTL_SECONDS,
  verifyImageWorkerTokenSignature,
} from "../media/image-worker-token";

const TEST_SECRET = "test-image-worker-secret-012345678901234567890";

function buildController() {
  return new AuthController(
    {} as any,
    {
      get: jest.fn().mockReturnValue(TEST_SECRET),
    } as any,
    {} as any,
    {} as any,
  );
}

function decodeTokenPayload(token: string): Record<string, unknown> {
  return JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
  );
}

describe("AuthController image upload token", () => {
  it("marks the identity-specific token response as non-cacheable", async () => {
    const controller = buildController();
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

  it("refuses the email upload type to non-admin callers", async () => {
    const controller = buildController();

    await expect(
      controller.imageUploadToken(
        { id: "user-2", shopId: "shop-1", role: "SHOPKEEPER" },
        "upload",
        "email",
        { setHeader: jest.fn() } as any,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("signs an email-scoped token for admin callers", async () => {
    const controller = buildController();
    const response = { setHeader: jest.fn() } as any;

    const result = await controller.imageUploadToken(
      { id: "admin-1", shopId: null, role: "ADMIN" },
      "upload",
      "email",
      response,
    );

    expect(verifyImageWorkerTokenSignature(result.token, TEST_SECRET)).toBe(
      true,
    );
    expect(decodeTokenPayload(result.token)).toEqual(
      expect.objectContaining({
        sub: "admin-1",
        role: "ADMIN",
        op: "upload",
        uploadType: "email",
      }),
    );
  });
});
