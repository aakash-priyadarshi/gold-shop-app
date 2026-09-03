import { describe, expect, it } from "vitest";
import { buildBillHtml } from "../billPrint";

describe("buildBillHtml templates", () => {
  it("applies the royal body class and extra CSS", () => {
    const html = buildBillHtml({
      invoiceNumber: "INV-1",
      totalAmount: 100,
      settings: { billTemplateId: "royal", shopNameOnBill: "Test Jewels" },
    });
    expect(html).toContain('class="bill-tpl-royal"');
    expect(html).toContain("body.bill-tpl-royal");
    expect(html).toContain("bill-frame");
    expect(html).toContain("bill-ornament-top");
  });

  it("falls back to classic when the id is missing", () => {
    const html = buildBillHtml({
      invoiceNumber: "INV-1",
      totalAmount: 100,
    });
    expect(html).toContain('class="bill-tpl-classic"');
  });

  it("never renders the retired KYC demo watermark", () => {
    const html = buildBillHtml({
      invoiceNumber: "INV-1",
      totalAmount: 100,
      // Guard against stale callers compiled before the watermark option was
      // removed from BillPrintPayload.
      watermark: true,
    } as any);

    expect(html).not.toContain("DEMO BILL");
    expect(html).not.toContain('class="wm"');
  });

  it("prefers the invoice supplier snapshot over current shop settings", () => {
    const html = buildBillHtml({
      invoiceNumber: "INV-1",
      totalAmount: 100,
      supplierName: "Original Jeweller",
      supplierAddress: "Original Address",
      supplierPhone: "1111111111",
      sellerTaxId: "ORIGINAL-TAX-ID",
      settings: {
        shopNameOnBill: "Renamed Jeweller",
        shopAddress: "New Address",
        shopPhone: "2222222222",
        gstin: "NEW-TAX-ID",
      },
    });

    expect(html).toContain("Original Jeweller");
    expect(html).toContain("Original Address");
    expect(html).toContain("1111111111");
    expect(html).toContain("ORIGINAL-TAX-ID");
    expect(html).not.toContain("Renamed Jeweller");
    expect(html).not.toContain("NEW-TAX-ID");
  });

  it("prints the complete verification URL when QR generation is unavailable", () => {
    const html = buildBillHtml({
      invoiceNumber: "INV-1",
      totalAmount: 100,
      verificationToken: "complete-token",
    });

    expect(html).toContain("https://www.orivraa.com/verify-bill/complete-token");
    expect(html).not.toContain("QR Code</text>");
  });
});
