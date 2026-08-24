import {
  formatSellerPosWorkflowReply,
  isSellerPosWorkflowQuestion,
} from "./seller-workflow-chat-context";

describe("seller workflow chat context", () => {
  it("explains pending manual card payments and the next action", () => {
    expect(isSellerPosWorkflowQuestion("Why is my card sale pending?")).toBe(
      true,
    );
    expect(
      formatSellerPosWorkflowReply("Why is my card sale pending?"),
    ).toContain("Confirm Payment Received");
  });

  it("explains remaining return quantity and the return path", () => {
    expect(isSellerPosWorkflowQuestion("Why can't I return 5g?")).toBe(true);
    expect(formatSellerPosWorkflowReply("Why can't I return 5g?")).toContain(
      "remaining quantity",
    );
    expect(formatSellerPosWorkflowReply("Why can't I return 5g?")).toContain(
      "POS → Return / Exchange",
    );
  });

  it("defines visible payment states without treating checkout as payment", () => {
    const reply = formatSellerPosWorkflowReply(
      "What does PARTIALLY_PAID status mean?",
    );
    expect(reply).toContain("PAID means");
    expect(reply).toContain("PENDING means");
    expect(reply).toContain("PARTIALLY_PAID means");
  });
});
