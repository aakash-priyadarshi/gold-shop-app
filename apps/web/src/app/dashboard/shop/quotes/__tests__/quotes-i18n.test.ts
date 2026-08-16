import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

describe("quotes list i18n leftovers", () => {
  it("wraps page chrome in <T> so walk-in quotes is not English-only", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/dashboard/shop/quotes/page.tsx"),
      "utf-8",
    );
    expect(source).toContain('from "@/components/ui/T"');
    expect(source).toContain("<T>Walk-in Quotes</T>");
    expect(source).toContain("<T>New Walk-in Quote</T>");
    expect(source).toContain("<T>Total Quotes</T>");
    expect(source).toContain("<T>View Details</T>");
    expect(source).toContain("getJewelleryTypeLabel");
    expect(source).toContain("LANGUAGES[locale].intlLocale");
  });
});
