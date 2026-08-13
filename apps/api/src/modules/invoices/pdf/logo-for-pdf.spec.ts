import { isPdfKitImage, isWebp } from "./logo-for-pdf";

describe("logo-for-pdf magic bytes", () => {
  it("detects PNG", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(isPdfKitImage(png)).toBe(true);
    expect(isWebp(png)).toBe(false);
  });

  it("detects JPEG", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(isPdfKitImage(jpeg)).toBe(true);
  });

  it("detects WebP even when named like a png", () => {
    const webp = Buffer.from("RIFF....WEBP", "ascii");
    // RIFF (4) + size (4) + WEBP (4)
    const buf = Buffer.alloc(12);
    buf.write("RIFF", 0);
    buf.write("WEBP", 8);
    expect(isWebp(buf)).toBe(true);
    expect(isPdfKitImage(buf)).toBe(false);
    expect(webp.length).toBeGreaterThan(0);
  });
});
