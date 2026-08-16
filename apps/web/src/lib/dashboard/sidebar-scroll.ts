export const DASHBOARD_NAV_SCROLL_KEY = "orivraa_dashboard_nav_scroll";

type ScrollStorage = Pick<Storage, "getItem" | "setItem">;

export function getDashboardNavScrollStorage(
  getStorage: () => Storage | undefined = () =>
    typeof sessionStorage === "undefined" ? undefined : sessionStorage,
): ScrollStorage | null {
  try {
    return getStorage() ?? null;
  } catch {
    return null;
  }
}

export function readDashboardNavScroll(storage?: ScrollStorage | null): number {
  if (!storage) return 0;
  try {
    const raw = storage.getItem(DASHBOARD_NAV_SCROLL_KEY);
    const top = Number(raw);
    return Number.isFinite(top) && top > 0 ? top : 0;
  } catch {
    return 0;
  }
}

export function writeDashboardNavScroll(
  top: number,
  storage?: ScrollStorage | null,
): void {
  if (!storage) return;
  try {
    storage.setItem(
      DASHBOARD_NAV_SCROLL_KEY,
      String(Math.max(0, Math.round(top))),
    );
  } catch {
    // Optional persistence — blocked or quota-exceeded storage must not crash nav.
  }
}
