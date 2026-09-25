import { describe, expect, it } from "vitest";
import { workshopRetryKey } from "./workshop-retry-key";

describe("Workshop ledger request retry key", () => {
  it("reuses the key for a lost response, rotates it when inputs change, and allows clearing after success", () => {
    let issued = 0;
    const next = () => `key-${++issued}`;
    const first = workshopRetryKey(null, { material: "goldGrains995", grams: "1.00" }, next);
    expect(workshopRetryKey(first, { material: "goldGrains995", grams: "1.00" }, next)).toBe(first);
    expect(workshopRetryKey(first, { material: "goldGrains995", grams: "2.00" }, next).key).toBe("key-2");
    expect(workshopRetryKey(null, { material: "goldGrains995", grams: "1.00" }, next).key).toBe("key-3");
  });
});
