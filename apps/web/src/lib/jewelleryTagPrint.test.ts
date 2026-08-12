import { describe, expect, it } from "vitest";
import {
  buildCode39Svg,
  getTagQrPayload,
  TAG_LAYOUTS,
} from "./jewelleryTagPrint";

describe("jewellery tag identities", () => {
  it("encodes the immutable inventory id in a QR payload", () => {
    expect(getTagQrPayload({ id: "item-12345678", sku: "RING-001" }))
      .toBe("orivraa:inventory:item-12345678");
  });

  it("falls back to the SKU for tags created before an id is available", () => {
    expect(getTagQrPayload({ sku: "RING-001" })).toBe("RING-001");
  });

  it("renders a local Code 39 barcode without executable markup", () => {
    const svg = buildCode39Svg("ring/001");
    expect(svg).toContain("<svg");
    expect(svg).toContain("<rect");
    expect(svg).not.toContain("<script");
  });

  it("offers A4 and continuous thermal layouts", () => {
    expect(TAG_LAYOUTS.some((layout) => layout.id === "A4_3X7")).toBe(true);
    expect(TAG_LAYOUTS.some((layout) => layout.id === "THERMAL_50X25")).toBe(true);
  });
});
