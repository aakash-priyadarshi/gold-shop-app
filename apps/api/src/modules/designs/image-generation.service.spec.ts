import { ConfigService } from "@nestjs/config";
import { ImageGenerationService } from "./image-generation.service";

describe("ImageGenerationService model selection", () => {
  const config = {
    get: jest.fn((key: string) =>
      key === "GEMINI_API_KEY" ? "test-key" : undefined,
    ),
  } as unknown as ConfigService;
  let service: ImageGenerationService;

  beforeEach(() => {
    service = new ImageGenerationService(config);
    jest.restoreAllMocks();
  });

  it("includes the selected model in the cache hash", () => {
    const base = { jewelryType: "RING", buildMethod: "METHOD_A" };
    expect(
      service.generateSpecHash({ ...base, model: "imagen-fast" }),
    ).not.toBe(
      service.generateSpecHash({ ...base, model: "imagen-ultra" }),
    );
  });

  it("calls the selected Imagen API model", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          predictions: [
            {
              mimeType: "image/png",
              bytesBase64Encoded: Buffer.alloc(1_024, 1).toString("base64"),
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    await service.generateImage({
      jewelryType: "RING",
      buildMethod: "METHOD_A",
      model: "imagen-ultra",
    });

    expect(String(fetchSpy.mock.calls[0][0])).toContain(
      "/imagen-4.0-ultra-generate-001:predict",
    );
  });
});
