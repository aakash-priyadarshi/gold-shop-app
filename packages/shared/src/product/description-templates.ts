export type ProductDescriptionWeightUnit = "GRAM" | "TOLA";

export type ProductDescriptionGemstone = {
  type?: string;
  cut?: string;
  caratWeight?: number;
};

export type ProductDescriptionSpecs = {
  jewelleryType?: string;
  metalType?: string;
  purity?: string;
  weightGrams?: number;
  weightUnit?: ProductDescriptionWeightUnit;
  gemstones?: ProductDescriptionGemstone[];
};

const TOLA_GRAMS = 11.6638;

const REQUIRED_SPEC_LABELS: Record<
  "jewelleryType" | "metalType" | "weightGrams",
  string
> = {
  jewelleryType: "Jewellery Type",
  metalType: "Metal Type",
  weightGrams: "Total Weight",
};

export function getMissingProductDescriptionSpecs(
  specs: ProductDescriptionSpecs,
): Array<"jewelleryType" | "metalType" | "weightGrams"> {
  const missing: Array<"jewelleryType" | "metalType" | "weightGrams"> = [];
  if (!String(specs.jewelleryType || "").trim()) missing.push("jewelleryType");
  if (!String(specs.metalType || "").trim()) missing.push("metalType");
  if (!(Number(specs.weightGrams) > 0)) missing.push("weightGrams");
  return missing;
}

export function productDescriptionSpecsReady(
  specs: ProductDescriptionSpecs,
): boolean {
  return getMissingProductDescriptionSpecs(specs).length === 0;
}

export function missingProductDescriptionLabels(
  specs: ProductDescriptionSpecs,
): string[] {
  return getMissingProductDescriptionSpecs(specs).map(
    (key) => REQUIRED_SPEC_LABELS[key],
  );
}

export function buildHardcodedProductDescription(
  specs: ProductDescriptionSpecs,
): string {
  if (!productDescriptionSpecsReady(specs)) {
    throw new Error("Jewellery Type, Metal Type, and Total Weight are required");
  }

  const piece = titleCase(String(specs.jewelleryType).replace(/_/g, " "));
  const metal = formatMetal(specs.metalType, specs.purity);
  const weight = formatWeightCopy(
    Number(specs.weightGrams),
    specs.weightUnit || "GRAM",
  );
  const gems = formatGemstones(specs.gemstones);

  const gemClause = gems ? `, ${gems}` : "";
  return `Handcrafted ${metal} ${piece.toLowerCase()} weighing ${weight}${gemClause}. Crafted for daily wear and occasion.`;
}

function formatWeightCopy(
  grams: number,
  unit: ProductDescriptionWeightUnit,
): string {
  if (unit === "TOLA") {
    const tola = grams / TOLA_GRAMS;
    return `${trimNumber(tola)} tola`;
  }
  return `${trimNumber(grams)} g`;
}

function formatMetal(metalType?: string, purity?: string): string {
  const metal = titleCase(String(metalType || "metal").replace(/_/g, " "));
  const purityLabel = String(purity || "").trim();
  if (!purityLabel) return metal.toLowerCase();
  if (metal.toLowerCase() === "gold" || metal.toLowerCase().includes("gold")) {
    return `${purityLabel} ${metal.toLowerCase()}`;
  }
  return `${purityLabel} ${metal.toLowerCase()}`;
}

function formatGemstones(gems?: ProductDescriptionGemstone[]): string {
  const listed = (gems || []).filter((g) => String(g.type || "").trim());
  if (!listed.length) return "";

  const parts = listed.map((g) => {
    const stone = titleCase(String(g.type).replace(/_/g, " "));
    const cut = g.cut ? `${String(g.cut).toLowerCase()} ` : "";
    const carat =
      Number(g.caratWeight) > 0 ? `${trimNumber(Number(g.caratWeight))} ct ` : "";
    return `${carat}${cut}${stone.toLowerCase()}`;
  });

  if (parts.length === 1) return `set with ${parts[0]}`;
  const last = parts.pop();
  return `set with ${parts.join(", ")} and ${last}`;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function trimNumber(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, "");
}
