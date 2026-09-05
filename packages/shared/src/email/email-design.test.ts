import { describe, expect, it } from "vitest";
import { parseOfferEmailDesign, OfferEmailRenderer } from "../../dist";

const options = { campaignName: "Product update", brandIconUrl: "https://example.com/icon.png", unsubscribeUrl: "https://example.com/unsubscribe" };
const renderer = new OfferEmailRenderer();
const gallery = { type: "gallery" as const, id: "gallery-1", images: [
  { url: "https://example.com/before.png", alt: "Before", caption: "Before <script>" },
  { url: "https://example.com/after.gif", alt: "After", linkUrl: "https://example.com/demo" },
] };

describe("email studio schema and shared renderer", () => {
  it("preserves legacy designs without injecting new metadata", () => {
    const design = parseOfferEmailDesign({ blocks: [{ type: "heading", text: "  Hello  " }, { type: "divider" }] });
    expect(design).toEqual({ blocks: [{ type: "heading", text: "Hello" }, { type: "divider" }] });
    expect(renderer.render(design.blocks, options).html).toContain("background:#f6f1e6");
  });
  it("round-trips theme, preheader, IDs, gallery and bounded styles", () => {
    const design = parseOfferEmailDesign({ preheader: "  A better workflow  ", theme: "editorial", blocks: [
      { type: "heading", id: "title", text: "New", style: { backgroundColor: "#ffffff", textColor: "#123456", fontSize: 40, padding: 24, fontFamily: "sans", align: "center", radius: 12 } }, gallery,
    ] });
    expect(JSON.parse(JSON.stringify(parseOfferEmailDesign(design)))).toEqual(JSON.parse(JSON.stringify(design)));
    const result = renderer.render(design.blocks, { ...options, ...design });
    expect(result.html).toContain("A better workflow");
    expect(result.html).toContain("background:#193d35");
    expect(result.html).toContain("font-size:40px");
    expect(result.html).toContain("color:#123456");
    expect(result.html).toContain("Before &lt;script&gt;");
    expect(result.html).toContain("max-width:480px");
    expect(result.html).toContain("orv-gallery-cell");
    expect(result.html).not.toContain("data-email-block");
    expect(result.html).not.toMatch(/<script|<video|<iframe|onclick=/i);
    expect(result.bytes).toBe(Buffer.byteLength(result.html, "utf8"));
  });
  it.each([
    { backgroundColor: "red;background:url(https://evil.test)" }, { textColor: '" onmouseover="x' },
    { fontFamily: "url(evil)" }, { padding: 49 }, { radius: -1 }, { fontSize: 200 }, { fontSize: "16" },
    { align: "right" }, { position: "absolute" },
  ])("rejects unsupported or injectable styles: %j", (style) => {
    expect(() => parseOfferEmailDesign({ blocks: [{ type: "heading", text: "Safe", style }] })).toThrow();
  });
  it("drops empty style objects instead of persisting them", () => {
    expect(parseOfferEmailDesign({ blocks: [{ type: "heading", text: "Safe", style: {} }] }).blocks[0]).toEqual({
      type: "heading",
      text: "Safe",
    });
    expect(parseOfferEmailDesign({ blocks: [{ type: "divider" }], preheader: "   " })).not.toHaveProperty("preheader");
  });
  it("rejects unsafe gallery links, invalid IDs, invalid theme and oversized preheader", () => {
    for (const design of [
      { blocks: [{ ...gallery, images: [gallery.images[0]] }] },
      { blocks: [{ ...gallery, images: [gallery.images[0], { url: "javascript:alert(1)", alt: "Bad" }] }] },
      { blocks: [{ ...gallery, images: [gallery.images[0], { url: "https://example.com/a", alt: "", linkUrl: "https://example.com" }] }] },
      { blocks: [{ type: "divider", id: 'a" style="x' }] },
      { blocks: [{ type: "divider", id: "same" }, { type: "divider", id: "same" }] },
      { blocks: [{ type: "divider" }], theme: "custom" },
      { blocks: [{ type: "divider" }], preheader: "x".repeat(181) },
    ]) expect(() => parseOfferEmailDesign(design)).toThrow();
  });
  it("removes all remote image requests in images-off mode and preserves destinations and alt text", () => {
    const { html } = renderer.render([gallery], { ...options, imagesOff: true, editor: true });
    expect(html).not.toContain("<img");
    expect(html).not.toContain("before.png");
    expect(html).toContain('aria-label="Before"');
    expect(html).toContain('href="https://example.com/demo"');
    expect(html).toContain('data-email-block="0"');
  });
  it("pauses CSS animation only for editor mode, keeping the default delivery enhancement", () => {
    const blocks = [{ type: "heading" as const, text: "New", animation: "fadeIn" as const }];
    expect(renderer.render(blocks, options).html).toContain("@keyframes");
    expect(renderer.render(blocks, { ...options, disableAnimations: true }).html).not.toContain("@keyframes");
  });
});
