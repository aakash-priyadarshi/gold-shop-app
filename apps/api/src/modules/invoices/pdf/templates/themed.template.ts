import type { BillTemplateId } from "@gold-shop/shared";
import type PDFKit from "pdfkit";
import type {
  InvoicePdfContext,
  InvoicePdfTemplate,
} from "../invoice-pdf.types";

type PdfLook = {
  accent: string;
  muted: string;
  text: string;
  light: string;
  headerFill: string | null;
  headerText: string | null;
  compact: boolean;
  ornate: boolean;
  uppercaseName: boolean;
};

const LOOKS: Record<BillTemplateId, PdfLook> = {
  classic: {
    accent: "#92400e",
    muted: "#666666",
    text: "#111111",
    light: "#999999",
    headerFill: null,
    headerText: null,
    compact: false,
    ornate: false,
    uppercaseName: false,
  },
  royal: {
    accent: "#c9a227",
    muted: "#475569",
    text: "#0f172a",
    light: "#94a3b8",
    headerFill: "#1e3a5f",
    headerText: "#f8fafc",
    compact: false,
    ornate: false,
    uppercaseName: false,
  },
  compact: {
    accent: "#92400e",
    muted: "#555555",
    text: "#111111",
    light: "#888888",
    headerFill: null,
    headerText: null,
    compact: true,
    ornate: false,
    uppercaseName: false,
  },
  ornate: {
    accent: "#92400e",
    muted: "#6b5a3c",
    text: "#1c1917",
    light: "#a8a29e",
    headerFill: null,
    headerText: null,
    compact: false,
    ornate: true,
    uppercaseName: false,
  },
  minimal: {
    accent: "#111111",
    muted: "#737373",
    text: "#171717",
    light: "#a3a3a3",
    headerFill: null,
    headerText: null,
    compact: false,
    ornate: false,
    uppercaseName: true,
  },
};

function money(currency: string, value: number): string {
  return `${currency} ${Number(value || 0).toLocaleString()}`;
}

function drawPageOrnament(doc: PDFKit.PDFDocument, look: PdfLook): void {
  if (!look.ornate) return;
  const inset = 22;
  const w = doc.page.width - inset * 2;
  const h = doc.page.height - inset * 2;
  doc.save();
  doc.lineWidth(1.4).strokeColor(look.accent).rect(inset, inset, w, h).stroke();
  doc
    .lineWidth(0.5)
    .rect(inset + 5, inset + 5, w - 10, h - 10)
    .stroke();
  doc.restore();
}

