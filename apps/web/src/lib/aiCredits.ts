import { AI_CREDITS_BILLING_PATH } from "@gold-shop/shared";

export const AI_CREDITS_BILLING_HREF = AI_CREDITS_BILLING_PATH;

export function isInsufficientAiCreditsError(error: unknown): boolean {
  const payload = getErrorPayload(error);
  if (payload?.error === "INSUFFICIENT_AI_CREDITS") return true;
  const message = String(payload?.message || "");
  return /insufficient ai credits/i.test(message);
}

export function getErrorPayload(error: unknown): {
  error?: string;
  message?: string;
  balance?: number;
  required?: number;
} | null {
  if (!error || typeof error !== "object") return null;
  const withResponse = error as {
    response?: { data?: Record<string, unknown> };
    message?: string;
  };
  if (withResponse.response?.data && typeof withResponse.response.data === "object") {
    return withResponse.response.data as {
      error?: string;
      message?: string;
      balance?: number;
      required?: number;
    };
  }
  if (typeof withResponse.message === "string") {
    return { message: withResponse.message };
  }
  return null;
}
