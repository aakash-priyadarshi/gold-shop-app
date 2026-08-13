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
    expect(html).toContain("brand-top");
  });

  it("falls back to classic when the id is missing", () => {
    const html = buildBillHtml({
      invoiceNumber: "INV-1",
      totalAmount: 100,
    });
    expect(html).toContain('class="bill-tpl-classic"');
  });
});
