import {
  isExpectedUploadValidationError,
  readUploadResult,
  validateImageWorkerUrl,
} from "../image-upload";

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

    expect(result).toEqual({
      success: false,
      error: "File too large",
      errorCode: "FILE_TOO_LARGE",
      httpStatus: 413,
    });
    expect(isExpectedUploadValidationError(result)).toBe(true);
  });

  it("turns a non-JSON edge response into a translatable fallback", async () => {
    const result = await readUploadResult(
      new Response("Bad gateway", { status: 502 }),
    );

    expect(result).toEqual({
      success: false,
      error: "Upload failed. Please try again.",
      errorCode: "HTTP_ERROR",
      httpStatus: 502,
    });
  });

  it("handles a null JSON response without accessing payload fields", async () => {
    const result = await readUploadResult(
      new Response("null", {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(result).toEqual({
      success: false,
      error: "Upload failed. Please try again.",
      errorCode: "HTTP_ERROR",
      httpStatus: 502,
    });
  });
});
