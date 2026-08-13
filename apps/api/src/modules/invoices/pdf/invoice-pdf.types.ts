import type PDFKit from "pdfkit";

/** Seller-selectable layouts. Unknown IDs fall back to classic. */
export type InvoicePdfTemplateId = import("@gold-shop/shared").BillTemplateId | string;

export interface InvoicePdfBranding {
  shopName: string;
  tagline?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  licenseNumber?: string | null;
  footerNote?: string | null;
  termsText?: string | null;
  showLogo: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showGstin: boolean;
  showLicense: boolean;
  showFooter: boolean;
  showTerms: boolean;
  logoPosition: "TOP" | "BOTTOM";
  /** Remote logo URL from InvoiceSettings / shop profile. */
  logoUrl?: string | null;
  /** Resolved image bytes (png/jpeg/webp). */
  logoBuffer?: Buffer | null;
}

export interface InvoicePdfLine {
  label: string;
  quantity?: number;
  amount: number;
  details?: string;
}

export interface InvoicePdfContext {
  templateId: InvoicePdfTemplateId;
  invoiceNumber: string;
  title: string;
  currency: string;
  invoiceCountry?: string | null;
  issuedAt?: Date | string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerTaxId?: string | null;
  lineItems: InvoicePdfLine[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  taxLabel?: string | null;
  taxBreakdown?: Record<string, number> | null;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  notes?: string | null;
  branding: InvoicePdfBranding;
  verificationToken?: string | null;
  verifyUrl?: string | null;
  /** PNG buffer for verification QR. */
  qrBuffer?: Buffer | null;
}

export interface InvoicePdfTemplate {
  id: InvoicePdfTemplateId;
  label: string;
  render(doc: PDFKit.PDFDocument, ctx: InvoicePdfContext): void;
}
