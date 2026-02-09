// Shared jewellery type and finish metadata with Cloudflare R2 images
// These images are AI-generated and hosted on Cloudflare R2 CDN — reusable across pages

const CDN = "https://images.orivraa.com/product";

// ── Jewellery Types ─────────────────────────────────────────────────────────

export interface JewelleryTypeInfo {
  value: string;
  label: string;
  image: string;
  description: string;
}

export const JEWELLERY_TYPE_DATA: Record<string, JewelleryTypeInfo> = {
  RING: {
    value: "RING",
    label: "Ring",
    image: `${CDN}/1769445057895-wcn56633.png`,
    description:
      "Finger rings including engagement, wedding, signet, and statement rings. Typically 1–7g.",
  },
  NECKLACE: {
    value: "NECKLACE",
    label: "Necklace",
    image: `${CDN}/1769445053991-4ytp6cgd.png`,
    description:
      "Neck jewellery with decorative elements. Simple chains to heavy statement pieces. 5–30g.",
  },
  PENDANT: {
    value: "PENDANT",
    label: "Pendant",
    image: `${CDN}/1769445056509-on5a83b5.png`,
    description:
      "Decorative pieces that hang from a chain. Excludes the chain itself. 1–10g.",
  },
  EARRING: {
    value: "EARRING",
    label: "Earrings",
    image: `${CDN}/1769445051626-dm5ke087.png`,
    description:
      "Studs, hoops, drops, and danglers worn on the ear. Weight is per pair. 1–6g.",
  },
  BRACELET: {
    value: "BRACELET",
    label: "Bracelet",
    image: `${CDN}/1769445045824-zjp8yki3.png`,
    description:
      "Wrist jewellery including tennis bracelets, cuffs, and link bracelets. 5–20g.",
  },
  BANGLE: {
    value: "BANGLE",
    label: "Bangle",
    image: `${CDN}/1769445043166-phaausjg.png`,
    description:
      "Rigid circular wrist ornaments. Thin bangles 8–12g, broad/heavy up to 40g.",
  },
  CHAIN: {
    value: "CHAIN",
    label: "Chain",
    image: `${CDN}/1769445050194-b6e62x3n.png`,
    description:
      "Plain chains in various styles — rope, curb, figaro, box, etc. 5–25g depending on length.",
  },
  ANKLET: {
    value: "ANKLET",
    label: "Anklet",
    image: `${CDN}/1769445041034-oa8hfslv.png`,
    description:
      "Ankle jewellery, simple chains or with charms and broader designs. 2–8g.",
  },
  BROOCH: {
    value: "BROOCH",
    label: "Brooch",
    image: `${CDN}/1769445047396-q4pss35p.png`,
    description:
      "Decorative pins worn on clothing. Small 5–8g, elaborate designs up to 25g.",
  },
  TIE_PIN: {
    value: "TIE_PIN",
    label: "Tie Pin",
    image: `${CDN}/1769445057895-wcn56633.png`,
    description: "Men's accessory to hold the tie in place. Usually 3–8g.",
  },
  CUFFLINKS: {
    value: "CUFFLINKS",
    label: "Cufflinks",
    image: `${CDN}/1769445057895-wcn56633.png`,
    description:
      "Decorative fasteners for shirt cuffs. Weight per pair, typically 5–15g.",
  },
  NOSE_PIN: {
    value: "NOSE_PIN",
    label: "Nose Pin",
    image: `${CDN}/1769445057895-wcn56633.png`,
    description:
      "Small stud or ring worn on the nose. Very lightweight, 0.3–2g.",
  },
  MAANG_TIKKA: {
    value: "MAANG_TIKKA",
    label: "Maang Tikka",
    image: `${CDN}/1769445057895-wcn56633.png`,
    description:
      "Traditional forehead jewellery worn at the hair parting. 3–10g.",
  },
  OTHER: {
    value: "OTHER",
    label: "Other",
    image: `${CDN}/1769445057895-wcn56633.png`,
    description:
      "Custom or specialty jewellery not covered by other categories.",
  },
};

// ── Surface Finishes ────────────────────────────────────────────────────────

export interface FinishInfo {
  label: string;
  image: string;
  description: string;
}

export const FINISH_DATA: Record<string, FinishInfo> = {
  POLISHED: {
    label: "Polished",
    image: `${CDN}/1769448671129-6anrd5rf.png`,
    description: "Mirror-like shine with a highly reflective surface",
  },
  MATTE: {
    label: "Matte",
    image: `${CDN}/1769445064701-hd5jgymd.png`,
    description: "Non-reflective, soft velvety appearance",
  },
  BRUSHED: {
    label: "Brushed",
    image: `${CDN}/1769445064701-hd5jgymd.png`,
    description: "Fine parallel lines creating a soft, satin-like texture",
  },
  HAMMERED: {
    label: "Hammered",
    image: `${CDN}/1769445062183-qd3i944l.png`,
    description: "Textured surface with small artisan indentations",
  },
  SANDBLASTED: {
    label: "Sandblasted",
    image: `${CDN}/1769445070947-3o0y4equ.png`,
    description: "Frosted, granular texture with a muted sheen",
  },
  RHODIUM_PLATED: {
    label: "Rhodium Plated",
    image: `${CDN}/1769448671129-6anrd5rf.png`,
    description:
      "Bright white coating over white gold/silver for extra shine and scratch resistance",
  },
  ANTIQUE: {
    label: "Antique",
    image: `${CDN}/1769445059769-uqh0w2ze.png`,
    description:
      "Oxidized finish that darkens recesses for a vintage, aged look",
  },
  TWO_TONE: {
    label: "Two Tone",
    image: `${CDN}/1769448674243-38v0ta17.png`,
    description:
      "Combines two metal colours (e.g., yellow + white gold) in one piece",
  },
};
