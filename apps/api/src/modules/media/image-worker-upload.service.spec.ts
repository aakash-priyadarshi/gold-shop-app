import { ConfigService } from "@nestjs/config";
import { ImageWorkerUploadService } from "./image-worker-upload.service";

const DATA_URL = `data:image/png;base64,${Buffer.alloc(1_024, 3).toString("base64")}`;

describe("ImageWorkerUploadService", () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === "IMAGE_WORKER_URL") return "http://images.orivraa.com";
      if (key === "IMAGE_WORKER_AUTH_SECRET") return "test-secret-must-be-32-chars-min";
      return undefined;
    }),
  } as unknown as ConfigService;

  it("refuses cleartext IMAGE_WORKER_URL and times out uploads", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, url: "https://images.orivraa.com/product/x.png" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const service = new ImageWorkerUploadService(config);

    const url = await service.uploadDataUrl({
      dataUrl: DATA_URL,
      uploadType: "product",
      filenamePrefix: "enhanced",
      subject: "system:test",
    });

    expect(url).toBe("https://images.orivraa.com/product/x.png");
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://images.orivraa.com/upload",
    );
    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    fetchMock.mockRestore();
  });
});
