import type PDFKit from "pdfkit";
import type {
  InvoicePdfContext,
  InvoicePdfTemplate,
} from "../invoice-pdf.types";

const AMBER = "#92400e";
const MUTED = "#666666";
const TEXT = "#111111";
const LIGHT = "#999999";

function money(currency: string, value: number): string {
  return `${currency} ${Number(value || 0).toLocaleString()}`;
}

function drawBranding(
  doc: PDFKit.PDFDocument,
  ctx: InvoicePdfContext,
  zone: "TOP" | "BOTTOM",
): void {
  const b = ctx.branding;
  const wanted =
    zone === "TOP"
      ? (pos: string) => (pos || "TOP").toUpperCase() !== "BOTTOM"
      : (pos: string) => (pos || "TOP").toUpperCase() === "BOTTOM";

  if (
    zone === "TOP" &&
    b.showLogo &&
    b.logoBuffer &&
    wanted(b.logoPosition)
  ) {
    try {
      const startY = doc.y;
      doc.image(b.logoBuffer, doc.page.margins.left, startY, {
        fit: [140, 56],
      });
      doc.y = startY + 64;
    } catch {
      /* corrupt/unsupported image — skip logo */
    }
  }

  if (zone === "TOP") {
    doc
      .fontSize(18)
      .fillColor(AMBER)
      .font("Helvetica-Bold")
      .text(b.shopName, { continued: false });
    doc.font("Helvetica");
    if (b.tagline) {
      doc.fontSize(10).fillColor(MUTED).text(b.tagline);
    }
    const contactBits: string[] = [];
    if (b.showPhone && b.phone) contactBits.push(b.phone);
    if (b.showEmail && b.email) contactBits.push(b.email);
    if (b.showAddress && b.address) {
      doc.fontSize(9).fillColor(MUTED).text(b.address);
    }
    if (contactBits.length) {
      doc.fontSize(9).fillColor(MUTED).text(contactBits.join(" · "));
    }
    if (b.showGstin && b.taxId) {
      doc.fontSize(9).fillColor(MUTED).text(`Tax ID: ${b.taxId}`);
    }
    if (b.showLicense && b.licenseNumber) {
      doc.fontSize(9).fillColor(MUTED).text(`License: ${b.licenseNumber}`);
    }
  }

  if (zone === "BOTTOM") {
    if (b.showFooter && b.footerNote) {
      doc.fontSize(9).fillColor(MUTED).text(b.footerNote, { align: "center" });
    }
    if (b.showTerms && b.termsText) {
      doc.fontSize(8).fillColor(LIGHT).text(b.termsText, { align: "center" });
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
}

function renderClassic(doc: PDFKit.PDFDocument, ctx: InvoicePdfContext): void {
  drawBranding(doc, ctx, "TOP");
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor(MUTED).text(ctx.title);
  doc.moveDown(0.4);

  doc
    .fontSize(12)
    .fillColor(TEXT)
    .font("Helvetica-Bold")
    .text(`Invoice #${ctx.invoiceNumber}`);
  doc.font("Helvetica");
  if (ctx.issuedAt) {
    doc
      .fontSize(10)
      .fillColor(MUTED)
      .text(`Date: ${new Date(ctx.issuedAt).toLocaleDateString()}`);
  }
  doc.moveDown(0.7);

  doc.fontSize(10).fillColor(TEXT).text("Bill to", { underline: true });
  doc.text(ctx.customerName || "Walk-in customer");
  if (ctx.customerPhone) doc.text(ctx.customerPhone);
  if (ctx.customerEmail) doc.text(ctx.customerEmail);
  if (ctx.customerAddress) doc.text(ctx.customerAddress);
  if (ctx.customerTaxId) doc.text(`Tax ID: ${ctx.customerTaxId}`);
  doc.moveDown(0.7);

  doc.fontSize(10).fillColor(TEXT).text("Items", { underline: true });
  doc.moveDown(0.3);
  for (const line of ctx.lineItems) {
    const qty =
      line.quantity && Number(line.quantity) !== 1
        ? ` × ${line.quantity}`
        : "";
    const label = `${line.label || "Item"}${qty}`;
    doc.fontSize(10).fillColor(TEXT).text(label, {
      continued: true,
      width: 360,
    });
    doc.text(money(ctx.currency, line.amount), { align: "right" });
    if (line.details) {
      doc.fontSize(8).fillColor(MUTED).text(String(line.details));
    }
    doc.moveDown(0.25);
  }

  doc.moveDown(0.4);
  const row = (label: string, value: number, bold = false) => {
    doc
      .fontSize(bold ? 12 : 10)
      .fillColor(TEXT)
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
    doc.fontSize(8).fillColor(MUTED);
    if (breakdown.metalTax)
      doc.text(`  Metal tax: ${money(ctx.currency, breakdown.metalTax)}`);
    if (breakdown.makingTax)
      doc.text(`  Making tax: ${money(ctx.currency, breakdown.makingTax)}`);
    if (breakdown.gemstoneTax)
      doc.text(`  Gemstone tax: ${money(ctx.currency, breakdown.gemstoneTax)}`);
    if (breakdown.wastageTax)
      doc.text(`  Wastage tax: ${money(ctx.currency, breakdown.wastageTax)}`);
    doc.fillColor(TEXT);
  }

  row("Total", ctx.totalAmount, true);
  row("Paid", ctx.paidAmount);
  row("Balance due", ctx.balanceDue, true);

  if (ctx.notes) {
    doc.moveDown(0.7);
    doc.fontSize(9).fillColor(MUTED).text(`Notes: ${ctx.notes}`);
  }

  // Verification QR — always when token present
  if (ctx.verificationToken && (ctx.qrBuffer || ctx.verifyUrl)) {
    doc.moveDown(1);
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const qrSize = 96;
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
      .fontSize(9)
      .fillColor(AMBER)
      .text("Scan to verify this bill is genuine", { align: "center" });
    if (ctx.verifyUrl) {
      doc.fontSize(7).fillColor(MUTED).text(ctx.verifyUrl, { align: "center" });
    }
  }

  doc.moveDown(1);
  drawBranding(doc, ctx, "BOTTOM");

  if (!ctx.branding.footerNote) {
    doc
      .fontSize(8)
      .fillColor(LIGHT)
      .text("Thank you for your business!", { align: "center" });
  }

  doc.moveDown(0.8);
  doc
    .fontSize(7)
    .fillColor(LIGHT)
    .text("Generated on demand by Orivraa — not stored.", {
      align: "center",
    });
}

export const classicInvoicePdfTemplate: InvoicePdfTemplate = {
  id: "classic",
  label: "Classic",
  render: renderClassic,
};
