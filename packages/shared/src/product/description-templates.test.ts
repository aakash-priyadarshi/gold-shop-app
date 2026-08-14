import { describe, expect, it } from "vitest";
import {
  buildHardcodedProductDescription,
  getMissingProductDescriptionSpecs,
  missingProductDescriptionLabels,
  productDescriptionSpecsReady,
} from "./description-templates";

describe("product description templates", () => {
  it("requires jewellery type, metal, and weight", () => {
    expect(
      getMissingProductDescriptionSpecs({
        metalType: "GOLD",
        jewelleryType: "",
        weightGrams: 0,
      }),
    ).toEqual(["jewelleryType", "weightGrams"]);
    expect(
      productDescriptionSpecsReady({
        jewelleryType: "RING",
        metalType: "GOLD",
        weightGrams: 5.5,
      }),
    ).toBe(true);
  });

  it("builds an editable hardcoded description from specs", () => {
    const text = buildHardcodedProductDescription({
      jewelleryType: "RING",
      metalType: "GOLD",
      purity: "22K",
      weightGrams: 5.5,
      gemstones: [{ type: "DIAMOND", cut: "Round", caratWeight: 0.5 }],
    });
    expect(text).toContain("22K gold ring");
    expect(text).toContain("5.5 g");
    expect(text).toContain("diamond");
    expect(text.toLowerCase()).toContain("0.5 ct");
    expect(text).toMatch(/engagement|marriage|wedding/i);
    expect(text).toMatch(/warm colour|gifting|keeping/i);
    expect(text.split(". ").length).toBeGreaterThanOrEqual(3);
  });

  it("changes occasion copy for a necklace and metal copy for silver", () => {
    const text = buildHardcodedProductDescription({
      jewelleryType: "NECKLACE",
      metalType: "SILVER",
      purity: "925",
      weightGrams: 12,
    });
    expect(text).toContain("925 silver necklace");
    expect(text).toMatch(/neckline|wedding|festival/i);
    expect(text).toMatch(/cooler shine|everyday wear/i);
    expect(text).not.toMatch(/engagement/i);
  });

  it("describes platinum as a white, dense metal", () => {
    const text = buildHardcodedProductDescription({
      jewelleryType: "EARRING",
      metalType: "PLATINUM",
      weightGrams: 4,
    });
    expect(text).toMatch(/frame the face/i);
    expect(text).toMatch(/naturally white|without plating|dense/i);
  });

  it("lists missing field labels for the UI", () => {
    expect(
      missingProductDescriptionLabels({
        jewelleryType: "",
        metalType: "",
        weightGrams: 0,
      }),
    ).toEqual(["Jewellery Type", "Metal Type", "Total Weight"]);
  });

  it("uses tola when that is the shop display unit", () => {
    const text = buildHardcodedProductDescription({
      jewelleryType: "NECKLACE",
      metalType: "GOLD",
      purity: "22K",
      weightGrams: 11.6638,
      weightUnit: "TOLA",
    });
    expect(text).toContain("1 tola");
  });
});