function drawBranding(
  doc: PDFKit.PDFDocument,
  ctx: InvoicePdfContext,
  zone: "TOP" | "BOTTOM",
  look: PdfLook,
): void {
  const b = ctx.branding;
  const wanted =
    zone === "TOP"
      ? (pos: string) => (pos || "TOP").toUpperCase() !== "BOTTOM"
      : (pos: string) => (pos || "TOP").toUpperCase() === "BOTTOM";
  const nameColor = look.headerText || look.accent;
  const gap = look.compact ? 0.15 : 0.3;

  if (
    zone === "TOP" &&
    b.showLogo &&
    b.logoBuffer &&
    wanted(b.logoPosition)
  ) {
    try {
      const startY = doc.y;
      doc.image(b.logoBuffer, doc.page.margins.left, startY, {
        fit: look.compact ? [110, 44] : [140, 56],
      });
      doc.y = startY + (look.compact ? 50 : 64);
    } catch {
      /* corrupt/unsupported image — skip logo */
    }
  }

  if (zone === "TOP") {
    if (look.headerFill) {
      const pageWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const barY = doc.y;
      const barH = 36;
      doc.save();
      doc
        .rect(doc.page.margins.left - 8, barY - 6, pageWidth + 16, barH)
        .fill(look.headerFill);
      doc.restore();
      doc.y = barY;
    }

    const shopName = look.uppercaseName
      ? b.shopName.toUpperCase()
      : b.shopName;
    doc
      .fontSize(look.compact ? 15 : 18)
      .fillColor(nameColor)
      .font("Helvetica-Bold")
      .text(shopName, { continued: false, align: look.ornate ? "center" : "left" });
    doc.font("Helvetica");

    if (look.headerFill) {
      doc.moveDown(0.35);
    }

    if (b.tagline) {
      doc
        .fontSize(look.compact ? 8 : 10)
        .fillColor(look.headerFill ? "#cbd5e1" : look.muted)
        .text(b.tagline, { align: look.ornate ? "center" : "left" });
    }
    const contactBits: string[] = [];
    if (b.showPhone && b.phone) contactBits.push(b.phone);
    if (b.showEmail && b.email) contactBits.push(b.email);
    if (b.showAddress && b.address) {
      doc
        .fontSize(look.compact ? 8 : 9)
        .fillColor(look.muted)
        .text(b.address, { align: look.ornate ? "center" : "left" });
    }
    if (contactBits.length) {
      doc
        .fontSize(look.compact ? 8 : 9)
        .fillColor(look.muted)
        .text(contactBits.join(" · "), {
          align: look.ornate ? "center" : "left",
        });
    }
    if (b.showGstin && b.taxId) {
      doc
        .fontSize(look.compact ? 8 : 9)
        .fillColor(look.muted)
        .text(`Tax ID: ${b.taxId}`, {
          align: look.ornate ? "center" : "left",
        });
    }
    if (b.showLicense && b.licenseNumber) {
      doc
        .fontSize(look.compact ? 8 : 9)
        .fillColor(look.muted)
        .text(`License: ${b.licenseNumber}`, {
          align: look.ornate ? "center" : "left",
        });
    }
  }

  if (zone === "BOTTOM") {
    if (b.showFooter && b.footerNote) {
      doc
        .fontSize(look.compact ? 8 : 9)
        .fillColor(look.muted)
        .text(b.footerNote, { align: "center" });
    }
    if (b.showTerms && b.termsText) {
      doc
        .fontSize(look.compact ? 7 : 8)
        .fillColor(look.light)
        .text(b.termsText, { align: "center" });
    }
    if (
      b.showLogo &&
      b.logoBuffer &&
      (b.logoPosition || "TOP").toUpperCase() === "BOTTOM"
    ) {
      try {
        const startY = doc.y + 4;
        doc.image(b.logoBuffer, doc.page.margins.left, startY, {
          fit: [100, 40],
        });
        doc.y = startY + 48;
      } catch {
        /* skip */
      }
    }
  }

  doc.moveDown(gap);
}

