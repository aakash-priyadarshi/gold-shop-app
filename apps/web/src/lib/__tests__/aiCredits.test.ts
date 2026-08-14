import { describe, expect, it } from "vitest";
import {
  AI_CREDITS_BILLING_HREF,
  getErrorPayload,
  isInsufficientAiCreditsError,
} from "../aiCredits";

describe("isInsufficientAiCreditsError", () => {
  it("detects the billed-credits error code from the API payload", () => {
    expect(
      isInsufficientAiCreditsError({
        response: {
          data: {
            error: "INSUFFICIENT_AI_CREDITS",
            message: "Insufficient AI credits. Balance: 0.24, required: 0.25",
            balance: 0.24,
            required: 0.25,
          },
        },
      }),
    ).toBe(true);
    expect(AI_CREDITS_BILLING_HREF).toContain("tab=credits");
  });

  it("ignores unrelated API failures", () => {
    expect(
      isInsufficientAiCreditsError({
        response: { data: { message: "Unauthorized" } },
      }),
    ).toBe(false);
    expect(isInsufficientAiCreditsError(null)).toBe(false);
  });

  it("reads nested axios payloads", () => {
    expect(
      getErrorPayload({
        response: { data: { error: "INSUFFICIENT_AI_CREDITS", required: 5 } },
      })?.required,
    ).toBe(5);
  });
});
