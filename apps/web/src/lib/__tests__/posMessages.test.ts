import {
  getPosReturnCompletionMessage,
  getPosWhatsAppPaymentStatus,
} from "../posMessages";

describe("POS customer-facing status messages", () => {
  it("uses the persisted return amount and pending state instead of claiming a non-cash refund was issued", () => {
    expect(getPosReturnCompletionMessage("PENDING", 1234.56, "INR")).toEqual({
      title: "Return recorded",
      description: "Return recorded — refund/reversal of INR 1,234.56 is pending.",
    });
  });

  it("describes settled cash refunds and store credit from the server status", () => {
    expect(getPosReturnCompletionMessage("SETTLED", 200, "NPR").description).toBe(
      "Return completed — refund of NPR 200 issued.",
    );
    expect(getPosReturnCompletionMessage("CREDIT_ISSUED", 200, "NPR").description).toBe(
      "Return completed — store credit of NPR 200 issued.",
    );
  });

  it("does not label a partially paid invoice as paid in WhatsApp share text", () => {
    expect(getPosWhatsAppPaymentStatus("PAID", 0, "INR")).toBe("Paid");
    expect(getPosWhatsAppPaymentStatus("PARTIALLY_PAID", 250.5, "INR")).toBe(
      "Partially paid — balance: INR 250.5",
    );
    expect(getPosWhatsAppPaymentStatus("PENDING", 100, "INR")).toBe(
      "Payment pending",
    );
  });
});
