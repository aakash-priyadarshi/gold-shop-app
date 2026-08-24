/** Invite and shop share codes are 12 hex chars; OAuth state may carry extras. */
const MAX_REFERRAL_CODE_LENGTH = 32;

export const PENDING_REFERRAL_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface PendingReferral {
  code: string;
  shopId?: string;
}

export function pendingReferralKey(userId: string): string {
  return `pending-referral:${userId}`;
}

export function normalizeReferralCode(
  referralCode?: string | null,
): string | undefined {
  if (!referralCode) return undefined;
  const code = String(referralCode)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, MAX_REFERRAL_CODE_LENGTH);
  return code || undefined;
}

/** Encode pending referrals with their originating shop when one exists. */
export function encodePendingReferral(referral: PendingReferral): string | undefined {
  const code = normalizeReferralCode(referral.code);
  if (!code) return undefined;
  const shopId = referral.shopId?.trim();
  return shopId ? JSON.stringify({ code, shopId }) : code;
}

/**
 * Decode the current structured value and the legacy plain-code value stored
 * before multi-shop referral recovery was introduced.
 */
export function decodePendingReferral(
  value?: string | null,
): PendingReferral | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.code === "string"
    ) {
      const code = normalizeReferralCode(parsed.code);
      const shopId =
        typeof parsed.shopId === "string" ? parsed.shopId.trim() : undefined;
      return code ? { code, ...(shopId ? { shopId } : {}) } : undefined;
    }
  } catch {
    // Legacy values contain only the referral code.
  }

  const code = normalizeReferralCode(value);
  return code ? { code } : undefined;
}
