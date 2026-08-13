import { describe, expect, it } from "vitest";
import {
  BILL_TEMPLATE_IDS,
  DEFAULT_BILL_TEMPLATE_ID,
  billTemplatePrintCss,
  getBillTemplate,
  resolveBillTemplateId,
} from "./bill-templates";

describe("bill templates", () => {
  it("defaults unknown ids to classic", () => {
    expect(resolveBillTemplateId(null)).toBe(DEFAULT_BILL_TEMPLATE_ID);
    expect(resolveBillTemplateId("unknown-future")).toBe("classic");
    expect(resolveBillTemplateId("  ROYAL  ")).toBe("royal");
  });

  it("emits print CSS scoped to the chosen template", () => {
    expect(billTemplatePrintCss("royal")).toContain("body.bill-tpl-royal");
    expect(billTemplatePrintCss("ornate")).toContain("outline");
  });

  it("exposes five seller-facing layouts", () => {
    expect(BILL_TEMPLATE_IDS).toEqual([
      "classic",
      "royal",
      "compact",
      "ornate",
      "minimal",
    ]);
    for (const id of BILL_TEMPLATE_IDS) {
      expect(getBillTemplate(id).id).toBe(id);
    }
  });
});
