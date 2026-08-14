import {
  normalizeInventoryScanCode,
  parseInventoryTagCode,
} from "./inventory-scan";

describe("inventory tag identity", () => {
  it("accepts the canonical QR payload", () => {
    expect(parseInventoryTagCode("orivraa:inventory:item-12345678")).toBe(
      "item-12345678",
    );
  });

  it("accepts uppercase QR payloads and EPC prefixes", () => {
    expect(
      parseInventoryTagCode("ORIVRAA:INVENTORY:item-12345678"),
    ).toBe("item-12345678");
    expect(normalizeInventoryScanCode("EPC:AB12CD34")).toBe("AB12CD34");
    expect(normalizeInventoryScanCode("RFID AB12CD34")).toBe("AB12CD34");
  });

  it("does not treat a normal SKU as an inventory-id QR payload", () => {
    expect(parseInventoryTagCode("RING-001")).toBeNull();
  });
});
