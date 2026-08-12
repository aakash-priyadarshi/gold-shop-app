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

  it("lists classic for seller picker scaffolding", () => {
    const list = listInvoicePdfTemplates();
    expect(list).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: classicInvoicePdfTemplate.id }),
      ]),
    );
  });
});
