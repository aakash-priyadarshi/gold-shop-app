import PDFDocument from "pdfkit";
import { classicInvoicePdfTemplate } from "./classic.template";
import {
  DEFAULT_INVOICE_PDF_TEMPLATE_ID,
  listInvoicePdfTemplates,
  resolveInvoicePdfTemplate,
} from "./index";
import { cleanLegacyDetails, formatGemstonePdfSpec } from "./themed.template";
import type { InvoicePdfContext } from "../invoice-pdf.types";

const PdfCtor =
  (PDFDocument as unknown as { default?: typeof PDFDocument }).default ||
  PDFDocument;

describe("invoice PDF templates", () => {
  it("defaults to classic", () => {
    expect(resolveInvoicePdfTemplate(null).id).toBe(
      DEFAULT_INVOICE_PDF_TEMPLATE_ID,
    );
    expect(resolveInvoicePdfTemplate("unknown-future").id).toBe("classic");
  });

  it("lists every seller-facing layout", () => {
    const list = listInvoicePdfTemplates();
    expect(list.map((t) => t.id).sort()).toEqual(
      ["classic", "compact", "minimal", "ornate", "royal"].sort(),
    );
    expect(list).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: classicInvoicePdfTemplate.id }),
      ]),
    );
  });

  it("resolves each known id to itself", () => {
    for (const id of ["classic", "royal", "compact", "ornate", "minimal"]) {
      expect(resolveInvoicePdfTemplate(id).id).toBe(id);
    }
  });

  describe("gemstone PDF formatting & legacy details cleaning", () => {
    it("formats a full certified lab diamond specification in language-neutral compact form", () => {
      const spec = formatGemstonePdfSpec({
        type: "DIAMOND",
        origin: "LAB",
        shape: "Oval",
        cut: "Oval",
        cutGrade: "Excellent",
        caratWeight: 1.5,
        color: "D",
        clarity: "VVS1",
        gradingLab: "IGI",
        certNumber: "IGI-123",
      });

      expect(spec).toBe(
        "DIAMOND · LAB · Oval · Excellent · D · VVS1 · 1.5 ct · IGI · IGI-123",
      );
      // Does not expose internal metadata
      expect(spec).not.toContain("BUDGET");
      expect(spec).not.toContain("PREMIUM");
      expect(spec).not.toContain("http");
      expect(spec).not.toContain("Lab-grown");
      expect(spec).not.toContain("Color");
      expect(spec).not.toContain("Clarity");
    });

    it("formats multiple gemstones with multiplier badges", () => {
      const spec1 = formatGemstonePdfSpec(
        {
          type: "DIAMOND",
          origin: "LAB",
          shape: "Oval",
          caratWeight: 1.5,
          color: "D",
          clarity: "VVS1",
          count: 1,
        },
        2,
      );
      const spec2 = formatGemstonePdfSpec(
        {
          type: "RUBY",
          shape: "Cushion",
          sizeMm: 6.0,
          count: 2,
        },
        2,
      );

      expect(spec1).toBe("DIAMOND · LAB · Oval · D · VVS1 · 1.5 ct · ×1");
      expect(spec2).toBe("RUBY · Cushion · 6 mm · ×2");
    });

    it("cleanLegacyDetails preserves non-gemstone metadata and removes duplicate gemstone prose", () => {
      // Legacy invoice without structured gemstones: keeps verbatim
      expect(
        cleanLegacyDetails(
          "DSR-001 · Hallmark: HM-9999 · Gemstones: Lab-grown DIAMOND Color D",
          false,
        ),
      ).toBe("DSR-001 · Hallmark: HM-9999 · Gemstones: Lab-grown DIAMOND Color D");

      // New invoice with structured gemstones: strips legacy gemstone prose
      expect(
        cleanLegacyDetails(
          "DSR-001 · Hallmark: HM-9999 · Gemstones: Lab-grown DIAMOND Color D Clarity VVS1",
          true,
        ),
      ).toBe("DSR-001 · Hallmark: HM-9999");

      // Details containing only gemstone prose becomes undefined to avoid duplicate blank/useless lines
      expect(
        cleanLegacyDetails("Gemstones: Lab-grown DIAMOND Color D", true),
      ).toBeUndefined();
    });

    it("renders PDF document with structured gemstone lines across all templates without errors", () => {
      const ctx: InvoicePdfContext = {
        templateId: "classic",
        invoiceNumber: "INV-2026-0001",
        title: "INVOICE",
        currency: "NPR",
        customerName: "Aakash Priyadarshi",
        lineItems: [
          {
            label: "Gold 18K Solitaire Ring",
            amount: 150000,
            quantity: 1,
            details: "SKU-SOL-1 · Hallmark: HM-2026",
            gemstones: [
              {
                type: "DIAMOND",
                origin: "LAB",
                shape: "Oval",
                cutGrade: "Excellent",
                caratWeight: 1.5,
                color: "D",
                clarity: "VVS1",
                gradingLab: "IGI",
                certNumber: "IGI-123",
              },
            ],
          },
        ],
        subtotal: 150000,
        discountAmount: 0,
        taxAmount: 750,
        totalAmount: 150750,
        paidAmount: 150750,
        balanceDue: 0,
        branding: {
          shopName: "Orivraa Demo Jewellers",
          showLogo: false,
          showAddress: false,
          showPhone: false,
          showEmail: false,
          showGstin: false,
          showLicense: false,
          showFooter: true,
          showTerms: true,
          logoPosition: "TOP",
        },
      };

      for (const id of ["classic", "royal", "compact", "ornate", "minimal"]) {
        const template = resolveInvoicePdfTemplate(id);
        const doc = new PdfCtor({ size: "A4", margin: 48 });
        expect(() => template.render(doc, ctx)).not.toThrow();
      }
    });
  });
});
