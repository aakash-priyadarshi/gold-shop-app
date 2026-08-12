import { parseInventoryTagCode } from "./inventory.service";

describe("inventory tag identity", () => {
  it("accepts the canonical QR payload", () => {
    expect(parseInventoryTagCode("orivraa:inventory:item-12345678"))
      .toBe("item-12345678");
  });

  it("does not treat a normal SKU as an inventory-id QR payload", () => {
    expect(parseInventoryTagCode("RING-001")).toBeNull();
  });
});
