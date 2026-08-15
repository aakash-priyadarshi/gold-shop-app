import { describe, expect, it } from "vitest";
import { parseShopLanguage } from "../presentation-locale";
import { LANGUAGES } from "../preferences";

describe("parseShopLanguage", () => {
  it("accepts known shop languages", () => {
    expect(parseShopLanguage("en")).toBe("en");
    expect(parseShopLanguage("ne")).toBe("ne");
    expect(parseShopLanguage("hi")).toBe("hi");
  });

  it("falls back to English for missing or unknown values", () => {
    expect(parseShopLanguage(undefined)).toBe("en");
    expect(parseShopLanguage("")).toBe("en");
    expect(parseShopLanguage("en-US")).toBe("en");
  });

  it("recognizes Hebrew as a right-to-left app locale", () => {
    expect(parseShopLanguage("he")).toBe("he");
    expect(LANGUAGES.he.direction).toBe("rtl");
  });
});
