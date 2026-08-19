import { normalizeReferralCode, pendingReferralKey } from "./referral-code";

describe("normalizeReferralCode", () => {
  it("trims, uppercases, and strips non-alphanumeric characters", () => {
    expect(normalizeReferralCode(" ab-12cd ")).toBe("AB12CD");
    expect(normalizeReferralCode("a1b2c3d4e5f6")).toBe("A1B2C3D4E5F6");
  });

  it("returns undefined for empty or punctuation-only values", () => {
    expect(normalizeReferralCode(undefined)).toBeUndefined();
    expect(normalizeReferralCode("")).toBeUndefined();
    expect(normalizeReferralCode(" --- ")).toBeUndefined();
  });

  it("caps length at 32 characters", () => {
    expect(normalizeReferralCode("a".repeat(40))).toBe("A".repeat(32));
  });
});

describe("pendingReferralKey", () => {
  it("scopes Redis keys by user id", () => {
    expect(pendingReferralKey("user-1")).toBe("pending-referral:user-1");
  });
});
