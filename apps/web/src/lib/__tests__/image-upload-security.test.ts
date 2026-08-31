import { readUploadResult, validateImageWorkerUrl } from "../image-upload";

describe("image worker URL validation", () => {
  it("accepts the default HTTPS worker URL", () => {
    expect(validateImageWorkerUrl("https://images.orivraa.com")).toBe(
      "https://images.orivraa.com",
    );
  });

  it.each(["http://images.orivraa.com", "not a url"])(
    "rejects %s before requesting an upload token",
    (value) => {
      expect(() => validateImageWorkerUrl(value)).toThrow(
        "NEXT_PUBLIC_IMAGE_WORKER_URL must be a valid HTTPS URL",
      );
    },
  );
});

describe("image worker responses", () => {
  it("preserves a useful worker error", async () => {
    const result = await readUploadResult(
      new Response(
        JSON.stringify({ success: false, error: "File too large" }),
        {
          status: 413,
        },
      ),
    );

    expect(result).toEqual({ success: false, error: "File too large" });
  });

  it("turns a non-JSON edge response into a useful error", async () => {
    const result = await readUploadResult(
      new Response("Bad gateway", { status: 502 }),
    );

    expect(result).toEqual({
      success: false,
      error: "Upload service returned HTTP 502",
    });
  });
});
