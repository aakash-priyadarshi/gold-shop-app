export const DASHBOARD_NAV_SCROLL_KEY = "orivraa_dashboard_nav_scroll";

type ScrollStorage = Pick<Storage, "getItem" | "setItem">;

export function readDashboardNavScroll(storage?: ScrollStorage | null): number {
  if (!storage) return 0;
  const raw = storage.getItem(DASHBOARD_NAV_SCROLL_KEY);
  const top = Number(raw);
  return Number.isFinite(top) && top > 0 ? top : 0;
}

export function writeDashboardNavScroll(
  top: number,
  storage?: ScrollStorage | null,
): void {
  if (!storage) return;
  storage.setItem(
    DASHBOARD_NAV_SCROLL_KEY,
    String(Math.max(0, Math.round(top))),
  );
}
