import { describe, expect, it } from "vitest";
import { specsLockMessage } from "../productDescriptionUi";

describe("specsLockMessage", () => {
  it("names both buttons and the empty Total Weight box", () => {
    expect(specsLockMessage(["Total Weight"], true)).toBe(
      "Fill from specs and Generate with AI need Jewellery Type, Metal Type, and Total Weight. Still empty: Total Weight.",
    );
  });

  it("drops Generate with AI on plans that cannot use it", () => {
    expect(specsLockMessage(["Jewellery Type", "Total Weight"], false)).toBe(
      "Fill from specs needs Jewellery Type, Metal Type, and Total Weight. Still empty: Jewellery Type, Total Weight.",
    );
  });
});
