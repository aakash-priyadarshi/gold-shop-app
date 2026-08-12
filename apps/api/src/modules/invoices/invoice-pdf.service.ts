import { Injectable, NotFoundException } from "@nestjs/common";
import PDFDocument from "pdfkit";
import { PrismaService } from "../../prisma/prisma.service";

// pdfkit CJS interop
const PdfCtor =
  (PDFDocument as unknown as { default?: typeof PDFDocument }).default ||
  PDFDocument;

@Injectable()
export class InvoicePdfService {
  constructor(private readonly prisma: PrismaService) {}

  async generatePdfBuffer(id: string, shopId: string): Promise<{
    buffer: Buffer;
    filename: string;
  }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, shopId },
      include: {
        shop: {
          select: {
            shopName: true,
            contactPhone: true,
            contactEmail: true,
            address: true,
            city: true,
            country: true,
            vatNumber: true,
            panNumber: true,
          },
        },
        payments: {
          where: { status: "RECEIVED" },
          orderBy: { receivedAt: "asc" },
          select: { amount: true, method: true, receivedAt: true },
        },
      },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");

    const buffer = await this.renderInvoice(invoice);
    const safeNumber = String(invoice.invoiceNumber || id).replace(
      /[^\w.-]+/g,
      "_",
    );
    return {
      buffer,
      filename: `Invoice-${safeNumber}.pdf`,
    };
  }

  private renderInvoice(invoice: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PdfCtor({ size: "A4", margin: 48 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const currency = invoice.currency || "NPR";
      const shopName =
        invoice.supplierName || invoice.shop?.shopName || "Jeweller";
      const title =
        invoice.invoiceTitle ||
        (invoice.invoiceCountry === "LK" ? "INVOICE" : "INVOICE");

      doc
        .fontSize(18)
        .fillColor("#92400e")
        .text(shopName, { continued: false });
      doc
        .fontSize(11)
        .fillColor("#666666")
        .text(title, { continued: false });
      doc.moveDown(0.5);

      doc
        .fontSize(12)
        .fillColor("#111111")
        .text(`Invoice #${invoice.invoiceNumber}`, { continued: false });
      if (invoice.issuedAt) {
        doc
          .fontSize(10)
          .fillColor("#555555")
          .text(`Date: ${new Date(invoice.issuedAt).toLocaleDateString()}`);
      }
      doc.moveDown(0.8);

      // Parties
      doc.fontSize(10).fillColor("#111111").text("Bill to", { underline: true });
      doc.text(invoice.customerName || "Walk-in customer");
      if (invoice.customerPhone) doc.text(invoice.customerPhone);
      if (invoice.customerEmail) doc.text(invoice.customerEmail);
      if (invoice.customerAddress) doc.text(invoice.customerAddress);
      if (invoice.customerTaxId) doc.text(`Tax ID: ${invoice.customerTaxId}`);
      doc.moveDown(0.8);

      // Lines
      doc.fontSize(10).fillColor("#111111").text("Items", { underline: true });
      doc.moveDown(0.3);
      const lines: any[] = Array.isArray(invoice.lineItems)
        ? invoice.lineItems
        : [];
      for (const line of lines) {
        const qty =
          line.quantity && Number(line.quantity) !== 1
            ? ` × ${line.quantity}`
            : "";
        const label = `${line.label || "Item"}${qty}`;
        const amount = `${currency} ${Number(line.amount || 0).toLocaleString()}`;
        doc.fontSize(10).fillColor("#111111").text(label, {
          continued: true,
          width: 360,
        });
        doc.text(amount, { align: "right" });
        if (line.details) {
          doc.fontSize(8).fillColor("#666666").text(String(line.details));
        }
        doc.moveDown(0.25);
      }

      doc.moveDown(0.5);
      const row = (label: string, value: number, bold = false) => {
        doc
          .fontSize(bold ? 12 : 10)
          .fillColor("#111111")
          .font(bold ? "Helvetica-Bold" : "Helvetica")
          .text(label, { continued: true, width: 360 });
        doc.text(`${currency} ${Number(value || 0).toLocaleString()}`, {
          align: "right",
        });
        doc.font("Helvetica");
      };

      row("Subtotal", Number(invoice.subtotal || 0));
      if (Number(invoice.discountAmount || 0) > 0) {
        row("Discount", -Number(invoice.discountAmount));
      }
      if (Number(invoice.taxAmount || 0) > 0) {
        row(invoice.taxLabel || "Tax", Number(invoice.taxAmount));
      }
      const breakdown = invoice.taxBreakdown as Record<string, number> | null;
      if (breakdown && typeof breakdown === "object") {
        doc.fontSize(8).fillColor("#666666");
        if (breakdown.metalTax)
          doc.text(`  Metal tax: ${currency} ${Number(breakdown.metalTax).toLocaleString()}`);
        if (breakdown.makingTax)
          doc.text(`  Making tax: ${currency} ${Number(breakdown.makingTax).toLocaleString()}`);
        if (breakdown.gemstoneTax)
          doc.text(`  Gemstone tax: ${currency} ${Number(breakdown.gemstoneTax).toLocaleString()}`);
        if (breakdown.wastageTax)
          doc.text(`  Wastage tax: ${currency} ${Number(breakdown.wastageTax).toLocaleString()}`);
        doc.fillColor("#111111");
      }
      row("Total", Number(invoice.totalAmount || 0), true);
      row("Paid", Number(invoice.paidAmount || 0));
      row("Balance due", Number(invoice.balanceDue || 0), true);

      if (invoice.notes) {
        doc.moveDown(0.8);
        doc.fontSize(9).fillColor("#555555").text(`Notes: ${invoice.notes}`);
      }

      if (invoice.verificationToken) {
        doc.moveDown(1);
        doc
          .fontSize(9)
          .fillColor("#92400e")
          .text(
            `Verify: https://www.orivraa.com/verify-bill/${invoice.verificationToken}`,
          );
      }

      doc.moveDown(1.5);
      doc
        .fontSize(8)
        .fillColor("#999999")
        .text("Generated on demand by Orivraa — not stored.", {
          align: "center",
        });

      doc.end();
    });
  }
}
