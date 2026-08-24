import {
  decodePendingReferral,
  encodePendingReferral,
  normalizeReferralCode,
  pendingReferralKey,
} from "./referral-code";

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

describe("pending referral encoding", () => {
  it("round-trips an originating shop id", () => {
    const encoded = encodePendingReferral({ code: " ref-123 ", shopId: "shop-1" });
    expect(encoded).toBe('{"code":"REF123","shopId":"shop-1"}');
    expect(decodePendingReferral(encoded)).toEqual({ code: "REF123", shopId: "shop-1" });
  });

  it("remains compatible with legacy plain referral-code values", () => {
    expect(decodePendingReferral(" ref-123 ")).toEqual({ code: "REF123" });
  });
});
