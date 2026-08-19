import { describe, expect, it } from "vitest";
import { UI_LOCALE_CODES } from "@gold-shop/shared";
import { ABOUT_SUMMARY_CONTENT } from "../about-summary-i18n";
import {
  ABOUT_CONTENT,
  getPublicAboutHref,
  PUBLIC_LANGUAGE_PAGES,
  SUPPORTED_ABOUT_LANGS,
  type Language,
} from "../about-i18n";

describe("public About language routes", () => {
  it("gives every advertised language a real About route", () => {
    expect(Object.keys(PUBLIC_LANGUAGE_PAGES).sort()).toEqual(
      [...UI_LOCALE_CODES].sort(),
    );
    for (const [language, pages] of Object.entries(PUBLIC_LANGUAGE_PAGES)) {
      const expected = language === "en" ? "/about" : `/about/${language}`;
      expect(pages.about, `${language} About route`).toBe(expected);
      expect(getPublicAboutHref(language as Language)).toBe(expected);
      expect(pages.about).not.toContain("/tutorial");
    }
  });

  it("advertises the same language count as the UI locale registry", () => {
    const count = String(UI_LOCALE_CODES.length);
    const localizedCount: Record<string, string> = {
      en: `${count} languages`,
      fr: `${count} langues`,
      de: `${count} Sprachen`,
      hi: `${count} भाषाओं`,
      es: `${count} idiomas`,
      ar: "15 لغة",
      ne: "१५ भाषाहरूमा",
    };

    for (const [locale, content] of Object.entries(ABOUT_CONTENT)) {
      const marker = localizedCount[locale];
      expect(marker, `${locale} language-count phrase`).toBeDefined();
      expect(content.languageGuideDesc).toContain(marker);
    }
  });

  it("does not advertise tutorial pages for locales without video assets", () => {
    expect(PUBLIC_LANGUAGE_PAGES.si.tutorial).toBeUndefined();
    expect(PUBLIC_LANGUAGE_PAGES.he.tutorial).toBeUndefined();
    expect(PUBLIC_LANGUAGE_PAGES.yi.tutorial).toBeUndefined();
    expect(PUBLIC_LANGUAGE_PAGES.hi.tutorial).toBe("/tutorial/hi");
  });

  it("includes every summary page in static generation", () => {
    expect(SUPPORTED_ABOUT_LANGS).toEqual(
      expect.arrayContaining(["gu", "mr", "ta", "te", "kn", "si", "he", "yi"]),
    );
    expect(ABOUT_SUMMARY_CONTENT.mr.metaTitle).toContain("Orivraa");
    expect(ABOUT_SUMMARY_CONTENT.he.metaTitle).toContain("Orivraa");
    expect(ABOUT_SUMMARY_CONTENT.yi.metaTitle).toContain("Orivraa");
  });
});
