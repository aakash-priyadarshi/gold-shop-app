import { describe, expect, it } from "vitest";
import {
  BILL_ORNAMENT_GOLD,
  BILL_ORNAMENT_WINE,
  BILL_TEMPLATE_IDS,
  DEFAULT_BILL_TEMPLATE_ID,
  billOrnamentSvg,
  billTemplateOrnamentHtml,
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
    expect(billTemplatePrintCss("ornate")).toContain("bill-frame");
    expect(billTemplatePrintCss("classic")).toContain("double");
    expect(billTemplatePrintCss("compact")).toContain("dashed");
  });

  it("uses gold ornaments except on the cream ornate paper", () => {
    expect(getBillTemplate("classic").theme.ornamentColor).toBe(
      BILL_ORNAMENT_GOLD,
    );
    expect(getBillTemplate("minimal").theme.ornamentColor).toBe(
      BILL_ORNAMENT_GOLD,
    );
    expect(getBillTemplate("compact").theme.ornamentColor).toBe(
      BILL_ORNAMENT_GOLD,
    );
    expect(getBillTemplate("royal").theme.ornamentColor).toBe(
      BILL_ORNAMENT_GOLD,
    );
    expect(getBillTemplate("ornate").theme.ornamentColor).toBe(
      BILL_ORNAMENT_WINE,
    );
    expect(getBillTemplate("ornate").theme.paper).toBe("#fffbeb");
  });

  it("gives each layout a distinct icon and frame", () => {
    const icons = BILL_TEMPLATE_IDS.map(
      (id) => getBillTemplate(id).theme.ornamentIcon,
    );
    const frames = BILL_TEMPLATE_IDS.map((id) => getBillTemplate(id).theme.frame);
    expect(new Set(icons).size).toBe(5);
    expect(frames).toContain("double");
    expect(frames).toContain("dashed");
    expect(frames).toContain("corners");
    expect(billOrnamentSvg("diya", BILL_ORNAMENT_GOLD)).toContain("svg");
    expect(billTemplateOrnamentHtml("classic").top).toContain("bill-ornament-top");
  });
});
