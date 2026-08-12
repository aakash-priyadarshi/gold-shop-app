import { lineItemTotal } from "./calculateLineTotals";
import type { RichLineItem } from "./lineItemTypes";

export interface InvoiceDraftValidation {
  ok: boolean;
  errors: string[];
}

/**
 * Strict validation — no flat-amount shortcut.
 * METAL jewellery lines need metal type + weight + metal cost (or catalog/quote source).
 */
export function validateInvoiceDraft(opts: {
  customerName: string;
  lineItems: RichLineItem[];
  customerType?: "B2C" | "B2B";
  customerTaxId?: string;
  invoiceCountry?: string;
  requestTaxInvoice?: boolean;
  customerAddress?: string;
  supplyDate?: string;
  isTaxExempt?: boolean;
  taxExemptReason?: string;
}): InvoiceDraftValidation {
  const errors: string[] = [];

  if (!opts.customerName.trim()) {
    errors.push("Customer name is required");
  }

  const priced = opts.lineItems.filter(
    (li) => li.label?.trim() && lineItemTotal(li) > 0,
  );
  if (priced.length === 0) {
    errors.push("Add at least one jewellery line with a price");
  }

  for (const li of priced) {
    if (!li.label.trim()) {
      errors.push("Every priced line needs a description");
      continue;
    }

    const metalCost = parseFloat(li.metalCost) || 0;
    const makingCost = parseFloat(li.makingCost) || 0;
    const hasCatalog = Boolean(li.inventoryItemId);
    const hasQuote = li.source === "QUOTE";
    const hasBreakdown = metalCost > 0 || makingCost > 0;

    // Flat-only lines are rejected — jewellery invoices need breakdown for tax/accounting
    if (!hasBreakdown && !hasCatalog && !hasQuote) {
      errors.push(
        `"${li.label}": enter metal cost / making charge (or add from catalog or quote)`,
      );
    }

    if (metalCost > 0) {
      if (!li.metalType) {
        errors.push(`"${li.label}": select a metal type`);
      }
      if (!li.metalWeightG || !(parseFloat(li.metalWeightG) > 0)) {
        errors.push(`"${li.label}": enter metal weight`);
      }
    }
  }

  const catalogIds = priced
    .map((l) => l.inventoryItemId)
    .filter(Boolean) as string[];
  if (new Set(catalogIds).size !== catalogIds.length) {
    errors.push("Each catalog piece can only appear once on an invoice");
  }

  if (opts.customerType === "B2B" && !opts.customerTaxId?.trim()) {
    errors.push("Business customers need a tax ID");
  }

  if (opts.invoiceCountry === "LK" && opts.requestTaxInvoice) {
    if (opts.customerType !== "B2B") {
      errors.push("Sri Lanka TAX INVOICE requires a business (B2B) customer");
    }
    if (!opts.customerTaxId?.trim()) {
      errors.push("Purchaser TIN is required for TAX INVOICE");
    }
    if (!opts.customerAddress?.trim()) {
      errors.push("Customer address is required for TAX INVOICE");
    }
    if (!opts.supplyDate) {
      errors.push("Date of supply is required for TAX INVOICE");
    }
  }

  if (opts.isTaxExempt && !opts.taxExemptReason?.trim()) {
    errors.push("Tax exempt reason is required");
  }

  return { ok: errors.length === 0, errors };
}
