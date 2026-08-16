import { describe, expect, it } from "vitest";
import {
  DASHBOARD_NAV_SCROLL_KEY,
  readDashboardNavScroll,
  writeDashboardNavScroll,
} from "../sidebar-scroll";

function memoryStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    store,
  };
}

describe("dashboard sidebar scroll persistence", () => {
  it("returns 0 when nothing is saved so a remount does not jump", () => {
    expect(readDashboardNavScroll(memoryStorage())).toBe(0);
    expect(readDashboardNavScroll(null)).toBe(0);
  });

  it("round-trips the nav scroll offset across a layout remount", () => {
    const storage = memoryStorage();
    writeDashboardNavScroll(640, storage);
    expect(storage.store[DASHBOARD_NAV_SCROLL_KEY]).toBe("640");
    expect(readDashboardNavScroll(storage)).toBe(640);
  });
});
