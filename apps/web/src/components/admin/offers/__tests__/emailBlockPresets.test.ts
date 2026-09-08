import { describe, expect, it } from "vitest";
import { EMAIL_BLOCK_PRESETS } from "../email-builder/emailBlockPresets";

describe("EMAIL_BLOCK_PRESETS", () => {
  it("provides at least three starter layouts with unique ids", () => {
    expect(EMAIL_BLOCK_PRESETS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(EMAIL_BLOCK_PRESETS.map((preset) => preset.id)).size).toBe(
      EMAIL_BLOCK_PRESETS.length,
    );
  });

  it("only uses email-safe block types and https URLs", () => {
    const validTypes = new Set([
      "heading",
      "text",
      "image",
      "video",
      "button",
      "divider",
      "spacer",
    ]);
    for (const preset of EMAIL_BLOCK_PRESETS) {
      expect(preset.blocks.length).toBeGreaterThan(0);
      expect(preset.blocks.length).toBeLessThanOrEqual(40);
      for (const block of preset.blocks) {
        expect(validTypes.has(block.type)).toBe(true);
        for (const value of Object.values(block)) {
          if (
            typeof value === "string" &&
            (value.startsWith("http://") || value.startsWith("https://"))
          ) {
            expect(value.startsWith("https://")).toBe(true);
          }
        }
      }
    }
  });

  it("shows product in action in every preset via media or demo link", () => {
    for (const preset of EMAIL_BLOCK_PRESETS) {
      const hasMedia = preset.blocks.some(
        (block) =>
          block.type === "image" ||
          block.type === "video" ||
          block.type === "button",
      );
      expect(hasMedia).toBe(true);
    }
  });
});
