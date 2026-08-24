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
