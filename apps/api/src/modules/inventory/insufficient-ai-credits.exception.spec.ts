import { AI_CREDITS_BILLING_PATH } from "@gold-shop/shared";
import { InsufficientAiCreditsException } from "../core/ai-credits/insufficient-ai-credits.exception";

describe("InsufficientAiCreditsException", () => {
  it("exposes the buy-credits path and remaining balance", () => {
    const err = new InsufficientAiCreditsException(0.24, 0.25);
    const body = err.getResponse() as Record<string, unknown>;
    expect(body.error).toBe("INSUFFICIENT_AI_CREDITS");
    expect(body.balance).toBe(0.24);
    expect(body.required).toBe(0.25);
    expect(body.buyCreditsPath).toBe(AI_CREDITS_BILLING_PATH);
    expect(String(body.message)).toContain("0.24");
    expect(String(body.message)).toContain("0.25");
  });
});
