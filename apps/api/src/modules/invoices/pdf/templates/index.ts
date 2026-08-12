import type {
  InvoicePdfTemplate,
  InvoicePdfTemplateId,
} from "../invoice-pdf.types";
import { classicInvoicePdfTemplate } from "./classic.template";

/**
 * Registry of printable PDF layouts.
 * Sellers will later pick a templateId from InvoiceSettings; unknown IDs
 * fall back to classic so new templates can ship without breaking shares.
 */
const TEMPLATES: Record<string, InvoicePdfTemplate> = {
  [classicInvoicePdfTemplate.id]: classicInvoicePdfTemplate,
};

export const DEFAULT_INVOICE_PDF_TEMPLATE_ID: InvoicePdfTemplateId = "classic";

export function resolveInvoicePdfTemplate(
  templateId?: string | null,
): InvoicePdfTemplate {
  const id = (templateId || DEFAULT_INVOICE_PDF_TEMPLATE_ID).trim().toLowerCase();
  return TEMPLATES[id] || classicInvoicePdfTemplate;
}

export function listInvoicePdfTemplates(): Array<{
  id: string;
  label: string;
}> {
  return Object.values(TEMPLATES).map((t) => ({ id: t.id, label: t.label }));
}
