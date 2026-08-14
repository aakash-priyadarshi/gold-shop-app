import { describe, expect, it } from "vitest";
import { withPhoneCountryCode } from "../mapToCreateDto";

describe("withPhoneCountryCode", () => {
  it("prefixes a local mobile number with the shop country code", () => {
    expect(withPhoneCountryCode("9800000000", "+977")).toBe("+9779800000000");
  });

  it("keeps numbers that are already E.164", () => {
    expect(withPhoneCountryCode("+919876543210", "+977")).toBe("+919876543210");
  });

  it("strips a leading trunk zero before prefixing", () => {
    expect(withPhoneCountryCode("09800000000", "+977")).toBe("+9779800000000");
  });
});
