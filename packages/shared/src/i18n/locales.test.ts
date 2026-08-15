import { describe, expect, it } from "vitest";
import { TRANSLATION_TEXT_MAX_LENGTH } from "./translation";
import {
  filterLocaleGroups,
  getLocaleDirection,
  isUiLocale,
  LOCALE_GROUPS,
  LOCALE_REGISTRY,
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
});

describe("translation batch limits", () => {
  it("exports a single 2000-character text ceiling for API and web", () => {
    expect(TRANSLATION_TEXT_MAX_LENGTH).toBe(2000);
  });
});
