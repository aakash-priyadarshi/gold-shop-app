import { classicInvoicePdfTemplate } from "./classic.template";
import {
  DEFAULT_INVOICE_PDF_TEMPLATE_ID,
  listInvoicePdfTemplates,
  resolveInvoicePdfTemplate,
} from "./index";

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
});
