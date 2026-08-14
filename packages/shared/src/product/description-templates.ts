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

const PIECE_COPY: Record<string, string> = {
  RING: "A ring stays on the hand through work, prayer, and celebration, which is why families still choose one for engagement, marriage, and everyday promise.",
  NECKLACE:
    "A necklace sits at the neckline, so it is the piece people notice first at a wedding, a festival, or a dressed evening.",
  PENDANT:
    "A pendant is small enough for every day and clear enough to gift — wear it alone or on a chain already at home.",
  EARRING:
    "Earrings frame the face from morning to function, light enough for daily wear and bright enough when guests are expected.",
  EARRINGS:
    "Earrings frame the face from morning to function, light enough for daily wear and bright enough when guests are expected.",
  BRACELET:
    "A bracelet moves with the wrist. It works alone in the shop and office, and it stacks when the customer wants more presence for a function.",
  BANGLE:
    "Bangles belong to wedding sets, festive wear, and the everyday pair kept on the stand at home — they are meant to be heard as well as seen.",
  CHAIN:
    "A chain is the everyday metal people rarely take off, simple on its own and ready to hold a pendant later.",
  ANKLET:
    "An anklet is a traditional finishing touch for festive and bridal dressing, light on the foot and noticed when you walk.",
  BROOCH:
    "A brooch pins one heirloom accent onto a saree, shawl, or coat when a full set is more than the occasion needs.",
  NOSE_PIN:
    "A nose pin is a classic detail for brides and for daily wear — small, central to the face, and easy to match with other jewellery.",
  MAANG_TIKKA:
    "A maang tikka is made for bridal and festive dressing, resting at the hairline so the whole look reads as ceremony.",
  SET: "A set is meant to be worn together so the metal and finish match across the occasion, from the house to the wedding hall.",
};

const DEFAULT_PIECE_COPY =
  "This piece is made for both daily wear and occasion, ready for the tray or for an outfit that needs one finished detail.";

const METAL_COPY: Record<"gold" | "silver" | "platinum" | "other", string> = {
  gold: "Gold keeps a warm colour in the shop and in sunlight, and it is still the metal families buy for marriage, gifting, and keeping.",
  silver:
    "Silver has a cooler shine that suits oxidised traditional work and plain modern shapes, and it is comfortable for everyday wear.",
  platinum:
    "Platinum stays naturally white without plating, feels dense on the skin, and holds a setting firmly over years of wear.",
  other:
    "The metal is polished for regular wear and will take a cloth at the counter when it needs to look tended again.",
};

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

  return [
    `Handcrafted ${metal} ${piece.toLowerCase()} weighing ${weight}${gemClause}.`,
    pieceOccasionCopy(specs.jewelleryType),
    metalCharacterCopy(specs.metalType),
  ].join(" ");
}

function pieceOccasionCopy(jewelleryType?: string): string {
  const key = String(jewelleryType || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  return PIECE_COPY[key] || DEFAULT_PIECE_COPY;
}

function metalFamily(
  metalType?: string,
): "gold" | "silver" | "platinum" | "other" {
  const metal = String(metalType || "").toUpperCase();
  if (metal.includes("PLATINUM") || metal.includes("PALLADIUM")) {
    return "platinum";
  }
  if (metal.includes("SILVER")) return "silver";
  if (metal.includes("GOLD")) return "gold";
  return "other";
}

function metalCharacterCopy(metalType?: string): string {
  return METAL_COPY[metalFamily(metalType)];
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
