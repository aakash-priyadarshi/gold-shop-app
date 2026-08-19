import { describe, expect, it } from "vitest";
import { TRANSLATION_TEXT_MAX_LENGTH } from "./translation";
import {
  compareByLocale,
  filterLocaleGroups,
  getLocaleDirection,
  isUiLocale,
  LOCALE_GROUPS,
  LOCALE_REGISTRY,
  sortByLocale,
  UI_LOCALE_CODES,
} from "./locales";

describe("UI locale registry", () => {
  it("defines Hebrew as an RTL locale with Israeli formatting", () => {
    expect(LOCALE_REGISTRY.he).toMatchObject({
      nativeName: "עברית",
      direction: "rtl",
      intlLocale: "he-IL",
    });
    expect(getLocaleDirection("he")).toBe("rtl");
  });

  it("defines Yiddish as an RTL locale grouped with Hebrew", () => {
    expect(LOCALE_REGISTRY.yi).toMatchObject({
      nativeName: "ייִדיש",
      direction: "rtl",
      intlLocale: "yi",
    });
    expect(getLocaleDirection("yi")).toBe("rtl");
    expect(LOCALE_GROUPS.find((group) => group.id === "middle-east")?.locales).toEqual(
      ["ar", "he", "yi"],
    );
  });

  it("sorts Hebrew and Yiddish names in Alef-Bet order", () => {
    const hebrew = sortByLocale(["שרה", "אברהם", "יצחק"], (name) => name, "he");
    expect(hebrew).toEqual(["אברהם", "יצחק", "שרה"]);
    expect(compareByLocale("אברהם", "שרה", "he")).toBeLessThan(0);

    const yiddish = sortByLocale(
      ["שׂרה", "אַבֿרהם", "יצחק"],
      (name) => name,
      "yi",
    );
    expect(yiddish[0].startsWith("אַ") || yiddish[0].startsWith("א")).toBe(true);
    expect(compareByLocale("אַבֿרהם", "שׂרה", "yi")).toBeLessThan(0);
  });

  it("keeps API and frontend locale validation on the same code list", () => {
    expect(UI_LOCALE_CODES).toContain("si");
    expect(isUiLocale("he")).toBe(true);
    expect(isUiLocale("he-IL")).toBe(false);
  });

  it("places every UI locale in exactly one mega-menu group", () => {
    const grouped = LOCALE_GROUPS.flatMap((group) => [...group.locales]);
    expect([...grouped].sort()).toEqual([...UI_LOCALE_CODES].sort());
    expect(new Set(grouped).size).toBe(UI_LOCALE_CODES.length);
  });

  it("filters mega-menu groups by English name, native name, or code", () => {
    const hebrew = filterLocaleGroups("עברית");
    expect(hebrew).toHaveLength(1);
    expect(hebrew[0].locales).toEqual(["he"]);

    const hindi = filterLocaleGroups("hi");
    expect(hindi.some((group) => group.locales.includes("hi"))).toBe(true);
    expect(hindi.every((group) => group.locales.length > 0)).toBe(true);

    expect(filterLocaleGroups("zzzz-not-a-language")).toEqual([]);
  });

  it("falls back to English collation for malformed or unsupported locale tags", () => {
    expect(() => compareByLocale("banana", "apple", "not a locale")).not.toThrow();
    expect(compareByLocale("apple", "banana", "not a locale")).toBe(
      compareByLocale("apple", "banana", "en"),
    );
    expect(compareByLocale("apple", "banana", "xx-YY")).toBe(
      compareByLocale("apple", "banana", "en"),
    );
  });
});

describe("translation batch limits", () => {
  it("exports a single 2000-character text ceiling for API and web", () => {
    expect(TRANSLATION_TEXT_MAX_LENGTH).toBe(2000);
  });
});
