import { DEFAULT_BILL_TEMPLATE_ID } from "@gold-shop/shared";
import type {
  InvoicePdfTemplate,
  InvoicePdfTemplateId,
} from "../invoice-pdf.types";
import {
  classicInvoicePdfTemplate,
  compactInvoicePdfTemplate,
  minimalInvoicePdfTemplate,
  ornateInvoicePdfTemplate,
  royalInvoicePdfTemplate,
} from "./themed.template";

/**
 * Registry of printable PDF layouts.
 * Unknown IDs fall back to classic so new templates can ship without
 * breaking existing shares.
 */
const TEMPLATES: Record<string, InvoicePdfTemplate> = {
  [classicInvoicePdfTemplate.id]: classicInvoicePdfTemplate,
  [royalInvoicePdfTemplate.id]: royalInvoicePdfTemplate,
  [compactInvoicePdfTemplate.id]: compactInvoicePdfTemplate,
  [ornateInvoicePdfTemplate.id]: ornateInvoicePdfTemplate,
  [minimalInvoicePdfTemplate.id]: minimalInvoicePdfTemplate,
};

export const DEFAULT_INVOICE_PDF_TEMPLATE_ID: InvoicePdfTemplateId =
  DEFAULT_BILL_TEMPLATE_ID;

export function resolveInvoicePdfTemplate(
  templateId?: string | null,
): InvoicePdfTemplate {
  const id = (templateId || DEFAULT_INVOICE_PDF_TEMPLATE_ID)
    .trim()
    .toLowerCase();
  return TEMPLATES[id] || classicInvoicePdfTemplate;
}

export function listInvoicePdfTemplates(): Array<{
  id: string;
  label: string;
}> {
  return Object.values(TEMPLATES).map((t) => ({ id: t.id, label: t.label }));
}
