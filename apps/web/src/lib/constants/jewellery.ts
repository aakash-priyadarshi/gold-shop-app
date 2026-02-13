/**
 * Shared Jewellery Constants
 *
 * Single source of truth for jewellery types, build methods, surface finishes,
 * and weight guidance used across customer RFQ, seller RFQ, walk-in quotes, etc.
 */

// ═══════════════════════════════════════════
// JEWELLERY TYPES
// ═══════════════════════════════════════════

export const JEWELLERY_TYPES = [
  { value: "RING", label: "Ring" },
  { value: "NECKLACE", label: "Necklace" },
  { value: "BRACELET", label: "Bracelet" },
  { value: "EARRING", label: "Earrings" },
  { value: "PENDANT", label: "Pendant" },
  { value: "BANGLE", label: "Bangle" },
  { value: "CHAIN", label: "Chain" },
  { value: "ANKLET", label: "Anklet" },
  { value: "BROOCH", label: "Brooch" },
  { value: "TIE_PIN", label: "Tie Pin" },
  { value: "CUFFLINKS", label: "Cufflinks" },
  { value: "NOSE_PIN", label: "Nose Pin" },
  { value: "MANGALSUTRA", label: "Mangalsutra" },
  { value: "MAANG_TIKKA", label: "Maang Tikka" },
  { value: "OTHER", label: "Other" },
] as const;

export const JEWELLERY_TYPE_IMAGES: Record<string, string> = {
  RING: "https://images.orivraa.com/product/1769445057895-wcn56633.png",
  NECKLACE: "https://images.orivraa.com/product/1769445053991-4ytp6cgd.png",
  BRACELET: "https://images.orivraa.com/product/1769445045824-zjp8yki3.png",
  EARRING: "https://images.orivraa.com/product/1769445051626-dm5ke087.png",
  PENDANT: "https://images.orivraa.com/product/1769445056509-on5a83b5.png",
  BANGLE: "https://images.orivraa.com/product/1769445043166-phaausjg.png",
  CHAIN: "https://images.orivraa.com/product/1769445050194-b6e62x3n.png",
  ANKLET: "https://images.orivraa.com/product/1769445041034-oa8hfslv.png",
  BROOCH: "https://images.orivraa.com/product/1769445047396-q4pss35p.png",
  TIE_PIN: "https://images.orivraa.com/product/1770654788358-98tpi91v.png",
  CUFFLINKS: "https://images.orivraa.com/product/1770654794011-mbmfttye.png",
  NOSE_PIN: "https://images.orivraa.com/product/1770654801812-rx6d93j5.png",
  MANGALSUTRA: "https://images.orivraa.com/product/1770658985031-60d4dogq.png",
  MAANG_TIKKA: "https://images.orivraa.com/product/1770654756626-gmaz323x.png",
  OTHER: "https://images.orivraa.com/product/1769445057895-wcn56633.png",
};

// ═══════════════════════════════════════════
// SURFACE FINISHES
// ═══════════════════════════════════════════

export const SURFACE_FINISH_IMAGES: Record<
  string,
  { image: string; description: string }
> = {
  HIGH_POLISH: {
    image: "https://images.orivraa.com/product/1769448671129-6anrd5rf.png",
    description: "Mirror-like shine, highly reflective surface",
  },
  MATTE: {
    image: "https://images.orivraa.com/product/1769445064701-hd5jgymd.png",
    description: "Non-reflective, soft appearance",
  },
  BRUSHED: {
    image: "https://images.orivraa.com/product/1769445064701-hd5jgymd.png",
    description: "Non-reflective, soft brushed appearance",
  },
  SATIN: {
    image: "https://images.orivraa.com/product/1769445073480-ji4q1p05.png",
    description: "Subtle sheen between matte and polish",
  },
  HAMMERED: {
    image: "https://images.orivraa.com/product/1769445062183-qd3i944l.png",
    description: "Textured surface with small indentations",
  },
  SANDBLASTED: {
    image: "https://images.orivraa.com/product/1769445070947-3o0y4equ.png",
    description: "Frosted, granular texture",
  },
  FLORENTINE: {
    image: "https://images.orivraa.com/product/1769445064701-hd5jgymd.png",
    description: "Cross-hatched matte texture",
  },
  BARK_TEXTURE: {
    image: "https://images.orivraa.com/product/1769448676427-epn2otmh.png",
    description: "Natural bark-like texture",
  },
  DIAMOND_CUT: {
    image: "https://images.orivraa.com/product/1769448674243-38v0ta17.png",
    description: "Precision faceted cuts for sparkle",
  },
  ENGRAVED: {
    image: "https://images.orivraa.com/product/1769448679035-4xzpm0lm.png",
    description: "Decorative carved patterns",
  },
  POLISHED: {
    image: "https://images.orivraa.com/product/1769448671129-6anrd5rf.png",
    description: "Mirror-like shine, highly reflective surface",
  },
  SANDBLAST: {
    image: "https://images.orivraa.com/product/1769445070947-3o0y4equ.png",
    description: "Frosted, granular texture",
  },
  ANTIQUE: {
    image: "https://images.orivraa.com/product/1769445059769-uqh0w2ze.png",
    description: "Oxidized finish for vintage look",
  },
};

// ═══════════════════════════════════════════
// BUILD METHODS
// ═══════════════════════════════════════════

