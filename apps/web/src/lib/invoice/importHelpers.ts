import { calculateLineWastage } from "@gold-shop/shared";
import {
  emptyGemstone,
  emptyLineItem,
  type MetalPart,
  type RichLineItem,
} from "./lineItemTypes";
import { isBlankLine, roundMoney2 } from "./calculateLineTotals";

/** Normalize catalog metal+purity (GOLD + 22K) into invoice codes (GOLD_22K). */
export function normalizeMetalCode(metal: string, purity?: string): string {
  const m = String(metal || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  if (!m) return "";
  if (/^(GOLD|SILVER|PLATINUM|PALLADIUM)_\w+/.test(m)) return m;

  const p = String(purity || "")
    .toUpperCase()
    .replace(/\s+/g, "");
  if (m === "GOLD" || m.startsWith("GOLD")) {
    if (p.includes("24") || p === "999") return "GOLD_24K";
    if (p.includes("22") || p === "916") return "GOLD_22K";
    if (p.includes("18") || p === "750") return "GOLD_18K";
    if (p.includes("14") || p === "585") return "GOLD_14K";
    if (p.includes("10")) return "GOLD_10K";
    return "GOLD_22K";
  }
  if (m === "SILVER" || m.startsWith("SILVER")) {
    if (p.includes("999")) return "SILVER_999";
    return "SILVER_925";
  }
  if (m === "PLATINUM" || m.startsWith("PLATINUM")) {
    if (p.includes("900")) return "PLATINUM_900";
    return "PLATINUM_950";
  }
  return m;
}

export function extractMetalTypeFromComposition(composition: unknown): string {
  if (!composition || typeof composition !== "object") return "";
  const c = composition as Record<string, unknown>;

  for (const key of [
    "preciousMetal",
    "metal",
    "primaryMetal",
    "alloy",
    "coreMetal",
    "standardAlloy",
  ]) {
    if (typeof c[key] === "string" && c[key]) {
      return normalizeMetalCode(
        c[key] as string,
        typeof c.purity === "string" ? (c.purity as string) : undefined,
      );
    }
  }

  const baseAlloy = c.baseAlloy;
  if (baseAlloy && typeof baseAlloy === "object") {
    const ba = baseAlloy as Record<string, unknown>;
    if (typeof ba.metal === "string" && ba.metal) {
      return normalizeMetalCode(
        ba.metal,
        typeof ba.purity === "string" ? ba.purity : undefined,
      );
    }
  }

  return "";
}

export function buildMetalPartsFromCatalogItem(item: any): MetalPart[] {
  const links = Array.isArray(item?.setComponents) ? item.setComponents : [];
  if (
    (item?.jewelleryType === "SET" || item?.composition?.kind === "SET") &&
    links.length > 0
  ) {
    return links
      .map((link: any) => {
        const comp = link.componentItem || link;
        return {
          metalType: extractMetalTypeFromComposition(comp.composition),
          weightG: Number(comp.totalWeightGrams) || 0,
          label: comp.nameEn || comp.sku || "Component",
        };
      })
      .filter((p: MetalPart) => p.weightG > 0);
  }

  const metalType = extractMetalTypeFromComposition(item?.composition);
  const weightG = Number(item?.totalWeightGrams) || 0;
  if (weightG > 0) {
    return [{ metalType, weightG, label: item?.nameEn || item?.sku }];
  }
  return [];
}

export function metalRateBaseKey(metalType: string): string | null {
  const m = String(metalType || "").toUpperCase();
  if (m.startsWith("GOLD")) return "GOLD";
  if (m.startsWith("SILVER")) return "SILVER";
  if (m.startsWith("PLATINUM")) return "PLATINUM";
  return null;
}

export function resolveMetalRatePerGram(
  metalType: string,
  shopPrices: { baseMetalPrices?: Record<string, number> } | null,
  marketRates: { metals?: Record<string, number> } | null,
): number | null {
  if (!metalType) return null;
  const baseKey = metalRateBaseKey(metalType);
  const shopRate =
    shopPrices?.baseMetalPrices?.[metalType] ??
    (baseKey ? shopPrices?.baseMetalPrices?.[baseKey] : undefined);
  if (shopRate && shopRate > 0) return Number(shopRate);

  let live =
    marketRates?.metals?.[metalType] ||
    marketRates?.metals?.[metalType.toLowerCase()];
  if (!live && baseKey && marketRates?.metals) {
    live =
      marketRates.metals[baseKey] ||
      marketRates.metals[baseKey.toLowerCase()];
  }
  return live && Number(live) > 0 ? Number(live) : null;
}

export function calcMetalCostFromParts(
  parts: MetalPart[],
  shopPrices: { baseMetalPrices?: Record<string, number> } | null,
  marketRates: { metals?: Record<string, number> } | null,
): { cost: number; missing: string[]; detailLines: string[] } {
  let cost = 0;
  const missing: string[] = [];
  const detailLines: string[] = [];
  for (const part of parts) {
    if (!part.metalType) {
      missing.push(part.label || "unknown metal");
      continue;
    }
    const rate = resolveMetalRatePerGram(
      part.metalType,
      shopPrices,
      marketRates,
    );
    if (!rate) {
      missing.push(part.metalType);
      continue;
    }
    const lineCost = part.weightG * rate;
    cost += lineCost;
    detailLines.push(
      `${part.label || part.metalType}: ${part.weightG.toFixed(3)}g × ${rate.toFixed(2)}/g = ${lineCost.toFixed(2)}`,
    );
  }
  return { cost: roundMoney2(cost), missing, detailLines };
}

export interface CatalogImportResult {
  line: RichLineItem;
  nextLines: RichLineItem[];
  makingPercent?: number;
  wastagePercent?: number;
  warning?: string;
}

export function importCatalogItem(opts: {
  item: any;
  existingLines: RichLineItem[];
  liveMetalCost?: number;
  liveDetail?: string;
  shopWastagePercent?: number;
}): CatalogImportResult | { error: string } {
  const { item, existingLines } = opts;
  if (
    existingLines.some((li) => li.inventoryItemId && li.inventoryItemId === item.id)
  ) {
    return { error: "This catalog piece is already on the invoice." };
  }

  const metalParts = buildMetalPartsFromCatalogItem(item);
  const metalType =
    metalParts[0]?.metalType ||
    extractMetalTypeFromComposition(item.composition);
  const totalWeightG = metalParts.reduce((s, p) => s + p.weightG, 0);
  const metalCost =
    opts.liveMetalCost != null && opts.liveMetalCost > 0
      ? String(opts.liveMetalCost)
      : String(Number(item.metalCost) || Number(item.costPrice) || "");

  const makingRaw =
    Number(item.makingCharge) ||
    Number(item.makingCost) ||
    Number(item.labourCharge) ||
    0;
  const makingCost = makingRaw > 0 ? String(makingRaw) : "";

  const catalogWastagePct = Number(item.wastagePercent);
  const basePct = Number.isFinite(catalogWastagePct)
    ? Math.max(0, catalogWastagePct)
    : Math.max(0, opts.shopWastagePercent || 0);

  let wastageCost = "";
  const mc = parseFloat(metalCost) || 0;
  if (mc > 0 && basePct > 0) {
    wastageCost = String(
      roundMoney2(
        calculateLineWastage(
          {
            metalCost: mc,
            metalWeightG: totalWeightG,
            wastagePercent: basePct,
          },
          { mode: "WEIGHT_PERCENT", percent: basePct, label: "Wastage" },
        ).wastageCost,
      ),
    );
  }

  const detailBits = [
    item.sku ? `SKU ${item.sku}` : null,
    opts.liveDetail || null,
  ].filter(Boolean);

  const next: RichLineItem = {
    label: item.nameEn || item.sku || "Catalog item",
    category: item.jewelleryType || "RING",
    quantity: 1,
    details: detailBits.join(" · ") || "",
    metalType: String(metalType || ""),
    metalWeightG: totalWeightG > 0 ? String(totalWeightG) : "",
    metalCost,
    gemstones: [],
    makingCost,
    baseMakingCost: makingRaw > 0 ? String(makingRaw) : undefined,
    metalParts: metalParts.length > 0 ? metalParts : undefined,
    inventoryItemId: item.id,
    source: "CATALOG",
    baseWastagePercent: String(basePct),
    wastagePercent: String(basePct),
    wastageCost,
  };

  const kept = existingLines.filter((li) => !isBlankLine(li));
  return {
    line: next,
    nextLines: [...kept, next],
    makingPercent: makingRaw > 0 && mc > 0 ? roundMoney2((makingRaw / mc) * 100) : undefined,
    wastagePercent: basePct,
    warning: !metalType
      ? "This catalog piece has no metal type stored. Edit the product composition."
      : undefined,
  };
}

export interface ShopQuoteImportResult {
  line: RichLineItem;
  customer: {
    name?: string;
    phone?: string;
    phoneCountryCode?: string;
    email?: string;
    id?: string;
  };
  shopQuoteId: string;
  wastagePercent?: number;
}

export function importShopQuote(quote: any): ShopQuoteImportResult {
  const customer = quote.walkInCustomer || {};
  const item = emptyLineItem();
  item.label =
    quote.jewelleryType || quote.metalType || "Jewellery Item";
  item.category = quote.jewelleryType || "OTHER";
  item.metalType =
    quote.metalType ||
    quote.alloyConfig?.baseMetal ||
    quote.composition?.baseAlloy?.metal ||
    "";
  item.metalWeightG = String(quote.targetTotalWeightG || "");
  item.metalCost = String(
    quote.metalCostNpr ??
      quote.metalCostOverride ??
      quote.estimatedTotal?.metalCost ??
      "",
  );
  const makingRaw =
    quote.makingChargeNpr ??
    quote.makingChargeOverride ??
    quote.estimatedTotal?.makingCharge ??
    "";
  item.makingCost = String(makingRaw);
  const makingNum = parseFloat(String(makingRaw)) || 0;
  if (makingNum > 0) item.baseMakingCost = String(makingNum);

  const gcVal =
    quote.gemstoneCostNpr ??
    quote.gemstoneCostOverride ??
    quote.estimatedTotal?.gemstoneCost ??
    0;
  if (gcVal) {
    item.gemstones = [{ ...emptyGemstone(), cost: String(gcVal) }];
  }

  const finishVal =
    quote.finishCostNpr ??
    quote.finishCostOverride ??
    quote.estimatedTotal?.finishCost ??
    0;
  if (finishVal) {
    const current = parseFloat(item.metalCost) || 0;
    item.metalCost = String(current + Number(finishVal));
  }

  item.source = "QUOTE";

  const wastagePct = Number(quote.wastagePercent) || 0;
  const mc = parseFloat(item.metalCost) || 0;
  if (mc > 0 && wastagePct > 0) {
    item.wastagePercent = String(wastagePct);
    item.baseWastagePercent = String(wastagePct);
    item.wastageCost = String(
      roundMoney2(
        calculateLineWastage(
          {
            metalCost: mc,
            metalWeightG: parseFloat(item.metalWeightG) || 0,
            wastagePercent: wastagePct,
          },
          { mode: "WEIGHT_PERCENT", percent: wastagePct, label: "Wastage" },
        ).wastageCost,
      ),
    );
  }

  return {
    line: item,
    customer: {
      name: customer.name,
      phone: customer.phone,
      phoneCountryCode: customer.phoneCountryCode,
      email: customer.email,
      id: customer.id,
    },
    shopQuoteId: quote.id,
    wastagePercent: wastagePct > 0 ? wastagePct : undefined,
  };
}
