import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

describe("dashboard sidebar scroll restore", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/dashboard/DashboardLayout.tsx"),
    "utf-8",
  );

  it("persists desktop nav scroll and restores after group auto-expand", () => {
    expect(source).toContain("persistScroll");
    expect(source).toContain("handleNavClick");
    expect(source).toContain("getDashboardNavScrollStorage");
    expect(source).toContain("writeDashboardNavScroll");
    expect(source).toContain("[openGroups, persistScroll, scrollStorage]");
  });
});