function renderThemed(
  doc: PDFKit.PDFDocument,
  ctx: InvoicePdfContext,
  look: PdfLook,
): void {
  drawPageOrnament(doc, look);
  drawBranding(doc, ctx, "TOP", look);
  doc.moveDown(look.compact ? 0.15 : 0.3);
  doc
    .fontSize(look.compact ? 9 : 11)
    .fillColor(look.muted)
    .text(ctx.title);
  doc.moveDown(look.compact ? 0.2 : 0.4);

  doc
    .fontSize(look.compact ? 11 : 12)
    .fillColor(look.text)
    .font("Helvetica-Bold")
    .text(`Invoice #${ctx.invoiceNumber}`);
  doc.font("Helvetica");
  if (ctx.issuedAt) {
    doc
      .fontSize(look.compact ? 9 : 10)
      .fillColor(look.muted)
      .text(`Date: ${new Date(ctx.issuedAt).toLocaleDateString()}`);
  }
  doc.moveDown(look.compact ? 0.4 : 0.7);

  doc
    .fontSize(look.compact ? 9 : 10)
    .fillColor(look.text)
    .text("Bill to", { underline: true });
  doc.text(ctx.customerName || "Walk-in customer");
  if (ctx.customerPhone) doc.text(ctx.customerPhone);
  if (ctx.customerEmail) doc.text(ctx.customerEmail);
  if (ctx.customerAddress) doc.text(ctx.customerAddress);
  if (ctx.customerTaxId) doc.text(`Tax ID: ${ctx.customerTaxId}`);
  doc.moveDown(look.compact ? 0.4 : 0.7);

  doc
    .fontSize(look.compact ? 9 : 10)
    .fillColor(look.text)
    .text("Items", { underline: true });
  doc.moveDown(look.compact ? 0.15 : 0.3);
  for (const line of ctx.lineItems) {
    const qty =
      line.quantity && Number(line.quantity) !== 1
        ? ` × ${line.quantity}`
        : "";
    const label = `${line.label || "Item"}${qty}`;
    doc
      .fontSize(look.compact ? 9 : 10)
      .fillColor(look.text)
      .text(label, {
        continued: true,
        width: 360,
      });
    doc.text(money(ctx.currency, line.amount), { align: "right" });
    if (line.details) {
      doc
        .fontSize(look.compact ? 7 : 8)
        .fillColor(look.muted)
        .text(String(line.details));
    }
    doc.moveDown(look.compact ? 0.12 : 0.25);
  }

  doc.moveDown(look.compact ? 0.2 : 0.4);
  const row = (label: string, value: number, bold = false) => {
    doc
      .fontSize(bold ? (look.compact ? 11 : 12) : look.compact ? 9 : 10)
      .fillColor(look.text)
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .text(label, { continued: true, width: 360 });
    doc.text(money(ctx.currency, value), { align: "right" });
    doc.font("Helvetica");
  };

  row("Subtotal", ctx.subtotal);
  if (ctx.discountAmount > 0) row("Discount", -ctx.discountAmount);
  if (ctx.taxAmount > 0) row(ctx.taxLabel || "Tax", ctx.taxAmount);

  const breakdown = ctx.taxBreakdown;
  if (breakdown && typeof breakdown === "object") {
    doc.fontSize(look.compact ? 7 : 8).fillColor(look.muted);
    if (breakdown.metalTax)
      doc.text(`  Metal tax: ${money(ctx.currency, breakdown.metalTax)}`);
    if (breakdown.makingTax)
      doc.text(`  Making tax: ${money(ctx.currency, breakdown.makingTax)}`);
    if (breakdown.gemstoneTax)
      doc.text(`  Gemstone tax: ${money(ctx.currency, breakdown.gemstoneTax)}`);
    if (breakdown.wastageTax)
      doc.text(`  Wastage tax: ${money(ctx.currency, breakdown.wastageTax)}`);
    doc.fillColor(look.text);
  }

  row("Total", ctx.totalAmount, true);
  row("Paid", ctx.paidAmount);
  row("Balance due", ctx.balanceDue, true);

  if (ctx.notes) {
    doc.moveDown(look.compact ? 0.4 : 0.7);
    doc
      .fontSize(look.compact ? 8 : 9)
      .fillColor(look.muted)
      .text(`Notes: ${ctx.notes}`);
  }

  if (ctx.verificationToken && (ctx.qrBuffer || ctx.verifyUrl)) {
    doc.moveDown(look.compact ? 0.6 : 1);
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const qrSize = look.compact ? 80 : 96;
    const qrX = doc.page.margins.left + (pageWidth - qrSize) / 2;
    const qrY = doc.y;

    if (ctx.qrBuffer) {
      try {
        doc.image(ctx.qrBuffer, qrX, qrY, { fit: [qrSize, qrSize] });
        doc.y = qrY + qrSize + 6;
      } catch {
        doc.y = qrY;
      }
    }

    doc
      .fontSize(look.compact ? 8 : 9)
      .fillColor(look.accent)
      .text("Scan to verify this bill is genuine", { align: "center" });
    if (ctx.verifyUrl) {
      doc
        .fontSize(7)
        .fillColor(look.muted)
        .text(ctx.verifyUrl, { align: "center" });
    }
  }

  doc.moveDown(look.compact ? 0.5 : 1);
  drawBranding(doc, ctx, "BOTTOM", look);

  if (!ctx.branding.footerNote) {
    doc
      .fontSize(8)
      .fillColor(look.light)
      .text("Thank you for your business!", { align: "center" });
  }

  doc.moveDown(0.8);
  doc
    .fontSize(7)
    .fillColor(look.light)
    .text("Generated on demand by Orivraa — not stored.", {
      align: "center",
    });
}

function createThemedTemplate(
  id: BillTemplateId,
  label: string,
): InvoicePdfTemplate {
  return {
    id,
    label,
    render: (doc, ctx) => renderThemed(doc, ctx, LOOKS[id]),
  };
}

export const classicInvoicePdfTemplate = createThemedTemplate(
  "classic",
  "Classic",
);
export const royalInvoicePdfTemplate = createThemedTemplate("royal", "Royal");
export const compactInvoicePdfTemplate = createThemedTemplate(
  "compact",
  "Compact",
);
export const ornateInvoicePdfTemplate = createThemedTemplate(
  "ornate",
  "Ornate",
);
export const minimalInvoicePdfTemplate = createThemedTemplate(
  "minimal",
  "Minimal",
);
