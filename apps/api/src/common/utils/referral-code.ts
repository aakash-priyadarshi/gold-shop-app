/** Invite and shop share codes are 12 hex chars; OAuth state may carry extras. */
const MAX_REFERRAL_CODE_LENGTH = 32;

export const PENDING_REFERRAL_TTL_SECONDS = 60 * 60 * 24 * 7;

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
