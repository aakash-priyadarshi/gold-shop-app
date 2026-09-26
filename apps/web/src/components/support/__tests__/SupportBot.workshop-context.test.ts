import { describe, expect, it } from "vitest";
import { getWorkshopQuickAsks } from "../SupportBot";
import { resolveWorkshopView } from "@/lib/workshop-route";

describe("SupportBot Workshop quick asks", () => {
  it("defaults to Overview only when Workshop mode and the live feature are enabled", () => {
    expect(resolveWorkshopView(null, true, true)).toBe("overview");
    expect(getWorkshopQuickAsks(null, true, true)).toContain("How do I finish factory setup?");
    for (const [mode, enabled] of [[false, true], [true, false], [false, false]]) {
      expect(resolveWorkshopView(null, mode, enabled)).toBe("book");
      expect(getWorkshopQuickAsks(null, mode, enabled)).toContain("How do I issue metal to a karigar?");
      expect(getWorkshopQuickAsks(null, mode, enabled)).not.toContain("How do I finish factory setup?");
    }
  });

  it("preserves explicit Recovery context and contextual assay questions", () => {
    expect(resolveWorkshopView("recovery", false, true)).toBe("recovery");
    expect(getWorkshopQuickAsks("recovery", false, true)).toContain("Is assay required for workshop recovery?");
    expect(getWorkshopQuickAsks("floor", true, true)).toContain("How do I start a process?");
  });
});
