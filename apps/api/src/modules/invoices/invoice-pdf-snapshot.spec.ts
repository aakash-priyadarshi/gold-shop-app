import { InvoicePdfService } from "./invoice-pdf.service";

describe("InvoicePdfService supplier snapshot", () => {
  it("uses immutable invoice supplier details before current shop settings", async () => {
    const service = new InvoicePdfService({} as any);
    const context = await (service as any).buildContext({
      id: "invoice-1",
      invoiceNumber: "INV-1",
      invoiceTitle: "INVOICE",
      currency: "NPR",
      issuedAt: new Date("2026-01-01T00:00:00.000Z"),
      supplierName: "Original Jeweller",
      supplierAddress: "Original Address",
      supplierPhone: "1111111111",
      supplierTaxId: "ORIGINAL-TAX-ID",
      subtotal: 100,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 100,
      paidAmount: 100,
      balanceDue: 0,
      lineItems: [],
      shop: {
        shopName: "Renamed Jeweller",
        address: "New Address",
        city: "New City",
        country: "NP",
        contactPhone: "3333333333",
        vatNumber: "CURRENT-TAX-ID",
        panNumber: null,
        profileImage: null,
        invoiceSettings: {
          showLogo: false,
          shopNameOnBill: "Settings Jeweller",
          shopAddress: "Settings Address",
          shopPhone: "2222222222",
          gstin: "SETTINGS-TAX-ID",
        },
      },
    });

    expect(context.branding).toEqual(
      expect.objectContaining({
        shopName: "Original Jeweller",
        address: "Original Address",
        phone: "1111111111",
        taxId: "ORIGINAL-TAX-ID",
      }),
    );
  });
});
