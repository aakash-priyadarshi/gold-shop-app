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

  it("recognizes Hebrew and Yiddish as right-to-left app locales", () => {
    expect(parseShopLanguage("he")).toBe("he");
    expect(parseShopLanguage("yi")).toBe("yi");
    expect(LANGUAGES.he.direction).toBe("rtl");
    expect(LANGUAGES.yi.direction).toBe("rtl");
  });
});
