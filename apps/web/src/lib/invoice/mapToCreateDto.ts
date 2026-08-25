import type { ResolvedWastageRule } from "@gold-shop/shared";
import {
  gemstoneTotal,
  lineItemTotal,
  resolveLineWastageCost,
} from "./calculateLineTotals";
import type { RichLineItem } from "./lineItemTypes";

export interface ApiInvoiceLineItem {
  label: string;
  category: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  details?: string;
  inventoryItemId?: string;
  variantId?: string;
  metalCost?: number;
  makingCost?: number;
  gemstoneCost?: number;
  wastageCost?: number;
  wastagePercent?: number;
  metalType?: string;
  metalWeightG?: number;
  gemstones?: Array<{
    type: string;
    origin?: string;
    cut?: string;
    caratWeight?: number;
    sizeMm?: number;
    color?: string;
    clarity?: string;
    qualityTier?: string;
    cutGrade?: string;
    gradingLab?: string;
    certNumber?: string;
    reportUrl?: string;
    reportDate?: string;
    count?: number;
    cost?: number;
  }>;
  setDiscountAmount?: number;
  discountAmount?: number;
}

export interface MapToCreateDtoInput {
  lineItems: RichLineItem[];
  invoiceWastagePct: number;
  wastageRule: Pick<ResolvedWastageRule, "mode" | "label">;
  customerName: string;
  customerPhone?: string;
  /** E.164 prefix such as +977. Applied when customerPhone has no leading +. */
  phoneCountryCode?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerType?: "B2C" | "B2B";
  customerTaxId?: string;
  invoiceCountry: string;
  currency: string;
  walkInCustomerId?: string;
  shopQuoteId?: string;
  orderId?: string;
  taxRate?: number;
  taxLabel?: string;
  taxBreakdown?: Record<string, unknown>;
  isTaxExempt?: boolean;
  taxExemptReason?: string;
  taxInvoiceRequested?: boolean;
  purchaserVatRegistered?: boolean;
  placeOfSupply?: string;
  supplyDate?: string;
  makingChargesAmt?: number;
  discountAmount?: number;
  dueDate?: string;
  notes?: string;
  terms?: string;
  paymentMethod?: string;
}

