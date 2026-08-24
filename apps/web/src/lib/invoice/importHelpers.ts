import {
  calculateLineWastage,
  extractGemstonesFromItem,
  extractMetalTypeFromComposition,
  normalizeMetalCode,
} from "@gold-shop/shared";
import {
  emptyGemstone,
  emptyLineItem,
  type MetalPart,
  type RichLineItem,
} from "./lineItemTypes";
import { isBlankLine, roundMoney2 } from "./calculateLineTotals";

export { normalizeMetalCode, extractMetalTypeFromComposition };

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
          metalType: extractMetalTypeFromComposition(comp.composition) || "",
          weightG: Number(comp.totalWeightGrams) || 0,
          label: comp.nameEn || comp.sku || "Component",
        };
      })
      .filter((p: MetalPart) => p.weightG > 0);
  }

  const metalType = extractMetalTypeFromComposition(item?.composition) || "";
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
  liveRateNote?: string;
  missingRates?: string[];
}

function gemstonesFromCatalogItem(item: any): RichLineItem["gemstones"] {
  const extracted = extractGemstonesFromItem(item);
  if (extracted.length > 0) {
    return extracted.map((g) => ({
      ...emptyGemstone(),
      ...g,
    }));
  }

  const gemCost = Number(item.gemstoneValueNpr) || 0;
  if (gemCost > 0) {
    return [
      {
        ...emptyGemstone(),
        type: "GEMSTONE",
        cost: String(gemCost),
      },
    ];
  }

  return [];
}

