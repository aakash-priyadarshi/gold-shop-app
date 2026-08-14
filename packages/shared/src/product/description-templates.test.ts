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
  });

  it("lists missing field labels for the UI", () => {
    expect(
      missingProductDescriptionLabels({
        jewelleryType: "",
        metalType: "",
        weightGrams: 0,
      }),
    ).toEqual(["Jewellery type", "Material type", "Material weight"]);
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