export function mapLineItemsToApi(
  lineItems: RichLineItem[],
  invoiceWastagePct: number,
  wastageRule: Pick<ResolvedWastageRule, "mode" | "label">,
): ApiInvoiceLineItem[] {
  return lineItems
    .filter((li) => li.label?.trim() && lineItemTotal(li) > 0)
    .map((li) => {
      const detailParts = [
        li.details,
        li.metalType ? `Metal: ${li.metalType}` : null,
        li.metalWeightG ? `Weight: ${li.metalWeightG}g` : null,
        li.gemstones.length > 0
          ? `Gemstones: ${li.gemstones
              .map((g) =>
                [
                  g.type,
                  g.origin === "LAB" ? "Lab-grown" : g.origin === "NATURAL" ? "Natural" : null,
                  g.color ? `Color ${g.color}` : null,
                  g.clarity ? `Clarity ${g.clarity}` : null,
                  g.cut,
                  g.caratWeight ? `${g.caratWeight}ct` : g.sizeMm ? `${g.sizeMm}mm` : null,
                  g.count ? `×${g.count}` : null,
                ]
                  .filter(Boolean)
                  .join(" "),
              )
              .join("; ")}`
          : null,
      ].filter(Boolean);

      const metalCost = parseFloat(li.metalCost) || 0;
      const makingCost = parseFloat(li.makingCost) || 0;
      const gemstoneCost = gemstoneTotal(li);
      const wastageCost = resolveLineWastageCost(
        li,
        invoiceWastagePct,
        wastageRule,
      );
      const pct =
        parseFloat(li.wastagePercent || "") || invoiceWastagePct || 0;
      const hasBreakdown =
        metalCost > 0 ||
        makingCost > 0 ||
        gemstoneCost > 0 ||
        wastageCost > 0;
      const lineAmount = lineItemTotal(li) + wastageCost * li.quantity;
      const gemstones = li.gemstones
        .map((g) => ({
          type: g.type,
          origin: g.origin,
          cut: g.cut || undefined,
          caratWeight: g.caratWeight ? Number(g.caratWeight) : undefined,
          sizeMm: g.sizeMm != null ? Number(g.sizeMm) : undefined,
          color: g.color || undefined,
          clarity: g.clarity || undefined,
          qualityTier: g.qualityTier || undefined,
          cutGrade: g.cutGrade || undefined,
          gradingLab: g.gradingLab || g.lab || undefined,
          certNumber: g.certNumber || undefined,
          reportUrl: g.reportUrl || undefined,
          reportDate: g.reportDate || undefined,
          count: g.count != null ? Number(g.count) : undefined,
          cost: g.cost ? Number(g.cost) : undefined,
        }))
        .filter((g) => g.type);

      return {
        label: li.label.trim(),
        category: li.category || "RING",
        quantity: li.quantity,
        unitPrice: lineAmount / li.quantity,
        amount: lineAmount,
        details: detailParts.length ? detailParts.join(" · ") : undefined,
        inventoryItemId: li.inventoryItemId || undefined,
        variantId: li.variantId || undefined,
        gemstones: gemstones.length ? gemstones : undefined,
        ...(hasBreakdown
          ? {
              metalCost: metalCost || undefined,
              makingCost: makingCost || undefined,
              gemstoneCost: gemstoneCost || undefined,
              wastageCost: wastageCost || undefined,
              wastagePercent: pct > 0 ? pct : undefined,
              metalType: li.metalType || undefined,
              metalWeightG: li.metalWeightG
                ? parseFloat(li.metalWeightG) || undefined
                : undefined,
              setDiscountAmount: li.setDiscountAmount
                ? Number(li.setDiscountAmount)
                : undefined,
              discountAmount: li.setDiscountAmount
                ? Number(li.setDiscountAmount)
                : undefined,
            }
          : {}),
      };
    });
}

/** Prefix a local phone with the shop country code unless it is already E.164. */
export function withPhoneCountryCode(
  phone?: string,
  countryCode?: string,
): string | undefined {
  const raw = phone?.trim();
  if (!raw) return undefined;
  if (raw.startsWith("+")) return raw;
  const prefix = countryCode?.trim();
  if (!prefix) return raw;
  return `${prefix}${raw.replace(/^0+/, "")}`;
}

export function mapToCreateDto(input: MapToCreateDtoInput): Record<string, unknown> {
  const apiLineItems = mapLineItemsToApi(
    input.lineItems,
    input.invoiceWastagePct,
    input.wastageRule,
  );

  return {
    orderId: input.orderId || undefined,
    walkInCustomerId: input.walkInCustomerId || undefined,
    shopQuoteId: input.shopQuoteId || undefined,
    customerName: input.customerName.trim(),
    customerPhone: withPhoneCountryCode(
      input.customerPhone,
      input.phoneCountryCode,
    ),
    customerEmail: input.customerEmail || undefined,
    customerAddress: input.customerAddress || undefined,
    lineItems: apiLineItems,
    currency: input.currency,
    taxRate: input.taxRate,
    taxLabel: input.taxLabel,
    taxBreakdown: input.taxBreakdown,
    isTaxExempt: input.isTaxExempt,
    taxExemptReason: input.isTaxExempt ? input.taxExemptReason : undefined,
    customerType: input.customerType,
    taxInvoiceRequested: input.taxInvoiceRequested,
    customerTaxId: input.customerTaxId || undefined,
    invoiceCountry: input.invoiceCountry,
    placeOfSupply: input.placeOfSupply || undefined,
    supplyDate: input.supplyDate || undefined,
    purchaserVatRegistered: input.purchaserVatRegistered,
    makingChargesAmt: input.makingChargesAmt || undefined,
    discountAmount: input.discountAmount || undefined,
    dueDate: input.dueDate || undefined,
    notes: input.notes || undefined,
    terms: input.terms || undefined,
    paymentMethod: input.paymentMethod || undefined,
  };
}