export function importCatalogItem(opts: {
  item: any;
  existingLines: RichLineItem[];
  liveMetalCost?: number;
  liveDetail?: string;
  shopWastagePercent?: number;
  shopPrices?: { baseMetalPrices?: Record<string, number> } | null;
  marketRates?: { metals?: Record<string, number> } | null;
  useLiveRate?: boolean;
}): CatalogImportResult | { error: string } {
  const { item, existingLines } = opts;
  if (
    existingLines.some((li) => li.inventoryItemId && li.inventoryItemId === item.id)
  ) {
    return { error: "This catalog piece is already on the invoice." };
  }

  const isSet =
    item.jewelleryType === "SET" || item.composition?.kind === "SET";

  const metalParts = buildMetalPartsFromCatalogItem(item);
  const metalType =
    metalParts[0]?.metalType ||
    extractMetalTypeFromComposition(item.composition);
  const totalWeightG =
    metalParts.reduce((s, p) => s + p.weightG, 0) ||
    Number(item.totalWeightGrams) ||
    0;

  let liveRateNote: string | undefined;
  let missingRates: string[] | undefined;
  let metalCostNum =
    opts.liveMetalCost != null && opts.liveMetalCost > 0
      ? opts.liveMetalCost
      : Number(item.metalValueNpr) ||
        Number(item.metalCost) ||
        Number(item.costPrice) ||
        0;

  if (
    opts.useLiveRate !== false &&
    metalParts.length > 0 &&
    metalParts.some((p) => p.metalType)
  ) {
    const { cost, missing, detailLines } = calcMetalCostFromParts(
      metalParts,
      opts.shopPrices ?? null,
      opts.marketRates ?? null,
    );
    if (cost > 0) {
      metalCostNum = cost;
      liveRateNote = opts.liveDetail || detailLines.join(" · ");
    }
    if (missing.length > 0) {
      missingRates = missing;
    }
  }

  const metalCost = metalCostNum > 0 ? String(metalCostNum) : "";

  const makingRaw =
    Number(item.makingChargeNpr) ||
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

  const gemstones = gemstonesFromCatalogItem(item);
  const gemTotal = gemstones.reduce((s, g) => s + (parseFloat(g.cost) || 0), 0);

  let setDiscountAmount: number | undefined;
  if (isSet && item.setDiscountType && item.setDiscountValue != null) {
    const rawSum = (parseFloat(metalCost) || 0) + (parseFloat(makingCost) || 0) + gemTotal;
    if (item.setDiscountType === "PERCENT") {
      setDiscountAmount = roundMoney2((rawSum * Number(item.setDiscountValue)) / 100);
    } else if (item.setDiscountType === "FIXED") {
      setDiscountAmount = roundMoney2(Number(item.setDiscountValue));
    }
  }

  const detailBits = [
    item.sku ? `SKU ${item.sku}` : null,
    liveRateNote || opts.liveDetail || null,
  ].filter(Boolean);

  const next: RichLineItem = {
    label: item.nameEn || item.sku || "Catalog item",
    category: item.jewelleryType || "RING",
    quantity: 1,
    details: detailBits.join(" · ") || "",
    metalType: String(metalType || ""),
    metalWeightG: totalWeightG > 0 ? String(totalWeightG) : "",
    metalCost,
    gemstones,
    makingCost,
    baseMakingCost: makingRaw > 0 ? String(makingRaw) : undefined,
    metalParts: metalParts.length > 0 ? metalParts : undefined,
    inventoryItemId: item.id,
    source: "CATALOG",
    baseWastagePercent: String(basePct),
    wastagePercent: String(basePct),
    wastageCost,
    isSet: isSet || undefined,
    setDiscountType: isSet ? item.setDiscountType : undefined,
    setDiscountValue: isSet && item.setDiscountValue != null ? Number(item.setDiscountValue) : undefined,
    setDiscountAmount,
  };

  const kept = existingLines.filter((li) => !isBlankLine(li));
  return {
    line: next,
    nextLines: [...kept, next],
    makingPercent:
      makingRaw > 0 && mc > 0 ? roundMoney2((makingRaw / mc) * 100) : undefined,
    wastagePercent: basePct,
    warning: !metalType
      ? "This catalog piece has no metal type stored. Edit the product composition."
      : undefined,
    liveRateNote,
    missingRates,
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
  const customer = quote.walkInCustomer || quote.customer || {};
  const estimated = quote.estimatedTotal || quote.pricing || {};
  const item = emptyLineItem();
  item.label =
    quote.jewelleryType ||
    quote.title ||
    quote.metalType ||
    "Jewellery Item";
  item.category = quote.jewelleryType || quote.category || "OTHER";
  item.metalType =
    quote.metalType ||
    quote.alloyConfig?.baseMetal ||
    quote.composition?.baseAlloy?.metal ||
    quote.composition?.preciousMetal ||
    "";
  item.metalWeightG = String(
    quote.targetTotalWeightG ??
      quote.metalWeightG ??
      quote.totalWeightGrams ??
      "",
  );

  const metalRaw =
    quote.metalCostNpr ??
    quote.metalCostOverride ??
    quote.metalCost ??
    estimated.metalCost ??
    estimated.metal ??
    "";
  item.metalCost = String(metalRaw);

  const makingRaw =
    quote.makingChargeNpr ??
    quote.makingChargeOverride ??
    quote.makingCharge ??
    estimated.makingCharge ??
    estimated.making ??
    "";
  item.makingCost = String(makingRaw);
  const makingNum = parseFloat(String(makingRaw)) || 0;
  if (makingNum > 0) item.baseMakingCost = String(makingNum);

  const gcVal =
    quote.gemstoneCostNpr ??
    quote.gemstoneCostOverride ??
    quote.gemstoneCost ??
    estimated.gemstoneCost ??
    estimated.gemstone ??
    0;
  if (gcVal) {
    item.gemstones = [{ ...emptyGemstone(), type: "GEMSTONE", cost: String(gcVal) }];
  } else if (Array.isArray(quote.composition?.gemstones)) {
    item.gemstones = quote.composition.gemstones.map((gem: any) => ({
      ...emptyGemstone(),
      type: String(gem.type || "GEMSTONE"),
      cut: String(gem.cut || ""),
      clarity: String(gem.clarity || ""),
      caratWeight: gem.caratWeight != null ? String(gem.caratWeight) : "",
      color: String(gem.color || ""),
      cost: gem.cost != null ? String(gem.cost) : "",
    }));
  }

  const finishVal =
    quote.finishCostNpr ??
    quote.finishCostOverride ??
    quote.finishCost ??
    estimated.finishCost ??
    estimated.finish ??
    0;
  if (finishVal) {
    const current = parseFloat(item.metalCost) || 0;
    item.metalCost = String(current + Number(finishVal));
  }

  item.source = "QUOTE";
  if (quote.inventoryItemId) item.inventoryItemId = quote.inventoryItemId;

  const wastagePct =
    Number(quote.wastagePercent) ||
    Number(quote.wastagePct) ||
    Number(estimated.wastagePercent) ||
    0;
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
      name:
        customer.name ||
        (customer.firstName || customer.lastName
          ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
          : undefined),
      phone: customer.phone,
      phoneCountryCode: customer.phoneCountryCode,
      email: customer.email,
      id: customer.id,
    },
    shopQuoteId: quote.id,
    wastagePercent: wastagePct > 0 ? wastagePct : undefined,
  };
}
