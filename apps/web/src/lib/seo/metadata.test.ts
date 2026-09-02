import { absolutePageTitle, brandPageTitle } from "./metadata";

describe("brandPageTitle", () => {
  it("adds the brand once for unbranded titles", () => {
    expect(brandPageTitle("Jewellery Shop Software with Mobile POS")).toBe(
      "Jewellery Shop Software with Mobile POS | Orivraa",
    );
  });

  it("does not double-append when the title already names Orivraa", () => {
    expect(
      brandPageTitle("Orivraa - Jewellery ERP, POS Software & Bullion Tracker"),
    ).toBe("Orivraa - Jewellery ERP, POS Software & Bullion Tracker");
    expect(brandPageTitle("About Orivraa | Orivraa")).toBe("About Orivraa");
  });

  it("strips a trailing 2026 brand suffix before branding once", () => {
    expect(brandPageTitle("Mobile POS | Orivraa 2026")).toBe(
      "Mobile POS | Orivraa",
    );
  });

  it("returns an absolute Next.js title object", () => {
    expect(absolutePageTitle("Privacy Policy")).toEqual({
      absolute: "Privacy Policy | Orivraa",
    });
  });
});
