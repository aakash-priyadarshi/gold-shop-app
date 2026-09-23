import { describe, expect, it } from "vitest";
import { assertStableGoldReading, GoldScaleSimulator } from "./workshop-scale";

describe("GoldScaleSimulator", () => {
  it("uses the same normalized reading shape a hardware adapter will use", () => {
    const sim = new GoldScaleSimulator("100.25");
    sim.connect();
    sim.setStable(true);
    const reading = sim.read();
    expect(reading).toMatchObject({
      purpose: "GOLD",
      weightGrams: "100.25",
      unit: "g",
      precisionGrams: "0.01",
      stable: true,
      adapterKind: "SIMULATOR",
    });
    expect(reading?.rawFrame).toContain("ST");
    expect(reading?.rawFrame).toContain("NET");
  });

  it("does not treat a missing stable flag as stable", () => {
    const sim = new GoldScaleSimulator("100.25");
    sim.connect();
    const reading = sim.read();
    expect(reading?.stable).toBe(false);
    expect(reading?.rawFrame).toContain("US");
    expect(() => assertStableGoldReading(reading!)).toThrow(/not stable/);
  });

  it("returns net weight with no software tare offset", () => {
    const sim = new GoldScaleSimulator("50.00");
    sim.connect();
    sim.setNetWeight("12.34");
    sim.setStable(true);
    const reading = sim.read();
    expect(reading?.weightGrams).toBe("12.34");
    expect(reading).not.toHaveProperty("tareOffset");
  });

  it("rejects a stone-purpose reading on a gold session", () => {
    const sim = new GoldScaleSimulator("100.25");
    sim.connect();
    sim.setStable(true);
    const reading = sim.read()!;
    expect(() =>
      assertStableGoldReading({ ...reading, purpose: "STONE" }, "GOLD"),
    ).toThrow(/purpose/);
  });

  it("stays disconnected until connect()", () => {
    const sim = new GoldScaleSimulator("100.25");
    expect(sim.read()).toBeNull();
    sim.connect();
    expect(sim.read()).not.toBeNull();
  });
});
