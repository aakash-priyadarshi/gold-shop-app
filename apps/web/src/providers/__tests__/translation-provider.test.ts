import { describe, expect, it } from "vitest";
import {
  getPublicRouteLocale,
  isSuspiciousFallback,
} from "@/lib/i18n/translation-safeguards";

describe("translation provider safeguards", () => {
  it("derives the presentation locale from reviewed public routes", () => {
    expect(getPublicRouteLocale("/about/hi")).toBe("hi");
    expect(getPublicRouteLocale("/tutorial/mr")).toBe("mr");
    expect(getPublicRouteLocale("/about/ar/team")).toBe("ar");
    expect(getPublicRouteLocale("/about")).toBe("en");
    expect(getPublicRouteLocale("/dashboard/shop")).toBeNull();
    expect(getPublicRouteLocale("/about/not-a-locale")).toBeNull();
  });

  it("accepts Hebrew as a route locale for future reviewed public pages", () => {
    expect(getPublicRouteLocale("/about/he")).toBe("he");
  });

  it("rejects long English fallback text but keeps valid short tokens", () => {
    expect(
      isSuspiciousFallback(
        "Could not load workshop tower",
        "Could not load workshop tower",
      ),
    ).toBe(true);
    expect(isSuspiciousFallback("SKU", "SKU")).toBe(false);
    expect(isSuspiciousFallback("Gold", "זהב")).toBe(false);
  });
});
