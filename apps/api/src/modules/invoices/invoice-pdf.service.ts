import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import PDFDocument from "pdfkit";
import * as QRCode from "qrcode";
import { PrismaService } from "../../prisma/prisma.service";
import type { InvoicePdfContext } from "./pdf/invoice-pdf.types";
import {
  getCachedLogo,
  isWebp,
  setCachedLogo,
  toPdfKitPng,
} from "./pdf/logo-for-pdf";
import {
  DEFAULT_INVOICE_PDF_TEMPLATE_ID,
  resolveInvoicePdfTemplate,
} from "./pdf/templates";

// pdfkit CJS interop
const PdfCtor =
  (PDFDocument as unknown as { default?: typeof PDFDocument }).default ||
  PDFDocument;

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generatePdfBuffer(
    id: string,
    shopId: string,
  ): Promise<{
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
            profileImage: true,
            invoiceSettings: true,
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

    const ctx = await this.buildContext(invoice);
    const buffer = await this.renderWithTemplate(ctx);
    const safeNumber = String(invoice.invoiceNumber || id).replace(
      /[^\w.-]+/g,
      "_",
    );
    return {
      buffer,
      filename: `Invoice-${safeNumber}.pdf`,
    };
  }

  private async buildContext(invoice: any): Promise<InvoicePdfContext> {
    const settings = invoice.shop?.invoiceSettings || null;
    const templateId =
      settings?.billTemplateId || DEFAULT_INVOICE_PDF_TEMPLATE_ID;

    const shopName =
      settings?.shopNameOnBill?.trim() ||
      invoice.supplierName ||
      invoice.shop?.shopName ||
      "Jeweller";

    const logoUrl =
      (settings?.showLogo !== false &&
        (settings?.shopLogoUrl || invoice.shop?.profileImage)) ||
      null;

    const frontendBase = (
      process.env.FRONTEND_URL || "https://www.orivraa.com"
    ).replace(/\/$/, "");
    const verifyUrl = invoice.verificationToken
      ? `${frontendBase}/verify-bill/${invoice.verificationToken}`
      : null;

    const [logoBuffer, qrBuffer] = await Promise.all([
      logoUrl ? this.fetchImageBuffer(logoUrl) : Promise.resolve(null),
      this.buildQrBuffer(verifyUrl, invoice.id),
    ]);

    const taxId =
      settings?.gstin ||
      invoice.shop?.vatNumber ||
      invoice.shop?.panNumber ||
      null;

    const address =
      settings?.shopAddress ||
      [invoice.shop?.address, invoice.shop?.city, invoice.shop?.country]
        .filter(Boolean)
        .join(", ") ||
      null;

    const lines: any[] = Array.isArray(invoice.lineItems)
      ? invoice.lineItems
      : [];

    return {
      templateId,
      invoiceNumber: String(invoice.invoiceNumber || invoice.id),
      title:
        invoice.invoiceTitle ||
        (invoice.invoiceCountry === "LK" ? "INVOICE" : "INVOICE"),
      currency: invoice.currency || "NPR",
      invoiceCountry: invoice.invoiceCountry,
      issuedAt: invoice.issuedAt,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerEmail: invoice.customerEmail,
      customerAddress: invoice.customerAddress,
      customerTaxId: invoice.customerTaxId,
      lineItems: lines.map((line) => ({
        label: String(line.label || "Item"),
        quantity: line.quantity != null ? Number(line.quantity) : 1,
        amount: Number(line.amount || 0),
        details: line.details ? String(line.details) : undefined,
      })),
      subtotal: Number(invoice.subtotal || 0),
      discountAmount: Number(invoice.discountAmount || 0),
      taxAmount: Number(invoice.taxAmount || 0),
      taxLabel: invoice.taxLabel,
      taxBreakdown: (invoice.taxBreakdown as Record<string, number>) || null,
      totalAmount: Number(invoice.totalAmount || 0),
      paidAmount: Number(invoice.paidAmount || 0),
      balanceDue: Number(invoice.balanceDue || 0),
      notes: invoice.notes,
      branding: {
        shopName,
        tagline: settings?.tagline ?? null,
        address,
        phone: settings?.shopPhone || invoice.shop?.contactPhone || null,
        email: settings?.shopEmail || invoice.shop?.contactEmail || null,
        taxId,
        licenseNumber: settings?.licenseNumber ?? null,
        footerNote: settings?.footerNote ?? null,
        termsText: settings?.termsText ?? null,
        showLogo: settings?.showLogo !== false,
        showAddress: settings?.showAddress !== false,
        showPhone: settings?.showPhone !== false,
        showEmail: settings?.showEmail === true,
        showGstin: settings?.showGstin !== false,
        showLicense: settings?.showLicense === true,
        showFooter: settings?.showFooter !== false,
        showTerms: settings?.showTerms !== false,
        logoPosition:
          (settings?.logoPosition || "TOP").toUpperCase() === "BOTTOM"
            ? "BOTTOM"
            : "TOP",
        logoUrl,
        logoBuffer,
      },
      verificationToken: invoice.verificationToken,
      verifyUrl,
      qrBuffer,
    };
  }

  private async buildQrBuffer(
    verifyUrl: string | null,
    invoiceId: string,
  ): Promise<Buffer | null> {
    if (!verifyUrl) return null;
    try {
      return await QRCode.toBuffer(verifyUrl, {
        type: "png",
        width: 160,
        margin: 1,
        errorCorrectionLevel: "M",
      });
    } catch (err) {
      this.logger.warn(
        `QR generation failed for invoice ${invoiceId}: ${String(err)}`,
      );
      return null;
    }
  }

  private async fetchImageBuffer(url: string): Promise<Buffer | null> {
    try {
      if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
        return null;
      }

      const cached = getCachedLogo(url);
      if (cached) return cached;

      const raw = await this.downloadImage(url);
      if (!raw) return null;

      let converted: Buffer;
      try {
        converted = await toPdfKitPng(raw);
      } catch (err) {
        this.logger.warn(
          `Could not convert shop logo for pdfkit${isWebp(raw) ? " (webp)" : ""}: ${url} — ${String(err)}`,
        );
        return null;
      }
      setCachedLogo(url, converted);
      return converted;
    } catch (err) {
      this.logger.warn(`Logo fetch error: ${String(err)}`);
      return null;
    }
  }

  private async downloadImage(url: string): Promise<Buffer | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          // Omit webp/avif so Cloudflare Polish is more likely to return PNG/JPEG
          Accept: "image/png,image/jpeg,image/*;q=0.8",
        },
      });
      if (!res.ok) {
        this.logger.warn(`Logo fetch failed (${res.status}): ${url}`);
        return null;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 32 || buf.length > 5_000_000) return null;
      return buf;
    } finally {
      clearTimeout(timer);
    }
  }

  private renderWithTemplate(ctx: InvoicePdfContext): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PdfCtor({ size: "A4", margin: 48 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const template = resolveInvoicePdfTemplate(ctx.templateId);
      template.render(doc, ctx);
      doc.end();
    });
  }
}
