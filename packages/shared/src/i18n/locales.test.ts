import { describe, expect, it } from "vitest";
import {
  getLocaleDirection,
  isUiLocale,
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
});
