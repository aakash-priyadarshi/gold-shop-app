import { validateImageWorkerUrl } from "../image-upload";

describe("image worker URL validation", () => {
  it("accepts the default HTTPS worker URL", () => {
    expect(validateImageWorkerUrl("https://images.orivraa.com")).toBe(
      "https://images.orivraa.com",
    );
  });

  it.each(["http://images.orivraa.com", "not a url"]) (
    "rejects %s before requesting an upload token",
    (value) => {
      expect(() => validateImageWorkerUrl(value)).toThrow(
        "NEXT_PUBLIC_IMAGE_WORKER_URL must be a valid HTTPS URL",
      );
    },
  );
});