export const BUILD_METHODS = [
  {
    value: "METHOD_A",
    label: "Method A: Solid Precious Metal",
    shortLabel: "Solid Metal",
    description: "Pure gold, silver, or platinum throughout",
    icon: "🏆",
    color: "amber",
    tooltip: {
      what: "Solid precious metal from core to surface. No plating or coating needed.",
      durability:
        "Highest durability. Can be polished and repaired forever. Maintains value.",
      bestFor: "Investment pieces, heirloom jewellery, daily wear items.",
      care: "Simple cleaning with mild soap. Can be professionally polished.",
      resale: "Highest resale value. Can be melted down and repurposed.",
    },
  },
  {
    value: "METHOD_B",
    label: "Method B: Precious Metal Alloy",
    shortLabel: "Metal Alloy",
    description: "Gold/silver mixed with other metals for durability",
    icon: "🔬",
    color: "blue",
    tooltip: {
      what: "Precious metal alloyed with other metals for color and strength.",
      durability: "Excellent durability. 18K is industry standard.",
      bestFor: "Engagement rings, wedding bands, colored gold pieces.",
      care: "White gold may need rhodium re-plating every 1-2 years.",
      colors: "Yellow Gold, White Gold, Rose Gold, Green Gold.",
    },
  },
  {
    value: "METHOD_C",
    label: "Method C: Base Metal + Plating",
    shortLabel: "Plated",
    description: "Not solid gold. Plated/Coated.",
    icon: "✨",
    color: "green",
    tooltip: {
      what: "Non-precious base metal with a thin gold/silver coating.",
      durability:
        "Plating wears off. Economy: 3-6 months. Standard: 1-2 years. Premium: 2-5 years.",
      bestFor: "Fashion jewellery, trendy pieces, budget-conscious buyers.",
      care: "Avoid water, perfumes, lotions. Remove before sleeping.",
      warning: "⚠️ This is NOT solid gold.",
    },
  },
  {
    value: "METHOD_D",
    label: "Method D: Italian Machine Made",
    shortLabel: "Machine Made",
    description: "Precision machine-made hollow chains and patterns",
    icon: "⚙️",
    color: "purple",
    tooltip: {
      what: "High-precision machinery creates intricate hollow or semi-hollow construction.",
      durability:
        "Good for the weight. Hollow = lighter pieces for same visual size.",
      bestFor: "Chains, hollow bangles, machine-cut patterns.",
      styles: "Hollow Chains, Laser-Cut, Machine-Stamped, Woven",
      advantage: "Up to 50% lighter than solid pieces of the same size.",
    },
  },
] as const;

// ═══════════════════════════════════════════
// WEIGHT GUIDANCE
// ═══════════════════════════════════════════

export const WEIGHT_GUIDANCE: Record<string, { range: string; note: string }> =
  {
    RING: {
      range: "1-7g",
      note: "Women's 1-3g, men's 4-7g. Heavy statement rings up to 15g.",
    },
    NECKLACE: {
      range: "5-30g",
      note: "Simple chains 5-10g, medium pendants 10-20g, heavy 30g+.",
    },
    BRACELET: {
      range: "5-20g",
      note: "Delicate 5-8g, tennis 10-15g, chunky 15-25g.",
    },
    EARRING: {
      range: "1-6g",
      note: "Per pair. Studs 0.5-2g, hoops 1-3g, statement 4-8g.",
    },
    PENDANT: {
      range: "1-10g",
      note: "Excludes chain. Small 1-3g, medium 3-6g, large 8-15g.",
    },
    BANGLE: {
      range: "8-30g",
      note: "Thin 8-12g, medium 15-20g, broad/heavy 25-40g.",
    },
    CHAIN: { range: "5-25g", note: '18" light 5-10g, 24" medium 15-25g.' },
    ANKLET: { range: "2-8g", note: "Simple chains 2-4g, with charms 5-10g." },
    BROOCH: {
      range: "5-20g",
      note: "Small 5-8g, medium 10-15g, elaborate 15-25g.",
    },
    TIE_PIN: { range: "3-8g", note: "Simple 3-5g, with gemstones 5-8g." },
    CUFFLINKS: {
      range: "5-15g",
      note: "Per pair. Simple 5-8g, ornate 10-15g.",
    },
    NOSE_PIN: {
      range: "0.3-2g",
      note: "Studs 0.3-0.5g, hoops 0.5-1g, decorative up to 2g.",
    },
    MANGALSUTRA: {
      range: "10-30g",
      note: "Short 10-15g, medium 15-20g, traditional 25-40g.",
    },
    MAANG_TIKKA: {
      range: "3-10g",
      note: "Simple 3-5g, with stones 5-8g, bridal 8-15g.",
    },
    OTHER: { range: "Varies", note: "Weight depends on the specific item." },
  };

// ═══════════════════════════════════════════
// ALLOY FAMILY COLORS (for visual display)
// ═══════════════════════════════════════════

export const ALLOY_FAMILY_COLORS: Record<
  string,
  { hex: string; label: string }
> = {
  YELLOW_GOLD: { hex: "#FFD700", label: "Yellow Gold" },
  WHITE_GOLD: { hex: "#E8E8E8", label: "White Gold" },
  ROSE_GOLD: { hex: "#B76E79", label: "Rose Gold" },
  GREEN_GOLD: { hex: "#C5D88A", label: "Green Gold" },
};

// ═══════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════

export function getJewelleryTypeLabel(value: string): string {
  return (
    JEWELLERY_TYPES.find((t) => t.value === value)?.label ||
    value.replace(/_/g, " ")
  );
}

export function getBuildMethodInfo(value: string) {
  return BUILD_METHODS.find((m) => m.value === value);
}

export function getSurfaceFinishInfo(value: string) {
  const key = value?.toUpperCase().replace(/\s+/g, "_");
  return SURFACE_FINISH_IMAGES[key] || null;
}
