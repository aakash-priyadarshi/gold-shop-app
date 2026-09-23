import {
  WorkshopMetalAccountKey,
  WorkshopScalePurpose,
} from "@prisma/client";
import {
  GOLD_SCALE_QUANTUM_GRAMS,
  STONE_SCALE_QUANTUM_GRAMS,
  WORKSHOP_GOLD_995_MATERIAL_KEY,
  WORKSHOP_GOLD_995_PURITY,
} from "@gold-shop/shared";

export const DEFAULT_WORKSHOP_METAL_ACCOUNTS: ReadonlyArray<{
  code: string;
  name: string;
  systemKey: WorkshopMetalAccountKey;
  materialKey: string;
  purity: string;
}> = [
  {
    code: "1100",
    name: "Gold 995 Vault",
    systemKey: WorkshopMetalAccountKey.GOLD995_VAULT,
    materialKey: WORKSHOP_GOLD_995_MATERIAL_KEY,
    purity: WORKSHOP_GOLD_995_PURITY,
  },
  {
    code: "1200",
    name: "Casting Tree WIP",
    systemKey: WorkshopMetalAccountKey.CASTING_TREE_WIP,
    materialKey: WORKSHOP_GOLD_995_MATERIAL_KEY,
    purity: WORKSHOP_GOLD_995_PURITY,
  },
  {
    code: "3000",
    name: "Workshop Opening Equity",
    systemKey: WorkshopMetalAccountKey.OPENING_EQUITY,
    materialKey: WORKSHOP_GOLD_995_MATERIAL_KEY,
    purity: WORKSHOP_GOLD_995_PURITY,
  },
];

export const SCALE_PRECISION_GRAMS: Record<WorkshopScalePurpose, string> = {
  GOLD: GOLD_SCALE_QUANTUM_GRAMS,
  STONE: STONE_SCALE_QUANTUM_GRAMS,
};

export const SESSION_TTL_MS = 15 * 60 * 1000;
