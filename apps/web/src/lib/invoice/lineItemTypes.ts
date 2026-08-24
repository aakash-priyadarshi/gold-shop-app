/** Shared invoice line types used by desktop + mobile create flows. */

export type InvoiceLineSource = "MANUAL" | "CATALOG" | "QUOTE" | "POS";

export type MetalPart = {
  metalType: string;
  weightG: number;
  label?: string;
};

export interface GemstoneEntry {
  type: string;
  cut: string;
  clarity: string;
  caratWeight: string;
  color: string;
  cost: string;
  quality?: string;
  origin?: string;
  sizeMm?: number | string;
  count?: number | string;
  cutGrade?: string;
  lab?: string;
  certNumber?: string;
  reportUrl?: string;
  sourceItemLabel?: string;
}

export interface RichLineItem {
  label: string;
  category: string;
  quantity: number;
  details: string;
  metalType: string;
  metalWeightG: string;
  metalCost: string;
  gemstones: GemstoneEntry[];
  makingCost: string;
  /** Snapshot of catalog/quote making when imported */
  baseMakingCost?: string;
  metalParts?: MetalPart[];
  inventoryItemId?: string;
  variantId?: string;
  source?: InvoiceLineSource;
  wastagePercent?: string;
  wastageCost?: string;
  baseWastagePercent?: string;
  isSet?: boolean;
  setDiscountType?: "PERCENT" | "FIXED";
  setDiscountValue?: number;
  setDiscountAmount?: number;
}

export type TaxCategoryKey =
  | "PRECIOUS_METAL"
  | "MAKING_CHARGE"
  | "GEMSTONE"
  | "FINISH";

export interface CountryTaxConfig {
  taxType: string;
  taxName: string;
  rates: Record<TaxCategoryKey, number>;
  defaultRate: number;
}

export interface InvoiceTaxBreakdown {
  metalTax: number;
  gemstoneTax: number;
  makingTax: number;
  wastageTax: number;
  totalTax: number;
}

export const METAL_TYPES = [
  { value: "GOLD_24K", label: "Gold 24K (999)" },
  { value: "GOLD_22K", label: "Gold 22K (916)" },
  { value: "GOLD_18K", label: "Gold 18K (750)" },
  { value: "GOLD_14K", label: "Gold 14K (585)" },
  { value: "SILVER_999", label: "Silver 999" },
  { value: "SILVER_925", label: "Silver 925 (Sterling)" },
  { value: "PLATINUM_950", label: "Platinum 950" },
  { value: "PLATINUM_900", label: "Platinum 900" },
] as const;

import {
  CANONICAL_GEMSTONE_TYPES,
  CANONICAL_GEMSTONE_CUTS,
  CANONICAL_GEMSTONE_CLARITIES,
  CANONICAL_GEMSTONE_COLORS,
  CANONICAL_GEMSTONE_CUT_GRADES,
  CANONICAL_GEMSTONE_LABS,
  getGemstoneDisplayLabel,
  normalizeGemstoneType,
} from "@gold-shop/shared";

export {
  CANONICAL_GEMSTONE_TYPES,
  CANONICAL_GEMSTONE_CUTS,
  CANONICAL_GEMSTONE_CLARITIES,
  CANONICAL_GEMSTONE_COLORS,
  CANONICAL_GEMSTONE_CUT_GRADES,
  CANONICAL_GEMSTONE_LABS,
  getGemstoneDisplayLabel,
  normalizeGemstoneType,
};

export const GEMSTONE_TYPES = CANONICAL_GEMSTONE_TYPES;

export const FALLBACK_CATEGORY_TAX_RATES: Record<
  string,
  CountryTaxConfig
> = {
  NP: {
    taxType: "VAT",
    taxName: "VAT + Skill Fee",
    rates: {
      PRECIOUS_METAL: 0.005,
      MAKING_CHARGE: 0.005,
      GEMSTONE: 0.13,
      FINISH: 0.005,
    },
    defaultRate: 0.005,
  },
  IN: {
    taxType: "GST",
    taxName: "GST",
    rates: {
      PRECIOUS_METAL: 0.03,
      MAKING_CHARGE: 0.05,
      GEMSTONE: 0.03,
      FINISH: 0.03,
    },
    defaultRate: 0.03,
  },
  LK: {
    taxType: "VAT",
    taxName: "VAT",
    rates: {
      PRECIOUS_METAL: 0.18,
      MAKING_CHARGE: 0.18,
      GEMSTONE: 0.18,
      FINISH: 0.18,
    },
    defaultRate: 0.18,
  },
  AE: {
    taxType: "VAT",
    taxName: "VAT",
    rates: {
      PRECIOUS_METAL: 0.05,
      MAKING_CHARGE: 0.05,
      GEMSTONE: 0.05,
      FINISH: 0.05,
    },
    defaultRate: 0.05,
  },
  GB: {
    taxType: "VAT",
    taxName: "VAT",
    rates: {
      PRECIOUS_METAL: 0.2,
      MAKING_CHARGE: 0.2,
      GEMSTONE: 0.2,
      FINISH: 0.2,
    },
    defaultRate: 0.2,
  },
  US: {
    taxType: "SALES_TAX",
    taxName: "Sales Tax",
    rates: {
      PRECIOUS_METAL: 0,
      MAKING_CHARGE: 0,
      GEMSTONE: 0,
      FINISH: 0,
    },
    defaultRate: 0,
  },
};

export function emptyGemstone(): GemstoneEntry {
  return {
    type: "",
    cut: "",
    clarity: "",
    caratWeight: "",
    color: "",
    cost: "",
  };
}

export function emptyLineItem(): RichLineItem {
  return {
    label: "",
    category: "RING",
    quantity: 1,
    details: "",
    metalType: "",
    metalWeightG: "",
    metalCost: "",
    gemstones: [],
    makingCost: "",
    source: "MANUAL",
    wastagePercent: "",
    wastageCost: "",
    baseWastagePercent: "",
  };
}
